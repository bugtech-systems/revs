import React, { useContext, useEffect, useState } from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import * as Progress from 'react-native-progress';
import { StackNavigator } from './StackNavigator2';
import NotifService from './utils/NotificationService';
import { COLORS } from './constants';
import  supabase  from './utils/supabaseClient';
import {  useDispatch, useSelector } from 'react-redux';
import { SET_ACTIVE_USER, SET_COLLECTOR, SET_USER } from './redux/actions/types';
import { SessionContext } from './context/SessionContext';
// import { useOfflineSync } from './context/OfflineSyncProvider';
// import { useOffline } from './context/OfflineProvider';
import { fetchUser } from "./utils/offlineSync"
import { useSync } from './context/SyncContext';
import SyncManager from './services/SyncManager';

export const LoadingIndicator = () => (
  <View style={{ ...styles.activityContainer, backgroundColor: COLORS.transparentBlack7 }}>
    <Progress.CircleSnail color={['blue', 'yellow', 'red']} />
  </View>
);

export const App = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(({ user }) => user);
  const { forceFullSync, isReady, status } = useSync();
  const { session } = useContext(SessionContext);
  const [loading, setLoading] = useState(true);

  const notif = new NotifService((reg) => console.log('Push registered:', reg));

      const initUser = async (email) => {
    try{
      if (!email) {
      setLoading(false)
      return;
      }
  
      console.log(email, 'EMAIL');

                  await SyncManager.clearSync()

  
  
      // Try fetching from local SQLite
      let localUser = await fetchUser(email);
  console.log(localUser, 'LOCAL USER')
      if (!localUser) {
        // Fetch from Supabase by email if not found locally
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email) // filter by email
          .limit(1)
    console.log(data, 'DATAA USER')
        if (error) {
          console.error('Supabase fetch error:', error);
        } else {
           localUser = data[0]
        }
      }
  
      if (localUser) {
        dispatch({ type: SET_USER, payload: localUser });
        dispatch({ type: SET_COLLECTOR, payload: email });
        dispatch({ type: SET_ACTIVE_USER, payload: localUser });
      }
      


      setLoading(false);

    } catch(err) {
      console.log(err, 'ERROR')
      setLoading(false)
    }
      
      
      };




  useEffect(() => {
    notif.createDefaultChannels();
  }, []);
  
  
  useEffect(() => {
    if(session?.user?.email){
          initUser(session?.user?.email);
    } else {
      setLoading(false)
    }
    
  }, [dispatch, session?.user?.email]);


console.log(loading, session, 'loaad', isReady, status, user)
  if (loading) return <LoadingIndicator />;

  return (
    <>
      <StackNavigator />
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
