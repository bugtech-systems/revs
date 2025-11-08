// src/redux/actions/syncActions.js
import SyncManager from '../../services/SyncManager';
import SupabaseService from '../../services/SupabaseService';

export const SYNC_ACTION_TYPES = {
  // Sync initialization
  INITIALIZE_SYNC_REQUEST: 'INITIALIZE_SYNC_REQUEST',
  INITIALIZE_SYNC_SUCCESS: 'INITIALIZE_SYNC_SUCCESS',
  INITIALIZE_SYNC_FAILURE: 'INITIALIZE_SYNC_FAILURE',

  // Sync status
  UPDATE_SYNC_STATUS: 'UPDATE_SYNC_STATUS',
  SET_SYNC_READY: 'SET_SYNC_READY',
  INCREMENT_DATA_VERSION: 'INCREMENT_DATA_VERSION',

  // Sync operations
  MANUAL_SYNC_REQUEST: 'MANUAL_SYNC_REQUEST',
  MANUAL_SYNC_SUCCESS: 'MANUAL_SYNC_SUCCESS',
  MANUAL_SYNC_FAILURE: 'MANUAL_SYNC_FAILURE',

  CLEANUP_REQUEST: 'CLEANUP_REQUEST',
  CLEANUP_SUCCESS: 'CLEANUP_SUCCESS',
  CLEANUP_FAILURE: 'CLEANUP_FAILURE',

  FORCE_CLEANUP_REQUEST: 'FORCE_CLEANUP_REQUEST',
  FORCE_CLEANUP_SUCCESS: 'FORCE_CLEANUP_SUCCESS',
  FORCE_CLEANUP_FAILURE: 'FORCE_CLEANUP_FAILURE',

  FORCE_FULL_SYNC_REQUEST: 'FORCE_FULL_SYNC_REQUEST',
  FORCE_FULL_SYNC_SUCCESS: 'FORCE_FULL_SYNC_SUCCESS',
  FORCE_FULL_SYNC_FAILURE: 'FORCE_FULL_SYNC_FAILURE',

  QUEUE_CHANGE_REQUEST: 'QUEUE_CHANGE_REQUEST',
  QUEUE_CHANGE_SUCCESS: 'QUEUE_CHANGE_SUCCESS',
  QUEUE_CHANGE_FAILURE: 'QUEUE_CHANGE_FAILURE',

  // Sync events
  SYNC_STARTED: 'SYNC_STARTED',
  SYNC_COMPLETED: 'SYNC_COMPLETED',
  SYNC_FAILED: 'SYNC_FAILED',
};

// Action Creators
export const initializeSync = (config = {}) => async (dispatch) => {
  dispatch({ type: SYNC_ACTION_TYPES.INITIALIZE_SYNC_REQUEST });

  try {
    console.log('🔄 Initializing sync with Redux...');

    // Initialize SyncManager
    await SyncManager.init();

    // Configure tables for syncing


    // Start background sync
    SyncManager.startBackgroundSync(config.syncInterval);

    // Get initial status
    const initialStatus = await SyncManager.getSyncStatus();

    dispatch({
      type: SYNC_ACTION_TYPES.INITIALIZE_SYNC_SUCCESS,
      payload: { status: initialStatus }
    });

    console.log('✅ Sync ready with Redux');

  } catch (error) {
    console.error('❌ Sync initialization failed:', error);
    dispatch({
      type: SYNC_ACTION_TYPES.INITIALIZE_SYNC_FAILURE,
      payload: error.message
    });
  }
};

export const updateSyncStatus = (status) => ({
  type: SYNC_ACTION_TYPES.UPDATE_SYNC_STATUS,
  payload: status
});

export const setSyncReady = (isReady) => ({
  type: SYNC_ACTION_TYPES.SET_SYNC_READY,
  payload: isReady
});

export const incrementDataVersion = () => ({
  type: SYNC_ACTION_TYPES.INCREMENT_DATA_VERSION
});


export const pauseSync = () => ({
  type: 'PAUSE_SYNC',
});

export const resumeSync = () => ({
  type: 'RESUME_SYNC',
});

export const setOnline = () => ({
  type: 'SET_ONLINE',
});

export const setOffline = () => ({
  type: 'SET_OFFLINE',
});

