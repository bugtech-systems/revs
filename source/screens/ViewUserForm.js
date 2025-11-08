import { SafeAreaView, StyleSheet, Text, TouchableOpacity, ScrollView, View } from 'react-native'

import React, { useCallback, useEffect, useState } from 'react'
import { COLORS, SIZES } from '../constants/theme'
import { getConfiguration } from '../utils/helpers'
import SelectDropdown from 'react-native-select-dropdown'
import { useDispatch, useSelector } from 'react-redux'
import LargeInput from '../components/LargeInput'
import LinearGradient from 'react-native-linear-gradient'
import { SET_LOADING, SET_USER_CONFIG, STOP_LOADING } from '../redux/actions/types'



function getRandomNumber() {
  return Math.floor(Math.random() * 99) + 1;
}

const ViewUserForm = ({ route, navigation }) => {
  const userDetails = JSON.parse(route.params);
  const { collector, userConfig, user } = useSelector(({ user }) => user);
  const dispatch = useDispatch();

  const [values, setValues] = useState({
    type: 'Coordinator',
    deviceId: '',
    commission: '',
    first_name: '',
    last_name: '',
    mobile: '',
    address: '',
    receipt_template: '',
    // username: '',
    // password: userDetails.password,
    role: '',
    commission: '',
    win_straight: '',
    win200: ''
  });



  // console.log(userConfig, "THE USER CAN BE CONFIG")





  const handleChanges = (prop) => (value) => {
    // if (prop == 'first_name') {

    //   let val = String(value).split(' ')[0];
    //   let coordName = String(user.first_name).split(' ')[0].toLowerCase().substring(0, 6);
    //   let ownName = String(val).toLowerCase().substring(0, 6)
    //   let email = `${coordName}-${ownName}`
    //   setValues({ ...values, username: email, password: String(email).split('-').join('') + getRandomNumber(), email: email + '@collector.com', [prop]: value })
    // }

    // else {
      setValues({ ...values, [prop]: value })

    // }

  }

  const handleConfiguration = (type) => {
    let config = getConfiguration(user, type)
    let oldConfigs = user.configuration;
    console.log(config);
    if (config.title) {
      oldConfigs
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




  }


  const handleSubmit = useCallback(async () => {
    dispatch({ type: SET_LOADING })
    let userToUpdate = realm.objectForPrimaryKey(Users, BSON.ObjectId(userConfig._id)); // search for a realm object with a primary key that is an objectId

    
    try {
      // if (userToUpdate) {
      //   await realm.write(async () => {
      //     userToUpdate.first_name = values?.first_name;
      //     userToUpdate.last_name = values?.last_name;
      //     userToUpdate.mobile = values?.mobile;
      //     userToUpdate.address = values?.address;
      //     userToUpdate.role = String(values?.type).toLowerCase();
      //     userToUpdate.receipt_template = values.receipt_template;
      //   })
      // }
    } catch (error) {
      console.log(error, 'Something went wrong.')
      return;
    }
    dispatch({ type: STOP_LOADING })
    navigation.goBack();
  }, [values])



  useEffect(() => {

    setValues({
      ...values,
      first_name: userDetails.first_name,
      last_name: userDetails.last_name,
      device_id: userDetails?.device_id,
      mobile: userDetails.mobile,
      address: userDetails.address,
      username: String(userDetails.email).split('@')[0],
      password: userDetails.password,
      role: userDetails.role,
      commission: userDetails.commission,
      receipt_template: userDetails?.receipt_template,
      win_straight: getConfiguration(userDetails, 'winStraight')?.value,
      win200: getConfiguration(userDetails, 'withWin200')?.value
    })

    dispatch({ type: STOP_LOADING })


  }, [userConfig])


  return (
    <SafeAreaView style={{ ...styles.wrapper }}>
      {/* <View style={{ borderWidth: 1 }}> */}
      <ScrollView
        contentContainerStyle={{flexGrow: 1}}
        // style={{ height: '100%', width: '100%' }}
      >

        <View style={{ width: '100%', alignItems: 'center', flexDirection: 'column', marginTop: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>Personal Details</Text>
        </View>

        {/* <View style={{ padding: 10, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center'}}> */}
        <View style={{ padding: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <LargeInput
            editable={true}
            label={'First name'}
            onChangeText={handleChanges('first_name')}
            value={values.first_name}
            inputLength={'100%'}
          />
        </View>

        <View style={{ padding: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <LargeInput
            editable={true}
            label={'Last name'}
            onChangeText={handleChanges('last_name')}
            value={values.last_name}
            inputLength={'100%'}
          />
        </View>
        <View style={{ padding: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <LargeInput
            editable={true}
            label={'mobile'}
            onChangeText={handleChanges('mobile')}
            value={values.mobile}
            inputLength={'100%'}
          />
        </View>
        <View style={{ padding: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <LargeInput
            editable={true}
            label={'address'}
            onChangeText={handleChanges('address')}
            value={values.address}
            inputLength={'100%'}
          />
        </View>

        <View style={{ width: '100%', alignItems: 'center', flexDirection: 'column', marginTop: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>Account Details</Text>
        </View>

        <View style={{ padding: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <LargeInput
            editable={false}
            label={'Username'}
            onChangeText={handleChanges('username')}
            value={values.username}
            inputLength={'48%'}
          />
          <LargeInput
            editable={false}
            label={'password'}
            onChangeText={handleChanges('password')}
            value={values.password}
            inputLength={'48%'}
          />
        </View>

        {/* <View style={{ ...styles.formControl, width: '47%' }}> */}
        <View style={{ padding: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          {/* <View style={{ width: '100%', alignItems: 'center', flexDirection: 'column'}}> */}
          <SelectDropdown 
            data={[{ title: 'Coordinator' }, { title: 'Teller' }]}
            // disabled={true}
            onSelect={(selectedItem, index) => {
              setValues({...values, type: selectedItem.title})
              // Alert.alert(selectedItem, index)
            }}
            defaultValueByIndex={userDetails.role == 'coordinator' ? 0 : 1}
            renderButton={(selectedItem, isOpened) => {
              return (
                <View
                  style={{ height: 40, paddingLeft: 10, width: '48%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.primaryTransparent3, backgroundColor: COLORS.primaryTransparent3, elevation: 4, shadowRadius: SIZES.radius / 2, shadowColor: COLORS.gray600, justifyContent: 'flex-start', alignItems: 'flex-start' }}
                >
                  <View style={{ flexDirection: 'row', }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.black600,
                        fontWeight: '500',
                      }}
                    >
                      User Type
                    </Text>
                    <Text style={{ color: COLORS.red }}>
                      *
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: COLORS.secondary,
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

          <LargeInput
            editable={false}
            label={'Commission'}
            onChangeText={handleChanges('Commission')}
            value={String(values.commission)}
            inputLength={'48%'}
          />
        </View>

        <View style={{ padding: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <LargeInput
            editable={false}
            label={'Win Straight'}
            onChangeText={handleChanges('winStraight')}
            value={values.win_straight ? values.win_straight : '0'}
            inputLength={'48%'}
          />
          <LargeInput
            editable={false}
            label={'Win200'}
            onChangeText={handleChanges('win200')}
            value={values.win200 ? values.win200 : '0'}
            inputLength={'48%'}
          />

        </View>

        <View style={{ padding: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <SelectDropdown
            data={[{ title: 'Samar' }, { title: 'Tacloban' }]}
            defaultValue={
              values.receipt_template
                ? { title: values.receipt_template } // If exists, set object with matching title
                : null // If no value, leave it null
            }
            // data={values?.receipt_template}
            // disabled={true}
            onSelect={(selectedItem, index) => {
              setValues({ ...values, receipt_template: selectedItem.title })
              // Alert.alert(selectedItem, index)
            }}
            defaultValueByIndex={userDetails.role == 'coordinator' ? 0 : 1}
            renderButton={(selectedItem, isOpened) => {
              return (
                <View
                  style={{ height: 40, paddingLeft: 10, width: '48%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.primaryTransparent3, backgroundColor: COLORS.primaryTransparent3, elevation: 4, shadowRadius: SIZES.radius / 2, shadowColor: COLORS.gray600, justifyContent: 'flex-start', alignItems: 'flex-start' }}
                >
                  <View style={{ flexDirection: 'row', }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.black600,
                        fontWeight: '500',
                      }}
                    >
                      Receipt Template
                    </Text>
                    <Text style={{ color: COLORS.red }}>
                      *
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: COLORS.secondary,
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
          <LargeInput
            editable={false}
            label={'Device ID'}
            onChangeText={handleChanges('deviceId')}
            value={String(values.deviceId ? values.deviceId : "T.B.A")}
            inputLength={'48%'}
          />
        </View>

        {/* </View> */}

        {/* <View style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
            <View style={{ ...styles.paginationContainer, paddingBottom: 'auto' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Personal Details</Text>
              <View style={styles.formControl}>
                <Text style={{ color: COLORS.black }}>First Name</Text>
                <TextInput
                  placeholder='Enter First Name'
                  placeholderTextColor={COLORS.gray800}
                  value={userDetails.first_name}
                  // onChangeText={handleChanges('first_name')}
                  style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.white, marginTop: 4, backgroundColor: COLORS.white, elevation: 4, shadowRadius: SIZES.radius / 2 }}
                />
              </View>
              <View style={styles.formControl}>
                <Text style={{ color: COLORS.black }}>Last Name</Text>
                <TextInput
                  value={userDetails.last_name}
                  // onChangeText={handleChanges('last_name')}
                  placeholder='Enter Last Name'
                  placeholderTextColor={COLORS.gray800}
                  style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.white, marginTop: 4, backgroundColor: COLORS.white, elevation: 4, shadowRadius: SIZES.radius / 2 }}
                />
              </View>
              <View style={styles.formControl}>
                <Text style={{ color: COLORS.black }}>Mobile Number</Text>
                <TextInput
                  value={userDetails.mobile}
                  // onChangeText={handleChanges('mobile')}
                  placeholder='Ex. 09xxxxxxxx'
                  placeholderTextColor={COLORS.gray800}

                  style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.white, marginTop: 4, backgroundColor: COLORS.white, elevation: 4, shadowRadius: SIZES.radius / 2 }}
                />
              </View>
              <View style={styles.formControl}>
                <Text style={{ color: COLORS.black }}>Address</Text>
                <TextInput
                  value={userDetails.address}
                  disabled
                  placeholder='Brgy, City, Province.'
                  placeholderTextColor={COLORS.gray800}
                  // onChangeText={handleChanges('address')}
                  style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.white, marginTop: 4, backgroundColor: COLORS.white, elevation: 4, shadowRadius: SIZES.radius / 2 }}
                />
              </View>
              <Text style={{ marginTop: 30, fontSize: 16, fontWeight: 'bold' }}>Account Details</Text>
              <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <View style={{ ...styles.formControl, width: '47%' }}>
                  <Text style={{ color: COLORS.black }}>Username</Text>
                  <TextInput
                    value={String(userDetails.email).split('@')[0]}
                    disabled
                    placeholderTextColor={COLORS.gray800}
                    style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.white, marginTop: 4, backgroundColor: COLORS.white, elevation: 4, shadowRadius: SIZES.radius / 2}}
                  />
                </View>
                <View style={{ ...styles.formControl, width: '47%' }}>
                  <Text style={{ color: COLORS.black }}>Password</Text>
                  <TextInput
                    value={userDetails.password}
                    placeholderTextColor={COLORS.gray800}

                    style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1,borderRadius: 6, borderColor: COLORS.white, marginTop: 4, backgroundColor: COLORS.white, elevation: 4, shadowRadius: SIZES.radius / 2}}
                  />
                </View>
              </View>
              <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <View style={{ ...styles.formControl, width: '47%' }}>
                  <Text style={{ color: COLORS.black }}>User Type</Text>
                  <SelectDropdown
                    data={[{ title: 'Coordinator' }, { title: 'Teller' }]}
                    disabled={true}
                    onSelect={(selectedItem, index) => {
                      // setValues({...values, type: selectedItem.title})
                      // Alert.alert(selectedItem, index)
                    }}
                    defaultValueByIndex={userDetails.role == 'coordinator' ? 0 : 1}
                    renderButton={(selectedItem, isOpened) => {
                      return (
                        <View
                          style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 4, display: 'flex', justifyContent: 'center' }}
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
                  <Text style={{ color: COLORS.black }}>Commission</Text>
                  <TextInput
                    value={String(userDetails.comRate)}
                    placeholder={`Max. ${user?.commission}%`}
                    placeholderTextColor={COLORS.gray800}
                    style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 4 }}
                  />
                </View>
              </View>
              {(currentuser && currentuser.isAdmin) && (
                <>
                  <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                    <View style={{ ...styles.formControl, width: '47%' }}>
                      <Text style={{ color: COLORS.black }}>Win Straight</Text>
                      <TextInput
                        value={values.win_straight}
                        disabled
                        placeholderTextColor={COLORS.gray800}
                        style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 4 }}
                      />
                    </View>
                    <View style={{ ...styles.formControl, width: '47%' }}>
                      <Text style={{ color: COLORS.black }}>Win200</Text>
                      <TextInput
                        value={values.win200}
                        disabled
                        placeholderTextColor={COLORS.gray800}
                        style={{ height: 40, paddingLeft: 10, width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.gray600, marginTop: 4 }}
                      />
                    </View>
                  </View>


                </>
              )}
            </View>

          </View> */}



      </ScrollView>


      <View style={{ position: 'relative', flex: 1, bottom: 20, backgroundColor: COLORS.transparentBlack1, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-around', width: '100%', }}>
        <TouchableOpacity
          onPress={() => {
            dispatch({ type: SET_USER_CONFIG, payload: null })
            navigation.goBack()
          }}
          style={{
            elevation: 10,
            shadowRadius: SIZES.radius,
            borderRadius: SIZES.radius,
            width: '40%',
            alignItems: 'center'
          }}
        >
          <LinearGradient colors={['#d85a58', '#bb473a', '#892c2f']} style={styles.linearGradientCancel}>


            <Text style={styles.buttonTextCancel}>
              CANCEL
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSubmit()}
          style={{
            elevation: 10,
            shadowRadius: SIZES.radius,
            borderRadius: SIZES.radius,
            width: '40%',
            alignItems: 'center'
          }}
        >
          <LinearGradient colors={['#6599c3', '#3573a2', '#165894']} style={styles.linearGradient}>
            <Text style={styles.buttonText}>
              SUBMIT
            </Text>
          </LinearGradient>
        </TouchableOpacity>

      </View>
      {/* </View> */}



    </SafeAreaView>
  )
}

export default ViewUserForm

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
    padding: 5,
  },
  toggleText: {
    flex: 1,
    fontSize: 16,
  },
  linearGradient: {
    // flex: 1,
    height: 40,
    paddingLeft: 15,
    paddingRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    width: '100%'
  },
  linearGradientCancel: {
    width: '100%',
    height: 40,
    paddingLeft: 15,
    paddingRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  buttonTextCancel: {
    fontSize: 16,
    fontWeight: 'bold',
    // textAlign: 'center',
    fontFamily: 'Gill Sans',
    textAlign: 'center',
    // margin: 10,
    color: '#ffffff',
    // width: '30%',
    backgroundColor: 'transparent',
  },
  wrapper: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 10,
    backgroundColor: COLORS.gray300
  },
  fontsHeader: {
    color: COLORS.black,
    fontWeight: 'bold',
    fontSize: 12,
  },
  formControl: {
    width: '100%',
    paddingHorizontal: 10,
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
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    // textAlign: 'center',
    fontFamily: 'Gill Sans',
    textAlign: 'center',
    // margin: 10,
    color: '#ffffff',
    // width: '30%',
    backgroundColor: 'transparent',
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