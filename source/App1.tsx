// App.js
import React from 'react';
import { SyncProvider } from './context/SyncContext';
import { DataProvider } from './context/DataContext';
import { syncConfig } from './configs/syncConfig';
import UserManagementScreen from './UserManagementScreen';

const App = () => {


  return (
    <SyncProvider config={syncConfig}>
      <DataProvider>
        <UserManagementScreen />
      </DataProvider>
    </SyncProvider>
  );
};

export default App;