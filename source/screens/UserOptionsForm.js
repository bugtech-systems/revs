import React, { useEffect, useState } from 'react'
import { SafeAreaView, StyleSheet, Switch, Text, View, ScrollView, Alert } from 'react-native'
import { useSelector, useDispatch } from 'react-redux'
import SQLite from 'react-native-sqlite-storage'
import { SET_LOADING, SET_USER_CONFIG, STOP_LOADING } from '../redux/actions/types'
import supabase from '../utils/supabaseClient'
import { COLORS, SIZES } from '../constants'

// 🔹 Default configuration template
const DEFAULT_CONFIG = [
  { title: 'ticketForm', label: 'Ticket Form', description: 'This will allow the user to Create Bettings', isCheck: false },
  { title: 'printHeader', label: 'Print Header', description: 'This enables users to display a header logo on receipts', isCheck: false },
  { title: 'soldouts', label: 'Sold Outs', description: 'This will allow the user to Generate Sold-out Tickets', isCheck: false },
  { title: 'updateTickets', label: 'Update Tickets', description: 'This allows for modifications to user-created tickets.', isCheck: false },
  { title: 'hasMaxLimit', label: 'Max Limit', description: 'Set maximum betting thresholds for straight and ramble.', isCheck: false },
  { title: 'uploadTip', label: 'Tip Uploader', description: 'This allows the user to provide a tip by uploading an image.', isCheck: false },
  { title: 'analytics', label: 'Analytics', description: 'Show Combinations Analytics.', isCheck: false },
  { title: 'dataAnalytics', label: 'Permutation Sets', description: 'Enables the user to access the Combinations Screen.', isCheck: false },
  { title: 'showAllData', label: 'Show All Switch', description: 'Toggle to reveal downline records in Transactions and Winnings.', isCheck: false },
  { title: 'mapUsers', label: 'Map Users', description: 'Provide access to Location Tracking for users.', isCheck: false },
  { title: 'coordinators', label: 'Coordinators', description: 'Provide access to the Coordinators Summary Report.', isCheck: false },
  { title: 'tellers', label: 'Tellers', description: 'Provide access to the Tellers Summary Report.', isCheck: false },
  { title: 'withWin200', label: 'With Win200', description: 'Enable WINTO tickets.', isCheck: false },
  { title: 'appUsers', label: 'Show Application Users', description: 'Grant access for all Users.', isCheck: false },
  { title: 'lastSummaryReport', label: 'Last Summary Report', description: 'Allows configuration of a user’s latest summary report.', isCheck: false },
  { title: 'cashFlow', label: 'Cash Flow', description: 'Enable viewing of Cash Flow reports.', isCheck: false },
]

const db = SQLite.openDatabase({ name: 'app.db', location: 'default' })

