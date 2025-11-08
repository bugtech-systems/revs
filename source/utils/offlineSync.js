// src/utils/offlineSync.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import supabase from './supabaseClient';
import { schema } from "../services/schema";
import { generateObjectId } from './helpers';
import DatabaseService from '../services/DatabaseService';
import SupabaseService from '../services/SupabaseService';
import SyncManager from '../services/SyncManager';

export const BATCH_SIZE = 1000;
export const DB_NAME = 'leov4.db';
export const LAST_PULLED_KEY = 'offline:lastPulledAt';

// Table list for water distribution system
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

// ---------- INITIALIZATION ----------
export async function init(userId) {
  // Create tables if not exists
  await createTablesIfNotExists();
  
  // Initialize SyncManager
  await SyncManager.init();
  
  // Preload essential data for offline use
  await preloadEssentialData(userId);
  
  // Start background sync if online
  NetInfo.fetch().then((s) => {
    if (s.isConnected && userId) {
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

// ---------- USER MANAGEMENT ----------
export const fetchUser = async (email) => {
  const cacheKey = getCacheKey('users', 'fetchUser', { email });
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    // Try local first (offline-first approach)
    let user = await fetchUserFromLocal(email);
    if (user) {
      setCache(cacheKey, user);
      return user;
    }

    // If online and not found locally, fetch from Supabase
    if (SupabaseService.isConnected()) {
      console.log(`🔍 Searching for user with email: ${email}`);
      
      // Use select with limit instead of single() to avoid PGRST116
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1);

      if (error) {
        console.log('Supabase fetchUser error:', error);
        return null;
      }

      if (data && data.length > 0) {
        user = data[0];
        console.log(`✅ User found remotely: ${user.id}`);
        
        // Populate uplines if they exist
        if (user?.uplines?.length) {
          try {
            const { data: uplineData, error: uplineError } = await supabase
              .from('users')
              .select('*')
              .in('id', user.uplines);

            if (!uplineError && uplineData) {
              user.uplines = uplineData;
            }
          } catch (uplineErr) {
            console.warn('⚠️ Error fetching upline users:', uplineErr);
          }
        }

        // Save to local database (async, don't wait)
        saveUserToLocal(user).catch(console.error);
        setCache(cacheKey, user);
        return user;
      } else {
        console.log(`❌ No user found with email: ${email}`);
        setCache(cacheKey, null);
        return null;
      }
    }

    return null;
  } catch (err) {
    console.log('Unexpected error in fetchUser:', err);
    return await fetchUserFromLocal(email);
  }
};

// ---------- REMOTE DATA SYNC ----------
const fetchRemoteData = async (tableName, operation, params = {}) => {
  let query = supabase.from(tableName).select('*');
  
  // Apply filters for query operations
  if (operation === 'query' && params.filters) {
    const applyFilters = (query, filters) => {
      if (Array.isArray(filters)) {
        // Handle OR conditions - array of filter groups
        const orConditions = filters.map(filterGroup => {
          if (typeof filterGroup === 'string') {
            return filterGroup; // Direct filter string
          } else if (typeof filterGroup === 'object' && !filterGroup.op) {
            // Build filter string from object with multiple AND conditions
            const conditions = [];
            Object.entries(filterGroup).forEach(([key, filter]) => {
              if (typeof filter === 'object' && filter.op) {
                const { op, value } = filter;
                switch (op.toLowerCase()) {
                  case "=": conditions.push(`${key}.eq.${value}`); break;
                  case "!=": conditions.push(`${key}.neq.${value}`); break;
                  case ">": conditions.push(`${key}.gt.${value}`); break;
                  case ">=": conditions.push(`${key}.gte.${value}`); break;
                  case "<": conditions.push(`${key}.lt.${value}`); break;
                  case "<=": conditions.push(`${key}.lte.${value}`); break;
                  case "like": conditions.push(`${key}.like.%${value}%`); break;
                  case "ilike": conditions.push(`${key}.ilike.%${value}%`); break;
                  case "in": 
                    if (Array.isArray(value)) {
                      conditions.push(`${key}.in.(${value.join(',')})`);
                    }
                    break;
                  case "between":
                    if (filter.from !== undefined && filter.to !== undefined) {
                      conditions.push(`${key}.gte.${filter.from},${key}.lte.${filter.to}`);
                    }
                    break;
                  case "is":
                    if (value === null) conditions.push(`${key}.is.null`);
                    else if (value === true || value === false) conditions.push(`${key}.is.${value}`);
                    break;
                }
              } else {
                // Simple equality
                conditions.push(`${key}.eq.${filter}`);
              }
            });
            return conditions.join(',');
          }
          return null;
        }).filter(Boolean);
        
        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','));
        }
      } else if (typeof filters === 'object') {
        // Handle AND conditions and logical operators
        Object.entries(filters).forEach(([key, filter]) => {
          if (key === '$or' && Array.isArray(filter)) {
            // Handle OR operator
            const orConditions = filter.map(filterGroup => {
              if (typeof filterGroup === 'object') {
                const conditions = [];
                Object.entries(filterGroup).forEach(([subKey, subFilter]) => {
                  if (typeof subFilter === 'object' && subFilter.op) {
                    const { op, value } = subFilter;
                    switch (op.toLowerCase()) {
                      case "=": conditions.push(`${subKey}.eq.${value}`); break;
                      case "!=": conditions.push(`${subKey}.neq.${value}`); break;
                      case ">": conditions.push(`${subKey}.gt.${value}`); break;
                      case ">=": conditions.push(`${subKey}.gte.${value}`); break;
                      case "<": conditions.push(`${subKey}.lt.${value}`); break;
                      case "<=": conditions.push(`${subKey}.lte.${value}`); break;
                      case "like": conditions.push(`${subKey}.like.%${value}%`); break;
                      case "ilike": conditions.push(`${subKey}.ilike.%${value}%`); break;
                      case "in": 
                        if (Array.isArray(value)) {
                          conditions.push(`${subKey}.in.(${value.join(',')})`);
                        }
                        break;
                      case "between":
                        if (subFilter.from !== undefined && subFilter.to !== undefined) {
                          conditions.push(`${subKey}.gte.${subFilter.from},${subKey}.lte.${subFilter.to}`);
                        }
                        break;
                      case "is":
                        if (value === null) conditions.push(`${subKey}.is.null`);
                        else if (value === true || value === false) conditions.push(`${subKey}.is.${value}`);
                        break;
                    }
                  } else {
                    conditions.push(`${subKey}.eq.${subFilter}`);
                  }
                });
                return conditions.join(',');
              }
              return filterGroup;
            }).filter(Boolean);
            
            if (orConditions.length > 0) {
              query = query.or(orConditions.join(','));
            }
          } else if (key === '$and' && Array.isArray(filter)) {
            // Handle AND operator - apply all filters directly
            filter.forEach(filterGroup => {
              if (typeof filterGroup === 'object') {
                Object.entries(filterGroup).forEach(([subKey, subFilter]) => {
                  if (typeof subFilter !== "object" || !subFilter.op) {
                    query = query.eq(subKey, subFilter);
                  } else {
                    const { op, value } = subFilter;
                    switch (op.toLowerCase()) {
                      case "=": query = query.eq(subKey, value); break;
                      case "!=": query = query.neq(subKey, value); break;
                      case ">": query = query.gt(subKey, value); break;
                      case ">=": query = query.gte(subKey, value); break;
                      case "<": query = query.lt(subKey, value); break;
                      case "<=": query = query.lte(subKey, value); break;
                      case "like": query = query.like(subKey, `%${value}%`); break;
                      case "ilike": query = query.ilike(subKey, `%${value}%`); break;
                      case "in": 
                        if (Array.isArray(value) && value.length > 0) {
                          query = query.in(subKey, value);
                        }
                        break;
                      case "between": 
                        if (subFilter.from !== undefined && subFilter.to !== undefined) {
                          query = query.gte(subKey, subFilter.from).lte(subKey, subFilter.to);
                        }
                        break;
                      case "is": 
                        if (value === null) {
                          query = query.is(subKey, null);
                        } else if (value === true || value === false) {
                          query = query.is(subKey, value);
                        }
                        break;
                      case "contains":
                        if (typeof value === 'string') {
                          query = query.contains(subKey, value);
                        } else if (Array.isArray(value)) {
                          query = query.contains(subKey, value);
                        }
                        break;
                      case "containedBy":
                        query = query.containedBy(subKey, value);
                        break;
                    }
                  }
                });
              }
            });
          } else {
            // Regular filter (AND by default)
            if (typeof filter !== "object" || !filter.op) {
              query = query.eq(key, filter);
            } else {
              const { op, value } = filter;
              switch (op.toLowerCase()) {
                case "=": query = query.eq(key, value); break;
                case "!=": query = query.neq(key, value); break;
                case ">": query = query.gt(key, value); break;
                case ">=": query = query.gte(key, value); break;
                case "<": query = query.lt(key, value); break;
                case "<=": query = query.lte(key, value); break;
                case "like": query = query.like(key, `%${value}%`); break;
                case "ilike": query = query.ilike(key, `%${value}%`); break;
                case "in": 
                  if (Array.isArray(value) && value.length > 0) {
                    query = query.in(key, value);
                  }
                  break;
                case "between": 
                  if (filter.from !== undefined && filter.to !== undefined) {
                    query = query.gte(key, filter.from).lte(key, filter.to);
                  }
                  break;
                case "is": 
                  if (value === null) {
                    query = query.is(key, null);
                  } else if (value === true || value === false) {
                    query = query.is(key, value);
                  }
                  break;
                case "contains":
                  if (typeof value === 'string') {
                    query = query.contains(key, value);
                  } else if (Array.isArray(value)) {
                    query = query.contains(key, value);
                  }
                  break;
                case "containedBy":
                  query = query.containedBy(key, value);
                  break;
              }
            }
          }
        });
      }
      return query;
    };

    query = applyFilters(query, params.filters);
  }
  
  // Apply ordering
  if (params.orderBy) {
    const [column, order] = params.orderBy.split(' ');
    query = query.order(column, { ascending: order?.toLowerCase() === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  try {
    if (operation === 'get' && params.id) {
      console.log(`🎯 Fetching single record: ${params.id}`);
      const { data, error } = await query.eq('id', params.id).single();
      
      if (error) {
        console.error(`❌ Error fetching ${tableName} record ${params.id}:`, error);
        return null;
      }
      
      if (data) {
        const normalized = normalizeForSQLite(tableName, data);
        await insertOrReplace(tableName, normalized);
        console.log(`💾 Updated ${tableName} record: ${params.id}`);
      }
      
      return data ? [data] : [];
    } else {
      console.log(`📋 Fetching multiple records for ${tableName}...`);
      const allData = await fetchAllRemoteDataWithPagination(
        tableName, 
        query, 
        params.maxRecords || 10000
      );
      
      console.log(`📥 Retrieved ${allData.length} records from Supabase for ${tableName}`);
      
      if (allData.length > 0) {
        await processBulkInsert(tableName, allData);
        console.log(`💾 Synced ${allData.length} ${tableName} records locally`);
      }
      
      return allData;
    }
  } catch (error) {
    console.error(`❌ Remote fetch failed for ${tableName}:`, error);
    return [];
  }
};

// Separate function to apply filters to Supabase query
function applyFilters(query, filters) {
  if (Array.isArray(filters)) {
    // Handle OR conditions
    const orConditions = filters.map(filterGroup => {
      if (typeof filterGroup === 'string') {
        return filterGroup;
      } else if (typeof filterGroup === 'object' && !filterGroup.op) {
        const conditions = [];
        Object.entries(filterGroup).forEach(([key, filter]) => {
          if (typeof filter === 'object' && filter.op) {
            const { op, value } = filter;
            switch (op.toLowerCase()) {
              case "=": conditions.push(`${key}.eq.${value}`); break;
              case "!=": conditions.push(`${key}.neq.${value}`); break;
              case ">": conditions.push(`${key}.gt.${value}`); break;
              case ">=": conditions.push(`${key}.gte.${value}`); break;
              case "<": conditions.push(`${key}.lt.${value}`); break;
              case "<=": conditions.push(`${key}.lte.${value}`); break;
              case "like": conditions.push(`${key}.like.%${value}%`); break;
              case "ilike": conditions.push(`${key}.ilike.%${value}%`); break;
              case "in": 
                if (Array.isArray(value)) {
                  conditions.push(`${key}.in.(${value.join(',')})`);
                }
                break;
              default: break;
            }
          } else {
            conditions.push(`${key}.eq.${filter}`);
          }
        });
        return conditions.join(',');
      }
      return null;
    }).filter(Boolean);
    
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }
  } else if (typeof filters === 'object') {
    Object.entries(filters).forEach(([key, filter]) => {
      if (key === '$or' && Array.isArray(filter)) {
        const orConditions = filter.map(filterGroup => {
          if (typeof filterGroup === 'object') {
            const conditions = [];
            Object.entries(filterGroup).forEach(([subKey, subFilter]) => {
              if (typeof subFilter === 'object' && subFilter.op) {
                const { op, value } = subFilter;
                switch (op.toLowerCase()) {
                  case "=": conditions.push(`${subKey}.eq.${value}`); break;
                  case "!=": conditions.push(`${subKey}.neq.${value}`); break;
                  case ">": conditions.push(`${subKey}.gt.${value}`); break;
                  case ">=": conditions.push(`${subKey}.gte.${value}`); break;
                  case "<": conditions.push(`${subKey}.lt.${value}`); break;
                  case "<=": conditions.push(`${subKey}.lte.${value}`); break;
                  case "like": conditions.push(`${subKey}.like.%${value}%`); break;
                  case "ilike": conditions.push(`${subKey}.ilike.%${value}%`); break;
                  case "in": 
                    if (Array.isArray(value)) {
                      conditions.push(`${subKey}.in.(${value.join(',')})`);
                    }
                    break;
                  default: break;
                }
              } else {
                conditions.push(`${subKey}.eq.${subFilter}`);
              }
            });
            return conditions.join(',');
          }
          return filterGroup;
        }).filter(Boolean);
        
        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','));
        }
      } else {
        if (typeof filter !== "object" || !filter.op) {
          query = query.eq(key, filter);
        } else {
          const { op, value } = filter;
          switch (op.toLowerCase()) {
            case "=": query = query.eq(key, value); break;
            case "!=": query = query.neq(key, value); break;
            case ">": query = query.gt(key, value); break;
            case ">=": query = query.gte(key, value); break;
            case "<": query = query.lt(key, value); break;
            case "<=": query = query.lte(key, value); break;
            case "like": query = query.like(key, `%${value}%`); break;
            case "ilike": query = query.ilike(key, `%${value}%`); break;
            case "in": 
              if (Array.isArray(value) && value.length > 0) {
                query = query.in(key, value);
              }
              break;
            default: break;
          }
        }
      }
    });
  }
  return query;
}

