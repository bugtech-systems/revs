import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './redux/store';
import { App, LoadingIndicator } from './App';
import { WelcomeView } from './WelcomeView';
import supabase from './utils/supabaseClient';
import { SessionContext } from './context/SessionContext';
import { SyncProvider } from './context/SyncContext';
import { DataProvider } from './context/DataContext';
import { syncConfig } from './configs/syncConfig';
import SyncManager from './services/SyncManager';

export const AppWrapper = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem('supabase_session');
      setSession(null);
      await supabase.auth.signOut();
      setLoading(false)
    } catch (err) {
      setLoading(false)
      console.error('Error clearing session:', err);
    }
  };

   const loadSession = async () => {
      try {
        const storedSession = await AsyncStorage.getItem('supabase_session');
        
        
        console.log(storedSession, 'STORED SESSION')
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
            setSession(parsed);
        } else {
          const { data } = await supabase.auth.getSession();
          
          
          
          console.log(data, 'SUPABASE SESSION')
          if (data?.session) {
            setSession(data.session);
            await AsyncStorage.setItem('supabase_session', JSON.stringify(data.session));
          } else {
                  await clearSession();
          }
        }
      } catch (err) {
        console.error('Error loading session:', err);
        await clearSession();
      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
        // SyncManager.clearSync()
        loadSession();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      
      
      
      console.log(newSession, _event, 'auth state change')
      if (newSession) {
        await AsyncStorage.setItem('supabase_session', JSON.stringify(newSession));
        setSession(newSession);
        
      } else {
          setLoading(false)
          await clearSession();
      }
    });


    return () => {
      listener.subscription.unsubscribe();
      setLoading(false)
    };
  }, []);

  if (loading) return <LoadingIndicator />;




console.log(loading, 'WRAPPER')
  return (
    <Provider store={store}>
      <SessionContext.Provider value={{ session, setSession, clearSession }}>
        <SyncProvider config={syncConfig}>
          <DataProvider>{session ? <App /> : <WelcomeView />}</DataProvider>
        </SyncProvider>
      </SessionContext.Provider>
    </Provider>
  );
};
