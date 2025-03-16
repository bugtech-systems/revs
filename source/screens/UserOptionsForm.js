import { SafeAreaView, StyleSheet, Switch, Text, View, Alert } from 'react-native'

import React, { useEffect, useState } from 'react'
import { realmContext } from '../RealmContext'
import { useApp } from '@realm/react';
import { getConfiguration } from '../utils/helpers'
import { useDispatch, useSelector } from 'react-redux'
import { SET_LOADING, STOP_LOADING } from '../redux/actions/types';
import { COLORS, SIZES } from '../constants';

const { useRealm, useQuery } = realmContext;

function getRandomNumber() {
  return Math.floor(Math.random() * 99) + 1;
}

const UserOptionsForm = ({ route, navigation }) => {
  const { selectedUser, user, configuration, userConfig } = useSelector(({ user }) => user);
	const dispatch = useDispatch();
  const realm = useRealm();
  const app = useApp();
  const [values, setValues] = useState({
    type: 'Coordinator',
    commission: '',
  });



  const handleChanges = (prop) => (value) => {
    if (prop == 'firstName') {

      let val = String(value).split(' ')[0];
      let coordName = String(user.firstName).split(' ')[0].toLowerCase().substring(0, 6);
      let ownName = String(val).toLowerCase().substring(0, 6)
      let email = `${coordName}-${ownName}`
      setValues({ ...values, username: email, password: String(email).split('-').join('') + getRandomNumber(), email: email + '@collector.com', [prop]: value })
    }

    else {
      setValues({ ...values, [prop]: value })

    }

  }

  const handleConfiguration = (type) => {
    dispatch({ type: SET_LOADING })
    let config = getConfiguration(userConfig, type)
    let oldConfigs = userConfig?.configuration;
    console.log(config, "CONFIG HANDLE CHANGES!");
    if (config.title) {

      realm.write(() => {
        oldConfigs[config.index].isCheck = !config.isCheck;
      });
    } else {
      realm.write(() => {
        oldConfigs.push({
          title: type,
          isCheck: true
        })
      });
    }
    dispatch({ type: STOP_LOADING })
  }

  let isWin200 = getConfiguration(userConfig, 'withWin200');
  let printHeader = getConfiguration(userConfig, 'printHeader')



  useEffect(() => {
    console.log(selectedUser, user, configuration, "HEY HEY HEY")


  }, [])

  return (
    <SafeAreaView style={styles.wrapper}>
      {/* <View style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%', }}> */}
        {/* <ScrollView style={{  width: '100%' }}> */}
            <View style={{ ...styles.paginationContainer, paddingHorizontal: 10 }}>


              <View style={{ width: '100%', paddingVertical: 4, marginTop: 10}}>
                <Text style={{ textAlign: 'left', fontSize: 16, color: COLORS.darkgray, fontWeight: '500'}}>
                  User Configurations
                </Text>
              </View>
              
                {/* <View style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.white, borderTopRightRadius: SIZES.radius / 2, borderTopLeftRadius: SIZES.radius / 2, padding: 6, width: '100%', borderBottomLeftRadius: SIZES.radius / 2, borderBottomRightRadius: SIZES.radius / 2, elevation: 4, shadowRadius: SIZES.radius / 2}}> */}

                <View style={{ ...styles.toggleRow, borderBottomWidth: .5, borderColor: COLORS.gray500 }}>
                  <Text style={styles.toggleText}>Ticket Form</Text>
                  <Switch
                    trackColor={{ true: '#00ED64' }}
                    onValueChange={() => {
                      if (realm.syncSession?.state !== 'active') {
                        Alert.alert(
                          'Switching subscriptions does not affect Realm data when the sync is offline.',
                        );
                      }
                      handleConfiguration('ticketForm');
                    }}
                    value={getConfiguration(userConfig, 'ticketForm')?.isCheck}
                  />

                </View>

                <View style={{ ...styles.toggleRow, borderBottomWidth: .5, borderColor: COLORS.gray500 }}>
                  <Text style={styles.toggleText}>Print Header</Text>
                  <Switch
                    trackColor={{ true: '#00ED64' }}
                    onValueChange={() => {
                      if (realm.syncSession?.state !== 'active') {
                        Alert.alert(
                          'Switching subscriptions does not affect Realm data when the sync is offline.',
                        );
                      }
                      handleConfiguration('printHeader');
                    }}
                    // value={getConfiguration(user, 'printHeader')?.isCheck}
                    value={getConfiguration(userConfig, 'printHeader')?.isCheck}
                  />
                </View>

                <View style={{ ...styles.toggleRow }}>
                  <Text style={styles.toggleText}>Sold Outs</Text>
                  <Switch
                    trackColor={{ true: '#00ED64' }}
                    onValueChange={() => {
                      if (realm.syncSession?.state !== 'active') {
                        Alert.alert(
                          'Switching subscriptions does not affect Realm data when the sync is offline.',
                        );
                      }
                      handleConfiguration('soldouts');
                    }}
                    value={getConfiguration(userConfig, 'soldouts')?.isCheck}
                  />

                </View>
              {/* </View> */}

              <View style={{ width: '100%', paddingVertical: 4, marginTop: 10}}>
                <Text style={{ textAlign: 'left', fontSize: 16, color: COLORS.darkgray, fontWeight: '500'}}>
                {/* <Text style={{ textAlign: 'left', fontSize: 16, color: COLORS.secondary, fontWeight: '500'}}> */}
                  User View Access
                </Text>
              </View>
              
              {/* <View style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.white, borderTopRightRadius: SIZES.radius / 2, borderTopLeftRadius: SIZES.radius / 2, padding: 6, width: '100%', borderBottomLeftRadius: SIZES.radius / 2, borderBottomRightRadius: SIZES.radius / 2, elevation: 4, shadowRadius: SIZES.radius / 2}}> */}

                <View style={{ ...styles.toggleRow, borderBottomWidth: .5, borderColor: COLORS.gray500 }}>
                  <Text style={styles.toggleText}>Analytics</Text>
                  <Switch
                    trackColor={{ true: '#00ED64' }}
                    onValueChange={() => {
                      if (realm.syncSession?.state !== 'active') {
                        Alert.alert(
                          'Switching subscriptions does not affect Realm data when the sync is offline.',
                        );
                      }
                      handleConfiguration('analytics');
                    }}
                    value={getConfiguration(userConfig, 'analytics')?.isCheck}
                  />
                </View>
                <View style={{ ...styles.toggleRow, borderBottomWidth: .5, borderColor: COLORS.gray500 }}>
                  <Text style={styles.toggleText}>Map Users</Text>
                  <Switch
                    trackColor={{ true: '#00ED64' }}
                    onValueChange={() => {
                      if (realm.syncSession?.state !== 'active') {
                        Alert.alert(
                          'Switching subscriptions does not affect Realm data when the sync is offline.',
                        );
                      }
                      handleConfiguration('mapUsers');
                    }}
                    value={getConfiguration(userConfig, 'mapUsers')?.isCheck}
                  />

                </View>

                <View style={{ ...styles.toggleRow, borderBottomWidth: .5, borderColor: COLORS.gray500 }}>
                  <Text style={styles.toggleText}>Coordinators</Text>
                  <Switch
                    trackColor={{ true: '#00ED64' }}
                    onValueChange={() => {
                      if (realm.syncSession?.state !== 'active') {
                        Alert.alert(
                          'Switching subscriptions does not affect Realm data when the sync is offline.',
                        );
                      }
                      handleConfiguration('coordinators');
                    }}
                    value={getConfiguration(userConfig, 'coordinators')?.isCheck}
                  />

                </View>
                <View style={{ ...styles.toggleRow, borderBottomWidth: .5, borderColor: COLORS.gray500 }}>
                  <Text style={styles.toggleText}>Tellers</Text>
                  <Switch
                    trackColor={{ true: '#00ED64' }}
                    onValueChange={() => {
                      if (realm.syncSession?.state !== 'active') {
                        Alert.alert(
                          'Switching subscriptions does not affect Realm data when the sync is offline.',
                        );
                      }
                      handleConfiguration('tellers');
                    }}
                    value={getConfiguration(userConfig, 'tellers')?.isCheck}
                  />

                </View>
              
                <View style={{ ...styles.toggleRow, borderBottomWidth: .5, borderColor: COLORS.gray500 }}>
                  <Text style={styles.toggleText}>With Win200</Text>
                  <Switch
                    trackColor={{ true: '#00ED64' }}
                    onValueChange={() => {
                      if (realm.syncSession?.state !== 'active') {
                        Alert.alert(
                          'Switching subscriptions does not affect Realm data when the sync is offline.',
                        );
                      }
                      handleConfiguration('withWin200');
                    }}
                    value={getConfiguration(userConfig, 'withWin200')?.isCheck}
                  />

                </View>
                
                <View style={{ ...styles.toggleRow }}>
                  <Text style={styles.toggleText}>Show Application Users</Text>
                  <Switch
                    trackColor={{ true: '#00ED64' }}
                    onValueChange={() => {
                      if (realm.syncSession?.state !== 'active') {
                        Alert.alert(
                          'Switching subscriptions does not affect Realm data when the sync is offline.',
                        );
                      }
                      handleConfiguration('appUsers');
                    }}
                    value={getConfiguration(userConfig, 'appUsers')?.isCheck}
                  />
                </View>

                <View style={{ ...styles.toggleRow }}>
                  <Text style={styles.toggleText}>Last Summary Report</Text>
                  <Switch
                    trackColor={{ true: '#00ED64' }}
                    onValueChange={() => {
                      if (realm.syncSession?.state !== 'active') {
                        Alert.alert(
                          'Switching subscriptions does not affect Realm data when the sync is offline.',
                        );
                      }
                      handleConfiguration('lastSummaryReport');
                    }}
                    value={getConfiguration(userConfig, 'lastSummaryReport')?.isCheck}
                  />
                </View>
              {/* </View> */}
              
            </View>


        {/* </ScrollView> */}

      {/* </View> */}

    </SafeAreaView>
  )
}