// Also update the localGet function to be more defensive:
// export async function localGet(tableName, id) {
//   const cacheKey = getCacheKey(tableName, 'get', { id });
//   const cached = getCache(cacheKey);
//   if (cached) return cached;

//   // Always try local first for offline-first approach
//   const resData = await DatabaseService.executeQuery(
//     `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
//     [id]
//   );
  
//   if (resData.rows && resData.rows.length > 0) {
//     const row = resData.rows[0];
    
//     // Parse JSON fields based on table schema
//     const tableSchema = schema[tableName];
//     if (tableSchema) {
//       for (const col in tableSchema) {
//         if (tableSchema[col] === "json" && row[col]) {
//           try {
//             row[col] = parseJsonText(row[col]);
//           } catch (e) {
//             console.warn(`Error parsing JSON for ${tableName}.${col}:`, e);
//           }
//         }
//       }
//     }

//     setCache(cacheKey, row);
//     return row;
//   }

//   // If not found locally and online, try remote
//   if (SupabaseService.isConnected()) {
//     try {
//       const remoteData = await fetchRemoteData(tableName, 'get', { id });
//       if (remoteData && remoteData.length > 0) {
//         setCache(cacheKey, remoteData[0]);
//         return remoteData[0];
//       }
//     } catch (error) {
//       console.warn(`Error fetching remote data for ${tableName} id ${id}:`, error);
//     }
//   }

