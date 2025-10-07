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
import supabase from './supabaseClient';
import { schema } from './schema';
import { generateObjectId } from './helpers';
import { forceFullResync } from './batchPull';

import moment from 'moment-timezone';

// Enable debug (optional for development)
SQLite.DEBUG(false);
SQLite.enablePromise(false); // optional, to use promises

export const BATCH_SIZE = 1000; // Supabase limit

export const DB_NAME = 'leov3.db';

export const LAST_PULLED_KEY = 'offline:lastPulledAt';

// Table list (as used in Supabase). Must match Supabase table names.
export const TABLES = [
'users', 
'bettings', 
'master_combinations',
'draws'
// 'messages', 'cashflow'
];

// ---------- UTIL ----------
let db = SQLite.openDatabase(
      { name: DB_NAME, location: "default" },
      async () => {  console.log("SQLite opened", DB_NAME);},
      (err) => console.error("SQLite open error", err)
    );

// ---------- INIT ----------
export async function init(userId) {
  // Ensure single DB open
  if (!db) {
    db = SQLite.openDatabase(
      { name: DB_NAME, location: "default" },
      async () => {  console.log("SQLite opened", DB_NAME);},
      (err) => console.error("SQLite open error", err)
    );
  }

  // create tables if not exists
  await createTablesIfNotExists();
  // Optionally fire an initial sync in background (not blocking)
  NetInfo.fetch().then((s) => {
    if (s.isConnected && userId) {
      // kick off sync in background
      syncWithSupabase(userId).catch((e) => console.warn("Initial sync error", e));
    }
  });
}

// ---------- UTIL ----------
function ensureDB() {
  if (!db) {
    db = SQLite.openDatabase(
      { name: DB_NAME, location: "default" },
      async () => {  console.log("SQLite opened", DB_NAME);},
      (err) => console.error("SQLite open error", err)
    );
  }
  return db;
}




/**
 * runSql: wrapper to execute SQL and return a Promise with the result
 * ensures db is opened and handles errors consistently.
 */
export function runSql (sql, params = [])  {
    let database = ensureDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx) => {
        tx.executeSql(
          sql,
          params,
          (_, res) => resolve(res),
          (_, err) => {
            console.error("SQL ERROR", sql, params, err);
            // returning false here would rollback the transaction; we reject to bubble up
            reject(err);
            return false;
          }
        );
      },
      (txErr) => {
        // transaction error
        console.error("Transaction error", txErr);
        reject(txErr);
      }
    );
  });
};



// // convert JS object to JSON string for JSONB columns
// const toJsonText = (v) => (v === undefined || v === null ? null : JSON.stringify(v));
// const parseJsonText = (v) => {
//   try {
//     return v === null || v === undefined ? null : JSON.parse(v);
//   } catch {
//     return null;
//   }
// };