const UserOptionsForm = () => {
  const dispatch = useDispatch()
  const { userConfig } = useSelector(({ user }) => user)
  const [mergedConfig, setMergedConfig] = useState([])

  // 🔹 Merge Supabase or SQLite configuration with defaults
  useEffect(() => {
    if (userConfig?.configuration) {
      const userConfigMap = Object.fromEntries(
        userConfig.configuration.map(cfg => [cfg.title, cfg])
      )
      const merged = DEFAULT_CONFIG.map(def => ({
        ...def,
        ...(userConfigMap[def.title] || {}),
      }))
      setMergedConfig(merged)
    } else {
      setMergedConfig(DEFAULT_CONFIG)
    }
  }, [userConfig])

  // 🔹 Toggle Configuration Handler
  const handleConfiguration = async (type) => {
    dispatch({ type: SET_LOADING })

    try {
      const configIndex = mergedConfig.findIndex(c => c.title === type)
      const oldConfigs = [...mergedConfig]
      const updatedConfig = { ...oldConfigs[configIndex], isCheck: !oldConfigs[configIndex].isCheck }
      oldConfigs[configIndex] = updatedConfig

      // 🔹 Update local SQLite
      await updateLocalConfig(userConfig._id, type, updatedConfig.isCheck)

      // 🔹 Update remote Supabase
      await updateSupabaseConfig(userConfig._id, oldConfigs)

      // 🔹 Update Redux state
      dispatch({
        type: SET_USER_CONFIG,
        payload: {
          ...userConfig,
          configuration: oldConfigs,
        },
      })

      setMergedConfig(oldConfigs)
    } catch (error) {
      console.error('Error updating configuration:', error)
      Alert.alert('Error', 'Failed to update configuration.')
    } finally {
      dispatch({ type: STOP_LOADING })
    }
  }

  // 🔹 Update SQLite (Offline)
  const updateLocalConfig = (userId, type, isCheck) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS user_config (user_id TEXT PRIMARY KEY, configuration TEXT)',
          [],
        )
        tx.executeSql(
          'SELECT configuration FROM user_config WHERE user_id = ?',
          [userId],
          (_, results) => {
            if (results.rows.length > 0) {
              const existing = JSON.parse(results.rows.item(0).configuration)
              const updated = existing.map(cfg =>
                cfg.title === type ? { ...cfg, isCheck } : cfg
              )
              tx.executeSql(
                'UPDATE user_config SET configuration = ? WHERE user_id = ?',
                [JSON.stringify(updated), userId],
                () => resolve(),
                (_, err) => reject(err)
              )
            } else {
              const newConfig = DEFAULT_CONFIG.map(cfg =>
                cfg.title === type ? { ...cfg, isCheck } : cfg
              )
              tx.executeSql(
                'INSERT INTO user_config (user_id, configuration) VALUES (?, ?)',
                [userId, JSON.stringify(newConfig)],
                () => resolve(),
                (_, err) => reject(err)
              )
            }
          },
        )
      })
    })
  }

  // 🔹 Update Supabase (Online)
  const updateSupabaseConfig = async (userId, configuration) => {
    const { error } = await supabase
      .from('user_configs')
      .update({ configuration })
      .eq('user_id', userId)

    if (error) {
      console.warn('Supabase update failed (will retry later):', error.message)
    }
  }

  const renderToggle = (label, description, type, isEnabled) => (
    <View key={type} style={{ ...styles.toggleRow, marginVertical: SIZES.padding }}>
      <View style={{ flexGrow: 1, flexDirection: 'row', borderWidth: 1, width: '100%' }}>
				<View
					style={{
						flexDirection: 'column',
						alignItems: 'flex-start',
						justifyContent: 'flex-start',
						width: '80%',
						borderWidth: 1,
					}}
				>
					<Text style={styles.toggleText}>{label}</Text>
					<Text style={{ ...styles.toggleText, color: COLORS.darkGray2, fontSize: 12 }}>{description}</Text>
				</View>
				<View
					style={{
						width: '20%',
						alignItems: 'center',
						justifyContent: 'center'
					}}
				>
					<Switch
						trackColor={{ true: '#00ED64', false: COLORS.gray400 }}
						thumbColor={!isEnabled ? '#f4f3f4' : '#00ED64'}
						value={!!isEnabled}
						onValueChange={() => handleConfiguration(type)}
						style={{ alignSelf: 'flex-end',  }}
						/>
				</View>
				</View>
    </View>
  )

  if (!userConfig) return null

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: COLORS.white }]}>
      <ScrollView style={{ width: '100%' }}>
        <View style={[styles.paginationContainer, { paddingHorizontal: 10 }]}>
          <View style={{ width: '100%', paddingVertical: 4, marginTop: 10 }}>
            <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '500' }}>Configurations</Text>
          </View>

          {mergedConfig
            .filter(cfg =>
              ['ticketForm', 'printHeader', 'soldouts', 'updateTickets', 'hasMaxLimit', 'uploadTip'].includes(cfg.title)
            )
            .map(cfg => renderToggle(cfg.label, cfg.description, cfg.title, cfg.isCheck))}

          <View style={{ width: '100%', paddingVertical: 4, marginTop: 10 }}>
            <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '500' }}>View Access</Text>
          </View>

       
          {mergedConfig
            .filter(cfg =>
              !['ticketForm', 'printHeader', 'soldouts', 'updateTickets', 'hasMaxLimit', 'uploadTip'].includes(cfg.title)
            )
            .map(cfg => {
              if (cfg.title === 'cashFlow' && !(userConfig?.role === 'coordinator' && userConfig?.is_admin)) return null
              return renderToggle(cfg.label, cfg.description, cfg.title, cfg.isCheck)
            })}
        </View>
 
      </ScrollView>
    </SafeAreaView>
  )
}

export default UserOptionsForm

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    // justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
		width: '100%',
    padding: 4,
  },
  toggleText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.black900,
    width: '80%',
  },
  wrapper: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    backgroundColor: COLORS.gray300,
  },
  paginationContainer: {
    flexDirection: 'column',
    width: '100%',
  },
})
