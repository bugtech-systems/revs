// src/redux/actions/bettingActions.js
import { api, SyncManager } from '../../utils/offlineSync';
// import { showMessage } from 'react-native-flash-message';
import { BETTING_ACTION_TYPES, DATA_ACTION_TYPES } from "./types";

// Action Creators - Bettings
export const createBetting = (bettingData) => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.CREATE_BETTING_REQUEST });
  
  try {
    const newBetting = await api.createBetting(bettingData);
    
    dispatch({
      type: BETTING_ACTION_TYPES.CREATE_BETTING_SUCCESS,
      payload: newBetting
    });

    // showMessage({
    //   message: "Betting created successfully",
    //   type: "success",
    // });

    return newBetting;
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.CREATE_BETTING_FAILURE,
      payload: error.message
    });

    // showMessage({
    //   message: "Failed to create betting",
    //   description: error.message,
    //   type: "danger",
    // });

    throw error;
  }
};

export const updateBetting = (id, bettingData) => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.UPDATE_BETTING_REQUEST });
  
  try {
    const updatedBetting = await api.updateBetting(id, bettingData);
    
    dispatch({
      type: BETTING_ACTION_TYPES.UPDATE_BETTING_SUCCESS,
      payload: updatedBetting
    });

    // showMessage({
    //   message: "Betting updated successfully",
    //   type: "success",
    // });

    return updatedBetting;
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.UPDATE_BETTING_FAILURE,
      payload: error.message
    });

    // showMessage({
    //   message: "Failed to update betting",
    //   description: error.message,
    //   type: "danger",
    // });

    throw error;
  }
};

export const deleteBetting = (id) => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.DELETE_BETTING_REQUEST });
  
  try {
    await api.deleteBetting(id);
    
    dispatch({
      type: BETTING_ACTION_TYPES.DELETE_BETTING_SUCCESS,
      payload: id
    });

    // showMessage({
    //   message: "Betting deleted successfully",
    //   type: "success",
    // });
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.DELETE_BETTING_FAILURE,
      payload: error.message
    });

    // showMessage({
    //   message: "Failed to delete betting",
    //   description: error.message,
    //   type: "danger",
    // });

    throw error;
  }
};

export const fetchBettings = (filters = {}) => async (dispatch, getState) => {
  dispatch({ type: BETTING_ACTION_TYPES.FETCH_BETTINGS_REQUEST });
  
  try {
    
      
    
  
    const bettings = await api.listBettings({
      filters: { ...filters, is_deleted: false },
      orderBy: 'timestamp DESC',
    });
    
    dispatch({
      type: BETTING_ACTION_TYPES.FETCH_BETTINGS_SUCCESS,
      payload: bettings
    });

    return bettings;
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.FETCH_BETTINGS_FAILURE,
      payload: error.message
    });

    throw error;
  }
};

export const fetchBettingById = (bettingId) => async (dispatch) => {
  dispatch({ type: DATA_ACTION_TYPES.FETCH_BETTING_BY_ID_REQUEST });

  try {
    const betting = await api.getBetting(bettingId);
    
    if (betting) {
      dispatch({
        type: DATA_ACTION_TYPES.FETCH_BETTING_BY_ID_SUCCESS,
        payload: betting
      });
      return betting;
    } else {
      dispatch({
        type: DATA_ACTION_TYPES.FETCH_BETTING_BY_ID_FAILURE,
        payload: 'Betting not found'
      });
      return null;
    }
  } catch (error) {
    console.error('Error fetching betting by ID:', error);
    dispatch({
      type: DATA_ACTION_TYPES.FETCH_BETTING_BY_ID_FAILURE,
      payload: error.message
    });
    throw error;
  }
};

// Action Creators - Draws
export const createDraw = (drawData) => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.CREATE_DRAW_REQUEST });
  
  try {
    const newDraw = await api.createDraw(drawData);
    
    dispatch({
      type: BETTING_ACTION_TYPES.CREATE_DRAW_SUCCESS,
      payload: newDraw
    });

    // showMessage({
    //   message: "Draw created successfully",
    //   type: "success",
    // });

    return newDraw;
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.CREATE_DRAW_FAILURE,
      payload: error.message
    });

    // showMessage({
    //   message: "Failed to create draw",
    //   description: error.message,
    //   type: "danger",
    // });

    throw error;
  }
};

