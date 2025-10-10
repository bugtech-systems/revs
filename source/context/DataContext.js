// src/contexts/DataContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import DatabaseService from '../services/DatabaseService';
import SyncManager from '../services/SyncManager';
import { useSync } from './SyncContext';

const DataContext = createContext();

export const useData = (tableName) => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  
  if (!tableName) {
    throw new Error('Table name is required');
  }
  
  return context.getTable(tableName);
};

export const DataProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const { queueChange, isReady: syncReady } = useSync();

  // Initialize database
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('💾 Initializing database...');
        await DatabaseService.init();
        setIsReady(true);
        console.log('✅ Database ready');
      } catch (error) {
        console.error('❌ Database initialization failed:', error);
      }
    };

    initialize();
  }, []);

  // Get table operations
  const getTable = (tableName) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load table data
    const loadData = async (whereClause = '') => {
      if (!isReady) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const where = whereClause ? `WHERE ${whereClause}` : '';
        const result = await DatabaseService.executeQuery(
          `SELECT * FROM ${tableName} ${where} ORDER BY updated_at DESC`
        );
        setData(result.rows);
      } catch (err) {
        setError(err.message);
        console.error(`Error loading ${tableName}:`, err);
      } finally {
        setLoading(false);
      }
    };
    // CRUD operations
    const create = async (recordData) => {
      if (!isReady) throw new Error('Database not ready');
      
      const id = `${tableName}_${Date.now()}`;
      const manilaTime = SyncManager.getCurrentManilaTime(); // Use Manila time

      // Remove any sync columns from the data being sent to Supabase
      const { _status, _version, ...cleanRecordData } = recordData;
      
      const record = {
        ...cleanRecordData,
        id,
        created_at: manilaTime,
        updated_at: manilaTime,
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
        await queueChange(tableName, 'INSERT', id, record);
      }

      await loadData(); // Refresh data
      return record;
    };

     const update = async (id, updates) => {
      if (!isReady) throw new Error('Database not ready');
        const manilaTime = SyncManager.getCurrentManilaTime(); // Use Manila time
  
      // Remove any sync columns from updates
      const { _status, _version, ...cleanUpdates } = updates;
      
  const updatedRecord = { ...cleanUpdates, updated_at: manilaTime };

      const columns = Object.keys(cleanUpdates);
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = columns.map(col => DatabaseService.sanitizeValue(updatedRecord[col]));

      await DatabaseService.executeQuery(
        `UPDATE ${tableName} SET ${setClause}, updated_at = ? WHERE id = ?`,
        [...values, manilaTime, id]
      );

      // Queue for sync - send clean data without sync columns
      if (syncReady) {
        await queueChange(tableName, 'UPDATE', id, updatedRecord);
      }

      await loadData(); // Refresh data
      return updatedRecord;
    };

    const remove = async (id) => {
      if (!isReady) throw new Error('Database not ready');
      
      // Check if table has is_deleted column
      const tableInfo = await DatabaseService.executeQuery(`PRAGMA table_info(${tableName})`);
      const hasIsDeleted = tableInfo.rows.some(col => col.name === 'is_deleted');

      if (hasIsDeleted) {
        // Soft delete
        await update(id, { is_deleted: 1 });
      } else {
        // Hard delete
        await DatabaseService.executeQuery(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
        
        // Queue for sync
        if (syncReady) {
          await queueChange(tableName, 'DELETE', id);
        }
      }
      
      await loadData(); // Refresh data
    };


     const search = async (searchTerm, searchFields = ['name']) => {
      if (!searchTerm) {
        await loadData();
        return;
      }

      const whereParts = searchFields.map(field => `${field} LIKE ?`);
      const whereClause = whereParts.join(' OR ');
      const params = searchFields.map(() => `%${searchTerm}%`);

      setLoading(true);
      try {
        const result = await DatabaseService.executeQuery(
          `SELECT * FROM ${tableName} WHERE ${whereClause} ORDER BY updated_at DESC`,
          params
        );
        setData(result.rows);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

 const getById = async (id) => {
      const result = await DatabaseService.executeQuery(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [id]
      );
      return result.rows[0] || null;
    };

    const getWhere = async (whereClause, params = []) => {
      const result = await DatabaseService.executeQuery(
        `SELECT * FROM ${tableName} WHERE ${whereClause}`,
        params
      );
      return result.rows;
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



  const api = createFastResponseApi(online);





    // Load data when table is first accessed and database is ready
    useEffect(() => {
      if (isReady) {
        loadData();
      }
    }, [isReady, tableName]);

   








    return {
      // State
      data,
      loading,
      error,
      
      // Actions
      create,
      update,
      delete: remove,
      refresh: loadData,
      search,
      getById,
      getWhere,
      
      // Status
      isReady: isReady && !loading
    };
  };

  const contextValue = {
    getTable,
    isReady
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};