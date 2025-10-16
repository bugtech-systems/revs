// src/contexts/SyncContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import SyncManager from '../services/SyncManager';
import SupabaseService from '../services/SupabaseService';

const SyncContext = createContext();

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

export const SyncProvider = ({ children, config = {} }) => {
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState({
    isSyncing: false,
    lastSync: null,
    pending: 0,
    failed: 0
  });

  // Initialize sync manager
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🔄 Initializing sync...');
        
        // First initialize the SyncManager (which waits for database)
        await SyncManager.init();
        
        // Then configure tables for syncing
        Object.entries(config.tables || {}).forEach(([tableName, tableConfig]) => {
          SyncManager.configureTable(tableName, tableConfig);
        });

        // Start background sync
        SyncManager.startBackgroundSync(config.syncInterval);
        
        // Get initial status
        const initialStatus = await SyncManager.getSyncStatus();
        setStatus(initialStatus);
        setIsReady(true);
        
        console.log('✅ Sync ready');
      } catch (error) {
        console.error('❌ Sync initialization failed:', error);
      }
    };
    
    console.log(SupabaseService.isConnected(), 'SUPABASE')

    initialize();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up sync...');
      SyncManager.stopBackgroundSync();
      SupabaseService.cleanup();
    };
  }, [config]);

  // Listen for sync events
  useEffect(() => {
    const syncListener = (event) => {
      switch (event.type) {
        case 'sync_started':
          setStatus(prev => ({ ...prev, isSyncing: true }));
          break;
        case 'sync_completed':
          SyncManager.getSyncStatus().then(newStatus => {
            setStatus({
              ...newStatus,
              isSyncing: false,
              lastSync: new Date(event.timestamp)
            });
          });
          break;
        case 'sync_failed':
          setStatus(prev => ({ ...prev, isSyncing: false }));
          break;
      }
    };

    SyncManager.addSyncListener(syncListener);
    
    return () => {
      SyncManager.removeSyncListener(syncListener);
    };
  }, []);
  
  

  // Sync operations
  const manualSync = async () => {
    if (!isReady) throw new Error('Sync not ready');
    await SyncManager.sync();
  };

  const cleanup = async () => {
    if (!isReady) throw new Error('Sync not ready');
    await SyncManager.cleanupOldData();
  };

  const queueChange = async (tableName, operation, recordId, data = null) => {
    if (!isReady) throw new Error('Sync not ready');
    await SyncManager.queueChange(tableName, operation, recordId, data);
  };
  
    const forceCleanup = async () => {
    if (!isReady) throw new Error('Sync not ready');
    await SyncManager.forceCleanup();
  };
  
  const forceFullSync = async () => {
  if (!isReady) return console.log('Sync not ready');
  
  await SyncManager.forceFullSync();
};



  const contextValue = {
    // State
    isReady,
    status,
    
    // Actions
    manualSync,
    cleanup,
    queueChange,
    forceCleanup,
    forceFullSync,
    // Convenience methods
    isSyncing: status.isSyncing,
    lastSync: status.lastSync,
    pendingCount: status.pending,
    failedCount: status.failed
  };

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
};