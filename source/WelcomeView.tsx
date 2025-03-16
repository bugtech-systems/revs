import React, { useCallback, useState } from 'react';
import Realm from 'realm';
import { useApp } from '@realm/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, Alert, TouchableOpacity, Image } from 'react-native';
import { Input, Button } from '@rneui/base';
import { colors } from './Colors';
// import { COLORS } from './constants/theme';
// import icons from './constants/icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-timezone';
import { COLORS, icons } from './constants';


export function WelcomeView(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false)
  const [passwordHidden, setPasswordHidden] = useState(true);
  const app = useApp();

  // signIn() uses the emailPassword authentication provider to log in
  const signIn = useCallback(async () => {
    let newEmail = String(email).trim() + '@collector.com'
    const creds = Realm.Credentials.emailPassword(newEmail, password);
    // setLoading(false)
    await app.logIn(creds);
    
    setLoading(false)
  }, [app, email, password]);

  // onPressSignIn() uses the emailPassword authentication provider to log in
  const onPressSignIn = useCallback(async () => {
    setLoading(true)
    const currentDateTime = moment.tz('Asia/Manila').format('DD MM YYYY hh:mm:ss');


    const existingValue = await AsyncStorage.getItem('dateTimeNumber');

    if (existingValue === null) {
      // Update AsyncStorage if no value exists or current datetime is greater
      await AsyncStorage.setItem('dateTimeNumber', currentDateTime);
      console.log('DateTime updated to:', currentDateTime);
    } else {
      console.log(moment(existingValue).format('YYYY/MM/DD HH:MM'))
    }


    try {
      await signIn();
    } catch (error: any) {

      Alert.alert(`Failed to sign in: ${error?.message}`);
    }
    setLoading(false)
  }, [signIn]);

  return (
    <SafeAreaProvider>
      <View style={styles.viewWrapper}>
        <View style={styles.container}>
          <Text style={{ ...styles.subtitle, marginBottom: 20, borderColor: COLORS.gray400 }}>
            Revise App
          </Text>
          <View style={{ width: '100%', borderColor: COLORS.gray500, marginBottom: 30 }} />
          <View style={{ width: '100%', alignItems: 'flex-start', left: 10 }}>
            <Text style={{ color: COLORS.black, fontSize: 12, fontWeight: '600' }}>USER ID</Text>
          </View>
          <Input
            // placeholder="Username"
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <View style={{ width: '100%', alignItems: 'flex-start', left: 10 }}>
            <Text style={{ color: COLORS.black, fontSize: 12, fontWeight: '600' }}>PASSWORD</Text>
          </View>
          <Input
            // placeholder="Password"
            autoCapitalize="none"
            onChangeText={setPassword}
            secureTextEntry={passwordHidden}
            rightIcon={
              <TouchableOpacity onPress={() => setPasswordHidden(!passwordHidden)}>
                <Image
                  source={passwordHidden ? icons.eyeOpen : icons.eyeClose}
                  style={{ height: 20, width: 20, }}
                />
              </TouchableOpacity>
            }
          />
          <TouchableOpacity
            onPress={onPressSignIn}
            disabled={loading}
            style={{ ...styles.mainButton, opacity: loading ? .6 : 1, }}
          >
            {
              loading &&
              <Image
                source={icons.loader}
                style={{ height: 25, width: 25, position: 'absolute', }}
              />
            }
            <Text style={{ fontWeight: '400', fontSize: 15, color: COLORS.white }}>
              SUBMIT
            </Text>
          </TouchableOpacity>
        </View>
        {/* <View style={{ width: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 20, color: COLORS.white, fontWeight: 'bold'}}>
            Check for Updates.
          </Text>
        </View> */}

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
    height: 400
  },
  title: {
    fontSize: 18,
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
    borderRadius: 20
  },
  secondaryButton: {
    color: colors.primary,
  },
});
