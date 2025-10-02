import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { syncAll } from "./sync";

export const useAutoSync = () => {
  useEffect(() => {
    // On network reconnect → trigger sync
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log("Connected → syncing...");
        syncAll().then(() => console.log("✅ Sync complete"));
      }
    });

    // Background periodic sync (every 2 mins)
    const interval = setInterval(() => {
      syncAll();
    }, 2 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);
};
