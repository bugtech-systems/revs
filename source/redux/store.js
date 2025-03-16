import { configureStore } from '@reduxjs/toolkit';
import uiReducers from './reducers/uiReducers';
import userReducers from './reducers/userReducers';

export const store = configureStore({
    reducer: {
      ui: uiReducers,
      user: userReducers
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false, // Disable immutable state check
        serializableCheck: false,
      }),
  });