export const fetchUser = async (email) => {
  // let db = await getDB();


  try {
    // Fetch main user from Supabase
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;

    let populatedUplines = [];

    if (data.uplines?.length) {
      // Fetch all uplines as user objects
      const { data: uplineData, error: uplineError } = await supabase
        .from('users')
        .select('*')
        .in('id', data.uplines);

      if (uplineError) throw uplineError;

      populatedUplines = uplineData || [];
    }

    const userWithUplines = { ...data, uplines: populatedUplines };



    return userWithUplines;
  } catch (err) {
    console.log('Supabase fetchUser error, falling back to local', err);

    // Fallback to SQLite
    return new Promise(resolve => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM users WHERE email = ?`,
          [email],
          async (_, { rows }) => {
            if (!rows.length) return resolve(null);

            const user = rows._array[0];

            // Parse uplines from JSON and fetch each locally
            if (user.uplines) {
              const uplineIds = JSON.parse(user.uplines);
              if (uplineIds.length) {
                const placeholders = uplineIds.map(() => '?').join(',');
                tx.executeSql(
                  `SELECT * FROM users WHERE id IN (${placeholders})`,
                  uplineIds,
                  (_, { rows: uplineRows }) => {
                    user.uplines = uplineRows._array;
                    resolve(user);
                  }
                );
              } else {
                user.uplines = [];
                resolve(user);
              }
            } else {
              user.uplines = [];
              resolve(user);
            }
          }
        );
      });
    });
  }
};

export const saveLocalUser = async (user) => {
            await api.createUser(user)
}

// // get timestamp string in ISO format
// const nowISO = () => moment().tz("Asia/Manila").toISOString();

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
  await runSql(
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      created_by TEXT,
      recepient TEXT,
      recepient_name TEXT,
      conversations TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`
  );

//   // cashflow
  await runSql(
    `CREATE TABLE IF NOT EXISTS cashflow (
      id TEXT PRIMARY KEY,
      amount TEXT DEFAULT '0',
      description TEXT NOT NULL,
      input_type TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      owner TEXT NOT NULL,
      owner_name TEXT,
      user TEXT NOT NULL,
      updated_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`
  );

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
  return rows;
}

async function removeQueueItem(id) {
  await runSql(`DELETE FROM sync_queue WHERE id = ?;`, [id]);
}

// ✅ Converts JSON fields before storing into SQLite (TEXT)
export function toJsonText(obj) {
  try {
    return obj ? JSON.stringify(obj) : null;
  } catch {
    return null;
  }
}

// ✅ Parse back JSON fields from SQLite string
export function parseJsonText(str) {
  if (str === null || str === undefined) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

// ✅ Timestamps: always ISO 8601
export function nowISO() {
  return moment().tz("Asia/Manila").format("YYYY-MM-DDTHH:mm:ss.SSSZ");
}

// ✅ Normalize row from SQLite -> JS object for Supabase

// ✅ normalize single value
export function normalizeValue(type, value, target = "supabase") {
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
  normalized.created_at = normalized.created_at || moment().tz("Asia/Manila").toISOString();
  normalized.updated_at = normalized.updated_at || moment().tz("Asia/Manila").toISOString();

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
  normalized.created_at = normalized.created_at || moment().tz("Asia/Manila").toISOString();
  normalized.updated_at = normalized.updated_at || moment().tz("Asia/Manila").toISOString();

  return normalized;
}



// ---------- CRUD Helpers (local-first) ----------
// Generic insert: expects record object with fields matching local column names
async function localInsert(tableName, record) {
  // Generate id + timestamps if missing
  const id = record.id || generateObjectId();
  const createdAt = record.created_at || nowISO();
  const updatedAt = nowISO();

  record = { ...record, id, created_at: createdAt, updated_at: updatedAt };

  // Normalize for SQLite based on schema
  const normalized = normalizeForSQLite(tableName, record);

  // Build dynamic insert
  const cols = Object.keys(normalized);
  const placeholders = cols.map(() => '?').join(', ');
  const values = cols.map((c) => normalized[c]);

  const sql = `INSERT OR REPLACE INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders});`;

  await runSql(sql, values);

  // enqueue for sync (use normalized row so Supabase gets valid JSON)
  await enqueueSync('insert', tableName, id, normalized);

  // Return freshly inserted row
  // const updated = await localGet(tableName, id);
  await pushQueueToSupabase();

  return record;
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
  
  
  await pushQueueToSupabase();
  
  return updated;
}

async function localDelete(tableName, id) {
  // For soft delete preference depends on table; we queue a delete operation and also remove local row
  await runSql(`DELETE FROM ${tableName} WHERE id = ?;`, [id]);
  await enqueueSync('delete', tableName, id, null);
  await pushQueueToSupabase();
  
  return true;
}

export async function localGet(tableName, id) {
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

async function localList(tableName, whereClause = "", params = []) {
  // Always order by created_at DESC
  const sql = `SELECT * FROM ${tableName} ${whereClause} ORDER BY created_at DESC;`;
  const res = await runSql(sql, params);
  const rows = [];

  for (let i = 0; i < res.rows.length; i++) {
    const r = res.rows.item(i);

    if (tableName === "users") {
      r.configuration = parseJsonText(r.configuration);
      r.uplines = parseJsonText(r.uplines);
    } else if (tableName === "bettings") {
      r.hits = parseJsonText(r.hits);
      r.commissions = parseJsonText(r.commissions);
      r.combinations = parseJsonText(r.combinations);
      r.uplines = parseJsonText(r.uplines);
    } else if (tableName === "messages") {
      r.conversations = parseJsonText(r.conversations);
    }

    rows.push(r);
  }
  return rows;
}

async function localQuery(tableName, query = {}) {
  const { filters = {}, limit, offset, orderBy } = query;

  // WHERE (dynamic)
  const { whereSql, values } = buildWhereClause(filters);

  // ORDER BY (default created_at DESC if not provided)
  const orderSql = orderBy
    ? `ORDER BY ${orderBy}`
    : "ORDER BY created_at DESC";

  // LIMIT / OFFSET
  const limitSql = limit ? `LIMIT ${limit}` : "";
  const offsetSql = offset ? `OFFSET ${offset}` : "";

  const sql = `SELECT * FROM ${tableName} ${whereSql} ${orderSql} ${limitSql} ${offsetSql};`;
  const res = await runSql(sql, values);

  const rows = [];
  for (let i = 0; i < res.rows.length; i++) {
    let row = res.rows.item(i);
console.log(row?.hits, 'HITSSS')
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
        
        
          console.log(insertPayload, 'INSERTING PAYLOAD TO SUPABASE')
        // Remove local-only fields if necessary
        const { data, error } = await supabase.from(tableName).upsert(insertPayload, { onConflict: 'id' }).select().limit(1);
        if (error) throw error;
        // Remove queue entry
        await removeQueueItem(queueId);
      } else if (op === 'update') {
                const updatePayload = normalizeForSupabase(tableName, payloadObj);
          console.log(updatePayload, 'UPDATING PAYLOAD TO SUPABASE')

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
// ---------- PULL FROM SUPABASE (always source of truth) ----------
async function pullFromSupabase(userId) {


  for (const table of TABLES) {
    try {
      const key = `${LAST_PULLED_KEY}:${table}`;
      const lastPulledAt = (await AsyncStorage.getItem(key)) || null;

      // ✅ Step 1: get all local IDs
      const localIds = await getAllLocalIds(table);

      // ✅ Step 2: fetch remote rows (always Supabase-first)
      let query = supabase.from(table).select("*").order("updated_at", { ascending: false });
      
      if (lastPulledAt) {
        query = query.gte('updated_at', lastPulledAt);
      } else {
      query = query.limit(500);
      }

      const { data: remoteData, error } = await query;
      if (error) {
        console.warn(`Pull error for ${table}`, error);
        continue;
      }
      console.log(remoteData[0], 'remote data', table)
      // ✅ Step 3: build a map of Supabase IDs
      const remoteIds = new Set(remoteData.map(r => r.id));

      // ✅ Step 4: sync Supabase rows into local
      for (const remoteRow of remoteData) {
           remoteIds.add(remoteRow.id);

    // Handle deleted records
    if (remoteRow.is_deleted) {
      await runSql(`DELETE FROM ${table} WHERE id = ?`, [remoteRow.id]);
      continue;
    }

    // Check if record exists locally and compare timestamps
    const local = await localGet(table, remoteRow.id);
    const remoteUpdatedAt = remoteRow.updated_at || nowISO();
    const localUpdatedAt = local ? local.updated_at || null : null;

    if (!local) {
      // New record - insert
      const toInsert = normalizeForSQLite(table, remoteRow);
      await insertOrReplace(table, toInsert);
    } else if (!localUpdatedAt || remoteUpdatedAt > localUpdatedAt) {
      // Updated record - replace
      const toInsert = normalizeForSQLite(table, remoteRow);
      await insertOrReplace(table, toInsert);
    }
    // Else: local is newer or same, keep local version
  }
  
  
  
      let locals = localIds.slice(0, 500);

      // ✅ Step 5: verify "orphaned" local rows before deletion
      // for (const localId of locals) {
      //   if (!remoteIds.has(localId)) {
      //     // double check Supabase directly by ID
      //     const { data: checkRow, error: checkError } = await supabase
      //       .from(table)
      //       .select("id, is_deleted")
      //       .eq("id", localId)
      //       .single();

      //     console.log(checkRow, 'CHECKKING PULL DATA', table)


      //     if (!checkRow || checkRow?.is_deleted) {
      //       console.log(`Removing orphaned row from ${table}: ${localId}`);
      //       await runSql(`DELETE FROM ${table} WHERE id = ?`, [localId]);
      //     }
      //   }
      // }

      // ✅ Step 6: update lastPulledAt
      
            await AsyncStorage.setItem(key, nowISO()); 
    } catch (err) {
      console.warn('Pull error', err);
    }
  }
}

// ---------- FETCH HELPER (Supabase first, fallback local) ----------
export async function fetchWithFallback(table, query = {}) {
  const state = await NetInfo.fetch();
  if (state.isConnected) {
    try {
      // fetch remote
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;

      // replace local with remote snapshot
      for (const row of data) {
        if (row.is_deleted) {
          await runSql(`DELETE FROM ${table} WHERE id = ?`, [row.id]);
        } else {
          const normalized = normalizeForSQLite(table, row);
          await insertOrReplace(table, normalized);
        }
      }

      // return supabase data
      return await localQuery(table, query);;
    } catch (err) {
      console.warn(`Fetch from Supabase failed for ${table}`, err);
      return await localQuery(table, query); // fallback to local
    }
  } else {
    // offline → use local only
    return await localQuery(table, query);
  }
};

// Full sync: try push first then pull. We check connectivity, else skip.
async function syncWithSupabase(id) {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    console.log('No network - skipping sync.');
    return { ok: false, reason: 'offline' };
  }
  console.log('Starting sync...');
  try {
    await pushQueueToSupabase(id)
      await pullFromSupabase();
    
    // await force
    
    console.log('Sync completed.');
    return { ok: true };
  } catch (err) {
    console.warn('Sync failed', err);
    return { ok: false, err };
  }
};


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
  listUsers: async (params) => localQuery('users', params),

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
  listMasterCombinations: async (params) => localQuery('master_combinations', params),

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


};

// Force sync manually
export async function forceSync() {
  return await syncWithSupabase();
};

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
};

export function stopAutoSyncOnReconnect(id) {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
};

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
         whereClauses.push(`${key} BETWEEN ? AND ?`);
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
        case "contains":
          // For arrays stored as JSON string, e.g. '["apple","banana"]'
          // Use LIKE with wildcards to match inside
          whereClauses.push(`${key} LIKE ?`);
          values.push(`%${filter.value}%`);
          break;
      default:
        throw new Error(`Unsupported operator: ${filter.op}`);
    }
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  return { whereSql, values };
};

