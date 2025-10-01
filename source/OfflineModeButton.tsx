import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, Text} from 'react-native';
// import {useRealm} from '@realm/react';
import {colors} from './Colors';
import { realmContext } from './RealmContext';
import { COLORS, icons } from './constants';


const { useRealm, useQuery } = realmContext;

export function OfflineModeButton() {
  const realm = useRealm();

  const [pauseSync, togglePauseSync] = useState(false);

  return (
    <Pressable
      style={{ padding: 10, alignItems: 'center', justifyContent: 'center'}}
      onPress={() => {
        if (!pauseSync && realm.syncSession?.state === 'active') {
          realm.syncSession.pause();
          togglePauseSync(true);
        } else if (pauseSync && realm.syncSession?.state === 'inactive') {
          realm.syncSession.resume();
          togglePauseSync(false);
        }
      }}>
        <Image 
          source={realm.syncSession?.state === 'active' ? icons.EnabledSync : icons.disabledSync}
          style={{ height: 25, width: 25, resizeMode: 'contain' }}
        />
        
        
      {/* <Text style={styles.buttonText}>
        {realm.syncSession?.state === 'active' ? 'Disable Sync' : 'Enable Sync'}
      </Text> */}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonText: {
    padding: 12,
    color: colors.primary,
  },
});
