// SessionProvider.tsx
import React, { useState, ReactNode, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import supabase from './utils/supabaseClient';
import { SessionContext } from './context/SessionContext';

interface Props {
  children: ReactNode;
}

export const SessionProvider = ({ children }: Props) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // 1️⃣ Get the current session on app start
    const currentSession = supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    // 2️⃣ Listen for auth changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cleanup on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {children}
    </SessionContext.Provider>
  );
};