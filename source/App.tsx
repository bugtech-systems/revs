import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Modal } from 'react-native';
import { createNavigationContainerRef } from '@react-navigation/native';
import { realmContext } from './RealmContext';
import { Betting, Combinations, Draws, Messages, Users } from './Models';
import * as Progress from 'react-native-progress';
import { StackNavigator } from './StackNavigator';
import NotifService from './utils/NotificationService';
import Config from 'react-native-config';
import { COLORS } from './constants';
import { AppInitializer } from './AppInitializer';
// import { useSelector } from 'react-redux';



const appId = Config.ATLAS_APP_ID_QA

console.log(appId, "APP ID")


const usersSubscriptionName = 'users';
const ownItemsSubscriptionName = 'bettings';
const drawsSubscriptionName = 'draws';
const combinationsSubscriptionName = 'combinations';

// If you're getting this app code by cloning the repository at
// https://github.com/mongodb/ template-app-react-native-todo,
// it does not contain the data explorer link. Download the
// app template from the Atlas UI to view a link to your data
const { RealmProvider } = realmContext

const LoadingIndicator = () => {
  return (
    <View style={{...styles.activityContainer, backgroundColor: COLORS.transparentBlack7}}>
        <Progress.CircleSnail color={['blue', 'yellow', 'red']} />
      {/* <ActivityIndicator size="large" /> */}
    </View>
  );
};

const realmFileBehavior = {
  type: 'downloadBeforeOpen',
  timeOut: 5000,
  timeOutBehavior: 'openLocalRealm',
}


export const App = () => {
  

  let notif = new NotifService((reg) => {
    console.log(reg)
  });

  useEffect(() => {
    notif.createDefaultChannels();
  }, [])

  return (
    <>
      {/* All screens nested in RealmProvider have access
            to the configured realm's hooks. */}
      <RealmProvider
        // schema={[Item]}
        fallback={LoadingIndicator}
        sync={{
          flexible: true,
          initialSubscriptions: {
            update: (mutableSubs, realm) => {
              mutableSubs.add(realm.objects(Users), { name: usersSubscriptionName })
              mutableSubs.add(realm.objects(Messages));
              // mutableSubs.add(realm.objects(Combinations));
              // mutableSubs.add(realm.objects(Betting));
              return mutableSubs;
            },
          },
          newRealmFileBehavior: realmFileBehavior,
          existingRealmFileBehavior: realmFileBehavior

        }}
      >
                  <AppInitializer />
        
        <StackNavigator />
      </RealmProvider>

    </>
  );
};

const styles = StyleSheet.create({
  activityContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
    // flexDirection: 'row',
    // justifyContent: 'space-around',
    // padding: 10,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 4,
  },
  hyperlink: {
    color: 'blue',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
});
