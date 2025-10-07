import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { App } from './App';
import App1 from './App1';
import { WelcomeView } from './WelcomeView';
import supabase from './utils/supabaseClient';
import { SessionContext } from './context/SessionContext';
import { OfflineSyncProvider } from "./context/OfflineSyncProvider";
import { OfflineProvider } from "./context/OfflineProvider";
import { ApiProvider } from "./context/ApiContext";
import { SyncProvider } from './context/SyncContext';
import { DataProvider } from './context/DataContext';
import { syncConfig } from './configs/syncConfig';


export const AppWrapper = () => {
  const [session, setSession] = useState(supabase.auth.getSession());



  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
     
       
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
  

  
  

  

  return (
    <Provider store={store}>
      <SessionContext.Provider value={{ session, setSession }}>
            <SyncProvider config={syncConfig}>
          <OfflineSyncProvider session={session}>
          <DataProvider>
           <OfflineProvider session={session}> 
        {/* <UpdateModalProvider> */}
          {session ? <App /> : <WelcomeView />}
        {/* </UpdateModalProvider> */}
        </OfflineProvider> 
        </DataProvider>
        </OfflineSyncProvider>
        </SyncProvider>
        
      </SessionContext.Provider>
    </Provider>
  );
};
