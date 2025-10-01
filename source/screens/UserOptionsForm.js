import { SafeAreaView, StyleSheet, Switch, Text, View, Alert, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { realmContext } from '../RealmContext'
import { useApp } from '@realm/react'
import { getConfiguration } from '../utils/helpers'
import { useDispatch, useSelector } from 'react-redux'
import { SET_LOADING, STOP_LOADING } from '../redux/actions/types'
import { COLORS, SIZES } from '../constants'

const { useRealm } = realmContext

function getRandomNumber() {
  return Math.floor(Math.random() * 99) + 1
}

const UserOptionsForm = ({ route, navigation }) => {
  const { selectedUser, user, configuration, userConfig } = useSelector(({ user }) => user)
  const dispatch = useDispatch()
  const realm = useRealm()
  const app = useApp()

  // Local state for switches
  const [switchStates, setSwitchStates] = useState({})

  // Sync state with realm config when userConfig changes
  useEffect(() => {
    if (userConfig?.configuration) {
      const updatedStates: Record<string, boolean> = {}
      userConfig.configuration.forEach(cfg => {
        updatedStates[cfg.title] = cfg.isCheck
      })
      setSwitchStates(updatedStates)
    }
  }, [userConfig])

  // const handleConfiguration = (type: string) => {
  //   dispatch({ type: SET_LOADING })

  //   let config = getConfiguration(userConfig, type)
  //   let oldConfigs = userConfig?.configuration

  //   if (config?.title) {
  //     realm.write(() => {
  //       oldConfigs[config.index].isCheck = !config.isCheck
  //     })
  //     setSwitchStates(prev => ({ ...prev, [type]: !config.isCheck }))
  //   } else {
  //     realm.write(() => {
  //       oldConfigs.push({
  //         title: type,
  //         isCheck: true,
  //       })
  //     })
  //     setSwitchStates(prev => ({ ...prev, [type]: true }))
  //   }

  //   dispatch({ type: STOP_LOADING })
  // }

  const handleConfiguration = (type) => {
  dispatch({ type: SET_LOADING });

  let configIndex = userConfig?.configuration?.findIndex(cfg => cfg.title === type);
  let oldConfigs = userConfig?.configuration;

  realm.write(() => {
    if (configIndex !== -1) {
      // Toggle the value
      oldConfigs[configIndex].isCheck = !oldConfigs[configIndex].isCheck;
    } else {
      // Add new config if not exists
      oldConfigs.push({
        title: type,
        isCheck: true,
      });
    }
  });

  // Sync local state with Realm after write
  const updatedStates = {};
  oldConfigs.forEach(cfg => {
    updatedStates[cfg.title] = cfg.isCheck;
  });
  setSwitchStates(updatedStates);

  dispatch({ type: STOP_LOADING });
};


  
  
  const renderToggle = (label: string, description: string, type: string) => (
    <View style={{ ...styles.toggleRow, marginVertical: SIZES.padding }}>
      <View style={{ flexGrow: 1, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
        <Text style={styles.toggleText}>{label}</Text>
        <Text style={{ color: COLORS.darkGray2, fontSize: 12, textAlign: 'left' }}>{description}</Text>
      </View>
      <Switch
        trackColor={{ true: '#00ED64' }}
        value={!!switchStates[type]}
        onValueChange={() => {
          if (realm.syncSession?.state !== 'active') {
            Alert.alert(
              'Switching subscriptions does not affect Realm data when the sync is offline.'
            )
          }
          handleConfiguration(type)
        }}
      />
    </View>
  )

  return (
    <SafeAreaView style={{ ...styles.wrapper, backgroundColor: COLORS.white }}>
      <ScrollView style={{ width: '100%' }}>
        <View style={{ ...styles.paginationContainer, paddingHorizontal: 10 }}>
          <View style={{ width: '100%', paddingVertical: 4, marginTop: 10 }}>
            <Text style={{ textAlign: 'left', fontSize: 12, color: COLORS.primary, fontWeight: '500' }}>
              Configurations
            </Text>
          </View>

          {renderToggle('Ticket Form', 'This will allow the user to Create Bettings', 'ticketForm')}
          {renderToggle('Print Header', 'This enables users to display a header logo on receipts', 'printHeader')}
          {renderToggle('Sold Outs', 'This will allow the user to Generate Sold-out Tickets', 'soldouts')}
          {renderToggle('Update Tickets', 'This allows for modifications to user-created tickets.', 'updateTickets')}
          {renderToggle('Max Limit', 'Set maximum betting thresholds for straight and ramble.', 'hasMaxLimit')}
          {renderToggle('Tip Uploader', 'This allows the user to provide a tip by uploading an image.', 'uploadTip')}

          <View style={{ width: '100%', paddingVertical: 4, marginTop: 10 }}>
            <Text style={{ textAlign: 'left', fontSize: 12, color: COLORS.primary, fontWeight: '500' }}>
              View Access
            </Text>
          </View>

          {renderToggle('Analytics', 'Show Combinations Analytics.', 'analytics')}
          {renderToggle('Permutation Sets', 'Enables the user to access the Combinations Screen.', 'dataAnalytics')}
          {renderToggle('Show All Switch', 'Toggle to reveal downline records in Transactions and Winnings.', 'showAllData')}
          {renderToggle('Map Users', 'Provide access to Location Tracking for users.', 'mapUsers')}
          {renderToggle('Coordinators', 'Provide access to the Coordinators Summary Report.', 'coordinators')}
          {renderToggle('Tellers', 'Provide access to the Tellers Summary Report.', 'tellers')}
          {renderToggle('With Win200', 'Enable WINTO tickets.', 'withWin200')}
          {renderToggle('Show Application Users', 'Grant access for all Users.', 'appUsers')}
          {renderToggle('Last Summary Report', 'Allows configuration of a user’s latest summary report.', 'lastSummaryReport')}

          {userConfig?.role === 'coordinator' && userConfig?.isAdmin &&
            renderToggle('Cash Flow', 'Enable viewing of Cash Flow reports.', 'cashFlow')
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default UserOptionsForm

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  toggleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  wrapper: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
    backgroundColor: COLORS.gray300,
  },
  paginationContainer: {
    flexDirection: 'column',
    width: '100%',
  },
})
