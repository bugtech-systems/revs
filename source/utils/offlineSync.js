/**
 * offlineSync.js
 *
 * Offline-first CRUD + auto-sync between SQLite (react-native-sqlite-storage)
 * and Supabase (Postgres). JavaScript (React Native).
 *
 * - Creates local SQLite tables matching the provided schemas (approximate mapping).
 * - Adds a `sync_queue` table to record pending operations.
 * - CRUD functions write to SQLite and enqueue operations.
 * - `syncWithSupabase()` processes the queue and pulls remote changes.
 *
 * NOTES:
 * - JSONB columns are stored locally as TEXT (JSON.stringify).
 * - UUIDs are generated locally with uuid v4.
 * - Conflict resolution: last-write-wins using `updated_at` timestamps.
 *
 * Usage: import functions below in your app. Call `init()` at app startup.
 */
import SQLite from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';
import supabase from './supabaseClient';
import { schema } from './schema';
import { generateObjectId } from './helpers';
// SQLite.enablePromise(true); // optional, to use promises

const DB_NAME = 'app.db';
let db = SQLite.openDatabase({ name: DB_NAME, location: 'default' });

// local metadata key to store lastPulledAt timestamp per table
const LAST_PULLED_KEY = 'offline:lastPulledAt';

// Table list (as used in Supabase). Must match Supabase table names.
const TABLES = [
'users', 'draws', 'bettings', 
'master_combinations',
// 'messages', 'cashflow'
];

// ---------- UTIL ----------
const runSql = (sql, params = []) => {
 
 return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_, res) => resolve(res),
        (_, err) => {
          console.error('SQL ERROR', sql, params, err);
          reject(err);
        }
      );
    });
  });
}
  

// // convert JS object to JSON string for JSONB columns
// const toJsonText = (v) => (v === undefined || v === null ? null : JSON.stringify(v));
// const parseJsonText = (v) => {
//   try {
//     return v === null || v === undefined ? null : JSON.parse(v);
//   } catch {
//     return null;
//   }
// };

// // get timestamp string in ISO format
// const nowISO = () => new Date().toISOString();

