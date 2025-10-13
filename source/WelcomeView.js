import React, { useCallback, useState, useEffect, useContext } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, Alert, TouchableOpacity, Image } from 'react-native';
import { Input } from '@rneui/base';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-timezone';
import { COLORS, icons } from './constants';
import supabase from './utils/supabaseClient';
import { fetchUser } from './utils/offlineSync';
import { useSync } from './context/SyncContext';
import { SessionContext } from './context/SessionContext';
import SyncManager from './services/SyncManager';
import { SET_ACTIVE_USER, SET_COLLECTOR, SET_USER } from './redux/actions/types';
import { useDispatch } from 'react-redux';

export function WelcomeView() {
  const {  isReady } = useSync();
    const dispatch = useDispatch();
  const { setSession } = useContext(SessionContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordHidden, setPasswordHidden] = useState(true);

  // Sign in with Supabase and store session + local user
  const signIn = useCallback(async () => {
    const fullEmail = String(email).trim() + '@collector.com';
    
            if (fullEmail) {
      const localUser = await fetchUser(fullEmail);
      console.log('Fetched local user:', localUser);
          if (localUser) {
              dispatch({ type: SET_USER, payload: localUser });
              dispatch({ type: SET_ACTIVE_USER, payload: localUser });
      }
    }
    
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: fullEmail,
      password,
    });

    if (error) {
              dispatch({ type: SET_USER, payload: null });
              dispatch({ type: SET_COLLECTOR, payload: null });
              dispatch({ type: SET_ACTIVE_USER, payload: null });
    
    throw error
    };



    // Save session for persistence
    if (data?.session) {
    console.log(data, 'DATA SESSION', data?.user?.email)

          await AsyncStorage.setItem('supabase_session', JSON.stringify(data.session));
      setSession(data.session);
  
    }



  

    return data;
  }, [email, password, setSession]);

  const onPressSignIn = useCallback(async () => {
    setLoading(true);
    try {
      const currentDateTime = moment.tz('Asia/Manila').format('DD MM YYYY hh:mm:ss');
      const existingValue = await AsyncStorage.getItem('dateTimeNumber');
      SyncManager.clearSync()
      if (!existingValue) {
        await AsyncStorage.setItem('dateTimeNumber', currentDateTime);
        console.log('DateTime updated to:', currentDateTime);
      }

      await signIn();
      Alert.alert('Success', 'Logged in successfully!');
    } catch (error) {
      console.log('Login error:', error);
      Alert.alert('Failed to sign in', error?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [signIn, dispatch]);

  useEffect(() => {
    // if (isReady) {
    //   forceFullSync();
    //   console.log('FORCE FULL RESYNC!');
    // }
    
    return () => {
      SyncManager.clearSync()
    }
  }, [isReady]);

  return (
    <SafeAreaProvider>
      <View style={styles.viewWrapper}>
        <View style={styles.container}>
          <Text style={{ ...styles.subtitle, marginBottom: 20 }}>Revise App</Text>
          <View style={{ width: '100%', borderColor: COLORS.gray500, marginBottom: 30 }} />

          <View style={{ width: '100%', alignItems: 'flex-start', left: 10 }}>
            <Text style={{ color: COLORS.black, fontSize: 12, fontWeight: '600' }}>USER ID</Text>
          </View>
          <Input onChangeText={setEmail} autoCapitalize="none" value={email} />

          <View style={{ width: '100%', alignItems: 'flex-start', left: 10 }}>
            <Text style={{ color: COLORS.black, fontSize: 12, fontWeight: '600' }}>PASSWORD</Text>
          </View>
          <Input
            autoCapitalize="none"
            onChangeText={setPassword}
            secureTextEntry={passwordHidden}
            rightIcon={
              <TouchableOpacity onPress={() => setPasswordHidden(!passwordHidden)}>
                <Image
                  source={passwordHidden ? icons.eyeOpen : icons.eyeClose}
                  style={{ height: 20, width: 20 }}
                />
              </TouchableOpacity>
            }
          />

          <TouchableOpacity
            onPress={onPressSignIn}
            disabled={loading}
            style={{ ...styles.mainButton, opacity: loading ? 0.6 : 1 }}
          >
            {loading && (
              <Image source={icons.loader} style={{ height: 25, width: 25, position: 'absolute' }} />
            )}
            <Text style={{ fontWeight: '400', fontSize: 15, color: COLORS.white }}>SUBMIT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  viewWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#303ea0',
  },
  container: {
    backgroundColor: COLORS.white,
    padding: 10,
    top: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 16,
    width: '80%',
    height: 400,
  },
  subtitle: {
    fontSize: 14,
    padding: 10,
    color: 'gray',
    textAlign: 'center',
  },
  mainButton: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f29601',
    width: '100%',
    borderRadius: 20,
  },
});
