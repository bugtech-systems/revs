import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNetInfo } from '@react-native-community/netinfo';
import { COLORS } from '../constants';
import { STOP_LOADING } from '../redux/actions/types';
import Config from 'react-native-config';
import axios from 'axios';
import * as Progress from 'react-native-progress';
import { useNavigation } from '@react-navigation/native';
import { getConfiguration } from '../utils/helpers';
import { fetchMasterCombinations } from '../redux/actions/bettingActions';

export function SyncComponent() {
  const { collector, user, selectedUser, users } = useSelector(
    ({ user }) => user
  );

  const dispatch = useDispatch();
  const netInfo = useNetInfo();
  const navigation = useNavigation();

  const [smsError, setSmsError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [combs, setCombs] = useState([]);

  const collectorName = selectedUser || collector;

  /** -----------------------
   * USER CONFIGURATION
   * ---------------------- */

  const analytics = getConfiguration(selectedUser, 'analytics')?.isCheck;
  const dataAnalytics = getConfiguration(selectedUser, 'dataAnalytics')?.isCheck;


  console.log(dataAnalytics, "dataAnalyticsdataAnalyticsdataAnalyticsdataAnalytics")
  
  

  const loadFilteredCombinations = async () => {
  try {
    const combinations = await dispatch(fetchMasterCombinations());

    const filteredCombinations = combinations.filter(
      item => Number(item.straight_total) === 0 && Number(item.ramble_total) === 0
    );

    // You can now:
    // - setState
    // - dispatch another action
    // - return the filtered data
    setCombs(filteredCombinations);
    return filteredCombinations;
  } catch (err) {
    console.error('Failed to load combinations', err);
    return [];
  }
};
  

  /** -----------------------
   * SMS STATUS
   * ---------------------- */
  const handleSms = async () => {
    try {
      const res = await axios.get(`${Config.API_UR}/apiv2/v1/smsStatus`);
      setSmsError(res.data?.sms ?? false);
    } catch (err) {
      console.log('SMS status error:', err);
    }
  };

  /** -----------------------
   * SYNC LOGIC (API-based)
   * ---------------------- */
  const startSync = async () => {
    if (!netInfo.isConnected) return;

    try {
      setSyncing(true);
      setProgress(0);

      // Fake progress animation while syncing
      let current = 0;
      const interval = setInterval(() => {
        current += 10;
        setProgress(current);

        if (current >= 100) {
          clearInterval(interval);
          setSyncing(false);
          dispatch({ type: STOP_LOADING });
        }
      }, 300);

      // 🔁 Call your backend sync endpoint here
      // await axios.post(`${Config.API_UR}/sync`);

    } catch (err) {
      console.log('Sync failed:', err);
      setSyncing(false);
    }
  };

  /** -----------------------
   * NETWORK AWARENESS
   * ---------------------- */
  useEffect(() => {
    if (netInfo.isConnected) {
      startSync();
    }
  }, [netInfo.isConnected]);

  /** -----------------------
   * INITIAL LOAD
   * ---------------------- */
  useEffect(() => {
    loadFilteredCombinations()
    handleSms();
  }, []);


  console.log(combs.length, "COMBS COUNT")

  /** -----------------------
   * UI
   * ---------------------- */
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexDirection: 'column',
        marginRight: 12,
      }}
    >
      

      <View style={{ alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column'}}>
      {user?.is_admin ?
        <TouchableOpacity 
          disabled={dataAnalytics ? false : true}
          onPress={() => navigation.navigate('Combinations', {})} 
          style={{ flexDirection: 'row' }}
        >
          {/* {smsError ? <Text style={{ fontSize: 12, color: COLORS.darkGray2, fontWeight: '500'}}>SMS</Text> : ''} */}
          {combs.length && (combs.length < 1000) ?
            <Text style={{ fontSize: 14, color: COLORS.black900, fontWeight: 'bold', textAlign: 'center'}}>
              {combs.length}
            </Text>
            : ''  
            }  
        </TouchableOpacity>
        : ''

      }
      </View>



    </View>
  );
}