//   return null;
// }


export const saveUserToLocal = async (user) => {
  try {
    const normalizedUser = normalizeForSQLite('users', user);
    const columns = Object.keys(normalizedUser);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => normalizedUser[col]);

    await DatabaseService.executeQuery(
      `INSERT OR REPLACE INTO users (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    console.log('✅ User saved to local database:', user.id);
    
    // Also save upline users if they exist (async)
    if (user.uplines?.length) {
      saveUsersToLocal(user.uplines).catch(console.error);
    }
    
    // Clear user-related cache
    clearCacheForTable('users');
    
    return user;
  } catch (error) {
    console.error('Error saving user to local database:', error);
    throw error;
  }
};

export const saveLocalUser = async (user) => {
  await saveUserToLocal(user);
};

export const fetchUserFromLocal = async (email) => {
  try {
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

  const cacheKey = getCacheKey('users', 'fetchUsersByIds', { userIds });
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const placeholders = userIds.map(() => '?').join(',');
    const result = await DatabaseService.executeQuery(
      `SELECT * FROM users WHERE id IN (${placeholders})`,
      userIds
    );

    if (!result.rows) {
      return [];
    }

    const users = result.rows.map(user => ({
      ...user,
      configuration: parseJsonText(user.configuration),
      uplines: parseJsonText(user.uplines)
    }));

    setCache(cacheKey, users);
    return users;
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    return [];
  }
};

// ---------- DATA NORMALIZATION ----------
export function toJsonText(obj) {
  try {
    return obj ? JSON.stringify(obj) : null;
  } catch {
    return null;
  }
}

export function parseJsonText(str) {
  if (str === null || str === undefined) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

export function nowISO() {
  return new Date().toISOString();
}

export function normalizeForSupabase(table, row) {
  const tableSchema = schema[table];
  if (!tableSchema) throw new Error(`Unknown table: ${table}`);

  const normalized = {};
  for (const col in tableSchema) {
    if (row[col] !== undefined) {
      normalized[col] = normalizeValue(tableSchema[col], row[col], "supabase");
    }
  }

  return normalized;
}

export function normalizeForSQLite(table, remoteRow) {
  if (!remoteRow) {
    console.error(`❌ Cannot normalize null/undefined row for ${table}`);
    return {};
  }

  const tableSchema = schema[table];
  if (!tableSchema) {
    console.error(`❌ Unknown table schema: ${table}`);
    return remoteRow;
  }

  const normalized = {};
  for (const col in tableSchema) {
    try {
      if (remoteRow[col] !== undefined) {
        normalized[col] = normalizeValue(tableSchema[col], remoteRow[col], "sqlite");
      }
    } catch (error) {
      console.warn(`⚠️ Normalization error for ${table}.${col}:`, error);
      normalized[col] = remoteRow[col];
    }
  }

  // Ensure required fields
  if (!normalized.id && remoteRow.id) {
    normalized.id = remoteRow.id;
  }

  return normalized;
}

export function normalizeValue(type, value, target = "supabase") {
  if (value === null || value === undefined) {
    return null;
  }

  let result;

  switch (type) {
    case "boolean":
      result = target === "sqlite" ? (value ? 1 : 0) : Boolean(value);
      break;

    case "json":
      if (target === "sqlite") {
        result = JSON.stringify(value ?? []);
      } else {
        result = typeof value === "string" ? JSON.parse(value) : value;
      }
      break;

    case "numeric":
    case "integer":
      result = Number(value);
      break;

    case "timestamp":
      if (target === "sqlite") {
        const date = new Date(value);
        result = date.toISOString();
      } else {
        result = new Date(value);
      }
      break;

    case "text":
    default:
      result = String(value);
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

// ---------- OPTIMIZED API FOR WATER DISTRIBUTION SYSTEM ----------
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


// ---------- UTILITY FUNCTIONS ----------
function buildWhereClause(filters = {}) {
  const whereClauses = [];
  const values = [];

  for (const key in filters) {
    const filter = filters[key];

    // Plain value → default "="
    if (typeof filter !== "object" || !filter.op) {
      if (filter === null) {
        whereClauses.push(`${key} IS NULL`);
      } else if (typeof filter === 'boolean') { 
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

      /**
       * ✅ NEW CASE:
       * Filters JSON column (e.g. "batches") that contains an object with "batch_id"
       * Works in SQLite by using LIKE.
       * Works in Postgres by using `::text LIKE`.
       */

       
      case "json_contains_batch":
        whereClauses.push(`(${key} LIKE ? OR json_extract(${key}, '$[*].batch_id') LIKE ?)`);
        values.push(`%${filter.value}%`, `%${filter.value}%`);
        break;
        
          case "json_array_contains":
            if (Array.isArray(filter.value)) {
              // For array of values, check if ANY of the values exist in JSON array
              const orConditions = filter.value.map(value => {
                values.push(`%"${value}"%`);
                return `json_extract(${key}, '$') LIKE ?`;
              });
              whereClauses.push(`(${orConditions.join(' OR ')})`);
            } else {
              // For single value - find if this specific string exists in JSON array
              whereClauses.push(`json_extract(${key}, '$') LIKE ?`);
              values.push(`%"${filter.value}"%`);
            }
            break;

      default:
        throw new Error(`Unsupported operator: ${filter.op}`);
    }
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  return { whereSql, values };
}

export async function getAllLocalIds(table) {
  const cacheKey = getCacheKey(table, 'getAllLocalIds');
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const res = await DatabaseService.executeQuery(
    `SELECT id FROM ${table} ORDER BY updated_at ASC`
  );
  
  const ids = [];
  if (res && res.rows) {
    for (let i = 0; i < res.rows.length; i++) {
      ids.push(res.rows[i].id);
    }
  }

  setCache(cacheKey, ids);
  return ids;
}

export async function insertOrReplace(table, row) {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
  const values = cols.map((c) => row[c]);
  await DatabaseService.executeQuery(sql, values);
  
  // Clear cache for this table
  clearCacheForTable(table);
}

export async function clearAllStorage() {
  try {
    await AsyncStorage.clear();
    queryCache.clear();
    console.log("✅ AsyncStorage and cache cleared");
  } catch (e) {
    console.error("❌ Failed to clear AsyncStorage", e);
  }
}

// ---------- OPTIMIZED BULK OPERATIONS ----------
const processBulkInsert = async (tableName, records) => {
  if (records.length === 0) return 0;

  const batchSize = 100;
  let totalInserted = 0;

  // Use transaction for better performance
  await DatabaseService.executeQuery('BEGIN TRANSACTION');

  try {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const columns = Object.keys(normalizeForSQLite(tableName, records[0]));
      const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
      const values = batch.flatMap(record => {
        const normalized = normalizeForSQLite(tableName, record);
        return columns.map(col => normalized[col]);
      });

      await DatabaseService.executeQuery(
        `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`,
        values
      );

      totalInserted += batch.length;
    }

    await DatabaseService.executeQuery('COMMIT');
    console.log(`💾 Bulk inserted ${totalInserted} ${tableName} records`);
    
    // Clear cache for this table
    clearCacheForTable(tableName);
    
    return totalInserted;
  } catch (error) {
    await DatabaseService.executeQuery('ROLLBACK');
    throw error;
  }
};

// ---------- PRELOAD ESSENTIAL DATA ----------
async function preloadEssentialData(userId) {
  if (!userId) return;

  try {
    // Preload frequently used data in background
    const preloadPromises = [
      getActiveBranches().catch(() => []),
      getActiveBatches().catch(() => []),
    ];

    await Promise.allSettled(preloadPromises);
    console.log('✅ Essential data preloaded for offline use');
  } catch (error) {
    console.warn('⚠️ Preload essential data failed:', error);
  }
}

// ---------- REMOTE DATA SYNC ----------
const fetchAllRemoteDataWithPagination = async (tableName, baseQuery, maxRecords = 50000) => {
  const allData = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  let totalFetched = 0;

  console.log(`🌐 Starting remote fetch for ${tableName}...`);

  while (hasMore && allData.length < maxRecords) {
    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      console.log(`📄 Fetching ${tableName} page ${page + 1} (records ${from}-${to})...`);

      const { data, error } = await baseQuery.range(from, to);
      
      if (error) {
        console.error(`❌ Error fetching ${tableName} page ${page + 1}:`, error);
        
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

      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Unexpected error in ${tableName} bulk fetch:`, error);
      break;
    }
  }

  console.log(`✅ Fetched ${allData.length} ${tableName} records from remote`);
  return allData;
};

