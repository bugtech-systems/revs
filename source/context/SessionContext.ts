import { createContext } from 'react';
import { Session } from '@supabase/supabase-js';

export const SessionContext = createContext<{
  session: Session | null;
  setSession: (session: Session | null) => void;
}>({
  session: null,
  setSession: () => {},
});
