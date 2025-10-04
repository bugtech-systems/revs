// src/hooks/useBatchedPull.js
import { useState, useCallback, useRef } from 'react';
import { pullFromSupabase, pullTablesFromSupabase, forceFullResync } from '../utils/batchPull';

const useBatchedPull = () => {
  const [pullState, setPullState] = useState({
    isPulling: false,
    currentTable: null,
    progress: 0,
    currentBatch: 0,
    totalBatches: 0,
    recordsProcessed: 0,
    error: null,
    lastPull: null,
    results: null
  });

  const abortControllerRef = useRef(null);

  const executePull = useCallback(async (userId, options = {}) => {
    if (pullState.isPulling) {
      console.log('Pull already in progress');
      return;
    }

    abortControllerRef.current = new AbortController();
    
    setPullState(prev => ({
      ...prev,
      isPulling: true,
      currentTable: null,
      progress: 0,
      error: null,
      results: null
    }));

    try {
      const results = await pullFromSupabase(userId, {
        ...options,
        onTableStart: (table) => {
          setPullState(prev => ({
            ...prev,
            currentTable: table
          }));
        },
        onProgress: (progressInfo) => {
          setPullState(prev => ({
            ...prev,
            progress: progressInfo.progress * 100,
            recordsProcessed: prev.recordsProcessed + 
              (progressInfo.inserted + progressInfo.updated + progressInfo.deleted)
          }));
        },
        onTableComplete: (table, tableResults) => {
          console.log(`Completed pull for ${table}`, tableResults);
        }
      });

      setPullState(prev => ({
        ...prev,
        isPulling: false,
        lastPull: results.completedAt,
        results,
        currentTable: null,
        progress: 100
      }));

      return results;

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Pull failed:', error);
        setPullState(prev => ({
          ...prev,
          isPulling: false,
          error: error.message
        }));
      }
      throw error;
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        abortControllerRef.current = null;
      }
    }
  }, [pullState.isPulling]);

  const pullSpecificTables = useCallback(async (tableNames, options = {}) => {
    return await executePull(null, {
      ...options,
      tables: tableNames
    });
  }, [executePull]);

  const fullResync = useCallback(async (options = {}) => {
    setPullState(prev => ({ ...prev, isPulling: true }));
    
    try {
      const results = await forceFullResync(options);
      
      setPullState(prev => ({
        ...prev,
        isPulling: false,
        lastPull: results.completedAt,
        results
      }));
      
      return results;
    } catch (error) {
      setPullState(prev => ({
        ...prev,
        isPulling: false,
        error: error.message
      }));
      throw error;
    }
  }, []);

  const abortPull = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setPullState(prev => ({
        ...prev,
        isPulling: false,
        currentTable: null,
        error: 'Pull aborted by user'
      }));
      console.log('Pull aborted');
    }
  }, []);

  const resetPullState = useCallback(() => {
    setPullState({
      isPulling: false,
      currentTable: null,
      progress: 0,
      currentBatch: 0,
      totalBatches: 0,
      recordsProcessed: 0,
      error: null,
      lastPull: null,
      results: null
    });
  }, []);

  return {
    // State
    ...pullState,
    
    // Actions
    pullFromSupabase: executePull,
    pullTables: pullSpecificTables,
    fullResync,
    abortPull,
    resetPullState,
    
    // Derived state
    hasResults: !!pullState.results,
    success: !pullState.error && pullState.results?.completedAt
  };
};

export default useBatchedPull;