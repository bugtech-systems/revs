
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import supabase from './supabaseClient';
// import { schema } from './schema';
import { schema } from "../services/schema";
import { generateObjectId } from './helpers';
import DatabaseService from '../services/DatabaseService';
import moment, { tz } from 'moment-timezone';
import SyncManager from '../services/SyncManager';
import SupabaseService from '../services/SupabaseService';

// Enable debug (optional for development)
// SQLite.DEBUG(false);
// SQLite.enablePromise(false); // optional, to use promises

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


// Cache for frequently accessed data
const queryCache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 5 minutes

// ---------- INIT ----------
export async function init(userId) {
  // Ensure single DB open
  // if (!db) {
  //   db = SQLite.openDatabase(
  //     { name: DB_NAME, location: "default" },
  //     async () => {  console.log("SQLite opened", DB_NAME);},
  //     (err) => console.error("SQLite open error", err)
  //   );
  // }

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


// ---------- CACHE MANAGEMENT ----------
function getCacheKey(tableName, operation, params = {}) {
  return `${tableName}:${operation}:${JSON.stringify(params)}`;
}

function setCache(key, data) {
  queryCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function getCache(key) {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  queryCache.delete(key);
  return null;
}

export function clearCacheForTable(tableName) {
  for (const key of queryCache.keys()) {
    if (key.startsWith(`${tableName}:`)) {
      queryCache.delete(key);
    }
  }
}


export const fetchUser = async (email) => {
  try {

  const cacheKey = getCacheKey('users', 'get', { email });
  const cached = getCache(cacheKey);
  if (cached) return cached;

  
  
  let user = null;
  
  user = await fetchUserFromLocal(email);
  
    
if(user){
  return user;
}




// Try Supabase first when online
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      // .single();
    if (error) throw error;

    user = data[0];



    let populatedUplines = [];

    if (user?.uplines?.length) {
      // Fetch all uplines as user objects
      const { data: uplineData, error: uplineError } = await supabase
        .from('users')
        .select('*')
        .in('id', user?.uplines);

      if (uplineError) throw uplineError;
      populatedUplines = uplineData || [];
    }

    const userWithUplines = { ...user, uplines: populatedUplines };




    // Save to local SQLite for offline access
    // await saveUserToLocal(userWithUplines);
  
    //   if (SupabaseService.isConnected()) {
    //   await syncRemoteDataInBackground('users', 'query', {filters: {email: email}});
    // }
  
    
    setCache(cacheKey, userWithUplines);
    return userWithUplines;
  } catch (err) {
    console.log('Supabase fetchUser error, falling back to local', err);
    
    // Fallback to SQLite using DatabaseService
    return await fetchUserFromLocal(email);
  }
};


export const saveUserToLocal = async (user) => {
  try {
    // Normalize user data for SQLite storage
    const normalizedUser = normalizeForSQLite('users', user);
    
    // Prepare data for insertion/update
    const columns = Object.keys(normalizedUser);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => normalizedUser[col]);

    // Use INSERT OR REPLACE to handle both new and existing users
    await DatabaseService.executeQuery(
      `INSERT OR REPLACE INTO users (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    console.log('✅ User saved to local database:', user.id);
    
    // Also save upline users if they exist
    if (user.uplines?.length) {
      await saveUsersToLocal(user.uplines);
    }
    
    return user;
  } catch (error) {
    console.error('Error saving user to local database:', error);
    throw error;
  }
};

export const saveLocalUser = async (user) => {
            await saveUserToLocal(user)
}

export const fetchUserFromLocal = async (email) => {
  try {
    // Fetch main user using DatabaseService
    const result = await DatabaseService.executeQuery(
      `SELECT * FROM users WHERE email = ? LIMIT 1`,
      [email]
    );


    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    
    // Parse JSON fields
    user.configuration = parseJsonText(user.configuration);
    user.uplines = parseJsonText(user.uplines);

    // Populate uplines if they exist
    if (user.uplines?.length) {
      const uplineUsers = await fetchUsersByIds(user.uplines);
      user.uplines = uplineUsers;
    } else {
      user.uplines = [];
    }

    return user;
  } catch (error) {
    console.error('Error fetching user from local database:', error);
    throw error;
  }
};

export const fetchUsersByIds = async (userIds) => {
  if (!userIds || userIds.length === 0) {
    return [];
  }

  try {
    const placeholders = userIds.map(() => '?').join(',');
    const result = await DatabaseService.executeQuery(
      `SELECT * FROM users WHERE id IN (${placeholders})`,
      userIds
    );

    if (!result.rows) {
      return [];
    }

    // Parse JSON fields for each user
    return result.rows.map(user => ({
      ...user,
      configuration: parseJsonText(user.configuration),
      uplines: parseJsonText(user.uplines)
    }));
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    return [];
  }
};

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
   return new Date().toISOString();
}

// ✅ Normalize row from SQLite -> JS object for Supabase

// // ✅ normalize single value
// export function normalizeValue(type, value, target = "supabase") {
//   if (value === null || value === undefined) return null;

//   switch (type) {
//     case "boolean":
//       return target === "sqlite" ? (value ? 1 : 0) : Boolean(value);

//     case "json":
//       return target === "sqlite"
//         ? JSON.stringify(value ?? [])
//         : typeof value === "string"
//           ? JSON.parse(value)
//           : value;

//     case "integer":
//       return Number(value);

//     case "timestamp":
//       return new Date(value).toISOString();

//     case "uuid":
//     case "text":
//     default:
//       return String(value);
//   }
// }

export function normalizeForSupabase(table, row) {
  const tableSchema = schema[table];
  if (!tableSchema) throw new Error(`Unknown table: ${table}`);

  const normalized = {};
  for (const col in tableSchema) {
      if(row[col] != undefined){
        normalized[col] = normalizeValue(tableSchema[col], row[col], "supabase");
       }
  }

  // timestamps fallback
  return normalized;
}

// // ✅ Normalize row for SQLite (from Supabase)
// export function normalizeForSQLite(table, remoteRow) {
//   const tableSchema = schema[table];
//   if (!tableSchema) throw new Error(`Unknown table: ${table}`);

//   const normalized = {};
//   for (const col in tableSchema) {
//     normalized[col] = normalizeValue(tableSchema[col], remoteRow[col], "sqlite");
//   }

//   // timestamps fallback
//   normalized.created_at = normalized.created_at || moment().tz("Asia/Manila").toISOString();
//   normalized.updated_at = normalized.updated_at || moment().tz("Asia/Manila").toISOString();
//   return normalized;
// }


// Enhanced normalization with validation
export function normalizeForSQLite(table, remoteRow) {
  if (!remoteRow) {
console.log(remoteRow, table, 'ERROR remote row')
  
    console.error(`❌ Cannot normalize null/undefined row for ${table}`);
    return {};
  }

  const tableSchema = schema[table];
  if (!tableSchema) {
    console.error(`❌ Unknown table schema: ${table}`);
    return remoteRow; // Return as-is if no schema
  }

  const normalized = {};
  for (const col in tableSchema) {
    try {
      if(remoteRow[col] != undefined){
        normalized[col] = normalizeValue(tableSchema[col], remoteRow[col], "sqlite");
      }
    } catch (error) {
      console.warn(`⚠️ Normalization error for ${table}.${col}:`, error);
      normalized[col] = remoteRow[col]; // Fallback to original value
    }
  }

  // Ensure required fields
  
  if (!normalized.id && remoteRow.id) {
    normalized.id = remoteRow.id;
  }
  
  

  return normalized;
}

// Enhanced value normalization with debugging
export function normalizeValue(type, value, target = "supabase") {
  // Log normalization for debugging
  const shouldLog = false; // Set to true for debugging
  
  if (value === null || value === undefined) {
    if (shouldLog) console.log(`🔄 Normalize ${type}: null/undefined -> null`);
    return null;
  }

  let result;

  switch (type) {
    case "boolean":
      result = target === "sqlite" ? (value ? 1 : 0) : Boolean(value);
      if (shouldLog) console.log(`🔄 Normalize boolean: ${value} -> ${result}`);
      break;

    case "json":
      if (target === "sqlite") {
        result = JSON.stringify(value ?? []);
        if (shouldLog) console.log(`🔄 Normalize json to sqlite:`, value, '->', result);
      } else {
        result = typeof value === "string" ? JSON.parse(value) : value;
        if (shouldLog) console.log(`🔄 Normalize json from sqlite:`, value, '->', result);
      }
      break;

    case "numeric":
      result = Number(value);
      if (shouldLog) console.log(`🔄 Normalize integer: ${value} -> ${result}`);
      break;

    case "timestamp":
        if (target === "sqlite") {
    const date = new Date(value);
      result = date.toISOString();
      if (shouldLog) console.log(`🔄 Normalize timestamp (UTC): ${value} -> ${result}`);
        } else {
          result = new Date(value);
        }
      break;

    case "uuid":
    case "text":
    default:
      result = String(value);
      if (shouldLog) console.log(`🔄 Normalize text: ${value} -> ${result}`);
      break;
  }

  return result;
}


// ---------- OPTIMIZED CRUD OPERATIONS ----------
async function localInsert(tableName, recordData) {
  const id = recordData.id || generateObjectId();
  const manilaTime = SyncManager.getCurrentManilaTime();

  // Remove sync columns from data being sent to Supabase
  const { _status, _version, ...cleanRecordData } = recordData;
  
  const record = normalizeForSQLite(tableName, {
    ...cleanRecordData,
    id,
    created_at: manilaTime,
    updated_at: manilaTime,
  });

  const columns = Object.keys(record);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map(col => record[col]);

  await DatabaseService.executeQuery(
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  // Queue for sync (async, don't block)
  SyncManager.queueChange(tableName, 'INSERT', id, record).catch(console.error);

  // Clear cache for this table
  clearCacheForTable(tableName);

  // Return normalized data immediately (don't wait for fresh query)
  const normalized = normalizeForSupabase(tableName, record);
  return normalized;
}

async function localUpdate(tableName, id, patch) {
  const manilaTime = SyncManager.getCurrentManilaTime();
  
  const cleanRecord = { 
    ...patch, 
    updated_at: manilaTime 
  };
  
  let updated = normalizeForSQLite(tableName, cleanRecord);
  const { _status, _version, ...record } = updated;

  // Build update SQL
  const columns = Object.keys(record);
  const setClause = columns.map(col => `${col} = ?`).join(', ');
  const values = columns.map(col => record[col]);

  const result = await DatabaseService.executeQuery(
    `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
    [...values, id]
  );

  if (result.rowsAffected === 0) {
    console.log('UPDATE NOT FOUND');
    return null;
  }

  // Queue for sync (async)
  SyncManager.queueChange(tableName, 'UPDATE', id, record).catch(console.error);

  // Clear cache for this table
  clearCacheForTable(tableName);

  // Return updated data immediately
  const normalized = normalizeForSupabase(tableName, { ...record, id });
  return normalized;
}

async function localDelete(tableName, id) {
  // For soft delete tables, mark as deleted instead of hard delete
  const tableSchema = schema[tableName];
  if (tableSchema.is_deleted) {
    await localUpdate(tableName, id, { is_deleted: true });
  } else {
    // Hard delete
    await DatabaseService.executeQuery(
      `DELETE FROM ${tableName} WHERE id = ?`,
      [id]
    );
    await SyncManager.queueChange(tableName, 'DELETE', id, null);
  }

  // Clear cache for this table
  clearCacheForTable(tableName);
  
  return true;
}

export async function localGet(tableName, id) {
  const cacheKey = getCacheKey(tableName, 'get', { id });
  const cached = getCache(cacheKey);
  if (cached) return cached;

  // Always try local first for offline-first approach
  const resData = await DatabaseService.executeQuery(
    `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
    [id]
  );
  
  if (resData.rows.length > 0) {
    const row = resData.rows[0];
    
    // Parse JSON fields based on table schema
    const tableSchema = schema[tableName];
    if (tableSchema) {
      for (const col in tableSchema) {
        if (tableSchema[col] === "json" && row[col]) {
          row[col] = parseJsonText(row[col]);
        }
      }
    }


    let { _status, _version, ...cleanRow} = normalizeForSupabase(tableName, row);

    setCache(cacheKey, cleanRow);
    return cleanRow;
  }

  // If not found locally and online, try remote
  if (SupabaseService.isConnected()) {
  
  console.log('GET BY ID')
    const remoteData = await fetchRemoteData(tableName, 'get', { id });
    if (remoteData && remoteData.length > 0) {
        let { _status, _version, ...cleanRow} = normalizeForSupabase(tableName, remoteData[0]);

      setCache(cacheKey, cleanRow);
      return cleanRow;
    }
  }

  return null;
}

async function localQuery(tableName, query = {}, is_online = false) {


  
  const cacheKey = getCacheKey(tableName, 'query', query);
  const cached = getCache(cacheKey);
  // console.log(cacheKey, cached, 'CHACEHHE')
  if (cached && !is_online) return cached;

  const { filters = {}, limit, offset, orderBy } = query;

  // Build WHERE clause
  const { whereSql, values } = buildWhereClause(filters);

  // ORDER BY (default created_at DESC if not provided)
  const orderSql = orderBy
    ? `ORDER BY ${orderBy}`
    : "ORDER BY created_at DESC";



  // LIMIT / OFFSET
  const limitSql = limit ? `LIMIT ${limit}` : "";
  const offsetSql = offset ? `OFFSET ${offset}` : "";

  const sql = `SELECT * FROM ${tableName} ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`;
  
  console.log(sql, values, 'SQL QUERY')
  
  let res = [];
  
  // Always try local first for offline-first approach
  /* let resData = await DatabaseService.executeQuery(sql, values);
  res = resData.rows || []; */
    console.log(res, 'Local DATA', limit, offsetSql, cached, cacheKey)

  // If no local results and online, try remote
  if ((SupabaseService.isConnected()) || is_online) {
    res = await fetchRemoteData(tableName, 'query', query);
    // console.log(res, 'REMOTE DATA')
  } else {
  let resData = await DatabaseService.executeQuery(sql, values);
  res = resData.rows || [];
  }

  // Parse JSON fields for each row
  const rows = res.map(row => {
    const tableSchema = schema[tableName];
    if (tableSchema) {
      for (const col in tableSchema) {
        if (tableSchema[col] === "json" && row[col]) {
          row[col] = parseJsonText(row[col]);
        }
      }
    }
    
        let { _status, _version, ...cleanRow} = normalizeForSupabase(tableName, row);
    
    return cleanRow;
  });

  setCache(cacheKey, rows);
  return rows;
}



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
  listMessages: async (params) => localQuery('messages', params),

  // cashflow
  createCashflow: async (c) => localInsert('cashflow', { ...c }),
  updateCashflow: async (id, patch) => localUpdate('cashflow', id, patch),
  deleteCashflow: async (id) => localDelete('cashflow', id),
  getCashflow: async (id) => localGet('cashflow', id),
  listCashflow: async (params) => localQuery('cashflow', params),
};

export async function deleteDB(){
    SQLite.deleteDatabase({ name: DB_NAME, location: 'default' })
  .then(() => console.log('✅ Database deleted'))
  .catch(err => console.log('❌ Error deleting DB:', err));


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
      } else if(typeof filter === 'boolean') { 
             whereClauses.push(`${key} = ?`);
             values.push(filter ? 1 : 0);
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
  const res = await DatabaseService.executeQuery(`SELECT id FROM ${table} ORDER BY updated_at ASC;`);
  const ids = [];
  if (res && res.rows) {
    for (let i = 0; i < res.rows.length; i++) {
      ids.push(res.rows[i].id);
    }
  }
  return ids;
}

export async function insertOrReplace(table, row) {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders});`;
  const values = cols.map((c) => row[c]);
  await DatabaseService.executeQuery(sql, values);
};

export async function clearAllStorage() {
  try {
  
     const key = `${LAST_PULLED_KEY}:bettings`;

  
    await AsyncStorage.clear();
    console.log("✅ AsyncStorage cleared");
  } catch (e) {
    console.error("❌ Failed to clear AsyncStorage", e);
  }
};


// // Bulk data processing
const processBulkInsert = async (tableName, records) => {
  if (records.length === 0) return 0;

  const batchSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
        const columns = Object.keys(normalizeForSQLite(tableName, records[0]));
    const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = batch.flatMap(record => {
      const normalized = normalizeForSQLite(tableName, record);
      return columns.map(col => normalized[col]);
    });


  // console.log(columns, values, 'INSERTINGGGG')

    await DatabaseService.executeQuery(
      `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`,
      values
    );

    totalInserted += batch.length;
  }

  console.log(`💾 Bulk inserted ${totalInserted} ${tableName} records`);
  return totalInserted;
};



// Enhanced remote query with better error handling and progress tracking
const fetchAllRemoteDataWithPagination = async (tableName, baseQuery, maxRecords = 50000) => {
  const allData = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  let totalFetched = 0;

  console.log(`🌐 Starting remote fetch for ${tableName}...`, baseQuery);

  while (hasMore && allData.length < maxRecords) {
    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      console.log(`📄 Fetching ${tableName} page ${page + 1} (records ${from}-${to})...`);

      const { data, error, count } = await baseQuery.range(from, to);
      
      if (error) {
        console.error(`ss❌ Error fetching ${tableName} page ${page + 1}:`, error, baseQuery, maxRecords);
        
        // If it's a rate limit error, wait and retry
        if (error.code === 'PGRST204' || error.status === 429) {
          console.log('⏳ Rate limit hit, waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        break;
      }

      if (data && data.length > 0) {
        allData.push(...data);
        totalFetched += data.length;
        
        console.log(`✅ Page ${page + 1}: ${data.length} records (total: ${totalFetched})`);

        if (data.length < pageSize) {
          hasMore = false;
          console.log(`🏁 Reached end of data for ${tableName}`);
        } else {
          page++;
        }
      } else {
        hasMore = false;
        console.log(`🏁 No more data for ${tableName}`);
      }

      // Rate limiting protection
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Unexpected error in ${tableName} bulk fetch:`, error);
      break;
    }
  }

  console.log(`✅ Fetched ${allData.length} ${tableName} records from remote`);
  return allData;
};

// Enhanced background sync with transaction support
const syncRemoteDataInBackground = async (tableName, operation, params = {}) => {
  // Use requestAnimationFrame for better background execution
  
  requestAnimationFrame(async () => {
    try {
      console.log(`🔄 Starting background sync for ${tableName} (${operation})...`);
      

      let query = supabase.from(tableName).select('*');
      
      // Apply filters for query operations
      if (operation === 'query' && params.filters) {
        Object.entries(params.filters).forEach(([key, filter]) => {
          if (typeof filter !== "object" || !filter.op) {
            // Simple equality filter
            query = query.eq(key, filter);
          } else {
            switch (filter.op.toLowerCase()) {
              case "=": 
                query = query.eq(key, filter.value); 
                break;
              case "!=": 
              case "<>": 
                query = query.neq(key, filter.value); 
                break;
              case ">": 
                query = query.gt(key, filter.value); 
                break;
              case ">=": 
                query = query.gte(key, filter.value); 
                break;
              case "<": 
                query = query.lt(key, filter.value); 
                break;
              case "<=": 
                query = query.lte(key, filter.value); 
                break;
              case "like": 
                query = query.like(key, `%${filter.value}%`); 
                break;
              case "ilike": 
                query = query.ilike(key, `%${filter.value}%`); 
                break;
              case "in": 
                if (Array.isArray(filter.value) && filter.value.length > 0) {
                  query = query.in(key, filter.value);
                } else {
                  console.warn(`⚠️ Empty array provided for IN filter on ${key}`);
                }
                break;
              case "not.in": 
                if (Array.isArray(filter.value) && filter.value.length > 0) {
                  query = query.not.in(key, filter.value);
                }
                break;
              case "contains": 
                  // Handle array contains - value should be one of the array elements
               if (Array.isArray(filter.value)) {
                query = query.filter(key, 'cs', JSON.stringify(filter.value));
              } else {
                query = query.filter(key, 'cs', JSON.stringify([filter.value]));
              }
              break;
              case "contained": 
                // Array is contained by column (opposite of contains)
                query = query.containedBy(key, filter.value);
                break;
              case "overlap": 
                // Arrays have overlapping elements
                query = query.overlap(key, filter.value);
                break;
              case "between": 
                if (filter.from !== undefined && filter.to !== undefined) {
                  query = query.gte(key, filter.from).lte(key, filter.to);
                } else {
                  console.warn(`⚠️ Between filter requires 'from' and 'to' properties`);
                }
                break;
              case "is": 
                if (filter.value === null) {
                  query = query.is(key, null);
                } else if (filter.value === true || filter.value === false) {
                  query = query.is(key, filter.value);
                }
                break;
              case "is.not": 
                if (filter.value === null) {
                  query = query.not.is(key, null);
                }
                break;
              case "textsearch": 
                // Full text search
                query = query.textSearch(key, filter.value);
                break;
              case "match": 
                // Match against multiple fields
                if (typeof filter.value === 'object') {
                  Object.entries(filter.value).forEach(([field, value]) => {
                    query = query.eq(field, value);
                  });
                }
                break;
              default:
                console.warn(`⚠️ Unsupported filter operator: ${filter.op}`);
            }
          }
        });
      }
      
      
      
      
      
      // Apply ordering
      if (params.orderBy) {
        const [column, order] = params.orderBy.split(' ');
        query = query.order(column, { ascending: order?.toLowerCase() === 'asc' });
        console.log(`🔽 Applying order: ${column} ${order}`);
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Start a transaction for better performance
      // await DatabaseService.executeQuery('BEGIN TRANSACTION');
      
      try {
        if (operation === 'get' && params.id) {
          console.log(`🎯 Fetching single record: ${params.id}`);
          const { data, error } = await query.eq('id', params.id).single();
          
          if (error) {
            console.error(`❌ Error fetching ${tableName} record ${params.id}:`, error);
          } else if (data) {
            const normalized = normalizeForSQLite(tableName, data);
            const columns = Object.keys(normalized);
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(col => normalized[col]);
            
            await DatabaseService.executeQuery(
              `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
              values
            );
            console.log(`💾 Background updated ${tableName} record: ${params.id}`);
          }
        } else {
          // For query/list operations
          console.log(`📋 Fetching multiple records for ${tableName}...`);
          const allData = await fetchAllRemoteDataWithPagination(
            tableName, 
            query, 
            params.maxRecords || 10000
          );
          
          console.log(`📥 Retrieved ${allData.length} records from Supabase for ${tableName}`);
          
          if (allData.length > 0) {
            const insertedCount = await processBulkInsert(tableName, allData);
            console.log(`💾 Background sync: ${insertedCount}/${allData.length} ${tableName} records saved locally`);
          } else {
            console.log(`ℹ️ No data found for ${tableName} with current filters`);
          }
        }
        
        // await DatabaseService.executeQuery('COMMIT');
        console.log(`✅ Background sync completed for ${tableName}`);
        
      } catch (error) {
        // await DatabaseService.executeQuery('ROLLBACK');
        console.error(`❌ Transaction failed for ${tableName}:`, error);
        throw error;
      }
      
    } catch (error) {
      console.error(`❌ Background sync failed for ${tableName}:`, error);
    }
  });
};


