// src/redux/reducers/syncReducer.js
import { SYNC_ACTION_TYPES } from '../actions/syncActions';

const initialState = {
  // Sync state
  isReady: false,
  isInitializing: false,
  dataVersion: 0,

  // Sync status
  status: {
    isSyncing: false,
    lastSync: null,
    pending: 0,
    failed: 0
  },

  // Operation states
  operations: {
    manualSync: { loading: false, error: null },
    cleanup: { loading: false, error: null },
    forceCleanup: { loading: false, error: null },
    forceFullSync: { loading: false, error: null },
    queueChange: { loading: false, error: null }
  },

  // Error state
  error: null
};

const syncReducer = (state = initialState, action) => {
  switch (action.type) {
    // Initialization
    case SYNC_ACTION_TYPES.INITIALIZE_SYNC_REQUEST:
      return {
        ...state,
        isInitializing: true,
        error: null
      };

    case SYNC_ACTION_TYPES.INITIALIZE_SYNC_SUCCESS:
      return {
        ...state,
        isReady: true,
        isInitializing: false,
        status: action.payload.status,
        error: null
      };

    case SYNC_ACTION_TYPES.INITIALIZE_SYNC_FAILURE:
      return {
        ...state,
        isReady: false,
        isInitializing: false,
        error: action.payload
      };

    // Sync status updates
    case SYNC_ACTION_TYPES.UPDATE_SYNC_STATUS:
      return {
        ...state,
        status: { ...state.status, ...action.payload }
      };

    case SYNC_ACTION_TYPES.SET_SYNC_READY:
      return {
        ...state,
        isReady: action.payload
      };

    case SYNC_ACTION_TYPES.INCREMENT_DATA_VERSION:
      return {
        ...state,
        dataVersion: state.dataVersion + 1
      };

    // Sync events
    case SYNC_ACTION_TYPES.SYNC_STARTED:
      return {
        ...state,
        status: {
          ...state.status,
          isSyncing: true
        }
      };

    case SYNC_ACTION_TYPES.SYNC_COMPLETED:
      return {
        ...state,
        status: {
          ...state.status,
          isSyncing: false,
          lastSync: new Date(action.payload.timestamp)
        }
      };

    case SYNC_ACTION_TYPES.SYNC_FAILED:
      return {
        ...state,
        status: {
          ...state.status,
          isSyncing: false
        },
        error: action.payload.error
      };

    // Manual sync operations
    case SYNC_ACTION_TYPES.MANUAL_SYNC_REQUEST:
      return {
        ...state,
        operations: {
          ...state.operations,
          manualSync: { loading: true, error: null }
        }
      };

    case SYNC_ACTION_TYPES.MANUAL_SYNC_SUCCESS:
      return {
        ...state,
        operations: {
          ...state.operations,
          manualSync: { loading: false, error: null }
        }
      };

    case SYNC_ACTION_TYPES.MANUAL_SYNC_FAILURE:
      return {
        ...state,
        operations: {
          ...state.operations,
          manualSync: { loading: false, error: action.payload }
        }
      };

    // Cleanup operations
    case SYNC_ACTION_TYPES.CLEANUP_REQUEST:
      return {
        ...state,
        operations: {
          ...state.operations,
          cleanup: { loading: true, error: null }
        }
      };

    case SYNC_ACTION_TYPES.CLEANUP_SUCCESS:
      return {
        ...state,
        operations: {
          ...state.operations,
          cleanup: { loading: false, error: null }
        }
      };

    case SYNC_ACTION_TYPES.CLEANUP_FAILURE:
      return {
        ...state,
        operations: {
          ...state.operations,
          cleanup: { loading: false, error: action.payload }
        }
      };

    // Force cleanup operations
    case SYNC_ACTION_TYPES.FORCE_CLEANUP_REQUEST:
      return {
        ...state,
        operations: {
          ...state.operations,
          forceCleanup: { loading: true, error: null }
        }
      };

    case SYNC_ACTION_TYPES.FORCE_CLEANUP_SUCCESS:
      return {
        ...state,
        operations: {
          ...state.operations,
          forceCleanup: { loading: false, error: null }
        }
      };

    case SYNC_ACTION_TYPES.FORCE_CLEANUP_FAILURE:
      return {
        ...state,
        operations: {
          ...state.operations,
          forceCleanup: { loading: false, error: action.payload }
        }
      };

    // Force full sync operations
    case SYNC_ACTION_TYPES.FORCE_FULL_SYNC_REQUEST:
      return {
        ...state,
        operations: {
          ...state.operations,
          forceFullSync: { loading: true, error: null }
        }
      };

    case SYNC_ACTION_TYPES.FORCE_FULL_SYNC_SUCCESS:
      return {
        ...state,
        operations: {
          ...state.operations,
          forceFullSync: { loading: false, error: null }
        }
      };

    case SYNC_ACTION_TYPES.FORCE_FULL_SYNC_FAILURE:
      return {
        ...state,
        operations: {
          ...state.operations,
          forceFullSync: { loading: false, error: action.payload }
        }
      };

    // Queue change operations
    case SYNC_ACTION_TYPES.QUEUE_CHANGE_REQUEST:
      return {
        ...state,
        operations: {
          ...state.operations,
          queueChange: { loading: true, error: null }
        }
      };

    case SYNC_ACTION_TYPES.QUEUE_CHANGE_SUCCESS:
      return {
        ...state,
        operations: {
          ...state.operations,
          queueChange: { loading: false, error: null }
        }
      };

    case SYNC_ACTION_TYPES.QUEUE_CHANGE_FAILURE:
      return {
        ...state,
        operations: {
          ...state.operations,
          queueChange: { loading: false, error: action.payload.error }
        }
      };

      return {
        ...state,
        pendingChanges: action.payload,
      };
    default:
      return state;
  }
};

export default syncReducer;