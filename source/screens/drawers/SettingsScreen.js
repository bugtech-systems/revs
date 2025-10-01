import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, Button, TouchableOpacity, Alert, ScrollView, SafeAreaView, Easing, Dimensions } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { realmContext } from '../../RealmContext';
import { useUser } from '@realm/react';
import { Users } from '../../Models';
import { CLOSE_CONFIRMATION_MODAL, OPEN_CONFIRMATION_MODAL, SET_ACTIVE_USER, SET_COLLECTOR, SET_USER, SET_USER_CONFIG } from '../../redux/actions/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import UpdateModal from '../../components/UpdateModal';
import Config from 'react-native-config';
import { getConfiguration, useScreenSize } from '../../utils/helpers';
import ConfirmationModal from '../../components/ConfirmationModal';
import { BSON } from 'realm';
import { COLORS, icons, SIZES } from '../../constants';

const { useRealm, useQuery } = realmContext;
const usersSubscriptionName = 'users';

const SettingsScreen = ({ navigation }) => {
  const { width, height } = Dimensions.get('window');
  const realm = useRealm()
  const dispatch = useDispatch();
  const { user, collector } = useSelector(({ user }) => user)
  const { confirmationModal } = useSelector(({ ui }) => ui)
  const [isModalVisible, setModalVisible] = useState(false);
  const [updateUrl, setUpdateUrl] = useState(null);
  const [rnd, setRnd] = useState(0);
  const [userToUpdate, setUserToUpdate] = useState(null);
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));

  const [activeDropDown, setActiveDropDown] = useState('');
  const apkUrl = Config.APK_URL;
  const ownUser = useUser();

  const users = useQuery(Users, users => {
    let userNow = user?.email ? user?.email : collector ? collector : "";
    return users.filtered('email == $0', String(userNow))
  }, [user, collector]);

  let authenticatedUser = ownUser?.profile?.email;

  const deletedUsers = useQuery(Users, users => {

    return users.filtered('isDeleted == true && email != $0', String(authenticatedUser))
  }, [users, collector, userToUpdate])

  const usersCoord = useQuery(Users, users => {

    return users.filtered('role == "coordinator" && isDeleted == false && email != $0', String(authenticatedUser))
    // return users.filtered('role == "coordinator" && isDeleted == false')

  }, [users, collector]);

  const tellersCoord = useQuery(Users, users => {

    return users.filtered('role == "teller" && isDeleted == false && email != $0', String(authenticatedUser))
  }, [users, collector]);

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  // The signOut function calls the logOut function on the currently
  const handleSelectCollector = (val) => {
    
    dispatch({ type: SET_COLLECTOR, payload: val.email })
    dispatch({ type: SET_ACTIVE_USER, payload: val.email })

    navigation.navigate('Dashboard', JSON.stringify({ user: val.email }))

  }

  const handleDoublePress = (val) => {


    dispatch({ type: SET_USER_CONFIG, payload: val })
    navigation.navigate('View User', JSON.stringify(val))

  }

  const handleReactivateUser = async (user) => {
    const updateUser = realm.objectForPrimaryKey(Users, BSON.ObjectId(user._id));


    if (updateUser && user?.actionType == 'reactivate') {
      let reactivatedUser = realm.write(() => {
        updateUser.isDeleted = false;
      });


    } else if (updateUser && user?.actionType == 'deactivate') {
      realm.write(() => {
        updateUser.isDeleted = true;
      });
    } else {
      realm.write(() => {
        updateUser.deviceId = 'revoke';
      });
    }
  }

  const toggleDropdown = () => {
    const isExpanding = activeDropDown !== 'tellers';
    setActiveDropDown(isExpanding ? 'tellers' : '');

    // Animated.timing(animatedHeight, {
    // 	toValue: isExpanding ? 200 : 0, // Expand to 200px height
    // 	duration: 500, // Slower duration for smooth effect
    // 	easing: Easing.out(Easing.exp), // Easing for slow opening
    // 	useNativeDriver: false, // Must be false for height animations
    // }).start();
  };

  // logged in user and then navigates to the welcome screen
  const signOut = useCallback(() => {
    ownUser?.logOut();
    dispatch({ type: SET_COLLECTOR, payload: null })
    dispatch({ type: SET_USER, payload: null })
  }, [ownUser, dispatch]);

  const handleSetDefault = () => {
    let authenticatedUser = ownUser?.profile?.email;
    dispatch({ type: SET_COLLECTOR, payload: authenticatedUser })
    dispatch({ type: SET_ACTIVE_USER, payload: null})
    return
  }


  const screen = useScreenSize();
  
  useEffect(() => {
    const currentUser = realm.objects(Users);
    //   let filterString = `owner_id == "${userRealm.id}" && isComplete == ${isHistory} && inputType == "normal"`;
    //   let data =  realm.objects(Betting)
    //   .filtered(filterString);   
    realm.subscriptions.update(mutableSubs => {
      mutableSubs.add(currentUser, { name: usersSubscriptionName });
    });
    // if(users[0]){
    //     handleAppVersion(users[0])
    // }
  }, [realm, users])
  

  let selUser = users[0] ? users[0] : {}
  let ableToViewDeletedUsers = getConfiguration(users[0], 'deletedUsers')?.isCheck;
  let ableToViewAppUsers = getConfiguration(users[0], 'appUsers')?.isCheck;
  let ableToViewMap = getConfiguration(users[0], 'mapUsers')?.isCheck;

  return (
    <SafeAreaView style={{ flex: 1, position: 'relative', backgroundColor: COLORS.gray300 }}>
    <ScrollView
      // contentContainerStyle={{ flex: 1}}
      style={{ backgroundColor: COLORS.gray300 }}>
      {
        apkUrl &&
        <UpdateModal
          visible={isModalVisible}
          onClose={closeModal}
          updateUrl={apkUrl}
          required={false}
        />
      }
      <ConfirmationModal
        visible={confirmationModal == 'update_user'}
        onClose={() => {
          dispatch({ type: CLOSE_CONFIRMATION_MODAL });
          setUserToUpdate(null);
        }}
        title={'Confirmation'}
        message={`Are you sure you want to ${userToUpdate?.actionType == 'revoke session' ? userToUpdate?.actionType + ' ' + 'of' : userToUpdate?.actionType} this user?`}
        handleConfirm={() => {
          // handleCancelTicket(ticketDetails._id)
          handleReactivateUser(userToUpdate);
          setUserToUpdate(null);
          dispatch({ type: CLOSE_CONFIRMATION_MODAL });
        }}
      />

      {selUser && (selUser.role == 'coordinator' && selUser.isAdmin) &&
        // <View style={{ padding: 10, backgroundColor: COLORS.gray300, }}>
        //     <Button title="New User" 
        // onPress={() => navigation.navigate('Create User', JSON.stringify(users[0]))} 
        // />
        //     {/* <Button title="" onPress={() => navigation.navigate('Create User', JSON.stringify(users[0]))} /> */}
        // </View>
        <View style={{ padding: 10, backgroundColor: COLORS.gray300 }}>

        <TouchableOpacity
        onPress={() => navigation.navigate('Create User', JSON.stringify(users[0]))}
        style={{
            backgroundColor: COLORS.secondaryTransparent,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >

          <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.white }}>
            NEW USER
          </Text>
        </TouchableOpacity>
        </View>

      }

      <View style={{ flex: 1, padding: 10, }}>

        {selUser && (selUser.role == 'coordinator' && selUser.isAdmin &&  ableToViewAppUsers) &&
          <>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={{ padding: 6, color: COLORS.primary, fontSize: 12, fontWeight: '500' }}>
                App Users
              </Text>
            {
              collector !== ownUser?.profile?.email &&
              <TouchableOpacity 
              onPress={() => handleSetDefault()}
              style={{  
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: 10
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '500'}}>
                Set Default
              </Text>
              </TouchableOpacity>
            }
            </View>
            {usersCoord.length != 0 &&
              <TouchableOpacity
                onPress={() => setActiveDropDown((activeDropDown) => activeDropDown == 'coordinators' ? '' : 'coordinators')}
                style={{
                  // marginTop: 10,
                  padding: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.gray600,
                  // backgroundColor:  activeDropDown == 'coordinators' ? COLORS.gray400 : COLORS.gray300,
                  // borderTopRightRadius: SIZES.radius / 2,
                  // borderTopLeftRadius: SIZES.radius / 2,
                  borderBottomRightRadius: SIZES.radius / 3,
                  borderBottomLeftRadius: SIZES.radius / 3,
                  justifyContent: 'space-between'
                }}
              >
                <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                  Coordinators
                </Text>
                {/* <Animated.View style={{ transform: [{ rotate: activeDropDown == 'coordinators' ? rotateInterpolation : '-90deg' }]}}> */}
                <Image
                  source={icons.arrow_down}
                  style={{ height: 18, width: 18, resizeMode: 'contain', tintColor: COLORS.primary, transform: [{ rotate: activeDropDown == 'coordinators' ? '0deg' : '-90deg' }] }}
                />
                {/* </Animated.View> */}
              </TouchableOpacity>

            }
            <View style={{ flex: 1 }}>
              {activeDropDown == 'coordinators' &&
                // <View style={{ maxHeight: '30%' }}>
                <ScrollView
                  nestedScrollEnabled={true}
                  style={{ height: 200 }}
                >
                  {usersCoord.map((list, index) => {
                    let displayName = String(list.email).split('@')[0];
                    const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

                    return (
                      <Animated.View
                        key={index}
                        entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
                        style={{
                          width: '100%',
                          flexDirection: 'row',
                          // padding: 10,
                          justifyContent: 'space-between',
                          marginVertical: 1,
                          backgroundColor: collector == list.email ? COLORS.primary : backgroundColor,

                          // justifyContent: 'center', 
                        }}
                      >
                        <TouchableOpacity
                          onLongPress={() => handleDoublePress(list)}
                          onPress={() => handleSelectCollector(list)}
                          style={{
                            width: '80%',
                            paddingVertical: 14,
                            justifyContent: 'center'
                            // borderWidth: 1, 
                          }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '500', color: collector == list.email ? COLORS.white : COLORS.black900, paddingLeft: 10 }}>
                            {displayName}
                          </Text>
                        </TouchableOpacity>
                        {
                          selUser && (selUser.role == 'coordinator' && selUser.isAdmin && collector !== list.email) ?
                          <View style={{ width: '20%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly'}}>
                          <TouchableOpacity
                              style={{ alignItems: 'center', justifyContent: 'center', width: '10%', opacity: list?.deviceId ? 1 : .5 }}
                              disabled={list?.deviceId ? false : true}
                              onPress={() => {
                                dispatch({ type: OPEN_CONFIRMATION_MODAL, payload: 'update_user' });
                                setUserToUpdate({ ...list, actionType: 'revoke session' });
                              }}
                            >
                              <Image
                                source={icons.revokeDevice}
                                style={{ height: 24, width: 24, resizeMode: 'contain' }}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{ alignItems: 'center', justifyContent: 'center', width: '10%' }}
                              onPress={() => {
                                dispatch({ type: OPEN_CONFIRMATION_MODAL, payload: 'update_user' });
                                setUserToUpdate({ ...list, actionType: 'deactivate' });
                              }}
                            >
                              <Image
                                source={icons.deactivate_account}
                                style={{ height: 26, width: 26, resizeMode: 'contain', tintColor: COLORS.red }}
                              />
                            </TouchableOpacity>
                          </View>

                            :
                            null
                        }
                      </Animated.View>
                    )
                  })}
                </ScrollView>
                // </View>
              }


              {tellersCoord.length != 0 &&
                <TouchableOpacity
                  // onPress={() => setActiveDropDown((activeDropDown) => activeDropDown == 'tellers' ? '' : 'tellers')}
                  onPress={toggleDropdown}
                  style={{
                    marginTop: 6,
                    padding: 6,
                    flexDirection: 'row',
                    // backgroundColor:  activeDropDown == 'tellers' ? COLORS.gray400 : COLORS.gray300,
                    // backgroundColor: COLORS.gray400,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.gray600,
                    // borderTopRightRadius: SIZES.radius / 2,
                    // borderTopLeftRadius: SIZES.radius / 2,
                    borderBottomRightRadius: SIZES.radius / 3,
                    borderBottomLeftRadius: SIZES.radius / 3,
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >

                  <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                    Tellers
                  </Text>
                  {/* <Animated.View style={{ transform: [{ rotate: activeDropDown === 'tellers' ? rotateInterpolation : '0deg' }] }}> */}
                  <Image
                    source={icons.arrow_down}
                    style={{ height: 18, width: 18, resizeMode: 'contain', tintColor: COLORS.primary, transform: [{ rotate: activeDropDown == 'tellers' ? '0deg' : '-90deg' }] }}
                  />
                  {/* </Animated.View> */}
                </TouchableOpacity>
              }
              {
                activeDropDown == 'tellers' &&
                // <View style={{ maxHeight: '30%' }}>
                  <ScrollView
                    nestedScrollEnabled={true}
                    style={{ height: 200 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {tellersCoord.map((list, index) => {
                      let displayName = String(list.email).split('@')[0];
                      const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

                      return (
                        <Animated.View
                          key={index}
                          entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
                          style={{
                            // height: animatedHeight, 
                            overflow: 'hidden',
                            width: '100%',
                            flexDirection: 'row',
                            // padding: 10,
                            justifyContent: 'space-between',
                            marginVertical: 1,
                            backgroundColor: collector == list.email ? COLORS.primary : backgroundColor,

                            // justifyContent: 'center', 
                          }}
                        >
                          <TouchableOpacity
                            onLongPress={() => handleDoublePress(list)}
                            onPress={() => handleSelectCollector(list)}
                            style={{
                              width: '80%',
                              paddingVertical: 1,
                              justifyContent: 'center'
                              // borderWidth: 1, 
                            }}
                          >

                            <Text style={{ fontSize: 16, fontWeight: '500', color: collector == list.email ? COLORS.white : COLORS.black900, paddingLeft: 10 }}>
                              {displayName}
                            </Text>
                          </TouchableOpacity>
                          {
                            selUser && (selUser.role == 'coordinator' && selUser.isAdmin) ?
                            <View style={{ width: '20%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly'}}>
                          <TouchableOpacity
                              style={{ alignItems: 'center', justifyContent: 'center', width: '10%', opacity: list?.deviceId ? 1 : .5 }}
                              disabled={list?.deviceId ? false : true}
                              onPress={() => {
                                dispatch({ type: OPEN_CONFIRMATION_MODAL, payload: 'update_user' });
                                setUserToUpdate({ ...list, actionType: 'revoke session' });
                              }}
                            >
                              <Image
                                source={icons.revokeDevice}
                                style={{ height: 24, width: 24, resizeMode: 'contain' }}
                              />
                            </TouchableOpacity>
                              <TouchableOpacity
                                style={{ padding: 10, alignItems: 'center', justifyContent: 'center', width: '10%' }}
                                onPress={() => {
                                  dispatch({ type: OPEN_CONFIRMATION_MODAL, payload: 'update_user' });
                                  setUserToUpdate({ ...list, actionType: 'deactivate' });
                                }}
                              >
                                <Image
                                  source={icons.deactivate_account}
                                  style={{ height: 26, width: 26, resizeMode: 'contain', tintColor: COLORS.red }}
                                />
                              </TouchableOpacity>
                            </View>
                              :
                              null
                          }

                        </Animated.View>

                      )
                    })}
                  </ScrollView>

                // </View>
              }

              {
                deletedUsers.length != 0 &&
                <TouchableOpacity
                  onPress={() => setActiveDropDown((activeDropDown) => activeDropDown == 'deletedUsers' ? '' : 'deletedUsers')}
                  style={{
                    marginTop: 6,
                    padding: 6,
                    flexDirection: 'row',
                    // backgroundColor: COLORS.gray400,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.gray600,
                    // borderTopRightRadius: SIZES.radius / 2,
                    // borderTopLeftRadius: SIZES.radius / 2,
                    borderBottomRightRadius: SIZES.radius / 3,
                    borderBottomLeftRadius: SIZES.radius / 3,
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                    Deleted Users
                  </Text>
                  {/* <Animated.View style={{ transform: [{ rotate: activeDropDown === 'deletedUsers' ? rotateInterpolation : '0deg'}]}}> */}
                  <Image
                    source={icons.arrow_down}
                    style={{ height: 18, width: 18, resizeMode: 'contain', tintColor: COLORS.primary, transform: [{ rotate: activeDropDown == 'deletedUsers' ? '0deg' : '-90deg' }] }}
                  />
                  {/* </Animated.View> */}
                </TouchableOpacity>
              }
              {
                activeDropDown == 'deletedUsers' &&
                // <View style={{ maxHeight: '40%' }}>
                <ScrollView
                  nestedScrollEnabled={true}
                  style={{ height: 200 }}
                >
                  {deletedUsers.map((list, index) => {
                    let displayName = String(list.email).split('@')[0];
                    const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

                    return (
                      <Animated.View
                        key={index}
                        entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
                        // onLongPress={() => handleDoublePress(list)}
                        // onPress={() => handleSelectCollector(list)}
                        style={{
                          paddingVertical: 1,
                          justifyContent: 'center',
                        }}>
                        <View
                          style={{
                            backgroundColor: collector == list.email ? COLORS.primary : backgroundColor,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                          <Text style={{ fontSize: 16, color: COLORS.black900, fontWeight: '500', paddingLeft: 10 }}>
                            {displayName}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              dispatch({ type: OPEN_CONFIRMATION_MODAL, payload: 'update_user' });
                              setUserToUpdate({ ...list, actionType: 'reactivate' });
                            }}
                            style={{ padding: 10, alignItems: 'center', justifyContent: 'center' }}>
                            <Image
                              source={icons.reactivate_account}
                              style={{ height: 26, width: 26, resizeMode: 'contain', tintColor: COLORS.success700 }}
                            />
                          </TouchableOpacity>
                        </View>
                      </Animated.View>
                    )
                  })}
                </ScrollView>
                // </View>
              }
            </View>
          </>
        }
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>

          {selUser && (selUser.role == 'coordinator' && selUser.isAdmin &&  ableToViewMap) &&
            <>
              <Text style={{ padding: 6, color: COLORS.primary, fontSize: 12, fontWeight: '500', marginTop: 10 }}>
                Preferences
              </Text>
              <TouchableOpacity style={{ paddingVertical: 1 }} onPress={() => navigation.navigate('MapScreen', {})}>
                <View
                  style={{
                    // backgroundColor: COLORS.gray400,
                    padding: 10,
                    borderTopRightRadius: 12,
                    borderBottomLeftRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                                  borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.gray600
                  }}>
                  <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                    Map Users
                  </Text>
                  <Image
                source={icons.go}
                style={{ height: 15, width: 15, tintColor: COLORS.black900 }}
              />
                </View>
              </TouchableOpacity>
            </>
          }

          {/* <Text style={{ padding: 6, color: COLORS.primary, fontSize: 12, fontWeight: '500', marginTop: 10 }}>
            Printer
          </Text> */}
          <TouchableOpacity style={{ paddingVertical: 1 }} onPress={() => navigation.navigate('TestPrinter', {})}>
            <View style={{
              // backgroundColor: COLORS.gray400,
              padding: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              // borderTopRightRadius: 12,
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.gray600
              // borderRadius: rowList === 0 ? 10 : rowList === lists.length - 1 ? 10 : 0,
              // borderTopRightRadius: rowList === 0 ? 10 : 0,
              // borderTopLeftRadius: rowList === 0 ? 10 : 0,
              // borderBottomRightRadius: rowList === lists.length - 1 ? 10 : 0,
              // borderBottomLeftRadius: rowList === lists.length - 1 ? 10 : 0,
            }}>
              <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                Test Printer
              </Text>
              <Image
                source={icons.go}
                style={{ height: 15, width: 15, tintColor: COLORS.black900 }}
              />
            </View>
          </TouchableOpacity>


          {/* <Text style={{ padding: 6, color: COLORS.primary, fontSize: 12, fontWeight: '500', marginTop: 10 }}>
            App Version {`${Config.APP_VERSION + '-' + String(Config.ATLAS_APP_ID_QA).split('-')[0]}`}
          </Text> */}


          <TouchableOpacity disabled={!apkUrl} style={{ paddingVertical: 1 }} onPress={() => openModal()}>
            <View style={{
              // backgroundColor: COLORS.gray400,
              padding: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTopRightRadius: 12,
              borderBottomLeftRadius: 12,
                            borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.gray600
            }}>
              <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                Update Application
              </Text>
              <Image
                source={icons.go}
                style={{ height: 15, width: 15, tintColor: COLORS.black900 }}
              />
            </View>
          </TouchableOpacity>

          <Text style={{ padding: 6, color: COLORS.primary, fontSize: 12, fontWeight: '500', marginTop: 10 }}>
            Security
          </Text>
          <TouchableOpacity style={{ paddingVertical: 1 }} onPress={() => navigation.navigate('Permissions', {})}>
            <View style={{
              // backgroundColor: COLORS.gray400,
              padding: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTopRightRadius: 12,
              borderBottomLeftRadius: 12,
                            borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.gray600
              // borderRadius: rowList === 0 ? 10 : rowList === lists.length - 1 ? 10 : 0,
              // borderTopRightRadius: rowList === 0 ? 10 : 0,
              // borderTopLeftRadius: rowList === 0 ? 10 : 0,
              // borderBottomRightRadius: rowList === lists.length - 1 ? 10 : 0,
              // borderBottomLeftRadius: rowList === lists.length - 1 ? 10 : 0,
            }}>
              <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                Permissions
              </Text>
              <Image
                source={icons.go}
                style={{ height: 15, width: 15, tintColor: COLORS.black900 }}
              />
            </View>
          </TouchableOpacity>
        </View>
        {/* </View> */}

        {/* <View style={{ flex: 1, padding: 10 }}> */}
{/* 
        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
          <Text style={{ padding: 6, color: COLORS.gray600, fontSize: 12, fontWeight: '500', marginTop: 10 }}>
            Current Version {Config.APP_VERSION}
          </Text>
        </View> */}

{ height < 600 && 

<TouchableOpacity onPress={signOut}>
        <View
          style={{
            backgroundColor: COLORS.gray400,
            paddingVertical: 12,
            paddingHorizontal: 24,
            marginTop: 10,
            borderRadius: 6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
                          // borderTopRightRadius: 12,
              // borderBottomLeftRadius: 12,
          }}
        >
          {/* <Image
            source={icons.back}
            style={{ height: 16, width: 16, tintColor: COLORS.black900, marginRight: 8 }}
          /> */}
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>
            Logout
          </Text>
        </View>
      </TouchableOpacity>
}




      </View>
    </ScrollView>
       {/* Fixed Logout button at bottom center */}
       { height > 600  && 
       
       
    <View
      style={{
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        // alignItems: 'center',
        zIndex: 999,
        padding: 10
        // width: '100%'
      }}
    >
       <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', marginBottom: SIZES.padding * 3 }}>
          <Text style={{ padding: 6, color: COLORS.gray600, fontSize: 12, fontWeight: '500', marginTop: 10 }}>
            Current Version {Config.APP_VERSION}
          </Text>
        </View>
      <TouchableOpacity onPress={signOut}>
        <View
          style={{
            backgroundColor: COLORS.gray400,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* <Image
            source={icons.back}
            style={{ height: 16, width: 16, tintColor: COLORS.black900, marginRight: 8 }}
          /> */}
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>
            Logout
          </Text>
        </View>
      </TouchableOpacity>
    </View>
       }

    </SafeAreaView>

  );
};



export default SettingsScreen