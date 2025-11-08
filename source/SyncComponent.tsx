import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { useSync } from './context/SyncContext';




const SyncComponent = () => {

  





console.log(isReady, status, 'STAATS')
  return (
    <View style={styles.container}>
      {status?.isSyncing ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
      <TouchableOpacity
      onPress={() => forceFullSync()}
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
    marginHorizontal: 8,
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
