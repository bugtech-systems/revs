import { configureStore } from '@reduxjs/toolkit';
import uiReducers from './reducers/uiReducers';
import userReducers from './reducers/userReducers';
import bettingReducers from './reducers/bettingReducers';
import syncReducer from './reducers/syncReducer';

export const store = configureStore({
    reducer: {
      ui: uiReducers,
      user: userReducers,
      betting: bettingReducers,
      sync: syncReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false, // Disable immutable state check
        serializableCheck: false,
      }),
  });