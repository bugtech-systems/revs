// src/hooks/useSync.js
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect } from 'react';
import {
  initializeSync,
  manualSync,
  cleanup,
  forceCleanup,
  forceFullSync,
  queueChange,
  updateSyncStatus,
  syncStarted,
  syncCompleted,
  syncFailed,
  cleanupSync
} from '../redux/actions/syncActions';
import SyncManager from '../services/SyncManager';

export const useSync = (config = {}) => {
  const dispatch = useDispatch();
  const syncState = useSelector((state) => state.sync);

  // Initialize sync on mount
  useEffect(() => {
    dispatch(initializeSync(config));

    // Setup sync event listeners
    const syncListener = (event) => {
      switch (event.type) {
        case 'sync_started':
          dispatch(syncStarted());
          break;
        case 'sync_completed':
          dispatch(syncCompleted(event.timestamp));
          // Update status after sync completion
          SyncManager.getSyncStatus().then(newStatus => {
            dispatch(updateSyncStatus(newStatus));
          });
          break;
        case 'sync_failed':
          dispatch(syncFailed(event.error));
          break;
      }
    };

    SyncManager.addSyncListener(syncListener);

    // Cleanup on unmount
    return () => {
      SyncManager.removeSyncListener(syncListener);
      dispatch(cleanupSync());
    };
  }, [dispatch, config]);

  // Action wrappers
  const handleManualSync = useCallback(() => {
    return dispatch(manualSync());
  }, [dispatch]);

  const handleCleanup = useCallback(() => {
    return dispatch(cleanup());
  }, [dispatch]);

  const handleForceCleanup = useCallback(() => {
    return dispatch(forceCleanup());
  }, [dispatch]);

  const handleForceFullSync = useCallback(() => {
    return dispatch(forceFullSync());
  }, [dispatch]);

  const handleQueueChange = useCallback((tableName, operation, recordId, data = null) => {
    return dispatch(queueChange(tableName, operation, recordId, data));
  }, [dispatch]);

  // Convenience properties
  const isSyncing = syncState.status.isSyncing;
  const lastSync = syncState.status.lastSync;
  const pendingCount = syncState.status.pending;
  const failedCount = syncState.status.failed;
  const dataVersion = syncState.dataVersion;

  return {
    // State
    ...syncState,

    // Convenience properties
    isSyncing,
    lastSync,
    pendingCount,
    failedCount,
    dataVersion,

    // Actions
    manualSync: handleManualSync,
    cleanup: handleCleanup,
    forceCleanup: handleForceCleanup,
    forceFullSync: handleForceFullSync,
    queueChange: handleQueueChange,

    // Operation states
    isManualSyncing: syncState.operations.manualSync.loading,
    isCleaningUp: syncState.operations.cleanup.loading,
    isForceCleaningUp: syncState.operations.forceCleanup.loading,
    isForceFullSyncing: syncState.operations.forceFullSync.loading,
    isQueueChanging: syncState.operations.queueChange.loading,

    // Operation errors
    manualSyncError: syncState.operations.manualSync.error,
    cleanupError: syncState.operations.cleanup.error,
    forceCleanupError: syncState.operations.forceCleanup.error,
    forceFullSyncError: syncState.operations.forceFullSync.error,
    queueChangeError: syncState.operations.queueChange.error,
  };
};

export default useSync;