// const fetchRemoteData = async (tableName, operation, params = {}) => {
//   let query = supabase.from(tableName).select('*');
  
//   // Apply filters for query operations
//   if (operation === 'query' && params.filters) {
//     const applyFilters = (query, filters) => {
//       if (Array.isArray(filters)) {
//         // Handle OR conditions - array of filter groups
//         const orConditions = filters.map(filterGroup => {
//           if (typeof filterGroup === 'string') {
//             return filterGroup; // Direct filter string
//           } else if (typeof filterGroup === 'object' && !filterGroup.op) {
//             // Build filter string from object with multiple AND conditions
//             const conditions = [];
//             Object.entries(filterGroup).forEach(([key, filter]) => {
//               if (typeof filter === 'object' && filter.op) {
//                 const { op, value } = filter;
//                 switch (op.toLowerCase()) {
//                   case "=": conditions.push(`${key}.eq.${value}`); break;
//                   case "!=": conditions.push(`${key}.neq.${value}`); break;
//                   case ">": conditions.push(`${key}.gt.${value}`); break;
//                   case ">=": conditions.push(`${key}.gte.${value}`); break;
//                   case "<": conditions.push(`${key}.lt.${value}`); break;
//                   case "<=": conditions.push(`${key}.lte.${value}`); break;
//                   case "like": conditions.push(`${key}.like.%${value}%`); break;
//                   case "ilike": conditions.push(`${key}.ilike.%${value}%`); break;
//                   case "in": 
//                     if (Array.isArray(value)) {
//                       conditions.push(`${key}.in.(${value.join(',')})`);
//                     }
//                     break;
//                   case "between":
//                     if (filter.from !== undefined && filter.to !== undefined) {
//                       conditions.push(`${key}.gte.${filter.from},${key}.lte.${filter.to}`);
//                     }
//                     break;
//                   case "is":
//                     if (value === null) conditions.push(`${key}.is.null`);
//                     else if (value === true || value === false) conditions.push(`${key}.is.${value}`);
//                     break;
//                 }
//               } else {
//                 // Simple equality
//                 conditions.push(`${key}.eq.${filter}`);
//               }
//             });
//             return conditions.join(',');
//           }
//           return null;
//         }).filter(Boolean);
        
