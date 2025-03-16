import { CLEAR_TOKEN, CLOSE_DRAWER, OPEN_DRAWER, SET_AUTHENTICATED, SET_LOADING, SET_TOKEN, SET_UNAUTHENTICATED, STOP_LOADING, SET_NOTIFICATION, CLEAR_NOTIFICATION, OPEN_UPDATE_MODAL, CLOSE_UPDATE_MODAL, OPEN_CONFIRMATION_MODAL, CLOSE_CONFIRMATION_MODAL, OPEN_WARNING_MODAL, CLOSE_WARNING_MODAL, OPEN_ALERT_MODAL, CLOSE_ALERT_MODAL } from '../actions/types';

const initialState = {
  isAuthenticated: false,
  loading: false,
  drawer: false,
  notification: false,
  updateModal: false,
  confirmationModal: null,
  warningModal: false,
  alertModal: null
};

export default (state = initialState, action) => {
  switch (action.type) {
    case SET_TOKEN:
      return {
        ...state,
        token: action.payload,
      };
    case CLEAR_TOKEN:
      return {
        ...state,
        token: null,
      };
    case SET_AUTHENTICATED:
      return {
        ...state,
        isAuthenticated: true,
      };
    case SET_UNAUTHENTICATED:
      return {
        ...state,
        isAuthenticated: false,
      };
    case OPEN_CONFIRMATION_MODAL:
      return {
        ...state,
        confirmationModal: action.payload,
      };
    case CLOSE_CONFIRMATION_MODAL:
      return {
        ...state,
        confirmationModal: null,
      };

    case OPEN_ALERT_MODAL:
      return {
        ...state,
        alertModal: action.payload,
      };
    case CLOSE_ALERT_MODAL:
      return {
        ...state,
        alertModal: null,
      };

    case OPEN_WARNING_MODAL:
      return {
        ...state,
        warningModal: true,
      };
    case CLOSE_WARNING_MODAL:
      return {
        ...state,
        warningModal: false,
      };

    case SET_LOADING:
      return {
        ...state,
        loading: true,
      };

    case STOP_LOADING:
      return {
        ...state,
        loading: false,
      };
    case OPEN_UPDATE_MODAL:
      return {
        ...state,
        updateModal: true,
      };

    case CLOSE_UPDATE_MODAL:
      return {
        ...state,
        updateModal: false,
      };

    case OPEN_DRAWER:
      return {
        ...state,
        drawer: true,
      };

    case CLOSE_DRAWER:
      return {
        ...state,
        drawer: false,
      };
    case SET_NOTIFICATION:
      return {
        ...state,
        notification: payload,
      };
    case CLEAR_NOTIFICATION:
      return {
        ...state,
        notification: action.payload,
      };

    default:
      return state;
  }
};