export const updateDraw = (id, drawData) => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.UPDATE_DRAW_REQUEST });
  
  try {
    const updatedDraw = await api.updateDraw(id, drawData);
    
    dispatch({
      type: BETTING_ACTION_TYPES.UPDATE_DRAW_SUCCESS,
      payload: updatedDraw
    });

    // showMessage({
    //   message: "Draw updated successfully",
    //   type: "success",
    // });

    return updatedDraw;
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.UPDATE_DRAW_FAILURE,
      payload: error.message
    });

    // showMessage({
    //   message: "Failed to update draw",
    //   description: error.message,
    //   type: "danger",
    // });

    throw error;
  }
};

export const deleteDraw = (id) => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.DELETE_DRAW_REQUEST });
  
  try {
    await api.deleteDraw(id);
    
    dispatch({
      type: BETTING_ACTION_TYPES.DELETE_DRAW_SUCCESS,
      payload: id
    });

    // showMessage({
    //   message: "Draw deleted successfully",
    //   type: "success",
    // });
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.DELETE_DRAW_FAILURE,
      payload: error.message
    });

    // showMessage({
    //   message: "Failed to delete draw",
    //   description: error.message,
    //   type: "danger",
    // });

    throw error;
  }
};

export const fetchDraws = (filters = {}) => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.FETCH_DRAWS_REQUEST });
  
  try {
    const draws = await api.listDraws({
      filters: { ...filters, is_deleted: false },
      orderBy: 'draw_date DESC'
    });
    
    dispatch({
      type: BETTING_ACTION_TYPES.FETCH_DRAWS_SUCCESS,
      payload: draws
    });

    return draws;
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.FETCH_DRAWS_FAILURE,
      payload: error.message
    });

    throw error;
  }
};

export const fetchDrawById = (drawId) => async (dispatch) => {
  dispatch({ type: DATA_ACTION_TYPES.FETCH_DRAW_BY_ID_REQUEST });

  try {
    const draw = await api.getDraw(drawId);
    
    if (draw) {
      dispatch({
        type: DATA_ACTION_TYPES.FETCH_DRAW_BY_ID_SUCCESS,
        payload: draw
      });
      return draw;
    } else {
      dispatch({
        type: DATA_ACTION_TYPES.FETCH_DRAW_BY_ID_FAILURE,
        payload: 'Draw not found'
      });
      return null;
    }
  } catch (error) {
    console.error('Error fetching draw by ID:', error);
    dispatch({
      type: DATA_ACTION_TYPES.FETCH_DRAW_BY_ID_FAILURE,
      payload: error.message
    });
    throw error;
  }
};

// Action Creators - Master Combinations
export const createMasterCombination = (combinationData) => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.CREATE_MASTER_COMBINATION_REQUEST });
  
  try {
    const newCombination = await api.createMasterCombination(combinationData);
    
    dispatch({
      type: BETTING_ACTION_TYPES.CREATE_MASTER_COMBINATION_SUCCESS,
      payload: newCombination
    });

    // showMessage({
    //   message: "Master combination created successfully",
    //   type: "success",
    // });

    return newCombination;
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.CREATE_MASTER_COMBINATION_FAILURE,
      payload: error.message
    });

    // showMessage({
    //   message: "Failed to create master combination",
    //   description: error.message,
    //   type: "danger",
    // });

    throw error;
  }
};

export const updateMasterCombination = (id, combinationData) => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.UPDATE_MASTER_COMBINATION_REQUEST });
  
  try {
    const updatedCombination = await api.updateMasterCombination(id, combinationData);
    
    dispatch({
      type: BETTING_ACTION_TYPES.UPDATE_MASTER_COMBINATION_SUCCESS,
      payload: updatedCombination
    });

    // showMessage({
    //   message: "Master combination updated successfully",
    //   type: "success",
    // });

    return updatedCombination;
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.UPDATE_MASTER_COMBINATION_FAILURE,
      payload: error.message
    });

    // showMessage({
    //   message: "Failed to update master combination",
    //   description: error.message,
    //   type: "danger",
    // });

    throw error;
  }
};

