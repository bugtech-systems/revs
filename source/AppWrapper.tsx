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

export const AppWrapper = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem('supabase_session');
      setSession(null);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error clearing session:', err);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedSession = await AsyncStorage.getItem('supabase_session');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
            setSession(parsed);
        } else {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            setSession(data.session);
            await AsyncStorage.setItem('supabase_session', JSON.stringify(data.session));
          }
        }
      } catch (err) {
        console.error('Error loading session:', err);
        await clearSession();
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession) {
        await AsyncStorage.setItem('supabase_session', JSON.stringify(newSession));
        setSession(newSession);
      } else {
        console.log('Session cleared by Supabase event.');
        await clearSession();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <LoadingIndicator />;

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