//         if (orConditions.length > 0) {
//           query = query.or(orConditions.join(','));
//         }
//       } else if (typeof filters === 'object') {
//         // Handle AND conditions and logical operators
//         Object.entries(filters).forEach(([key, filter]) => {
//           if (key === '$or' && Array.isArray(filter)) {
//             // Handle OR operator
//             const orConditions = filter.map(filterGroup => {
//               if (typeof filterGroup === 'object') {
//                 const conditions = [];
//                 Object.entries(filterGroup).forEach(([subKey, subFilter]) => {
//                   if (typeof subFilter === 'object' && subFilter.op) {
//                     const { op, value } = subFilter;
//                     switch (op.toLowerCase()) {
//                       case "=": conditions.push(`${subKey}.eq.${value}`); break;
//                       case "!=": conditions.push(`${subKey}.neq.${value}`); break;
//                       case ">": conditions.push(`${subKey}.gt.${value}`); break;
//                       case ">=": conditions.push(`${subKey}.gte.${value}`); break;
//                       case "<": conditions.push(`${subKey}.lt.${value}`); break;
//                       case "<=": conditions.push(`${subKey}.lte.${value}`); break;
//                       case "like": conditions.push(`${subKey}.like.%${value}%`); break;
//                       case "ilike": conditions.push(`${subKey}.ilike.%${value}%`); break;
//                       case "in": 
//                         if (Array.isArray(value)) {
//                           conditions.push(`${subKey}.in.(${value.join(',')})`);
//                         }
//                         break;
//                       case "between":
//                         if (subFilter.from !== undefined && subFilter.to !== undefined) {
//                           conditions.push(`${subKey}.gte.${subFilter.from},${subKey}.lte.${subFilter.to}`);
//                         }
//                         break;
//                       case "is":
//                         if (value === null) conditions.push(`${subKey}.is.null`);
//                         else if (value === true || value === false) conditions.push(`${subKey}.is.${value}`);
//                         break;
//                     }
//                   } else {
//                     conditions.push(`${subKey}.eq.${subFilter}`);
//                   }
//                 });
//                 return conditions.join(',');
//               }
//               return filterGroup;
//             }).filter(Boolean);
            
