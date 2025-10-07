// src/contexts/OfflineSyncContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import DatabaseService from "../services/DatabaseService";
import SyncManager from "../services/SyncManager";
import SupabaseService from "../services/SupabaseService";
import { syncConfig } from "../configs/syncConfig";
import { generateObjectId } from "../utils/helpers";
import { schema } from "../services/schema";
import { normalizeValue } from "../utils/offlineSync";
import { useSync } from './SyncContext';

const OfflineSyncContext = createContext(null);

// Enhanced query builder with proper filter handling
function buildWhereClause(filters = {}) {
  const whereClauses = [];
  const values = [];

  for (const key in filters) {
    const filter = filters[key];

    // Handle null values
    if (filter === null) {
      whereClauses.push(`${key} IS NULL`);
      continue;
    }

    // Handle plain values (default to equals)
    if (typeof filter !== "object" || !filter.op) {
      whereClauses.push(`${key} = ?`);
      values.push(filter);
      continue;
    }

    // Handle operator objects
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
        values.push(`%${filter.value}%`);
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
        whereClauses.push(`${key} LIKE ?`);
        values.push(`%${filter.value}%`);
        break;

      default:
        console.warn(`Unsupported operator: ${filter.op} for field ${key}`);
        break;
    }
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  return { whereSql, values };
}

// JSON normalization helpers



export function normalizeRecordForSQLite(table, remoteRow) {
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

const normalizeRecordFromSQLite = (tableName, record) => {
  const normalized = { ...record };
  
  const jsonFields = {
    users: ['configuration', 'uplines'],
    bettings: ['hits', 'commissions', 'combinations', 'uplines'],
    messages: ['conversations'],
    draws: ['results']
  };
  
  if (jsonFields[tableName]) {
    jsonFields[tableName].forEach(field => {
      if (normalized[field] && typeof normalized[field] === 'string') {
        try {
          normalized[field] = JSON.parse(normalized[field]);
        } catch {
          // Keep original value if parsing fails
        }
      }
    });
  }
  
  return normalized;
};

// Bulk data processing
const processBulkInsert = async (tableName, records) => {
  if (records.length === 0) return 0;

  const batchSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const columns = Object.keys(normalizeRecordForSQLite(tableName, batch[0]));
    const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = batch.flatMap(record => {
      const normalized = normalizeRecordForSQLite(tableName, record);
      return columns.map(col => normalized[col]);
    });

    await DatabaseService.executeQuery(
      `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`,
      values
    );

    totalInserted += batch.length;
  }

  console.log(`💾 Bulk inserted ${totalInserted} ${tableName} records`);
  return totalInserted;
};

// Enhanced remote query with pagination
const fetchAllRemoteDataWithPagination = async (tableName, baseQuery, maxRecords = 50000) => {
  const allData = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore && allData.length < maxRecords) {
    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await baseQuery.range(from, to);

      if (error) {
        console.error(`❌ Error fetching ${tableName} page ${page}:`, error);
        break;
      }

      if (data && data.length > 0) {
        allData.push(...data);
        
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }

      // Small delay to avoid rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error(`❌ Error in ${tableName} bulk fetch:`, error);
      break;
    }
  }

  console.log(`✅ Fetched ${allData.length} ${tableName} records from remote`);
  return allData;
};


export const OfflineSyncProvider = ({ session, children }) => {
  const { queueChange, isReady: syncReady } = useSync();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [online, setOnline] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);


