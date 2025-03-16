import { SafeAreaView, StyleSheet, Text, TextInput, ScrollView, View } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import { realmContext } from '../RealmContext'
import { useApp } from '@realm/react';
import { Users } from '../Models'
import SelectDropdown from 'react-native-select-dropdown'
import { useSelector } from 'react-redux'
import { Button } from '@rneui/base';
import Config from 'react-native-config';
import { COLORS } from '../constants';


const { useRealm, useQuery } = realmContext;

function getRandomNumber() {
  return Math.floor(Math.random() * 99) + 1;
}

const CreateUserForm = ({ route, navigation }) => {
  const { collector } = useSelector(({ user }) => user);
  const realm = useRealm();
  const app = useApp();
  const [values, setValues] = useState({
    type: 'Coordinator',
    commission: '',
    win200: Config.WIN_2PRIZE,
    winStraight: Config.S_PRIZE
  });

  const users = useQuery(Users, users => {
    return users.filtered(
      'email == $0',
      collector,
    );
  }, [collector]);

  const onPressSignUp = useCallback(async () => {
    let newEmailReg = String(values.username + '@collector.com')
    try {
      await app.emailPasswordAuth.registerUser({ email: String(newEmailReg), password: values.password });
      let uplines = (users[0] && users[0].uplines) ? users[0].uplines : [];
      let newUplines = [...uplines];
      let newConfigurations = [];
      let comPortion = 0;
      let comRate = 0;
      if (users[0]) {
        comPortion = (values.commission / users[0].comRate) * 100;
        comRate = values.commission >= users[0].comRate ? users[0].comRate : values.commission
      }


      let accessLevel = uplines.length + 1;

      newUplines.push(users[0])

      newConfigurations.push({
        title: 'winStraight',
        value: values.winStraight
      })

      newConfigurations.push({
        title: 'withWin200',
        isCheck: false,
        value: values.win200
      })


      let newUser = {
        ...values,
        referral: String(users[0]._id),
        comRate: Number(values.commission),
        commission: Number(comRate),
        comPortion: comPortion,
        uplines: newUplines,
        userLevel: accessLevel,
        appVersion: users[0].appVersion,
        configuration: newConfigurations
      }

      realm.write(async () => {
        let betCreated = new Users(realm, {
          ...newUser,
          email: newEmailReg,
          role: values.type == 'Coordinator' ? 'coordinator' : 'teller'
        })


        setValues({
          email: '',
          comPortion: 0,
          comRate: 0,
          type: 'Coordinator',
          username: '',
          password: '',
          commission: 0
        })

        navigation.navigate('Settings', {})
        return
      })

    } catch (error) {
      console.log(error)
    }
  }, [app, values, users]);

  const handleChanges = (prop) => (value) => {
    if (prop == 'firstName') {

      let val = String(value).split(' ')[0];
      let coordName = String(users[0].firstName).split(' ')[0].toLowerCase().substring(0, 6);
      let ownName = String(val).toLowerCase().substring(0, 6)
      let email = `${coordName}-${ownName}`
      setValues({ ...values, username: email, password: String(email).split('-').join('') + getRandomNumber(), email: email + '@collector.com', [prop]: value })
    } else {
      setValues({ ...values, [prop]: value })
    }
  }

  useEffect(() => {
    if (values.firstName) {
      let val = String(values.firstName).split(' ')[0];
      let coordName = String(users[0].firstName).split(' ')[0].toLowerCase().substring(0, 6);
      let ownName = String(val).toLowerCase().substring(0, 6)
      let email = `${coordName}-${ownName}`
      setValues({ ...values, username: email, password: String(email).split('-').join('') + getRandomNumber(), email: email + '@collector.com', winStraight: SPrize, win200: Win2Prize })
    }
  }, [])

  return (
    <SafeAreaView style={styles.wrapper}>

      <View style={{ display: 'flex', flexGrow: 1, justifyContent: 'space-between', alignItems: 'center', height: '100%', width: '100%' }}>
        <ScrollView style={{ width: '100%' }}>
          <View style={{ paddingBottom: 10, flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
            <View style={{ ...styles.paginationContainer, paddingBottom: 'auto' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Personal Details</Text>
              <View style={styles.formControl}>
                <Text>First Name</Text>
                <TextInput
                  placeholder='Enter First Name'
                  placeholderTextColor={COLORS.gray800}
                  value={values.firstName}
                  onChangeText={handleChanges('firstName')}
                  style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 10 }}
                />
              </View>
              <View style={styles.formControl}>
                <Text>Last Name</Text>
                <TextInput
                  value={values.lastName}
                  onChangeText={handleChanges('lastName')}
                  placeholder='Enter Last Name'
                  placeholderTextColor={COLORS.gray800}
                  style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 10 }}
                />
              </View>
              <View style={styles.formControl}>
                <Text>Mobile Number</Text>
                <TextInput
                  value={values.mobile}
                  onChangeText={handleChanges('mobile')}
                  placeholder='Ex. 09xxxxxxxx'
                  placeholderTextColor={COLORS.gray800}

                  style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 10 }}
                />
              </View>
              <View style={styles.formControl}>
                <Text>Address</Text>
                <TextInput
                  value={values.address}
                  placeholder='Brgy, City, Province.'
                  placeholderTextColor={COLORS.gray800}
                  onChangeText={handleChanges('address')}
                  style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 10 }}
                />
              </View>
              <Text style={{ marginTop: 30, fontSize: 16, fontWeight: 'bold' }}>Account Details</Text>
              <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <View style={{ ...styles.formControl, width: '47%' }}>
                  <Text>Username</Text>
                  <TextInput
                    value={values.username}
                    disabled
                    placeholderTextColor={COLORS.gray800}
                    style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 10 }}
                  />
                </View>
                <View style={{ ...styles.formControl, width: '47%' }}>
                  <Text>Password</Text>
                  <TextInput
                    value={values.password}
                    placeholderTextColor={COLORS.gray800}

                    style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 10 }}
                  />
                </View>
              </View>
              <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <View style={{ ...styles.formControl, width: '47%' }}>
                  <Text>User Type</Text>
                  <SelectDropdown
                    data={[{ title: 'Coordinator' }, { title: 'Teller' }]}
                    onSelect={(selectedItem, index) => {
                      setValues({ ...values, type: selectedItem.title })
                    }}
                    defaultValueByIndex={0}
                    renderButton={(selectedItem, isOpened) => {
                      return (
                        <View
                          style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 10, display: 'flex', justifyContent: 'center' }}
                        >
                          <Text
                            style={{
                              fontSize: 15
                            }}
                          >
                            {selectedItem?.title}
                          </Text>
                        </View>
                      );
                    }}
                    renderItem={(item, index, isSelected) => {
                      return (
                        <View style={{ ...styles.dropdownItemStyle, ...(isSelected && { backgroundColor: '#D2D9DF' }) }}>
                          <Text style={styles.dropdownItemTxtStyle}>{item.title}</Text>
                        </View>
                      );
                    }}
                    showsVerticalScrollIndicator={false}
                    dropdownStyle={styles.dropdownMenuStyle}
                  />
                </View>
                <View style={{ ...styles.formControl, width: '47%' }}>
                  <Text>Commission</Text>
                  <TextInput
                    value={String(values.commission)}
                    onChangeText={handleChanges('commission')}
                    placeholder={`Max. ${users[0]?.commission}%`}
                    placeholderTextColor={COLORS.gray800}
                    style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 10 }}
                  />
                </View>
              </View>
              <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <View style={{ ...styles.formControl, width: '47%' }}>
                  <View style={{ ...styles.toggleRow }}>
                    <Text>Win Straight</Text>
                  </View>
                  <TextInput
                    onChangeText={handleChanges('winStraight')}
                    value={String(values.winStraight)}
                    placeholderTextColor={COLORS.gray800}
                    style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 10 }}
                  />
                </View>
                <View style={{ ...styles.formControl, width: '47%' }}>
                  <View style={{ ...styles.toggleRow }}>
                    <Text>Win200</Text>
                  </View>
                  <TextInput
                    onChangeText={handleChanges('win200')}
                    value={String(values.win200)}
                    placeholderTextColor={COLORS.gray800}
                    style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 10 }}
                  />
                </View>
              </View>
            </View>
          </View>
          <View
            style={{ marginBottom: 'auto', width: '100%', display: 'flex', justifyContent: 'flex-start' }}
          >
            <Button
              title="SUBMIT"
              buttonStyle={styles.addToDoButton}
              onPress={() => onPressSignUp()}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

export default CreateUserForm

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  wrapper: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 10,
    backgroundColor: COLORS.white2
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
    position: 'absolute',
    marginLeft: 10,
    top: '100%'
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'column',
    width: '100%',
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