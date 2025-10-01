import React from 'react';
import {AppProvider, UserProvider} from '@realm/react';
import {App} from './App';
import {WelcomeView} from './WelcomeView';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import Config from 'react-native-config';
import { UpdateModalProvider } from './UpdateModalContext';

export const AppWrapper = () => {
  const appId = `${Config.ATLAS_APP_ID_QA}`;
  const baseUrl = `${Config.ATLAS_BASE_URL}`;
  return (
    
   <Provider store={store}>
    <AppProvider id={appId} baseUrl={baseUrl}>
      <UserProvider fallback={WelcomeView}>
        <UpdateModalProvider>
          <App />
        </UpdateModalProvider>
      </UserProvider>
    </AppProvider>
    </Provider>
  );
};