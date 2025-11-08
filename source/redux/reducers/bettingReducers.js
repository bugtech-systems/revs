// src/redux/reducers/bettingReducer.js
import { 
  BETTING_ACTION_TYPES, 
  DATA_ACTION_TYPES 
} from '../actions/types';

const initialState = {
  // Bettings state
  bettings: [],
  currentBetting: null,
  bettingLoading: false,
  bettingError: null,
  
  // Draws state
  draws: [],
  currentDraw: null,
  drawLoading: false,
  drawError: null,
  
  // Master Combinations state
  masterCombinations: [],
  currentMasterCombination: null,
  masterCombinationLoading: false,
  masterCombinationError: null,
  
  // UI state
  loading: false,
  error: null,
  syncStatus: 'idle', // 'idle', 'syncing', 'success', 'error'
};

const bettingReducer = (state = initialState, action) => {
  switch (action.type) {
    
    // ============ BETTINGS ACTIONS ============
    

    // Create Betting
    case BETTING_ACTION_TYPES.CREATE_BETTING_REQUEST:
      return {
        ...state,
        bettingLoading: true,
        bettingError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.CREATE_BETTING_SUCCESS:
      return {
        ...state,
        bettingLoading: false,
        loading: false,
        bettings: [action.payload, ...state.bettings],
        currentBetting: action.payload
      };
      
    case BETTING_ACTION_TYPES.CREATE_BETTING_FAILURE:
      return {
        ...state,
        bettingLoading: false,
        loading: false,
        bettingError: action.payload,
        error: action.payload
      };
      
    // Update Betting
    case BETTING_ACTION_TYPES.UPDATE_BETTING_REQUEST:
      return {
        ...state,
        bettingLoading: true,
        bettingError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.UPDATE_BETTING_SUCCESS:
      return {
        ...state,
        bettingLoading: false,
        loading: false,
        bettings: state.bettings.map(betting =>
          betting.id === action.payload.id ? action.payload : betting
        ),
        currentBetting: state.currentBetting?.id === action.payload.id 
          ? action.payload 
          : state.currentBetting
      };
      
    case BETTING_ACTION_TYPES.UPDATE_BETTING_FAILURE:
      return {
        ...state,
        bettingLoading: false,
        loading: false,
        bettingError: action.payload,
        error: action.payload
      };
      
    // Delete Betting
    case BETTING_ACTION_TYPES.DELETE_BETTING_REQUEST:
      return {
        ...state,
        bettingLoading: true,
        bettingError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.DELETE_BETTING_SUCCESS:
      return {
        ...state,
        bettingLoading: false,
        loading: false,
        bettings: state.bettings.filter(betting => betting.id !== action.payload),
        currentBetting: state.currentBetting?.id === action.payload 
          ? null 
          : state.currentBetting
      };
      
    case BETTING_ACTION_TYPES.DELETE_BETTING_FAILURE:
      return {
        ...state,
        bettingLoading: false,
        loading: false,
        bettingError: action.payload,
        error: action.payload
      };
      
    // Fetch Bettings
    case BETTING_ACTION_TYPES.FETCH_BETTINGS_REQUEST:
      return {
        ...state,
        bettingLoading: true,
        bettingError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.FETCH_BETTINGS_SUCCESS:
      return {
        ...state,
        bettingLoading: false,
        loading: false,
        bettings: action.payload,
        bettingError: null
      };
      
    case BETTING_ACTION_TYPES.FETCH_BETTINGS_FAILURE:
      return {
        ...state,
        bettingLoading: false,
        loading: false,
        bettingError: action.payload,
        error: action.payload
      };
      
    // ============ DRAWS ACTIONS ============
    
    // Create Draw
    case BETTING_ACTION_TYPES.CREATE_DRAW_REQUEST:
      return {
        ...state,
        drawLoading: true,
        drawError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.CREATE_DRAW_SUCCESS:
      return {
        ...state,
        drawLoading: false,
        loading: false,
        draws: [action.payload, ...state.draws],
        currentDraw: action.payload
      };
      
    case BETTING_ACTION_TYPES.CREATE_DRAW_FAILURE:
      return {
        ...state,
        drawLoading: false,
        loading: false,
        drawError: action.payload,
        error: action.payload
      };
      
    // Update Draw
    case BETTING_ACTION_TYPES.UPDATE_DRAW_REQUEST:
      return {
        ...state,
        drawLoading: true,
        drawError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.UPDATE_DRAW_SUCCESS:
      return {
        ...state,
        drawLoading: false,
        loading: false,
        draws: state.draws.map(draw =>
          draw.id === action.payload.id ? action.payload : draw
        ),
        currentDraw: state.currentDraw?.id === action.payload.id 
          ? action.payload 
          : state.currentDraw
      };
      
    case BETTING_ACTION_TYPES.UPDATE_DRAW_FAILURE:
      return {
        ...state,
        drawLoading: false,
        loading: false,
        drawError: action.payload,
        error: action.payload
      };
      
    // Delete Draw
    case BETTING_ACTION_TYPES.DELETE_DRAW_REQUEST:
      return {
        ...state,
        drawLoading: true,
        drawError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.DELETE_DRAW_SUCCESS:
      return {
        ...state,
        drawLoading: false,
        loading: false,
        draws: state.draws.filter(draw => draw.id !== action.payload),
        currentDraw: state.currentDraw?.id === action.payload 
          ? null 
          : state.currentDraw
      };
      
    case BETTING_ACTION_TYPES.DELETE_DRAW_FAILURE:
      return {
        ...state,
        drawLoading: false,
        loading: false,
        drawError: action.payload,
        error: action.payload
      };
      
    // Fetch Draws
    case BETTING_ACTION_TYPES.FETCH_DRAWS_REQUEST:
      return {
        ...state,
        drawLoading: true,
        drawError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.FETCH_DRAWS_SUCCESS:
      return {
        ...state,
        drawLoading: false,
        loading: false,
        draws: action.payload,
        drawError: null
      };
      
    case BETTING_ACTION_TYPES.FETCH_DRAWS_FAILURE:
      return {
        ...state,
        drawLoading: false,
        loading: false,
        drawError: action.payload,
        error: action.payload
      };
      
    // ============ MASTER COMBINATIONS ACTIONS ============
    
    // Create Master Combination
    case BETTING_ACTION_TYPES.CREATE_MASTER_COMBINATION_REQUEST:
      return {
        ...state,
        masterCombinationLoading: true,
        masterCombinationError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.CREATE_MASTER_COMBINATION_SUCCESS:
      return {
        ...state,
        masterCombinationLoading: false,
        loading: false,
        masterCombinations: [action.payload, ...state.masterCombinations],
        currentMasterCombination: action.payload
      };
      
    case BETTING_ACTION_TYPES.CREATE_MASTER_COMBINATION_FAILURE:
      return {
        ...state,
        masterCombinationLoading: false,
        loading: false,
        masterCombinationError: action.payload,
        error: action.payload
      };
      
    // Update Master Combination
    case BETTING_ACTION_TYPES.UPDATE_MASTER_COMBINATION_REQUEST:
      return {
        ...state,
        masterCombinationLoading: true,
        masterCombinationError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.UPDATE_MASTER_COMBINATION_SUCCESS:
      return {
        ...state,
        masterCombinationLoading: false,
        loading: false,
        masterCombinations: state.masterCombinations.map(combination =>
          combination.id === action.payload.id ? action.payload : combination
        ),
        currentMasterCombination: state.currentMasterCombination?.id === action.payload.id 
          ? action.payload 
          : state.currentMasterCombination
      };
      
    case BETTING_ACTION_TYPES.UPDATE_MASTER_COMBINATION_FAILURE:
      return {
        ...state,
        masterCombinationLoading: false,
        loading: false,
        masterCombinationError: action.payload,
        error: action.payload
      };
      
    // Delete Master Combination
    case BETTING_ACTION_TYPES.DELETE_MASTER_COMBINATION_REQUEST:
      return {
        ...state,
        masterCombinationLoading: true,
        masterCombinationError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.DELETE_MASTER_COMBINATION_SUCCESS:
      return {
        ...state,
        masterCombinationLoading: false,
        loading: false,
        masterCombinations: state.masterCombinations.filter(
          combination => combination.id !== action.payload
        ),
        currentMasterCombination: state.currentMasterCombination?.id === action.payload 
          ? null 
          : state.currentMasterCombination
      };
      
    case BETTING_ACTION_TYPES.DELETE_MASTER_COMBINATION_FAILURE:
      return {
        ...state,
        masterCombinationLoading: false,
        loading: false,
        masterCombinationError: action.payload,
        error: action.payload
      };
      
    // Fetch Master Combinations
    case BETTING_ACTION_TYPES.FETCH_MASTER_COMBINATIONS_REQUEST:
      return {
        ...state,
        masterCombinationLoading: true,
        masterCombinationError: null,
        loading: true
      };
      
    case BETTING_ACTION_TYPES.FETCH_MASTER_COMBINATIONS_SUCCESS:
      return {
        ...state,
        masterCombinationLoading: false,
        loading: false,
        masterCombinations: action.payload,
        masterCombinationError: null
      };
      
    case BETTING_ACTION_TYPES.FETCH_MASTER_COMBINATIONS_FAILURE:
      return {
        ...state,
        masterCombinationLoading: false,
        loading: false,
        masterCombinationError: action.payload,
        error: action.payload
      };
      
    // ============ GET BY ID ACTIONS ============
    
    // Fetch Betting by ID
    case DATA_ACTION_TYPES.FETCH_BETTING_BY_ID_REQUEST:
      return {
        ...state,
        bettingLoading: true,
        bettingError: null,
        loading: true
      };
      
    case DATA_ACTION_TYPES.FETCH_BETTING_BY_ID_SUCCESS:
      return {
        ...state,
        bettingLoading: false,
        loading: false,
        currentBetting: action.payload,
        bettingError: null
      };
      
    case DATA_ACTION_TYPES.FETCH_BETTING_BY_ID_FAILURE:
      return {
        ...state,
        bettingLoading: false,
        loading: false,
        bettingError: action.payload,
        error: action.payload
      };
      
    // Fetch Draw by ID
    case DATA_ACTION_TYPES.FETCH_DRAW_BY_ID_REQUEST:
      return {
        ...state,
        drawLoading: true,
        drawError: null,
        loading: true
      };
      
    case DATA_ACTION_TYPES.FETCH_DRAW_BY_ID_SUCCESS:
      return {
        ...state,
        drawLoading: false,
        loading: false,
        currentDraw: action.payload,
        drawError: null
      };
      
    case DATA_ACTION_TYPES.FETCH_DRAW_BY_ID_FAILURE:
      return {
        ...state,
        drawLoading: false,
        loading: false,
        drawError: action.payload,
        error: action.payload
      };
      
    // Fetch Master Combination by ID
    case DATA_ACTION_TYPES.FETCH_MASTER_COMBINATION_BY_ID_REQUEST:
      return {
        ...state,
        masterCombinationLoading: true,
        masterCombinationError: null,
        loading: true
      };
      
    case DATA_ACTION_TYPES.FETCH_MASTER_COMBINATION_BY_ID_SUCCESS:
      return {
        ...state,
        masterCombinationLoading: false,
        loading: false,
        currentMasterCombination: action.payload,
        masterCombinationError: null
      };
      
    case DATA_ACTION_TYPES.FETCH_MASTER_COMBINATION_BY_ID_FAILURE:
      return {
        ...state,
        masterCombinationLoading: false,
        loading: false,
        masterCombinationError: action.payload,
        error: action.payload
      };
      
    // ============ SYNC ACTIONS ============
    
    case BETTING_ACTION_TYPES.SYNC_DATA_REQUEST:
      return {
        ...state,
        loading: true,
        syncStatus: 'syncing',
        error: null
      };
      
    case BETTING_ACTION_TYPES.SYNC_DATA_SUCCESS:
      return {
        ...state,
        loading: false,
        syncStatus: 'success',
        error: null
      };
      
    case BETTING_ACTION_TYPES.SYNC_DATA_FAILURE:
      return {
        ...state,
        loading: false,
        syncStatus: 'error',
        error: action.payload
      };
      
    case BETTING_ACTION_TYPES.UPDATE_SYNC_STATUS:
      return {
        ...state,
        syncStatus: action.payload
      };
      
    // ============ UI ACTIONS ============
    
    case BETTING_ACTION_TYPES.SET_CURRENT_DRAW:
      return {
        ...state,
        currentDraw: action.payload
      };
      
    case BETTING_ACTION_TYPES.SET_CURRENT_BETTING:
      return {
        ...state,
        currentBetting: action.payload
      };
      
    case BETTING_ACTION_TYPES.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
      
    case BETTING_ACTION_TYPES.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        bettingError: null,
        drawError: null,
        masterCombinationError: null
      };
      
    // Clear specific errors
    case 'CLEAR_BETTING_ERROR':
      return {
        ...state,
        bettingError: null
      };
      
    case 'CLEAR_DRAW_ERROR':
      return {
        ...state,
        drawError: null
      };
      
    case 'CLEAR_MASTER_COMBINATION_ERROR':
      return {
        ...state,
        masterCombinationError: null
      };
      
    // Reset states
    case 'RESET_BETTING_STATE':
      return {
        ...initialState
      };
      
    case 'RESET_CURRENT_BETTING':
      return {
        ...state,
        currentBetting: null
      };
      
    case 'RESET_CURRENT_DRAW':
      return {
        ...state,
        currentDraw: null
      };
      
    case 'RESET_CURRENT_MASTER_COMBINATION':
      return {
        ...state,
        currentMasterCombination: null
      };
      
    default:
      return state;
  }
};

export default bettingReducer;