export const deleteMasterCombination = (id) => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.DELETE_MASTER_COMBINATION_REQUEST });
  
  try {
    await api.deleteMasterCombination(id);
    
    dispatch({
      type: BETTING_ACTION_TYPES.DELETE_MASTER_COMBINATION_SUCCESS,
      payload: id
    });

    // showMessage({
    //   message: "Master combination deleted successfully",
    //   type: "success",
    // });
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.DELETE_MASTER_COMBINATION_FAILURE,
      payload: error.message
    });

    // showMessage({
    //   message: "Failed to delete master combination",
    //   description: error.message,
    //   type: "danger",
    // });

    throw error;
  }
};

export const fetchMasterCombinations = (filters = {}) => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.FETCH_MASTER_COMBINATIONS_REQUEST });
  
  try {
    const combinations = await api.listMasterCombinations({
      filters: { ...filters, is_deleted: false },
      orderBy: 'created_at DESC'
    });
    
    // dispatch({
    //   type: BETTING_ACTION_TYPES.FETCH_MASTER_COMBINATIONS_SUCCESS,
    //   payload: combinations
    // });

    return combinations;
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.FETCH_MASTER_COMBINATIONS_FAILURE,
      payload: error.message
    });

    throw error;
  }
};

export const fetchMasterCombinationById = (combinationId) => async (dispatch) => {
  dispatch({ type: DATA_ACTION_TYPES.FETCH_MASTER_COMBINATION_BY_ID_REQUEST });

  try {
    const combination = await api.getMasterCombination(combinationId);
    
    if (combination) {
      dispatch({
        type: DATA_ACTION_TYPES.FETCH_MASTER_COMBINATION_BY_ID_SUCCESS,
        payload: combination
      });
      return combination;
    } else {
      dispatch({
        type: DATA_ACTION_TYPES.FETCH_MASTER_COMBINATION_BY_ID_FAILURE,
        payload: 'Master combination not found'
      });
      return null;
    }
  } catch (error) {
    console.error('Error fetching master combination by ID:', error);
    dispatch({
      type: DATA_ACTION_TYPES.FETCH_MASTER_COMBINATION_BY_ID_FAILURE,
      payload: error.message
    });
    throw error;
  }
};

// Specialized betting actions
export const fetchActiveDraws = (filters = {}) => async (dispatch) => {
  try {
    const defaultFilters = { 
      is_deleted: false, 
      is_active: true,
      ...filters 
    };
    
    const activeDraws = await api.listDraws({
      filters: defaultFilters,
      orderBy: 'draw_date ASC'
    });

    return activeDraws;
  } catch (error) {
    console.error('Error fetching active draws:', error);
    throw error;
  }
};

export const fetchBettingsByDraw = (drawId, filters = {}) => async (dispatch) => {
  try {
    const bettings = await api.listBettings({
      filters: { 
        ...filters, 
        is_deleted: false,
        draw_id: drawId 
      },
      orderBy: 'created_at DESC'
    });

    return bettings;
  } catch (error) {
    console.error('Error fetching bettings by draw:', error);
    throw error;
  }
};

// Sync Actions for betting data
export const syncBettingData = () => async (dispatch) => {
  dispatch({ type: BETTING_ACTION_TYPES.SYNC_DATA_REQUEST });
  
  try {
    await SyncManager.sync();
    
    dispatch({
      type: BETTING_ACTION_TYPES.SYNC_DATA_SUCCESS
    });

    // showMessage({
    //   message: "Betting data synchronized successfully",
    //   type: "success",
    // });
  } catch (error) {
    dispatch({
      type: BETTING_ACTION_TYPES.SYNC_DATA_FAILURE,
      payload: error.message
    });

    // showMessage({
    //   message: "Betting sync failed",
    //   description: error.message,
    //   type: "danger",
    // });

    throw error;
  }
};

// UI Actions for betting module
export const setCurrentDraw = (draw) => ({
  type: BETTING_ACTION_TYPES.SET_CURRENT_DRAW,
  payload: draw
});

export const setCurrentBetting = (betting) => ({
  type: BETTING_ACTION_TYPES.SET_CURRENT_BETTING,
  payload: betting
});

export const clearBettingError = () => ({
  type: BETTING_ACTION_TYPES.CLEAR_ERROR
});