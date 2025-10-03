import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { App } from './App';
import { WelcomeView } from './WelcomeView';
import supabase from './utils/supabaseClient';
import { SessionContext } from './context/SessionContext';
import { init, api, forceSync, startAutoSyncOnReconnect } from './utils/offlineSync';


export const AppWrapper = () => {
  const [session, setSession] = useState(supabase.auth.getSession());



  useEffect(() => {
  
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
     
       
    });
  console.log(listener, 'sesssss')

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
  

  
  
    useEffect(() => {
      (async () => {


        console.log(session, "THE SESYON@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        
        
        if(session?.user){
            let displayName = String(session.user.email).split('@')[0];

        console.log(session.user.email, 'sssss')
             await init(displayName);
        await startAutoSyncOnReconnect(displayName);

        }
      })();
    }, [session]);
  
  
  

  return (
    <Provider store={store}>
      <SessionContext.Provider value={{ session, setSession }}>
        {/* <UpdateModalProvider> */}
          {session ? <App /> : <WelcomeView />}
        {/* </UpdateModalProvider> */}
      </SessionContext.Provider>
    </Provider>
  );
};
