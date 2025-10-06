import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Button, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { PermissionsAndroid } from 'react-native';
// import { useOfflineSync } from "./context/OfflineSyncProvider";
import { useOffline } from "./context/OfflineProvider";
import {  forceFullResync } from './utils/batchPull';




const SyncComponent = () => {
  const {  syncing, lastSync, online } = useOffline();

  






  return (
    <View style={styles.container}>
      {syncing ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
      <TouchableOpacity
      onPress={forceFullResync}
      >
        <Text style={styles.text}>
          {online ? `Synced` : 'Offline'}
          {lastSync ? ` • Last: ${new Date(lastSync).toLocaleTimeString()}` : ''}
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
