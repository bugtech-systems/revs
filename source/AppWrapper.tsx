import React from 'react';
import {AppProvider, UserProvider} from '@realm/react';
import {App} from './App';
import {WelcomeView} from './WelcomeView';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import Config from 'react-native-config';

export const AppWrapper = () => {
  const appId = `${Config.ATLAS_APP_ID_PROD}`;
  const baseUrl = `${Config.ATLAS_BASE_URL}`;
  return (
    
   <Provider store={store}>
    <AppProvider id={appId} baseUrl={baseUrl}>
      <UserProvider fallback={WelcomeView}>
          <App />
      </UserProvider>
    </AppProvider>
    </Provider>
  );
};