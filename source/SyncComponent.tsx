import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Button, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { PermissionsAndroid } from 'react-native';
// import { useOfflineSync } from "./context/OfflineSyncProvider";
import { useOffline } from "./context/OfflineProvider";
import { useSync } from './context/SyncContext';
// import {  forceFullResync } from './utils/batchPull';




const SyncComponent = () => {
  const {   online } = useOffline();
  const { forceFullSync, isReady, status, lastSync
  } = useSync();
  





console.log(isReady, status, 'STAATS')
  return (
    <View style={styles.container}>
      {status?.isSyncing ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
      <TouchableOpacity
      onPress={forceFullSync}
      >
        <Text style={styles.text}>
          {status?.isSyncing ? 'Syncing' : ` • Last: ${new Date(lastSync).toLocaleTimeString()}`}
        </Text>
        </TouchableOpacity>
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
