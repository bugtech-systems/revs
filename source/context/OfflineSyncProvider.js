import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import SQLite from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import supabase from '../utils/supabaseClient';
import { schema } from '../utils/schema';
import { generateObjectId } from '../utils/helpers';
import { pullFromSupabase } from '../utils/batchPull';
import moment from 'moment-timezone';

// Constants
const DB_NAME = 'leov3.db';
const LAST_PULLED_KEY = 'offline:lastPulledAt';
const BATCH_SIZE = 1000;

const TABLES = [
  'users', 'draws', 'bettings', 
  'master_combinations',
  // 'messages', 'cashflow'
];

// Create Context
const OfflineSyncContext = createContext();

// Custom Hook
export const useOfflineSync = () => {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
};

export const OfflineSyncProvider = ({ children, session }) => {
  const [db, setDb] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [syncError, setSyncError] = useState(null);

  // ---------- UTILITY FUNCTIONS ----------
  const toJsonText = useCallback((obj) => {
    try {
      return obj ? JSON.stringify(obj) : null;
    } catch {
      return null;
    }
  }, []);

  const parseJsonText = useCallback((str) => {
    if (str === null || str === undefined) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }, []);

  const nowISO = useCallback(() => {
    return moment().tz("Asia/Manila").format("YYYY-MM-DDTHH:mm:ss.SSSZ");
  }, []);

  const normalizeValue = useCallback((type, value, target = "supabase") => {
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
  }, []);

  const normalizeForSupabase = useCallback((table, row) => {
    const tableSchema = schema[table];
    if (!tableSchema) throw new Error(`Unknown table: ${table}`);

    const normalized = {};
    for (const col in tableSchema) {
      normalized[col] = normalizeValue(tableSchema[col], row[col], "supabase");
    }

    normalized.created_at = normalized.created_at || nowISO();
    normalized.updated_at = normalized.updated_at || nowISO();

    return normalized;
  }, [normalizeValue, nowISO]);

  const normalizeForSQLite = useCallback((table, remoteRow) => {
    const tableSchema = schema[table];
    if (!tableSchema) throw new Error(`Unknown table: ${table}`);

    const normalized = {};
    for (const col in tableSchema) {
      normalized[col] = normalizeValue(tableSchema[col], remoteRow[col], "sqlite");
    }

    normalized.created_at = normalized.created_at || nowISO();
    normalized.updated_at = normalized.updated_at || nowISO();

    return normalized;
  }, [normalizeValue, nowISO]);

  // ---------- DATABASE OPERATIONS ----------
  const runSql = useCallback((sql, params = []) => {
    if (!db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            sql,
            params,
            (_, res) => resolve(res),
            (_, err) => {
              console.error("SQL ERROR", sql, params, err);
              reject(err);
              return false;
            }
          );
        },
        (txErr) => {
          console.error("Transaction error", txErr);
          reject(txErr);
        }
      );
    });
  }, [db]);

  // ---------- SCHEMA MANAGEMENT ----------
  const createTablesIfNotExists = useCallback(async () => {
    const tables = [
      // users table
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
      );`,

      // draws table
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
      );`,

      // bettings table
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
      );`,

      // master_combinations table
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
      );`,

      // sync_queue table
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        op TEXT NOT NULL,
        table_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        payload TEXT,
        created_at TEXT NOT NULL
      );`
    ];

    for (const tableSql of tables) {
      await runSql(tableSql);
    }
  }, [runSql]);

  // ---------- SYNC QUEUE MANAGEMENT ----------
  const enqueueSync = useCallback(async (op, tableName, rowId, payload = null) => {
    const createdAt = nowISO();
    const payloadText = payload ? JSON.stringify(payload) : null;
    await runSql(
      `INSERT INTO sync_queue (op, table_name, row_id, payload, created_at) VALUES (?, ?, ?, ?, ?);`,
      [op, tableName, rowId, payloadText, createdAt]
    );
  }, [runSql, nowISO]);

  const fetchSyncQueue = useCallback(async () => {
    const res = await runSql(`SELECT * FROM sync_queue ORDER BY id ASC;`);
    const rows = [];
    for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
    return rows;
  }, [runSql]);

  const removeQueueItem = useCallback(async (id) => {
    await runSql(`DELETE FROM sync_queue WHERE id = ?;`, [id]);
  }, [runSql]);

  // ---------- CRUD OPERATIONS ----------
  const localInsert = useCallback(async (tableName, record) => {
    const id = record.id || generateObjectId();
    const createdAt = record.created_at || nowISO();
    const updatedAt = record.updated_at || createdAt;
    
    const processedRecord = {
      ...record,
      id,
      created_at: createdAt,
      updated_at: updatedAt,
    };

    // Handle JSON fields
    if (tableName === 'users') {
      processedRecord.configuration = toJsonText(processedRecord.configuration ?? []);
      processedRecord.uplines = toJsonText(processedRecord.uplines ?? []);
    } else if (tableName === 'bettings') {
      processedRecord.hits = toJsonText(processedRecord.hits ?? []);
      processedRecord.commissions = toJsonText(processedRecord.commissions ?? []);
      processedRecord.combinations = toJsonText(processedRecord.combinations ?? []);
      processedRecord.uplines = toJsonText(processedRecord.uplines ?? []);
      processedRecord.ticket_no = String(processedRecord.ticket_no ?? '');
    }

    const cols = Object.keys(processedRecord);
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders});`;
    const values = cols.map((c) => processedRecord[c]);

    await runSql(sql, values);
    await enqueueSync('insert', tableName, id, processedRecord);

    return { id, ...processedRecord };
  }, [runSql, enqueueSync, nowISO, toJsonText]);

  const localUpdate = useCallback(async (tableName, id, patch) => {
    const res = await runSql(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1;`, [id]);
    if (res.rows.length === 0) throw new Error('Not found');
    
    const existing = res.rows.item(0);
    const updated = { ...existing, ...patch, updated_at: nowISO() };

    // Handle JSON fields
    if (tableName === 'users') {
      updated.configuration = toJsonText(parseJsonText(updated.configuration) ?? updated.configuration ?? []);
      updated.uplines = toJsonText(parseJsonText(updated.uplines) ?? updated.uplines ?? []);
    } else if (tableName === 'bettings') {
      updated.hits = toJsonText(updated.hits ? parseJsonText(updated.hits) : null) || updated.hits;
      updated.commissions = toJsonText(updated.commissions ? parseJsonText(updated.commissions) : null) || updated.commissions;
      updated.combinations = toJsonText(updated.combinations ? parseJsonText(updated.combinations) : null) || updated.combinations;
      updated.uplines = toJsonText(updated.uplines ? parseJsonText(updated.uplines) : null) || updated.uplines;
    }

    const cols = Object.keys(updated).filter((c) => c !== 'id');
    const setClause = cols.map((c) => `${c} = ?`).join(', ');
    const values = cols.map((c) => updated[c]);
    values.push(id);
    
    const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?;`;
    await runSql(sql, values);
    await enqueueSync('update', tableName, id, updated);

    return updated;
  }, [runSql, enqueueSync, nowISO, toJsonText, parseJsonText]);

  const localDelete = useCallback(async (tableName, id) => {
    await runSql(`DELETE FROM ${tableName} WHERE id = ?;`, [id]);
    await enqueueSync('delete', tableName, id, null);
    return true;
  }, [runSql, enqueueSync]);

  const localGet = useCallback(async (tableName, id) => {
    const res = await runSql(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1;`, [id]);
    if (res.rows.length === 0) return null;
    
    const row = res.rows.item(0);

    // Parse JSON fields
    if (tableName === 'users') {
      row.configuration = parseJsonText(row.configuration);
      row.uplines = parseJsonText(row.uplines);
    } else if (tableName === 'bettings') {
      row.hits = parseJsonText(row.hits);
      row.commissions = parseJsonText(row.commissions);
      row.combinations = parseJsonText(row.combinations);
      row.uplines = parseJsonText(row.uplines);
    }

    return row;
  }, [runSql, parseJsonText]);

  const buildWhereClause = useCallback((filters = {}) => {
    const whereClauses = [];
    const values = [];

    for (const key in filters) {
      const filter = filters[key];

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
            whereClauses.push("1=0");
          }
          break;
        case "null":
          whereClauses.push(`${key} IS NULL`);
          break;
        case "notnull":
          whereClauses.push(`${key} IS NOT NULL`);
          break;
        case "contains":
          whereClauses.push(`${key} LIKE ?`);
          values.push(`%${filter.value}%`);
          break;
        default:
          throw new Error(`Unsupported operator: ${filter.op}`);
      }
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    return { whereSql, values };
  }, []);

  const localQuery = useCallback(async (tableName, query = {}) => {
    const { filters = {}, limit, offset, orderBy } = query;
    const { whereSql, values } = buildWhereClause(filters);
    
    const orderSql = orderBy ? `ORDER BY ${orderBy}` : "ORDER BY created_at DESC";
    const limitSql = limit ? `LIMIT ${limit}` : "";
    const offsetSql = offset ? `OFFSET ${offset}` : "";

    const sql = `SELECT * FROM ${tableName} ${whereSql} ${orderSql} ${limitSql} ${offsetSql};`;
    const res = await runSql(sql, values);

    const rows = [];
    for (let i = 0; i < res.rows.length; i++) {
      let row = res.rows.item(i);

      // Parse JSON fields
      if (tableName === "users") {
        row.configuration = parseJsonText(row.configuration);
        row.uplines = parseJsonText(row.uplines);
      } else if (tableName === "bettings") {
        row.hits = parseJsonText(row.hits);
        row.commissions = parseJsonText(row.commissions);
        row.combinations = parseJsonText(row.combinations);
        row.uplines = parseJsonText(row.uplines);
      }

      rows.push(row);
    }
    return rows;
  }, [runSql, buildWhereClause, parseJsonText]);

  const localList = useCallback(async (tableName, whereClause = "", params = []) => {
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
      }

      rows.push(r);
    }
    return rows;
  }, [runSql, parseJsonText]);

  // ---------- SYNC OPERATIONS ----------
  const pushQueueToSupabase = useCallback(async () => {
    const queue = await fetchSyncQueue();
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const q of queue) {
      try {
        const { id: queueId, op, table_name: tableName, row_id: rowId, payload } = q;
        let payloadObj = payload ? JSON.parse(payload) : null;

        if (op === 'insert') {
          const insertPayload = normalizeForSupabase(tableName, payloadObj);
          const { error } = await supabase.from(tableName).upsert(insertPayload, { onConflict: 'id' });
          if (error) throw error;
          await removeQueueItem(queueId);
          results.successful++;
        } else if (op === 'update') {
          const updatePayload = normalizeForSupabase(tableName, payloadObj);
          const { error } = await supabase.from(tableName).update(updatePayload).eq('id', rowId);
          if (error) throw error;
          await removeQueueItem(queueId);
          results.successful++;
        } else if (op === 'delete') {
          const { error } = await supabase.from(tableName).delete().eq('id', rowId);
          if (error) {
            console.warn('Delete error:', error);
            // Still remove from queue to prevent infinite retry
            await removeQueueItem(queueId);
          } else {
            results.successful++;
          }
        }
      } catch (err) {
        console.warn('Failed to push queue item, will retry later', err);
        results.failed++;
        results.errors.push(err);
      }
    }

    return results;
  }, [fetchSyncQueue, removeQueueItem, normalizeForSupabase]);

  const syncWithSupabase = useCallback(async () => {
    if (!isOnline) {
      const error = { ok: false, reason: 'offline' };
      setSyncError(error);
      return error;
    }

    if (isSyncing) {
      const error = { ok: false, reason: 'sync_in_progress' };
      setSyncError(error);
      return error;
    }

    setIsSyncing(true);
    setSyncError(null);
    console.log('Starting sync...');

    try {
      const pushResults = await pushQueueToSupabase();
      await pullFromSupabase();
      
      const syncTime = nowISO();
      setLastSync(syncTime);
      
      console.log('Sync completed successfully', { pushResults });
      return { 
        ok: true, 
        timestamp: syncTime,
        pushResults 
      };
    } catch (err) {
      console.warn('Sync failed', err);
      const error = { ok: false, error: err };
      setSyncError(error);
      return error;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, pushQueueToSupabase, nowISO]);

  const forceSync = useCallback(async () => {
    return await syncWithSupabase();
  }, [syncWithSupabase]);

  // ---------- SPECIALIZED QUERIES ----------
  const fetchUser = useCallback(async (email) => {
    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (error) throw error;

        let populatedUplines = [];
        if (data.uplines?.length) {
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
      }
    }

    // Local fallback
    return new Promise(resolve => {
      if (!db) {
        resolve(null);
        return;
      }

      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM users WHERE email = ?`,
          [email],
          async (_, { rows }) => {
            if (!rows.length) return resolve(null);

            const user = rows._array[0];
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
  }, [isOnline, db]);
  
  const saveLocalUser = useCallback(async (user) => {
    if (isOnline) {
      try {
            await api.createUser(user)
      } catch (err) {
        console.log('Supabase fetchUser error, falling back to local', err);
      }
    }

    
  }, [isOnline, db]);
  
  
  const fetchWithFallback = useCallback(async (table, query = {}) => {
    if (isOnline) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;

        // Update local database with remote data
        for (const row of data) {
          if (row.is_deleted) {
            await runSql(`DELETE FROM ${table} WHERE id = ?`, [row.id]);
          } else {
            const normalized = normalizeForSQLite(table, row);
            await localInsert(table, normalized);
          }
        }

        return await localQuery(table, query);
      } catch (err) {
        console.warn(`Fetch from Supabase failed for ${table}`, err);
        return await localQuery(table, query);
      }
    } else {
      return await localQuery(table, query);
    }
  }, [isOnline, runSql, localInsert, localQuery, normalizeForSQLite]);

  const fetchBettings = useCallback(async ({ includeAll, date, userNow, user }) => {
    const startOfDay = moment(date).tz("Asia/Manila").startOf("day").toISOString();
    const endOfDay = moment(date).tz("Asia/Manila").endOf("day").toISOString();

    let adjustedStart = startOfDay;
    let adjustedEnd = endOfDay;

    if (!includeAll && new Date(date) <= new Date(user?.lastSummary)) {
      adjustedStart = moment().tz("Asia/Manila").add(1, "d").startOf("day").toISOString();
      adjustedEnd = moment().tz("Asia/Manila").add(1, "d").endOf("day").toISOString();
    }

    const filters = {
      is_deleted: false,
      input_type: "normal",
      timestamp: { op: "between", from: adjustedStart, to: adjustedEnd }
    };

    if (includeAll) {
      filters.uplines = { op: "contains", value: userNow };
    } else {
      filters.owner_id = userNow;
    }

    const items = await localQuery('bettings', {
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
  }, [localQuery]);

  // ---------- DATABASE MANAGEMENT ----------
  const initDatabase = useCallback(async () => {
    try {
      const database = await new Promise((resolve, reject) => {
        const dbInstance = SQLite.openDatabase(
          { name: DB_NAME, location: "default" },
          () => resolve(dbInstance),
          (err) => reject(err)
        );
      });

      setDb(database);
      await createTablesIfNotExists();
      setIsInitialized(true);
      
      console.log("Offline database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize offline database", error);
      setSyncError({ ok: false, error: 'init_failed', details: error });
    }
  }, [createTablesIfNotExists]);

  const deleteDatabase = useCallback(async () => {
    try {
      if (db) {
        db.close();
        setDb(null);
      }
      
      await SQLite.deleteDatabase({ name: DB_NAME, location: 'default' });
      setIsInitialized(false);
      console.log('✅ Database deleted');
      return { ok: true };
    } catch (err) {
      console.error('❌ Error deleting DB:', err);
      return { ok: false, error: err };
    }
  }, [db]);

  const clearAllStorage = useCallback(async () => {
    try {
      // Clear AsyncStorage keys
      for (const table of TABLES) {
        const key = `${LAST_PULLED_KEY}:${table}`;
        await AsyncStorage.removeItem(key);
      }
      console.log("✅ AsyncStorage cleared");
      return { ok: true };
    } catch (e) {
      console.error("❌ Failed to clear AsyncStorage", e);
      return { ok: false, error: e };
    }
  }, []);

  // ---------- API METHODS ----------
  const api = {
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
  };

  // ---------- EFFECTS ----------
  useEffect(() => {
    initDatabase();
  }, [initDatabase]);

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      
      // Auto-sync when coming online
      if (state.isConnected && isInitialized && session?.user?.email) {
        console.log('Device reconnected — running auto-sync');
        syncWithSupabase().catch((e) => console.warn('Auto sync failed', e));
      }
    });

    return () => {
      unsubscribeNetInfo();
      if (db) {
        db.close();
      }
    };
  }, [isInitialized, session, syncWithSupabase, db]);

  // ---------- CONTEXT VALUE ----------
  const value = {
    // State
    isInitialized,
    isSyncing,
    isOnline,
    lastSync,
    syncError,
    
    // Core Methods
    syncWithSupabase,
    forceSync,
    fetchWithFallback,
    fetchUser,
    fetchBettings,
    saveLocalUser,
    
    // Database Operations
    runSql,
    localInsert,
    localUpdate,
    localDelete,
    localGet,
    localQuery,
    localList,
    
    // Database Management
    deleteDatabase,
    clearAllStorage,
    
    // API
    api,
  };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
};