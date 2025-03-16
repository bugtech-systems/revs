import { SET_COLLECTOR, SET_ACTIVE_USER, SET_USER, SET_APK_URL, SET_DEVICE_ADDRESS, CLEAR_DEVICE_ADDRESS, SET_USER_CONFIG, SET_SUMMARIZED_USER, INCREMENT_UNREAD_MESSAGES, DECREMENT_UNREAD_MESSAGES } from "../actions/types";

const initialState = {
  collector: null,
  user: null,
  apkUrl: 'https://sharewin.pro/apiv2/assets/revs_app.apk',
  selectedUser: null,
  summarizedUser: null,
  configs: [],
  device: null,
  unReadMessages: 0
};

export default (state = initialState, action) => {
  switch (action.type) {
    
    case SET_USER_CONFIG:
      return {
        ...state,
        userConfig: action.payload,
      };
    case SET_USER:
      return {
        ...state,
        user: action.payload,
        configs: action.payload?.configuration
      };
    case SET_COLLECTOR:
      return {
        ...state,
        collector: action.payload
      }
    case SET_APK_URL:
      return {
        ...state,
        apkUrl: action.payload
      }
    case SET_ACTIVE_USER:
      return {
        ...state,
        selectedUser: action.payload
      }

      case SET_SUMMARIZED_USER:
        return {
          ...state,
          summarizedUser: action.payload
        }
  
        case INCREMENT_UNREAD_MESSAGES:
          return {
            ...state,
            unReadMessages: action.payload
          }

          case DECREMENT_UNREAD_MESSAGES:
            return {
              ...state,
              unReadMessages: action.payload
            }

    case SET_DEVICE_ADDRESS:
      return {
        ...state,
        device: action.payload
      };

    case CLEAR_DEVICE_ADDRESS:
      return {
        ...state,
        device: null
      };
    default:
      return state;
  }
};