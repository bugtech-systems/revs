import React, { useContext, useEffect, useState } from 'react';
import { View, Modal, StyleSheet, Text } from 'react-native';
import * as Progress from 'react-native-progress';
import { StackNavigator } from './StackNavigator2';
import NotifService from './utils/NotificationService';
import { COLORS } from './constants';
import  supabase  from './utils/supabaseClient';
import {  useDispatch, useSelector } from 'react-redux';
import { SET_ACTIVE_USER, SET_COLLECTOR, SET_USER } from './redux/actions/types';
import { SessionContext } from './context/SessionContext';
import { fetchUser } from "./utils/offlineSync"
import { useSync } from './context/SyncContext';
import { WelcomeView } from './WelcomeView';

export const LoadingIndicator = () => (
  <View style={{ ...styles.activityContainer, backgroundColor: COLORS.transparentBlack7 }}>
    <Progress.CircleSnail color={['blue', 'yellow', 'red']} />
  </View>
);

export const App = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(({ user }) => user);
  const { isReady, status } = useSync();
  const { session, setSession } = useContext(SessionContext);
  const [loading, setLoading] = useState(true);

  const notif = new NotifService((reg) => console.log('Push registered:', reg));

      const initUser = async (email) => {
    try{
      if (!email) {
      setLoading(false)
      return;
      }
  
      console.log(email, 'EMAIL');

                  // await SyncManager.clearSync()

  
  
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
        if(isReady){
        if(session?.user?.email){
          initUser(session?.user?.email);
        } else {
          setLoading(false)
        }
        }
        
  }, [dispatch, session, isReady]);


  if (loading) return <LoadingIndicator />;

  return (
    <>
      {session ? 
      
      <StackNavigator/>
      : <WelcomeView/>
      }
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
