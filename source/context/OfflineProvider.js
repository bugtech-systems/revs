import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  // init,
  api as rawApi,
  forceSync,
  startAutoSyncOnReconnect,
  stopAutoSyncOnReconnect,
  nowISO,
  fetchUser,
  saveLocalUser
  
} from "../utils/offlineSync";
import {  pullFromSupabase, forceFullResync } from '../utils/batchPull';

const OfflineSyncContext = createContext(null);

export const OfflineProvider = ({ session, children }) => {
   const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [online, setOnline] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // 👈 consumers watch this
  
  
  // bump dataVersion so consumers know to refetch
  const bumpVersion = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);
  
  
  
  

  // Initialize DB + run initial sync
  useEffect(() => {
    const bootstrap = async () => {
      bumpVersion();

    };
    bootstrap();
  }, [session?.user?.email]);

  // Track network
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected);
    });
    return () => unsub();
  }, []);

  // Auto sync when reconnect
  // useEffect(() => {
  //   if (session?.user?.email) {
  //     forceFullResync().then(() => {
  //       bumpVersion()
  //     });
     
  //   }
  // }, [session?.user?.email]);

  // Manual sync
  const syncNow = useCallback(async () => {
    try {
      // init();
      setSyncing(true);
      await forceSync(session?.user?.email);
      // await forceFullResync();
      bumpVersion();
      setLastSync(new Date().toISOString());
    } catch (err) {
      console.warn("Manual sync failed", err);
    } finally {
      setSyncing(false);
    }

    
  }, []);

  

     // Initial load
  useEffect(() => {
      startAutoSyncOnReconnect(session?.user?.email);
      bumpVersion();
     
    const interval = setInterval(syncNow, 120000); // background sync every 10s
    // const fullSyncInterval = setInterval(fullSync, 300000); // background sync every 5m
    return () => {
    clearInterval(interval);
     stopAutoSyncOnReconnect(session?.user?.email);
    }    

  }, []);


  // Wrapped API that bumps version after any CRUD
  const api = {
    ...rawApi,
    createUser: async (u) => { await rawApi.createUser(u); bumpVersion(); },
    updateUser: async (id, p) => { await rawApi.updateUser(id, p); bumpVersion(); },
    deleteUser: async (id) => { await rawApi.deleteUser(id); bumpVersion(); },

    createBetting: async (b) => { await rawApi.createBetting(b); bumpVersion(); },
    updateBetting: async (id, p) => { await rawApi.updateBetting(id, p); bumpVersion(); },
    deleteBetting: async (id) => { await rawApi.deleteBetting(id); bumpVersion(); },

    createDraw: async (d) => { await rawApi.createDraw(d); bumpVersion(); },
    updateDraw: async (id, p) => { await rawApi.updateDraw(id, p); bumpVersion(); },
    deleteDraw: async (id) => { await rawApi.deleteDraw(id); bumpVersion(); },

    createMasterCombination: async (m) => { await rawApi.createMasterCombination(m); bumpVersion(); },
    updateMasterCombination: async (id, p) => { await rawApi.updateMasterCombination(id, p); bumpVersion(); },
    deleteMasterCombination: async (id) => { await rawApi.deleteMasterCombination(id); bumpVersion(); },
  };


  const value = {
    api,        // CRUD API
    syncing,    // boolean
    lastSync,   // ISO timestamp
    online,     // boolean
    syncNow,    // manual sync trigger
    dataVersion, // 👈 consumers watch this
    bumpVersion,
    fetchUser,
    saveLocalUser,
    forceSync
  };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

// Hook to consume the context
export const useOffline = () => {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) throw new Error("useOfflineSync must be used inside OfflineSyncProvider");
  return ctx;
};