// Core CRUD operations
const localInsert = async (tableName, recordData) => {
//   const id =  record.id || generateObjectId();
//   const manilaTime = SyncManager.getCurrentManilaTime();
  
  
//       const { _status, _version, ...cleanRecordData } = record;
      
//       const fullRecord = {
//         ...cleanRecordData,
//         id,
//         created_at: manilaTime,
//         updated_at: manilaTime,
//       };

//       const columns = Object.keys(fullRecord);
//       const placeholders = columns.map(() => '?').join(', ');
//       const values = columns.map(col => DatabaseService.sanitizeValue(fullRecord[col]));

//       await DatabaseService.executeQuery(
//         `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
//         values
//       );

//  /*      // Queue for sync - send clean data without sync columns
//       if (syncReady) {
//         await queueChange(tableName, 'INSERT', id, record);
//       }
//        */
  

//   await SyncManager.queueChange(tableName, 'INSERT', id, fullRecord);
  
//   return fullRecord;


     const id = `${tableName}_${Date.now()}`;

      const manilaTime = SyncManager.getCurrentManilaTime(); // Use Manila time

      // Remove any sync columns from the data being sent to Supabase
      const { _status, _version, ...cleanRecordData } = recordData;
      
      const record = {
        ...cleanRecordData,
        id: generateObjectId()
      };

      const columns = Object.keys(record);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => DatabaseService.sanitizeValue(record[col]));

      await DatabaseService.executeQuery(
        `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );

      // Queue for sync - send clean data without sync columns
      if (syncReady) {
        await queueChange(tableName, 'INSERT', id, cleanRecordData);
      }

           const result = await localGet(tableName, record.id)
      // await SyncManager.pushLocalChanges();
  console.log(result, "CREATED ??")
      // await loadData(); // Refresh data
      return record;
      
      

};

const localUpdate = async (tableName, id, patch) => {
  const existingResult = await DatabaseService.executeQuery(
    `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
    [id]
  );
  
  if (existingResult.rows.length === 0) {
    throw new Error(`Record not found: ${id}`);
  }

  const existing = existingResult.rows[0];
  const now = SyncManager.getCurrentManilaTime();

  
          const { _status, _version, ...cleanRecordData } = patch;

  
  
  const updatedRecord = {
    ...existing,
    ...cleanRecordData,
    updated_at: now
  };

  const normalizedRecord = normalizeRecordForSQLite(tableName, updatedRecord);

  const columns = Object.keys(normalizedRecord).filter(col => col !== 'id');
  const setClause = columns.map(col => `${col} = ?`).join(', ');
  const values = [...columns.map(col => normalizedRecord[col]), id];

  await DatabaseService.executeQuery(
    `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
    values
  );

  await SyncManager.queueChange(tableName, 'UPDATE', id, normalizedRecord);
  
  return updatedRecord;
};

const localDelete = async (tableName, id) => {
  const tableConfig = syncConfig.tables[tableName];
  
  if (tableConfig?.softDelete) {
    await DatabaseService.executeQuery(
      `UPDATE ${tableName} SET is_deleted = 1, updated_at = ? WHERE id = ?`,
      [SyncManager.getCurrentManilaTime(), id]
    );
    
    const existing = await DatabaseService.executeQuery(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [id]
    );
    
    if (existing.rows.length > 0) {
      await SyncManager.queueChange(tableName, 'UPDATE', id, {
        is_deleted: 1,
        updated_at: SyncManager.getCurrentManilaTime()
      });
    }
  } else {
    await DatabaseService.executeQuery(
      `DELETE FROM ${tableName} WHERE id = ?`,
      [id]
    );
    
    await SyncManager.queueChange(tableName, 'DELETE', id);
  }
  
  return true;
};

const localGet = async (tableName, id) => {
  const result = await DatabaseService.executeQuery(
    `SELECT * FROM ${tableName} WHERE id = ?`,
    [id]
  );
  
  if (result.rows.length === 0) return null;
  
  const record = result.rows[0];
  return normalizeRecordFromSQLite(tableName, record);
};

const localQuery = async (tableName, params = {}) => {
  const { filters = {}, limit, offset, orderBy } = params;

  const { whereSql, values } = buildWhereClause(filters);

  const orderSql = orderBy ? `ORDER BY ${orderBy}` : "ORDER BY created_at DESC";
  const limitSql = limit ? `LIMIT ${limit}` : "";
  const offsetSql = offset ? `OFFSET ${offset}` : "";

  const sql = `SELECT * FROM ${tableName} ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`;
  
  try {
    const result = await DatabaseService.executeQuery(sql, values);
    
    console.log(result, 'LOCALLS')
    console.log(result.rows.map(record => normalizeRecordFromSQLite(tableName, record)),'LOCALL QUERYSS')
    return result.rows.map(record => normalizeRecordFromSQLite(tableName, record));
    
    
  } catch (error) {
    console.error(`❌ Local query failed for ${tableName}:`, error);
    throw error;
  }
};

const localList = async (tableName, whereClause = "", params = []) => {
  const sql = `SELECT * FROM ${tableName} ${whereClause} ORDER BY created_at DESC`;
  const result = await DatabaseService.executeQuery(sql, params);
  
  return result.rows.map(record => normalizeRecordFromSQLite(tableName, record));
};

// FAST RESPONSE STRATEGY: Return local data first, then sync remote in background
const fastResponseGet = async (tableName, id) => {
  // 1. Always return local data first (fast response)
  console.log(`📱 Getting ${tableName} ${id} from local storage...`);
  const localData = await localGet(tableName, id);
  
  // 2. If online, sync remote data in background
  if (online && SupabaseService.isConnected() && (!localData || localData.updated_at < new Date(Date.now() - 5 * 60 * 1000).toISOString())) {
    syncRemoteDataInBackground(tableName, 'get', { id });
  }
  
  return localData;
};

const fastResponseQuery = async (tableName, params = {}) => {
  // 1. Always return local data first (fast response)
  console.log(`📱 Querying ${tableName} from local storage...`, !SupabaseService.isConnected());
  const localData = await localQuery(tableName, params);
  
  console.log(localData, 'LOCAL DATA')
  // 2. If online, sync remote data in background
  if (SupabaseService.isConnected()) {
    syncRemoteDataInBackground(tableName, 'query', params);
  } else {
  
  }
  
  return localData;
};

const fastResponseList = async (tableName, params = {}) => {
  // 1. Always return local data first (fast response)
  console.log(`📱 Listing ${tableName} from local storage...`);
  const localData = await localList(tableName);
  
  // 2. If online, sync remote data in background
  if (online && SupabaseService.isConnected()) {
    syncRemoteDataInBackground(tableName, 'list', params);
  }
  
  return localData;
};

// Background remote sync
const syncRemoteDataInBackground = async (tableName, operation, params = {}) => {
  // Run in background without blocking
  setTimeout(async () => {
    try {
      console.log(`🔄 Background sync for ${tableName}...`);
      const supabase = SupabaseService.getClient();
      
      let query = supabase.from(tableName).select('*');
      
      // Apply filters for query operations
      if (operation === 'query' && params.filters) {
        Object.entries(params.filters).forEach(([key, filter]) => {
          if (typeof filter !== "object" || !filter.op) {
            query = query.eq(key, filter);
          } else {
            switch (filter.op.toLowerCase()) {
              case "=": query = query.eq(key, filter.value); break;
              case "!=": query = query.neq(key, filter.value); break;
              case ">": query = query.gt(key, filter.value); break;
              case ">=": query = query.gte(key, filter.value); break;
              case "<": query = query.lt(key, filter.value); break;
              case "<=": query = query.lte(key, filter.value); break;
              case "like": query = query.like(key, `%${filter.value}%`); break;
              case "in": query = query.in(key, filter.value); break;
              case "is": 
                if (filter.value === null) query = query.is(key, null);
                break;
            }
          }
        });
      }
      
      // Apply ordering
      if (params.orderBy) {
        const [column, order] = params.orderBy.split(' ');
        query = query.order(column, { ascending: order?.toLowerCase() === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // For get operations, fetch specific record
      if (operation === 'get' && params.id) {
        const { data, error } = await query.eq('id', params.id).single();
        
        if (!error && data) {
          const normalized = normalizeRecordForSQLite(tableName, data);
          const columns = Object.keys(normalized);
          const placeholders = columns.map(() => '?').join(', ');
          const values = columns.map(col => normalized[col]);
          
          await DatabaseService.executeQuery(
            `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
          console.log(`💾 Background updated ${tableName} record ${params.id}`);
        }
      } else {
        // For query/list operations, fetch all matching data
        const allData = await fetchAllRemoteDataWithPagination(tableName, query, params.maxRecords || 10000);
        
        if (allData.length > 0) {
          await processBulkInsert(tableName, allData);
          console.log(`💾 Background updated ${allData.length} ${tableName} records`);
        }
      }
      
      console.log(`✅ Background sync completed for ${tableName}`);
    } catch (error) {
      console.warn(`⚠️ Background sync failed for ${tableName}:`, error.message);
    }
  }, 100); // Small delay to ensure UI responsiveness
};