//             if (orConditions.length > 0) {
//               query = query.or(orConditions.join(','));
//             }
//           } else if (key === '$and' && Array.isArray(filter)) {
//             // Handle AND operator - apply all filters directly
//             filter.forEach(filterGroup => {
//               if (typeof filterGroup === 'object') {
//                 Object.entries(filterGroup).forEach(([subKey, subFilter]) => {
//                   if (typeof subFilter !== "object" || !subFilter.op) {
//                     query = query.eq(subKey, subFilter);
//                   } else {
//                     const { op, value } = subFilter;
//                     switch (op.toLowerCase()) {
//                       case "=": query = query.eq(subKey, value); break;
//                       case "!=": query = query.neq(subKey, value); break;
//                       case ">": query = query.gt(subKey, value); break;
//                       case ">=": query = query.gte(subKey, value); break;
//                       case "<": query = query.lt(subKey, value); break;
//                       case "<=": query = query.lte(subKey, value); break;
//                       case "like": query = query.like(subKey, `%${value}%`); break;
//                       case "ilike": query = query.ilike(subKey, `%${value}%`); break;
//                       case "in": 
//                         if (Array.isArray(value) && value.length > 0) {
//                           query = query.in(subKey, value);
//                         }
//                         break;
//                       case "between": 
//                         if (subFilter.from !== undefined && subFilter.to !== undefined) {
//                           query = query.gte(subKey, subFilter.from).lte(subKey, subFilter.to);
//                         }
//                         break;
//                       case "is": 
//                         if (value === null) {
//                           query = query.is(subKey, null);
//                         } else if (value === true || value === false) {
//                           query = query.is(subKey, value);
//                         }
//                         break;
//                       case "contains":
//                         if (typeof value === 'string') {
//                           query = query.contains(subKey, value);
//                         } else if (Array.isArray(value)) {
//                           query = query.contains(subKey, value);
//                         }
//                         break;
//                       case "containedBy":
//                         query = query.containedBy(subKey, value);
//                         break;
//                     }
//                   }
//                 });
//               }
//             });
//           } else {
//             // Regular filter (AND by default)
//             if (typeof filter !== "object" || !filter.op) {
//               query = query.eq(key, filter);
//             } else {
//               const { op, value } = filter;
//               switch (op.toLowerCase()) {
//                 case "=": query = query.eq(key, value); break;
//                 case "!=": query = query.neq(key, value); break;
//                 case ">": query = query.gt(key, value); break;
//                 case ">=": query = query.gte(key, value); break;
//                 case "<": query = query.lt(key, value); break;
//                 case "<=": query = query.lte(key, value); break;
//                 case "like": query = query.like(key, `%${value}%`); break;
//                 case "ilike": query = query.ilike(key, `%${value}%`); break;
//                 case "in": 
//                   if (Array.isArray(value) && value.length > 0) {
//                     query = query.in(key, value);
//                   }
//                   break;
//                 case "between": 
//                   if (filter.from !== undefined && filter.to !== undefined) {
//                     query = query.gte(key, filter.from).lte(key, filter.to);
//                   }
//                   break;
//                 case "is": 
//                   if (value === null) {
//                     query = query.is(key, null);
//                   } else if (value === true || value === false) {
//                     query = query.is(key, value);
//                   }
//                   break;
//                 case "contains":
//                   if (typeof value === 'string') {
//                     query = query.contains(key, value);
//                   } else if (Array.isArray(value)) {
//                     query = query.contains(key, value);
//                   }
//                   break;
//                 case "containedBy":
//                   query = query.containedBy(key, value);
//                   break;
//               }
//             }
//           }
//         });
//       }
//       return query;
//     };

