// SyncContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { syncAll, startAutoSync, stopAutoSync } from "../utils/sync";
import { initDB } from "../utils/db";

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const startSync = async () => {
    try {
      setIsSyncing(true);
      await syncAll();
      setLastSync(new Date());
    } catch (err) {
      console.error("[SyncContext] Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await initDB();
      setInitialized(true)
    };
    init();
  }, []);
  
  
    useEffect(() => {
    const init = async () => {
      await startSync();      
      startAutoSync(30000);
    };
    
    if(initialized){
    console.log('INITIALIZED INIIIT')
    init();
    }
    
    return () => stopAutoSync();
  }, [initialized]);

  return (
    <SyncContext.Provider value={{ isSyncing, lastSync, startSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
};
