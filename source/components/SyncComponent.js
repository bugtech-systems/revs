import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { realmContext } from '../RealmContext';
import { Combinations } from '../Models';
import Realm, { BSON } from 'realm';
import { useSelector, useDispatch } from 'react-redux';
import { useNetInfo } from '@react-native-community/netinfo';
import { COLORS, icons } from '../constants';
import { STOP_LOADING } from '../redux/actions/types';
import Config from 'react-native-config';
import axios from 'axios';
import * as Progress from 'react-native-progress';


const { useRealm, useQuery } = realmContext

export function SyncComponent() {
  const { user } = useSelector(({ user }) => user);
  const dispatch = useDispatch();
  const realm = useRealm();
  const netInfo = useNetInfo();
  const [connection, setConnection] = useState(null);
  const [pauseSync, togglePauseSync] = useState(false);
  const [smsError, setSmsError] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [syncing, setSyncing] = useState(false);
  
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
    handleConnection();
    handleSms();
  }, [])

  useEffect(() => {
    setTimeout(() => {
      dispatch({ type: STOP_LOADING })
    }, 30000)


    const progressNotificationCallback = (transferred, transferable) => {
      // Convert decimal to percent with no decimals
      // (e.g. 0.6666... -> 67)
      // console.log("THE TRANSFERABLE SYNC:", transferable, "THE TEANSFERRED:", transferred)



      console.log(transferable, 'transferable')
      console.log(transferred, 'transferred')


      console.log(Number(transferable / transferred), "TT")
      
      const percentTransferred = parseFloat((transferred / transferable).toFixed(2)) * 100;


      // setProgress(percentTransferred)

      
      
      setUploadProgressPercent(percentTransferred);
      if (percentTransferred == 100) {
        dispatch({ type: STOP_LOADING })
      }
      // console.log(uploadProgressPercent, "THE PERCENT!")
      // console.log(progress, percentTransferred, '1percentTransferredpercentTransferredpercentTransferredpercentTransferred')
      return percentTransferred;
    };


    // Listen for changes to connection state
    realm.syncSession?.addProgressNotification(
      Realm.ProgressDirection.Upload,
      Realm.ProgressMode.ReportIndefinitely,
      progressNotificationCallback,
    );

    // Remove the connection listener when component unmounts
    return () => {
      realm.syncSession?.removeProgressNotification(
        progressNotificationCallback,
      );
      dispatch({ type: STOP_LOADING })
    }
    // Run useEffect only when component mounts
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
      {(user && user.isAdmin) ?
        <View style={{ flexDirection: 'row' }}>
          {smsError ? <Text style={{ fontSize: 12, color: COLORS.darkGray2, fontWeight: '500'}}>SMS</Text> : ''}
          {combs.length && (combs.length < 999) ?
            <Text style={{ fontSize: 12, color: COLORS.darkGray2, fontWeight: '500', textAlign: 'center'}}>
              {combs.length}
            </Text>
            : ''
          }
        </View>
        : ''

      }
      {(uploadProgressPercent && uploadProgressPercent < 100) ?
        <Progress.Circle progress={uploadProgressPercent} showsText={true} textStyle={{fontSize: 10, color: COLORS.black, fontWeight: '500'}} thickness={1.5} size={32} color={COLORS.primary} />
        : ''
      } 
    </View>
  );
}