//     query = applyFilters(query, params.filters);
//   }
  
//   // Apply ordering
//   if (params.orderBy) {
//     const [column, order] = params.orderBy.split(' ');
//     query = query.order(column, { ascending: order?.toLowerCase() === 'asc' });
//   } else {
//     query = query.order('created_at', { ascending: false });
//   }

//   try {
//     if (operation === 'get' && params.id) {
//       console.log(`🎯 Fetching single record: ${params.id}`);
//       const { data, error } = await query.eq('id', params.id).single();
      
//       if (error) {
//         console.error(`❌ Error fetching ${tableName} record ${params.id}:`, error);
//         return null;
//       }
      
//       if (data) {
//         const normalized = normalizeForSQLite(tableName, data);
//         await insertOrReplace(tableName, normalized);
//         console.log(`💾 Updated ${tableName} record: ${params.id}`);
//       }
      
//       return data ? [data] : [];
//     } else {
//       console.log(`📋 Fetching multiple records for ${tableName}...`);
//       const allData = await fetchAllRemoteDataWithPagination(
//         tableName, 
//         query, 
//         params.maxRecords || 10000
//       );
      
//       console.log(`📥 Retrieved ${allData.length} records from Supabase for ${tableName}`);
      
//       if (allData.length > 0) {
//         await processBulkInsert(tableName, allData);
//         console.log(`💾 Synced ${allData.length} ${tableName} records locally`);
//       }
      