// Enhanced API with fast response strategy
const createFastResponseApi = (online) => ({
  // users
  createUser: async (user) => localInsert('users', { ...user }),
  updateUser: async (id, patch) => localUpdate('users', id, patch),
  deleteUser: async (id) => localDelete('users', id),
  getUser: async (id) => fastResponseGet('users', id),
  listUsers: async (params) => fastResponseQuery('users', params),

  // draws
  createDraw: async (draw) => localInsert('draws', { ...draw }),
  updateDraw: async (id, patch) => localUpdate('draws', id, patch),
  deleteDraw: async (id) => localDelete('draws', id),
  getDraw: async (id) => fastResponseGet('draws', id),
  listDraws: async (params) => fastResponseQuery('draws', params),

  // bettings
  createBetting: async (b) => localInsert('bettings', { ...b }),
  updateBetting: async (id, patch) => localUpdate('bettings', id, patch),
  deleteBetting: async (id) => localDelete('bettings', id),
  getBetting: async (id) => fastResponseGet('bettings', id),
  listBettings: async (params) => fastResponseQuery('bettings', params),

  // master_combinations
  createMasterCombination: async (m) => localInsert('master_combinations', { ...m }),
  updateMasterCombination: async (id, patch) => localUpdate('master_combinations', id, patch),
  deleteMasterCombination: async (id) => localDelete('master_combinations', id),
  getMasterCombination: async (id) => fastResponseGet('master_combinations', id),
  listMasterCombinations: async (params) => fastResponseQuery('master_combinations', params),

  // messages
  createMessage: async (m) => localInsert('messages', { ...m }),
  updateMessage: async (id, patch) => localUpdate('messages', id, patch),
  deleteMessage: async (id) => localDelete('messages', id),
  getMessage: async (id) => fastResponseGet('messages', id),
  listMessages: async (params) => fastResponseList('messages', params),

  // cashflow
  createCashflow: async (c) => localInsert('cashflow', { ...c }),
  updateCashflow: async (id, patch) => localUpdate('cashflow', id, patch),
  deleteCashflow: async (id) => localDelete('cashflow', id),
  getCashflow: async (id) => fastResponseGet('cashflow', id),
  listCashflow: async (params) => fastResponseList('cashflow', params),

  // Bulk operations
  fetchAll: async (tableName, params = {}) => {
    const localData = await localQuery(tableName, params);
    
    if (online && SupabaseService.isConnected()) {
      syncRemoteDataInBackground(tableName, 'query', { ...params, fetchAll: true });
    }
    
    return localData;
  },

  bulkInsert: async (tableName, records) => {
    const inserted = await processBulkInsert(tableName, records);
    
    // Queue sync for each record
    for (const record of records) {
      const normalized = normalizeRecordForSQLite(tableName, record);
      await SyncManager.queueChange(tableName, 'INSERT', record.id, normalized);
    }
    
    return inserted;
  },

  // Force immediate remote sync (for when you need fresh data)
  forceRemoteSync: async (tableName, params = {}) => {
    if (!online || !SupabaseService.isConnected()) {
      throw new Error('No internet connection');
    }

    console.log(`🔄 Force syncing ${tableName} from remote...`);
    const supabase = SupabaseService.getClient();
    
    let query = supabase.from(tableName).select('*');
    
    // Apply filters
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, filter]) => {
        if (typeof filter !== "object" || !filter.op) {
          query = query.eq(key, filter);
        } else {
          switch (filter.op.toLowerCase()) {
            case "=": query = query.eq(key, filter.value); break;
            case "!=": query = query.neq(key, filter.value); break;
            case ">": query = query.gt(key, filter.value); break;
            case ">=": query = query.gte(key, filter.value); break;
            case "<": query = query.lt(key, filter.value); break;
            case "<=": query = query.lte(key, filter.value); break;
            case "like": query = query.like(key, `%${filter.value}%`); break;
            case "in": query = query.in(key, filter.value); break;
          }
        }
      });
    }
    
    // Apply ordering
    if (params.orderBy) {
      const [column, order] = params.orderBy.split(' ');
      query = query.order(column, { ascending: order?.toLowerCase() === 'asc' });
    }

    const allData = await fetchAllRemoteDataWithPagination(tableName, query, params.maxRecords || 10000);
    
    if (allData.length > 0) {
      await processBulkInsert(tableName, allData);
      console.log(`✅ Force sync completed: ${allData.length} ${tableName} records`);
      return allData.map(record => normalizeRecordFromSQLite(tableName, record));
    }
    
    return [];
  }
});


  const forceFullResync = useCallback(async () => {
    if (syncing || !isInitialized) {
      console.log('⏸️ Full resync skipped: already syncing or not initialized');
      return;
    }

    try {
      setSyncing(true);
      console.log('🔄 Starting full resync...');
      
      await DatabaseService.executeQuery(
        `DELETE FROM sync_metadata WHERE key = 'last_sync_time'`
      );
      
      for (const tableName of Object.keys(syncConfig.tables)) {
        await DatabaseService.executeQuery(
          `DELETE FROM sync_metadata WHERE key LIKE ?`,
          [`%remote_${tableName}%`]
        );
      }
      
      await SyncManager.sync();
      
      setLastSync(new Date().toISOString());
      console.log('✅ Full resync completed');
    } catch (error) {
      console.error('❌ Full resync failed:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, []);

  const api = createFastResponseApi(online);

  const value = {
    api,
    syncing,
    lastSync,
    online,
    // syncNow,
    forceFullResync,
    isInitialized,
    database: DatabaseService,
    syncManager: SyncManager,
    buildWhereClause,
    normalizeRecordForSQLite,
    normalizeRecordFromSQLite
  };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSync = () => {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error("useOfflineSync must be used within an OfflineSyncProvider");
  }
  return context;
};

// Hook for table operations with fast response
export const useTableData = (tableName, initialParams = {}) => {
  const { api } = useOfflineSync();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const listMethod = `list${tableName.charAt(0).toUpperCase() + tableName.slice(1).replace('_', '')}`;

  const loadData = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api[listMethod]({ ...initialParams, ...params });
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api, listMethod, initialParams]);

  const refresh = useCallback(async (params = {}) => {
    return await loadData(params);
  }, [loadData]);

  const forceSync = useCallback(async (params = {}) => {
    if (!online) {
      throw new Error('No internet connection for force sync');
    }
    
    try {
      setLoading(true);
      const result = await api.forceRemoteSync(tableName, { ...initialParams, ...params });
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api, tableName, initialParams]);

  return {
    data,
    loading,
    error,
    online,
    refresh,
    // forceSync,
    setData
  };
};

export const useQueryBuilder = () => {
  const { buildWhereClause } = useOfflineSync();
  
  return {
    buildWhereClause,
    equal: (field, value) => ({ [field]: value }),
    notEqual: (field, value) => ({ [field]: { op: '!=', value } }),
    greaterThan: (field, value) => ({ [field]: { op: '>', value } }),
    lessThan: (field, value) => ({ [field]: { op: '<', value } }),
    between: (field, from, to) => ({ [field]: { op: 'between', from, to } }),
    like: (field, value) => ({ [field]: { op: 'like', value } }),
    in: (field, values) => ({ [field]: { op: 'in', value: values } }),
    isNull: (field) => ({ [field]: { op: 'null' } }),
    isNotNull: (field) => ({ [field]: { op: 'notnull' } }),
    contains: (field, value) => ({ [field]: { op: 'contains', value } })
  };
};