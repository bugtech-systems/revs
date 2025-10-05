import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  init,
  api,
  forceSync,
  startAutoSyncOnReconnect,
  stopAutoSyncOnReconnect,
} from "../utils/offlineSync";

const OfflineSyncContext = createContext(null);

export const OfflineSyncProvider = ({ session, children }) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [online, setOnline] = useState(false);

  // Initialize DB + run initial sync
  useEffect(() => {
    const bootstrap = async () => {
      await init(session?.user?.email);
    };
    bootstrap();
  }, [session]);

  // Track network
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected);
    });
    return () => unsub();
  }, []);

  // Auto sync when reconnect
  useEffect(() => {
    if (session?.user?.email) {
      startAutoSyncOnReconnect(session?.user?.email);
      return () => stopAutoSyncOnReconnect(session?.user?.email);
    }
  }, [session]);

  // Manual sync
  const syncNow = useCallback(async () => {
    try {
      setSyncing(true);
      await forceSync(session?.user?.email);
      setLastSync(new Date().toISOString());
    } catch (err) {
      console.warn("Manual sync failed", err);
    } finally {
      setSyncing(false);
    }
  }, [session]);

  const value = {
    api,        // CRUD API
    syncing,    // boolean
    lastSync,   // ISO timestamp
    online,     // boolean
    syncNow,    // manual sync trigger
  };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

// Hook to consume the context
export const useOfflineSync = () => {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) throw new Error("useOfflineSync must be used inside OfflineSyncProvider");
  return ctx;
};
