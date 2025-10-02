import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { App } from './App';
import { WelcomeView } from './WelcomeView';
import supabase from './utils/supabaseClient';
import { SessionContext } from './context/SessionContext';
import { initDB } from './utils/db';

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
        {/* <UpdateModalProvider> */}
          {session ? <App /> : <WelcomeView />}
        {/* </UpdateModalProvider> */}
      </SessionContext.Provider>
    </Provider>
  );
};
