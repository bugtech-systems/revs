import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Button } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { init, api, forceSync, startAutoSyncOnReconnect, deleteDB } from './utils/offlineSync';
import { exportDatabase } from './utils/exportHelper';



const SyncComponent = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const handleDelete = async () => {
await deleteDB()
  }


  useEffect(() => {
    init()
    // Listen to network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);




  return (
    <View style={styles.container}>
      {syncing ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.text}>
          {isOnline ? 'Synced' : 'Offline'}
          {lastSync ? ` • Last: ${new Date(lastSync).toLocaleTimeString()}` : ''}
        </Text>
      )}
                  {/* <Button title="Delete DB" onPress={handleDelete} />
            <Button title="Force Sync" onPress={forceSync} />
            <Button title="Export Database" onPress={exportDatabase} /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  text: {
    color: '#fff',
    fontSize: 12,
  },
});

export default SyncComponent;
