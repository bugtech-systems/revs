import React, { useCallback, useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, Alert, TouchableOpacity, Image } from 'react-native';
import { Input } from '@rneui/base';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-timezone';
import { COLORS, icons } from './constants';
import supabase  from './utils/supabaseClient'; // Your initialized Supabase client
import { getLocalUser, initDB, saveLocalUser } from './utils/db'; // SQLite helper functions

export function WelcomeView(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordHidden, setPasswordHidden] = useState(true);

  // Try to load cached user on mount
  useEffect(() => {
    (async () => {

      // await initDB();
      
      const localUser = await getLocalUser();
      if (localUser?.email) setEmail(localUser.email.replace('@collector.com', ''));
    })();
  }, []);

  // Sign in with Supabase
  const signIn = useCallback(async () => {
    const fullEmail = String(email).trim() + '@collector.com';
    const { data, error } = await supabase.auth.signInWithPassword({
      email: fullEmail,
      password,
    });

    if (error) throw error;

    // Save user locally for offline-first
    if (data.user) {

      
      await saveLocalUser({
        id: data.user.id,
        email: fullEmail
      });
      console.log(data.user, "THE USER DATA")
    }
  }, [email, password]);

  const onPressSignIn = useCallback(async () => {
    setLoading(true);

    try {
      const currentDateTime = moment.tz('Asia/Manila').format('DD MM YYYY hh:mm:ss');
      const existingValue = await AsyncStorage.getItem('dateTimeNumber');

      if (!existingValue) {
        await AsyncStorage.setItem('dateTimeNumber', currentDateTime);
        console.log('DateTime updated to:', currentDateTime);
      } else {
        console.log('Stored datetime:', existingValue);
      }

      await signIn();
      Alert.alert('Success', 'Logged in successfully!');
    } catch (error: any) {
      console.log(error);
      Alert.alert('Failed to sign in', error?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [signIn]);

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
