import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Button } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { init, api, forceSync, startAutoSyncOnReconnect, deleteDB } from './utils/offlineSync';
import { PermissionsAndroid } from 'react-native';




const SyncComponent = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);







async function requestStoragePermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: "Storage Permission",
        message: "App needs access to your storage to save the database file.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn(err);
    return false;
  }
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
