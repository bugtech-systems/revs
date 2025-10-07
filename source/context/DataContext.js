// src/contexts/DataContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import DatabaseService from '../services/DatabaseService';
import SyncManager from '../services/SyncManager';
import { useSync } from './SyncContext';
import moment from 'moment-timezone';

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