// export const manualSync = () => async (dispatch) => {
//   dispatch({ type: 'SYNC_STARTED' });
//   try {
//     // Implement your manual sync logic here
//     // This could trigger synchronization with Supabase
//     const result = await performManualSync();
//     dispatch({ type: 'SYNC_COMPLETED', payload: result });
//   } catch (error) {
//     dispatch({ type: 'SYNC_FAILED', payload: error.message });
//   }
// };



export const manualSync = () => async (dispatch, getState) => {
  const { isReady } = getState().sync;

  if (!isReady) {
    throw new Error('Sync not ready');
  }

  dispatch({ type: SYNC_ACTION_TYPES.MANUAL_SYNC_REQUEST });

  try {
    await SyncManager.sync();
    dispatch({ type: SYNC_ACTION_TYPES.MANUAL_SYNC_SUCCESS });
    dispatch(incrementDataVersion());
  } catch (error) {
    dispatch({
      type: SYNC_ACTION_TYPES.MANUAL_SYNC_FAILURE,
      payload: error.message
    });
    throw error;
  }
};

export const cleanup = () => async (dispatch, getState) => {
  const { isReady } = getState().sync;

  if (!isReady) {
    throw new Error('Sync not ready');
  }

  dispatch({ type: SYNC_ACTION_TYPES.CLEANUP_REQUEST });

  try {
    await SyncManager.cleanupOldData();
    dispatch({ type: SYNC_ACTION_TYPES.CLEANUP_SUCCESS });
  } catch (error) {
    dispatch({
      type: SYNC_ACTION_TYPES.CLEANUP_FAILURE,
      payload: error.message
    });
    throw error;
  }
};

export const forceCleanup = () => async (dispatch, getState) => {
  const { isReady } = getState().sync;

  if (!isReady) {
    throw new Error('Sync not ready');
  }

  dispatch({ type: SYNC_ACTION_TYPES.FORCE_CLEANUP_REQUEST });

  try {
    await SyncManager.forceCleanup();
    dispatch({ type: SYNC_ACTION_TYPES.FORCE_CLEANUP_SUCCESS });
  } catch (error) {
    dispatch({
      type: SYNC_ACTION_TYPES.FORCE_CLEANUP_FAILURE,
      payload: error.message
    });
    throw error;
  }
};

export const forceFullSync = () => async (dispatch, getState) => {
  const { isReady } = getState().sync;

  if (!isReady) {
    console.log('Sync not ready');
    return;
  }

  dispatch({ type: SYNC_ACTION_TYPES.FORCE_FULL_SYNC_REQUEST });

  try {
    await SyncManager.forceFullSync();
    dispatch({ type: SYNC_ACTION_TYPES.FORCE_FULL_SYNC_SUCCESS });
    dispatch(incrementDataVersion());
  } catch (error) {
    dispatch({
      type: SYNC_ACTION_TYPES.FORCE_FULL_SYNC_FAILURE,
      payload: error.message
    });
    throw error;
  }
};

export const queueChange = (tableName, operation, recordId, data = null) => async (dispatch, getState) => {
  const { isReady } = getState().sync;

  if (!isReady) {
    throw new Error('Sync not ready');
  }

  dispatch({
    type: SYNC_ACTION_TYPES.QUEUE_CHANGE_REQUEST,
    payload: { tableName, operation, recordId }
  });

  try {
    await SyncManager.queueChange(tableName, operation, recordId, data);
    dispatch({
      type: SYNC_ACTION_TYPES.QUEUE_CHANGE_SUCCESS,
      payload: { tableName, operation, recordId }
    });
  } catch (error) {
    dispatch({
      type: SYNC_ACTION_TYPES.QUEUE_CHANGE_FAILURE,
      payload: { tableName, operation, recordId, error: error.message }
    });
    throw error;
  }
};

// Sync event actions
export const syncStarted = () => ({
  type: SYNC_ACTION_TYPES.SYNC_STARTED
});

export const syncCompleted = (timestamp) => ({
  type: SYNC_ACTION_TYPES.SYNC_COMPLETED,
  payload: { timestamp }
});

export const syncFailed = (error) => ({
  type: SYNC_ACTION_TYPES.SYNC_FAILED,
  payload: { error }
});

// Cleanup function for when component unmounts
export const cleanupSync = () => {
  return () => {
    console.log('🧹 Cleaning up sync with Redux...');
    SyncManager.stopBackgroundSync();
    SupabaseService.cleanup();
  };
};