// ---------- SCHEMA CREATION (SQLite) ----------
// Note: SQLite types simplified. JSONB stored as TEXT.
// created_at and updated_at stored as TEXT (ISO timestamp).
async function createTablesIfNotExists() {
  // users
  await runSql(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'teller',
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      address TEXT,
      receipt_template TEXT,
      commission TEXT,
      mobile TEXT,
      referral TEXT,
      user_level INTEGER DEFAULT 0,
      com_rate TEXT DEFAULT '0',
      com_portion TEXT DEFAULT '0',
      device_id TEXT,
      user_id TEXT,
      coordinates TEXT,
      gross_today TEXT,
      app_version TEXT,
      last_summary TEXT,
      configuration TEXT,
      uplines TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`
  );

  // draws
  await runSql(
    `CREATE TABLE IF NOT EXISTS draws (
      id TEXT PRIMARY KEY,
      game_type TEXT NOT NULL DEFAULT 'swertres',
      game_time TEXT NOT NULL DEFAULT '2pm',
      combination TEXT,
      gross_total TEXT NOT NULL,
      win_total TEXT,
      net_total TEXT,
      sold_out_total TEXT,
      draw_date TEXT,
      is_win_to INTEGER DEFAULT 0,
      tip_url TEXT,
      created_at TEXT,
      updated_at TEXT
    );`
  );

  // bettings
  await runSql(
    `CREATE TABLE IF NOT EXISTS bettings (
      id TEXT PRIMARY KEY,
      is_complete INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      is_validated TEXT,
      timestamp TEXT,
      input_type TEXT DEFAULT 'normal',
      straight TEXT NOT NULL,
      ramble TEXT NOT NULL,
      gross TEXT NOT NULL,
      net TEXT NOT NULL,
      is_print INTEGER DEFAULT 0,
      is_win_to INTEGER DEFAULT 0,
      collector TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      print_copy INTEGER,
      draw_id TEXT,
      user_id TEXT,
      file_url TEXT,
      note TEXT,
      contact TEXT,
      ticket_no TEXT,
      winning TEXT,
      game_time TEXT DEFAULT '2pm',
      hits TEXT,
      commissions TEXT,
      combinations TEXT,
      uplines TEXT,
      created_at TEXT,
      updated_at TEXT
    );`
  );

  // master_combinations
  await runSql(
    `CREATE TABLE IF NOT EXISTS master_combinations (
      id TEXT PRIMARY KEY,
      digit TEXT NOT NULL,
      straight_limit TEXT DEFAULT '0',
      ramble_limit TEXT DEFAULT '0',
      ramble_total TEXT DEFAULT '0',
      straight_total TEXT DEFAULT '0',
      is_win_to INTEGER DEFAULT 0,
      risk_level TEXT DEFAULT 'neutral',
      win_frequency INTEGER DEFAULT 0,
      straight_max_limit TEXT DEFAULT '0',
      ramble_max_limit TEXT DEFAULT '0',
      created_at TEXT,
      updated_at TEXT
    );`
  );

//   // messages
//   await runSql(
//     `CREATE TABLE IF NOT EXISTS messages (
//       id TEXT PRIMARY KEY,
//       created_by TEXT,
//       recepient TEXT,
//       recepient_name TEXT,
//       conversations TEXT,
//       is_deleted INTEGER DEFAULT 0,
//       created_at TEXT NOT NULL,
//       updated_at TEXT NOT NULL
//     );`
//   );

//   // cashflow
//   await runSql(
//     `CREATE TABLE IF NOT EXISTS cashflow (
//       id TEXT PRIMARY KEY,
//       amount TEXT DEFAULT '0',
//       description TEXT NOT NULL,
//       input_type TEXT NOT NULL,
//       is_deleted INTEGER DEFAULT 0,
//       owner TEXT NOT NULL,
//       owner_name TEXT,
//       user TEXT NOT NULL,
//       updated_by TEXT,
//       created_at TEXT NOT NULL,
//       updated_at TEXT NOT NULL
//     );`
//   );

  // sync_queue: holds operations to push to Supabase
  await runSql(
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      op TEXT NOT NULL, -- 'insert'|'update'|'delete'
      table_name TEXT NOT NULL,
      row_id TEXT NOT NULL,
      payload TEXT, -- JSON text of changed row (for insert/update)
      created_at TEXT NOT NULL
    );`
  );

  // local metadata: we use AsyncStorage for lastPulledAt per table
}

// ---------- QUEUE HELPERS ----------
async function enqueueSync(op, tableName, rowId, payload = null) {
  const createdAt = nowISO();
  const payloadText = payload ? JSON.stringify(payload) : null;
  await runSql(
    `INSERT INTO sync_queue (op, table_name, row_id, payload, created_at) VALUES (?, ?, ?, ?, ?);`,
    [op, tableName, rowId, payloadText, createdAt]
  );
}

async function fetchSyncQueue() {
  const res = await runSql(`SELECT * FROM sync_queue ORDER BY id ASC;`);
  const rows = [];
  
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  console.log(rows, 'RESS')
  return rows;
}

async function removeQueueItem(id) {
  await runSql(`DELETE FROM sync_queue WHERE id = ?;`, [id]);
}

// ✅ Converts JSON fields before storing into SQLite (TEXT)
function toJsonText(obj) {
  try {
    return obj ? JSON.stringify(obj) : null;
  } catch {
    return null;
  }
}

// ✅ Parse back JSON fields from SQLite string
function parseJsonText(str) {
  if (str === null || str === undefined) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

// ✅ Timestamps: always ISO 8601
function nowISO() {
  return new Date().toISOString();
}

// ✅ Normalize row from SQLite -> JS object for Supabase

// ✅ normalize single value
function normalizeValue(type, value, target = "supabase") {
  if (value === null || value === undefined) return null;

  switch (type) {
    case "boolean":
      return target === "sqlite" ? (value ? 1 : 0) : Boolean(value);

    case "json":
      return target === "sqlite"
        ? JSON.stringify(value ?? [])
        : typeof value === "string"
          ? JSON.parse(value)
          : value;

    case "integer":
      return Number(value);

    case "timestamp":
      return new Date(value).toISOString();

    case "uuid":
    case "text":
    default:
      return String(value);
  }
}

// ✅ Normalize row for Supabase (from SQLite)
export function normalizeForSupabase(table, row) {
  const tableSchema = schema[table];
  if (!tableSchema) throw new Error(`Unknown table: ${table}`);

  const normalized = {};
  for (const col in tableSchema) {
    normalized[col] = normalizeValue(tableSchema[col], row[col], "supabase");
  }

  // timestamps fallback
  normalized.created_at = normalized.created_at || new Date().toISOString();
  normalized.updated_at = normalized.updated_at || new Date().toISOString();

  return normalized;
}

// ✅ Normalize row for SQLite (from Supabase)
export function normalizeForSQLite(table, remoteRow) {
  const tableSchema = schema[table];
  if (!tableSchema) throw new Error(`Unknown table: ${table}`);

  const normalized = {};
  for (const col in tableSchema) {
    normalized[col] = normalizeValue(tableSchema[col], remoteRow[col], "sqlite");
  }

  // timestamps fallback
  normalized.created_at = normalized.created_at || new Date().toISOString();
  normalized.updated_at = normalized.updated_at || new Date().toISOString();

  return normalized;
}



// ---------- CRUD Helpers (local-first) ----------
// Generic insert: expects record object with fields matching local column names
async function localInsert(tableName, record) {
  // set timestamps
  const id = record.id || generateObjectId();
  const createdAt = record.created_at || nowISO();
  const updatedAt = record.updated_at || createdAt;
  record.id = id;
  record.created_at = createdAt;
  record.updated_at = updatedAt;

  // Ensure JSON fields are stringified if present for known tables
  if (tableName === 'users') {
    record.configuration = toJsonText(record.configuration ?? []);
    record.uplines = toJsonText(record.uplines ?? []);
  } else if (tableName === 'bettings') {
    record.hits = toJsonText(record.hits ?? []);
    record.commissions = toJsonText(record.commissions ?? []);
    record.combinations = toJsonText(record.combinations ?? []);
    record.uplines = toJsonText(record.uplines ?? []);
  } else if (tableName === 'messages') {
    record.conversations = toJsonText(record.conversations ?? []);
  }

  // build dynamic insert
  const cols = Object.keys(record);
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders});`;
  const values = cols.map((c) => record[c]).map(normalizeValue);

  await runSql(sql, values);
  // enqueue for sync
  await enqueueSync('insert', tableName, id, record);

  return { id, ...record };
}

async function localUpdate(tableName, id, patch) {
  // fetch existing
  const res = await runSql(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1;`, [id]);
  if (res.rows.length === 0) throw new Error('Not found');
  const existing = res.rows.item(0);
  const updated = { ...existing, ...patch, updated_at: nowISO() };

  // JSON fields stringify
  if (tableName === 'users') {
    updated.configuration = toJsonText(parseJsonText(updated.configuration) ?? updated.configuration ?? []);
    updated.uplines = toJsonText(parseJsonText(updated.uplines) ?? updated.uplines ?? []);
  } else if (tableName === 'bettings') {
    updated.hits = toJsonText(updated.hits ? parseJsonText(updated.hits) : null) || updated.hits;
    updated.commissions = toJsonText(updated.commissions ? parseJsonText(updated.commissions) : null) || updated.commissions;
    updated.combinations = toJsonText(updated.combinations ? parseJsonText(updated.combinations) : null) || updated.combinations;
    updated.uplines = toJsonText(updated.uplines ? parseJsonText(updated.uplines) : null) || updated.uplines;
  } else if (tableName === 'messages') {
    updated.conversations = toJsonText(updated.conversations ? parseJsonText(updated.conversations) : []);
  }

  // build update SQL
  const cols = Object.keys(updated).filter((c) => c !== 'id');
  const setClause = cols.map((c) => `${c} = ?`).join(', ');
  const values = cols.map((c) => updated[c]);
  values.push(id);
  const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?;`;
  await runSql(sql, values);

  await enqueueSync('update', tableName, id, updated);
  return updated;
}

async function localDelete(tableName, id) {
  // For soft delete preference depends on table; we queue a delete operation and also remove local row
  await runSql(`DELETE FROM ${tableName} WHERE id = ?;`, [id]);
  await enqueueSync('delete', tableName, id, null);
  return true;
}

async function localGet(tableName, id) {
  const res = await runSql(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1;`, [id]);
  if (res.rows.length === 0) return null;
  const row = res.rows.item(0);

  // parse JSON fields
  if (tableName === 'users') {
    row.configuration = parseJsonText(row.configuration);
    row.uplines = parseJsonText(row.uplines);
  } else if (tableName === 'bettings') {
    row.hits = parseJsonText(row.hits);
    row.commissions = parseJsonText(row.commissions);
    row.combinations = parseJsonText(row.combinations);
    row.uplines = parseJsonText(row.uplines);
  } else if (tableName === 'messages') {
    row.conversations = parseJsonText(row.conversations);
  }

  return row;
}

async function localList(tableName, whereClause = '', params = []) {
  const sql = `SELECT * FROM ${tableName} ${whereClause};`;
  const res = await runSql(sql, params);
  const rows = [];
  for (let i = 0; i < res.rows.length; i++) {
    const r = res.rows.item(i);
    if (tableName === 'users') {
      r.configuration = parseJsonText(r.configuration);
      r.uplines = parseJsonText(r.uplines);
    } else if (tableName === 'bettings') {
      r.hits = parseJsonText(r.hits);
      r.commissions = parseJsonText(r.commissions);
      r.combinations = parseJsonText(r.combinations);
      r.uplines = parseJsonText(r.uplines);
    } else if (tableName === 'messages') {
      r.conversations = parseJsonText(r.conversations);
    }
    rows.push(r);
  }
  return rows;
}

// query = { filters: { field: value, ... }, limit, offset, orderBy }
async function localQuery(tableName, query = {}) {
  const { filters = {}, limit, offset, orderBy } = query;

  // WHERE (dynamic)
  const { whereSql, values } = buildWhereClause(filters);

  // ORDER BY
  const orderSql = orderBy ? `ORDER BY ${orderBy}` : "";

  // LIMIT / OFFSET
  const limitSql = limit ? `LIMIT ${limit}` : "";
  const offsetSql = offset ? `OFFSET ${offset}` : "";

  const sql = `SELECT * FROM ${tableName} ${whereSql} ${orderSql} ${limitSql} ${offsetSql};`;
  const res = await runSql(sql, values);

  const rows = [];
  for (let i = 0; i < res.rows.length; i++) {
    let row = res.rows.item(i);

    // parse JSON fields
    if (tableName === "users") {
      row.configuration = parseJsonText(row.configuration);
      row.uplines = parseJsonText(row.uplines);
    } else if (tableName === "bettings") {
      row.hits = parseJsonText(row.hits);
      row.commissions = parseJsonText(row.commissions);
      row.combinations = parseJsonText(row.combinations);
      row.uplines = parseJsonText(row.uplines);
    } else if (tableName === "messages") {
      row.conversations = parseJsonText(row.conversations);
    }

    rows.push(row);
  }
  return rows;
}



// ---------- SYNC LOGIC ----------

// push: process queue and apply to Supabase
async function pushQueueToSupabase() {

console.log('PUSH QUQU')
  const queue = await fetchSyncQueue();
  for (const q of queue) {
    try {
      const { id: queueId, op, table_name: tableName, row_id: rowId, payload } = q;
      // parse payload if exists
      let payloadObj = payload ? JSON.parse(payload) : null;

      if (op === 'insert') {
        // Insert to Supabase. If record exists remotely, we can use upsert (insert with on_conflict)
        // supabase-js supports upsert via .upsert()
        const insertPayload = normalizeForSupabase(tableName, payloadObj);
        
        
        // Remove local-only fields if necessary
        console.log(insertPayload, 'INSERT PAAAY', payloadObj, 'PAAY')
        const { data, error } = await supabase.from(tableName).upsert(insertPayload, { onConflict: 'id' }).select().limit(1);
        if (error) throw error;
        // Remove queue entry
        await removeQueueItem(queueId);
      } else if (op === 'update') {
                const updatePayload = normalizeForSupabase(tableName, payloadObj);

        // Use update where id = rowId
        const { data, error } = await supabase.from(tableName).update(updatePayload).eq('id', rowId);
        if (error) throw error;
        await removeQueueItem(queueId);
      } else if (op === 'delete') {
        const { error } = await supabase.from(tableName).delete().eq('id', rowId);
        if (error) {
          // If not found or other errors, decide to remove or keep queue. We remove to avoid infinite loop.
          console.warn('Delete error (ignored):', error);
        }
        await removeQueueItem(queueId);
      }
    } catch (err) {
      console.warn('Failed to push queue item, will retry later', err);
      // don't remove queue item - will retry next sync
    }
  }
}

// pull: fetch remote changes since lastPulledAt for each table and write to local
async function pullFromSupabase(id) {

  console.log(id, "THE ID IN PULLER")
  
  for (const table of TABLES) {
    try {
      const key = `${id}:${LAST_PULLED_KEY}:${table}`;
      const lastPulledAt = (await AsyncStorage.getItem(key)) || null;

      // ✅ Step 1: get all local ids
      const localIds = await getAllLocalIds(table);

      // ✅ Step 2: fetch all Supabase rows updated since lastPulledAt
      let query = supabase.from(table).select('*');
      if (lastPulledAt) {
        query = query.gte('updated_at', lastPulledAt);
      }

      const { data: remoteData, error } = await query;
      if (error) {
        console.warn(`Pull error for ${table}`, error);
        continue;
      }

      // ✅ Step 3: build a map of Supabase IDs
      const remoteIds = new Set(remoteData.map((row) => row.id));

      // ✅ Step 4: handle Supabase rows
      for (const remoteRow of remoteData) {
        const local = await localGet(table, remoteRow.id);
        const remoteUpdatedAt = remoteRow.updated_at || nowISO();
        const localUpdatedAt = local ? local.updated_at || null : null;

        if (remoteRow.is_deleted) {
          // case 2: deleted in supabase → delete locally
          await runSql(`DELETE FROM ${table} WHERE id = ?`, [remoteRow.id]);
          continue;
        }

        if (!local) {
          // case 3a: supabase row doesn’t exist locally → insert
          const toInsert = normalizeForSQLite(table, remoteRow);
          await insertOrReplace(table, toInsert);
        } else if (!localUpdatedAt || remoteUpdatedAt > localUpdatedAt) {
          // case 1: supabase row is newer → update
          const toInsert = normalizeForSQLite(table, remoteRow);
          await insertOrReplace(table, toInsert);
        }
      }

      // ✅ Step 5: handle local rows that don’t exist in Supabase
      for (const localId of localIds) {
        if (!remoteIds.has(localId)) {
          await runSql(`DELETE FROM ${table} WHERE id = ?`, [localId]);
        }
      }

      // ✅ Step 6: update lastPulledAt
      await AsyncStorage.setItem(key, nowISO());
    } catch (err) {
      console.warn('Pull error', err);
    }
  }
}



// Full sync: try push first then pull. We check connectivity, else skip.
async function syncWithSupabase(id) {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    console.log('No network - skipping sync.');
    return { ok: false, reason: 'offline' };
  }
  console.log('Starting sync...');
  try {
    await pushQueueToSupabase(id);
    await pullFromSupabase(id);
    console.log('Sync completed.');
    return { ok: true };
  } catch (err) {
    console.warn('Sync failed', err);
    return { ok: false, err };
  }
}

// ---------- PUBLIC API ----------

export async function init(id) {
  await createTablesIfNotExists();

  // Optionally run a sync if network available
  const state = await NetInfo.fetch();
  if (state.isConnected) {
    // Run sync but do not block init
    syncWithSupabase(id).catch((e) => console.warn('Initial sync failed', e));
  }
}

export const getDB = async () => {
  let db = await SQLite.openDatabase({ name: "app.db", location: "default" });

  if (!db) throw new Error("DB not initialized. Call initDB() first.");
  return db;
};

// CRUD wrappers for each table (you can call these from your components)
export const api = {
  // users
  createUser: async (user) => localInsert('users', { ...user }),
  updateUser: async (id, patch) => localUpdate('users', id, patch),
  deleteUser: async (id) => localDelete('users', id),
  getUser: async (id) => localGet('users', id),
  listUsers: async () => localList('users'),

  // draws
  createDraw: async (draw) => localInsert('draws', { ...draw }),
  updateDraw: async (id, patch) => localUpdate('draws', id, patch),
  deleteDraw: async (id) => localDelete('draws', id),
  getDraw: async (id) => localGet('draws', id),
  listDraws: async (params) => localQuery('draws', params),

  // bettings
  createBetting: async (b) => localInsert('bettings', { ...b }),
  updateBetting: async (id, patch) => localUpdate('bettings', id, patch),
  deleteBetting: async (id) => localDelete('bettings', id),
  getBetting: async (id) => localGet('bettings', id),
  listBettings: async (params) => localQuery('bettings', params),

  // master_combinations
  createMasterCombination: async (m) => localInsert('master_combinations', { ...m }),
  updateMasterCombination: async (id, patch) => localUpdate('master_combinations', id, patch),
  deleteMasterCombination: async (id) => localDelete('master_combinations', id),
  getMasterCombination: async (id) => localGet('master_combinations', id),
  listMasterCombinations: async () => localList('master_combinations'),

  // messages
  createMessage: async (m) => localInsert('messages', { ...m }),
  updateMessage: async (id, patch) => localUpdate('messages', id, patch),
  deleteMessage: async (id) => localDelete('messages', id),
  getMessage: async (id) => localGet('messages', id),
  listMessages: async () => localList('messages'),

  // cashflow
  createCashflow: async (c) => localInsert('cashflow', { ...c }),
  updateCashflow: async (id, patch) => localUpdate('cashflow', id, patch),
  deleteCashflow: async (id) => localDelete('cashflow', id),
  getCashflow: async (id) => localGet('cashflow', id),
  listCashflow: async () => localList('cashflow'),
};

export async function deleteDB(){
    SQLite.deleteDatabase({ name: DB_NAME, location: 'default' })
  .then(() => console.log('✅ Database deleted'))
  .catch(err => console.log('❌ Error deleting DB:', err));


}

// Force sync manually
export async function forceSync() {
  return await syncWithSupabase();
}

// Optionally: watch connectivity and auto-sync when network returns
let unsubscribeNetInfo = null;
export function startAutoSyncOnReconnect(id) {
  if (unsubscribeNetInfo) return;
  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      console.log('Device reconnected — running sync');
      syncWithSupabase(id).catch((e) => console.warn('Auto sync failed', e));
    }
  });
}
export function stopAutoSyncOnReconnect(id) {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}


function buildWhereClause(filters = {}) {
  const whereClauses = [];
  const values = [];

  for (const key in filters) {
    const filter = filters[key];

    // Plain value → default "="
    if (typeof filter !== "object" || !filter.op) {
      if (filter === null) {
        whereClauses.push(`${key} IS NULL`);
      } else {
        whereClauses.push(`${key} = ?`);
        values.push(filter);
      }
      continue;
    }

    switch (filter.op.toLowerCase()) {
      case "=":
      case "!=":
      case ">":
      case ">=":
      case "<":
      case "<=":
        whereClauses.push(`${key} ${filter.op} ?`);
        values.push(filter.value);
        break;

      case "between":
        // Ensure date format is YYYY-MM-DD (safe for SQLite)
        whereClauses.push(`${key} BETWEEN DATE(?) AND DATE(?)`);
        values.push(filter.from, filter.to);
        break;

      case "like":
        whereClauses.push(`${key} LIKE ?`);
        values.push(filter.value);
        break;

      case "in":
        if (Array.isArray(filter.value) && filter.value.length > 0) {
          const placeholders = filter.value.map(() => "?").join(", ");
          whereClauses.push(`${key} IN (${placeholders})`);
          values.push(...filter.value);
        } else {
          whereClauses.push("1=0"); // empty IN → no results
        }
        break;

      case "null":
        whereClauses.push(`${key} IS NULL`);
        break;

      case "notnull":
        whereClauses.push(`${key} IS NOT NULL`);
        break;

      default:
        throw new Error(`Unsupported operator: ${filter.op}`);
    }
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  return { whereSql, values };
}

async function getAllLocalIds(table) {
  const res = await runSql(`SELECT id FROM ${table}`);
  const ids = [];
  if (res && res.rows) {
    for (let i = 0; i < res.rows.length; i++) {
      ids.push(res.rows.item(i).id);
    }
  }
  return ids;
}


async function insertOrReplace(table, row) {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders});`;
  const values = cols.map((c) => row[c]);
  await runSql(sql, values);
}

