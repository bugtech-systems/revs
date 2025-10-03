import React, { useContext, useEffect, useState } from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import * as Progress from 'react-native-progress';
import { StackNavigator } from './StackNavigator2';
// import { AppInitializer } from './AppInitializer';
import NotifService from './utils/NotificationService';
import { COLORS } from './constants';
import { getLocalUser, initDB, saveLocalUser } from './utils/db';
import  supabase  from './utils/supabaseClient';
import { useDispatch } from 'react-redux';
import { SET_USER } from './redux/actions/types';
import { SessionContext } from './context/SessionContext';
import { SyncProvider } from './context/SyncContext';
import { init, api, forceSync, startAutoSyncOnReconnect } from './utils/offlineSync';

const LoadingIndicator = () => (
  <View style={{ ...styles.activityContainer, backgroundColor: COLORS.transparentBlack7 }}>
    <Progress.CircleSnail color={['blue', 'yellow', 'red']} />
  </View>
);

export const App = () => {
  const [loading, setLoading] = useState(true);
 const [users, setUsers] = useState([]);
    const { session } = useContext(SessionContext);
  const dispatch = useDispatch();

  const notif = new NotifService((reg) => console.log('Push registered:', reg));

  useEffect(() => {

    notif.createDefaultChannels();
  }, []);
  
  
  useEffect(() => {
    const initUser = async (email) => {
      if (!email) return;
  
      console.log(email, 'EMAIL');
  
      // Try fetching from local SQLite
      let localUser = await getLocalUser(email);
      console.log(localUser, 'LOCAL USER');
  
      if (!localUser) {
        // Fetch from Supabase by email if not found locally
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email) // filter by email
          .limit(1)
          .single();
    console.log(data, 'DATAA USER')
        if (error) {
          console.error('Supabase fetch error:', error);
        }
  
        if (data) {
          // Save fetched user to local SQLite
          await saveLocalUser(data);
          localUser = data;
        }
      }
  
      if (localUser) {
        dispatch({ type: SET_USER, payload: localUser });
      }
  

  console.log('SET LOADING')
      setLoading(false);
      };
  
    initUser(session?.user?.email);
  }, [dispatch, session]);


console.log(loading, session, 'loaad')
  if (loading) return <LoadingIndicator />;

  return (
    <>
      {/* <AppInitializer /> */}
      {/* <SyncProvider> */}
      <StackNavigator />
      {/* </SyncProvider> */}
    </>
  );
};

const styles = StyleSheet.create({
  activityContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