export async function getAllLocalIds(table) {
  const res = await runSql(`SELECT id FROM ${table} ORDER BY updated_at ASC;`);
  const ids = [];
  if (res && res.rows) {
    for (let i = 0; i < res.rows.length; i++) {
      ids.push(res.rows.item(i).id);
    }
  }
  return ids;
}

export async function insertOrReplace(table, row) {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders});`;
  const values = cols.map((c) => row[c]);
  await runSql(sql, values);
};

export async function clearAllStorage() {
  try {
  
     const key = `${LAST_PULLED_KEY}:bettings`;

  
    await AsyncStorage.removeItem(key);
    console.log("✅ AsyncStorage cleared");
  } catch (e) {
    console.error("❌ Failed to clear AsyncStorage", e);
  }
};

export async function fetchBettings({ includeAll, date, userNow, user }) {
  // Convert to Philippine timezone (always consistent with app)
  const startOfDay = moment(date).tz("Asia/Manila").startOf("day").toISOString();
  const endOfDay = moment(date).tz("Asia/Manila").endOf("day").toISOString();

  // Realm-like adjustment logic
  let adjustedStart = startOfDay;
  let adjustedEnd = endOfDay;

  if (!includeAll && new Date(date) <= new Date(user?.lastSummary)) {
    adjustedStart = moment().tz("Asia/Manila").add(1, "d").startOf("day").toISOString();
    adjustedEnd = moment().tz("Asia/Manila").add(1, "d").endOf("day").toISOString();
  }

  // Filters
  const filters = {
    is_deleted: false,
    input_type: "normal",
    timestamp: { op: "between", from:  adjustedStart, to: adjustedEnd }
  };

  if (includeAll) {
    // Match any uplines containing userNow
    filters.uplines = { op: "contains", value: userNow };
  } else {
    filters.owner_id = userNow;
  }

  // Execute query via API
  const items = await api.listBettings({
    filters,
    orderBy: "timestamp ASC",
  });

  console.log("Fetched bettings", {
    count: items?.length ?? 0,
    date,
    includeAll,
    start: adjustedStart,
    end: adjustedEnd,
  });

  return items;
};

export async function fetchWinningBettings({ date, user, includeAll = false }) {
  const table = "bettings";
  const userNow = user?.id ? String(user.id) : "";
  const state = await NetInfo.fetch();

  // Define start and end of day range
  let startOfDay = moment(date).startOf("day").toISOString();
  let endOfDay = moment(date).endOf("day").toISOString();

  // Realm-like adjustment logic
  if (!includeAll && new Date(date) <= new Date(user?.last_summary)) {
    startOfDay = moment().add(1, "d").endOf("day").toISOString();
    endOfDay = moment().add(1, "d").endOf("day").toISOString();
  }

  // =============================
  // ONLINE (Supabase)
  // =============================
  if (state.isConnected) {
    try {
      let query = supabase
        .from(table)
        .select("*")
        .eq("is_deleted", false)
        .eq("input_type", "normal")
        .gt("winning", 0)
        .gte("timestamp", startOfDay)
        .lt("timestamp", endOfDay)
        .order("timestamp", { ascending: false });

      // Apply user filter
      if (includeAll) {
        // filter bettings where uplines contain userNow
        query = query.contains("uplines", [userNow]);
      } else {
        query = query.eq("owner_id", userNow);
      }

      const { data, error } = await query;
      if (error) throw error;

      // ✅ Sync fetched data to local SQLite
      for (const row of data) {
        const normalized = normalizeForSQLite(table, row);
        await insertOrReplace(table, normalized);
      }

      return data;
    } catch (err) {
      console.warn("⚠️ Supabase fetchWinningBettings failed, using local fallback:", err);
    }
  }

  // =============================
  // OFFLINE (SQLite)
  // =============================
  const params = [startOfDay, endOfDay];
  let whereClause = `
    WHERE is_deleted = 0 
    AND input_type = 'normal'
    AND winning > 0
    AND timestamp >= ? 
    AND timestamp < ?
  `;

  if (includeAll && userNow) {
    whereClause += ` AND uplines LIKE '%' || ? || '%'`;
    params.push(userNow);
  } else if (userNow) {
    whereClause += ` AND owner_id = ?`;
    params.push(userNow);
  }

  const query = `SELECT * FROM ${table} ${whereClause} ORDER BY timestamp DESC;`;

  const localRes = await runSql(query, params);
  const rows = [];
  for (let i = 0; i < localRes.rows.length; i++) {
    rows.push(localRes.rows.item(i));
  }

  return rows;
}


/**
 * 1️⃣ Get current user
 * Realm: users.filtered('email == $0')
 */
export async function getCurrentUser({ user, collector }) {
  const userNow = user?.email ? user.email : collector ? collector : "";

  return localQuery('users', {
    filters: {
      email: { op: '=', value: userNow },
    },
  });
}

/**
 * 2️⃣ Get deleted users (excluding authenticated user)
 * Realm: users.filtered('isDeleted == true && email != $0')
 */
export async function getDeletedUsers({ authenticatedUser }) {
  return localQuery('users', {
    filters: {
      is_deleted: { op: '=', value: true },
      email: { op: '!=', value: authenticatedUser },
    },
  });
}

/**
 * 3️⃣ Get coordinators (excluding authenticated user)
 * Realm: users.filtered('role == "coordinator" && isDeleted == false && email != $0')
 */
export async function getCoordinators({ authenticatedUser }) {
  return localQuery('users', {
    filters: {
      role: { op: '=', value: 'coordinator' },
      is_deleted: { op: '=', value: false },
      email: { op: '!=', value: authenticatedUser },
    },
  });
}

/**
 * 4️⃣ Get tellers (excluding authenticated user)
 * Realm: users.filtered('role == "teller" && isDeleted == false && email != $0')
 */
export async function getTellers({ authenticatedUser }) {
  return localQuery('users', {
    filters: {
      role: { op: '=', value: 'teller' },
      is_deleted: { op: '=', value: false },
      email: { op: '!=', value: authenticatedUser },
    },
  });
}

export async function getBettingByTicketNo(ticketNo) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM bettings WHERE ticket_no = ? LIMIT 1;`,
        [ticketNo],
        (txObj, resultSet) => {
          const rows = [];
          for (let i = 0; i < resultSet.rows.length; i++) {
            rows.push(resultSet.rows.item(i));
          }
          resolve(rows);
        },
        (txObj, error) => {
          console.error('Error fetching betting by ticket_no:', error);
          reject(error);
        }
      );
    });
  });
}