export default UserOptionsForm

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    // backgroundColor: COLORS.green,
    // borderWidth: 1,
    margin: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  toggleText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.black,
    fontWeight: 'bold'
  },
  wrapper: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
    // padding: 10,
    backgroundColor: COLORS.gray300
  },
  fontsHeader: {
    color: COLORS.black,
    fontWeight: 'bold',
    fontSize: 12,
  },
  formControl: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 5
  },
  addToDoButton: {
    backgroundColor: COLORS.primary,
    width: '100%',
    borderRadius: 4,
    margin: 5,
  },
  modalContentPageLimit: {
    backgroundColor: 'white',
    borderColor: COLORS.white,
    elevation: 8,
    borderWidth: 1,
    padding: 20,
    alignItems: 'flex-start',
    flex: 1,
    height: '35%',
    width: '100%',
    // alignItems: 'center',
    // justifyContent: 'center',
    position: 'absolute',
    marginLeft: 10,
    top: '100%'
    // width: '100%',

    // maxHeight: '50%',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'column',
    width: '100%',
    // borderBottomWidth: 1
    // marginVertical: 10,
  },
  pageInfo: {
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.black

  },
  dropdownButtonStyle: {
    width: 200,
    height: 50,
    backgroundColor: '#E9ECEF',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  dropdownButtonTxtStyle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#151E26',
  },
  dropdownButtonArrowStyle: {
    fontSize: 28,
  },
  dropdownButtonIconStyle: {
    fontSize: 28,
    marginRight: 8,
  },
  dropdownMenuStyle: {
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
  },
  dropdownItemStyle: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dropdownItemTxtStyle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#151E26',
  },
  dropdownItemIconStyle: {
    fontSize: 28,
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    width: 300,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center'
  },
  item: {
    // padding: 6,
    // borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
    color: COLORS.white2,

  },
  itemText: {
    padding: 8
  },
  timeText: {
    padding: 12
  }

})