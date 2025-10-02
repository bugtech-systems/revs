import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { realmContext } from '../RealmContext';
import { Combinations, Users } from '../Models';
import Realm, { BSON } from 'realm';
import { useSelector, useDispatch } from 'react-redux';
import { useNetInfo } from '@react-native-community/netinfo';
import { COLORS, icons } from '../constants';
import { STOP_LOADING } from '../redux/actions/types';
import Config from 'react-native-config';
import axios from 'axios';
import * as Progress from 'react-native-progress';
import { useNavigation } from '@react-navigation/native';
import { getConfiguration } from '../utils/helpers';


const { useRealm, useQuery } = realmContext

export function SyncComponent() {
  const { collector, user, selectedUser } = useSelector(({ user }) => user);
  const dispatch = useDispatch();
  const realm = useRealm();
  const netInfo = useNetInfo();
  const [connection, setConnection] = useState(null);
  const [pauseSync, togglePauseSync] = useState(false);
  const [smsError, setSmsError] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const [connectionState, setConnectionState] = useState("Disconnected");
  const navigation = useNavigation();

  let collectorName = selectedUser ? selectedUser : collector;

    const users = useQuery(Users, user => {
      return user.filtered(
        'email == $0',
        collectorName,
      );
    }, [collectorName]);
  
  let analytics = getConfiguration(users[0], 'analytics').isCheck;
  let dataAnalytics = getConfiguration(users[0], 'dataAnalytics').isCheck;


  console.log(analytics, "THE ANALYTICS ALLOWED", "DATA ANALYTICS", dataAnalytics)
  
  
  let combs = useQuery(Combinations, combination => {
    return combination.filtered('straightTotal == 0 && rambleTotal == 0');
  })

  const handleConnection = async () => {
    if (netInfo.isConnected === false) {
      togglePauseSync(true);
      realm.syncSession?.pause();
    } else {
      setConnection(null)
      togglePauseSync(false);
        realm.syncSession?.reconnect();
    }
    // syncProgress()
  }

  const handleSms = async () => {

    await axios.get(`${Config.API_UR}/apiv2/v1/smsStatus`)
      .then(async (res) => {
        let { sms } = res.data;
        setSmsError(sms);
      })
      .catch(err => {
        console.log(err)
      })

  }

  useEffect(() => {
    // handleConnection();
    handleSms();
  }, [])


  useEffect(() => {
    if (!realm?.syncSession) return;

    // Get the initial state
    setConnectionState(realm.syncSession.connectionState);

    // Listen for connection state changes
    const listener = (newState) => {
      console.log("New Connection State:", newState);
      setConnectionState(newState);
    };

    realm.syncSession.addConnectionNotification(listener);

    // Cleanup listener on unmount
    return () => {
      realm.syncSession?.removeConnectionNotification(listener);
    };
  }, [realm]);
  
  useEffect(() => {
    let lastTransferred = 0;
    
    const progressNotificationCallback = (transferred, transferable) => {
      if (transferable === 0) return; // Avoid division by zero

      let percentTransferred = (transferred / transferable) * 100;

      // Ensure progress moves smoothly, avoiding large jumps
      if (percentTransferred > lastTransferred + 10) {
        percentTransferred = lastTransferred + 5; // Increment in smaller steps
      }

      setProgress(percentTransferred);
      lastTransferred = percentTransferred;

      // Stop loading when upload completes
      if (percentTransferred >= 100) {
        dispatch({ type: STOP_LOADING });
      }
    };



    console.log(JSON.stringify(realm?.syncSession.connectionState), 'USER SESSION')

    // Start progress from 0% and attach listener

    realm?.syncSession?.addProgressNotification(
      Realm.ProgressDirection.Upload,
      Realm.ProgressMode.ReportIndefinitely,
      progressNotificationCallback
    );

    // Cleanup on unmount
    return () => {
      realm?.syncSession?.removeProgressNotification(progressNotificationCallback);
      console.log(JSON.stringify(realm?.syncSession.connectionState), 'USER SESSION ON COMPONENT UN-MOUNT')
      setProgress(0)
      dispatch({ type: STOP_LOADING });
    };
  }, [realm]);

  const intervalTime = 5 * 60 * 1000;

  useEffect(() => {
    // Set up the interval to trigger every 3 minutes
    const interval = setInterval(() => {
    //   handleSms();
    }, intervalTime);
    // Clean up the interval when the component is unmounted
    return () => clearInterval(interval);
  }, []);




  return (
    <View style={{ alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
      {user?.isAdmin && analytics ?
        <TouchableOpacity 
          disabled={dataAnalytics ? false : true}
          onPress={() => navigation.navigate('Combinations', {})} 
          style={{ flexDirection: 'row' }}
        >
          {smsError ? <Text style={{ fontSize: 12, color: COLORS.darkGray2, fontWeight: '500'}}>SMS</Text> : ''}
          {/* {combs.length && (combs.length < 999) ? */}
            <Text style={{ fontSize: 12, color: COLORS.darkGray2, fontWeight: '500', textAlign: 'center'}}>
              {combs.length}
            </Text>
            {/* : '' */}
          {/* } */}
        </TouchableOpacity>
        : ''

      }
      {(Number(progress / 100) > 1 && Number(progress / 100) < 100) ?
      <Progress.CircleSnail color={['blue', 'yellow', 'red']} size={22} />
        : '' 
        } 
    </View>
  );
}
