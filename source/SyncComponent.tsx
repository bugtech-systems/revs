import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const SyncComponent = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);



  useEffect(() => {
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