//       return allData;
//     }
//   } catch (error) {
//     console.error(`❌ Remote fetch failed for ${tableName}:`, error);
//     return [];
//   }
// };

// ---------- BUSINESS LOGIC QUERIES ----------
export async function getActiveBranches() {
  const cacheKey = getCacheKey('branches', 'getActiveBranches');
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const result = await localQuery('branches', {
    filters: {
      is_deleted: false
    },
    orderBy: 'name ASC'
  });

  setCache(cacheKey, result);
  return result;
}

export async function getAccountsByBranch(branchId) {
  const cacheKey = getCacheKey('accounts', 'getAccountsByBranch', { branchId });
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const result = await localQuery('accounts', {
    filters: {
      branch_id: branchId,
      is_deleted: false
    },
    orderBy: 'name ASC'
  });

  setCache(cacheKey, result);
  return result;
}

export async function getActiveBatches() {
  const cacheKey = getCacheKey('batches', 'getActiveBatches');
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const result = await localQuery('batches', {
    filters: {
      is_active: true,
      is_deleted: false
    },
    orderBy: 'purchase_date DESC'
  });

  setCache(cacheKey, result);
  return result;
}

export async function getOrdersByDateRange(startDate, endDate) {
  const cacheKey = getCacheKey('orders', 'getOrdersByDateRange', { startDate, endDate });
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const result = await localQuery('orders', {
    filters: {
      order_date: { op: 'between', from: startDate, to: endDate },
      is_deleted: false
    },
    orderBy: 'order_date DESC'
  });

  setCache(cacheKey, result);
  return result;
}

export async function getUsersByRole(role) {
  const cacheKey = getCacheKey('users', 'getUsersByRole', { role });
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const result = await localQuery('users', {
    filters: {
      role: role,
      is_deleted: false,
      is_activated: true
    },
    orderBy: 'first_name ASC'
  });

  setCache(cacheKey, result);
  return result;
}

// ---------- DATABASE SETUP ----------
export async function createTablesIfNotExists() {
  try {
    // The INITIAL_SCHEMA from your schema file will be executed by DatabaseService
    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// ---------- SYNC FUNCTIONS ----------
export async function syncWithSupabase(userId) {
  console.log('🔄 Starting background sync with Supabase...');
  await SyncManager.sync();
}

export async function saveUsersToLocal(users) {
  for (const user of users) {
    await saveUserToLocal(user);
  }
}

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

// Export SyncManager for direct access if needed
export { SyncManager };