const fetchRemoteData = async (tableName, operation, params = {}) => {
  // Use requestAnimationFrame for better background execution
  

      let query = supabase.from(tableName).select('*');
      
      // Apply filters for query operations
      if (operation === 'query' && params.filters) {
        Object.entries(params.filters).forEach(([key, filter]) => {
          if (typeof filter !== "object" || !filter.op) {
            // Simple equality filter
            query = query.eq(key, filter);
          } else {
            switch (filter.op.toLowerCase()) {
              case "=": 
                query = query.eq(key, filter.value); 
                break;
              case "!=": 
              case "<>": 
                query = query.neq(key, filter.value); 
                break;
              case ">": 
                query = query.gt(key, filter.value); 
                break;
              case ">=": 
                query = query.gte(key, filter.value); 
                break;
              case "<": 
                query = query.lt(key, filter.value); 
                break;
              case "<=": 
                query = query.lte(key, filter.value); 
                break;
              case "like": 
                query = query.like(key, `%${filter.value}%`); 
                break;
              case "ilike": 
                query = query.ilike(key, `%${filter.value}%`); 
                break;
              case "in": 
                if (Array.isArray(filter.value) && filter.value.length > 0) {
                  query = query.in(key, filter.value);
                } else {
                  console.warn(`⚠️ Empty array provided for IN filter on ${key}`);
                }
                break;
              case "not.in": 
                if (Array.isArray(filter.value) && filter.value.length > 0) {
                  query = query.not.in(key, filter.value);
                }
                break;
              case "contains": 
                  // Handle array contains - value should be one of the array elements
               if (Array.isArray(filter.value)) {
                query = query.filter(key, 'cs', JSON.stringify(filter.value));
              } else {
                query = query.filter(key, 'cs', JSON.stringify([filter.value]));
              }
              break;
              case "contained": 
                // Array is contained by column (opposite of contains)
                query = query.containedBy(key, filter.value);
                break;
              case "overlap": 
                // Arrays have overlapping elements
                query = query.overlap(key, filter.value);
                break;
              case "between": 
                if (filter.from !== undefined && filter.to !== undefined) {
                  query = query.gte(key, filter.from).lte(key, filter.to);
                } else {
                  console.warn(`⚠️ Between filter requires 'from' and 'to' properties`);
                }
                break;
              case "is": 
                if (filter.value === null) {
                  query = query.is(key, null);
                } else if (filter.value === true || filter.value === false) {
                  query = query.is(key, filter.value);
                }
                break;
              case "is.not": 
                if (filter.value === null) {
                  query = query.not.is(key, null);
                }
                break;
              case "textsearch": 
                // Full text search
                query = query.textSearch(key, filter.value);
                break;
              case "match": 
                // Match against multiple fields
                if (typeof filter.value === 'object') {
                  Object.entries(filter.value).forEach(([field, value]) => {
                    query = query.eq(field, value);
                  });
                }
                break;
              default:
                console.warn(`⚠️ Unsupported filter operator: ${filter.op}`);
            }
          }
        });
      }
      
      
      
      
      
      // Apply ordering
      if (params.orderBy) {
        const [column, order] = params.orderBy.split(' ');
        query = query.order(column, { ascending: order?.toLowerCase() === 'asc' });
        console.log(`🔽 Applying order: ${column} ${order}`);
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Start a transaction for better performance
      // await DatabaseService.executeQuery('BEGIN TRANSACTION');
      
      try {
        if (operation === 'get' && params.id) {
          console.log(`🎯 Fetching single record: ${params.id}`);
          const { data, error } = await query.eq('id', params.id).single();
          
          if (error) {
            console.error(`❌ Error fetching ${tableName} record ${params.id}:`, error);
          } else if (data) {
            const normalized = normalizeForSQLite(tableName, data);
            const columns = Object.keys(normalized);
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(col => normalized[col]);
            
            await DatabaseService.executeQuery(
              `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
              values
            );
            console.log(`💾 Background updated ${tableName} record: ${params.id}`);
          }
          return data;
        } else {
          // For query/list operations
          console.log(`📋 Fetching multiple records for ${tableName}...`);
          const allData = await fetchAllRemoteDataWithPagination(
            tableName, 
            query, 
            params.maxRecords || 10000
          );
          
          console.log(`📥 Retrieved ${allData.length} records from Supabase for ${tableName}`);
          
          if (allData.length > 0) {
            const insertedCount = await processBulkInsert(tableName, allData);
            console.log(`💾 Background sync: ${insertedCount}/${allData.length} ${tableName} records saved locally`);
          } else {
            console.log(`ℹ️ No data found for ${tableName} with current filters`);
          }
          return allData
        }
        
        // await DatabaseService.executeQuery('COMMIT');
        // console.log(`✅ Background sync completed for ${tableName}`);
        
      } catch (error) {
        // await DatabaseService.executeQuery('ROLLBACK');
        console.error(`❌ Transaction failed for ${tableName}:`, error);
        // throw error;
        return null
      }
};


// Utility function to verify data was saved
export const verifyLocalData = async (tableName, expectedCount) => {
  try {
    const result = await DatabaseService.executeQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
    const actualCount = result.rows[0]?.count || 0;
    
    console.log(`🔍 Verification: ${tableName} has ${actualCount} records (expected: ${expectedCount})`);
    
    if (expectedCount !== null && actualCount < expectedCount) {
      console.warn(`⚠️ Data mismatch: Expected ${expectedCount}, found ${actualCount}`);
    }
    
    return actualCount;
  } catch (error) {
    console.error(`❌ Error verifying ${tableName}:`, error);
    return 0;
  }
};

export const fetchUsers = async ( filter, is_online = false) => {
  try {
    const filters = {
      ...filter,
      is_deleted: false
    };

    const users = await api.listUsers({
      filters,
      orderBy: "created_at DESC",
    }, is_online);

    return users;

  } catch (error) {
    console.error("❌ Error fetching users with coordinates:", error);
    return [];
  }
};


export async function fetchBettings({ includeAll, date, userNow, user, gameTime }) {
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
    game_time: gameTime,
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

  const localRes = await DatabaseService.executeQuery(query, params);
  const rows = [];
  for (let i = 0; i < localRes.rows.length; i++) {
    rows.push(localRes.rows.item(i));
  }

  return rows;
}

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

