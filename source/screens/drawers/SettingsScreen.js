import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, Button, TouchableOpacity, Alert, ScrollView, SafeAreaView, Easing } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { realmContext } from '../../RealmContext';
import { useUser } from '@realm/react';
import { Users } from '../../Models';
import { CLOSE_CONFIRMATION_MODAL, OPEN_CONFIRMATION_MODAL, SET_ACTIVE_USER, SET_COLLECTOR, SET_USER, SET_USER_CONFIG } from '../../redux/actions/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import UpdateModal from '../../components/UpdateModal';
import Config from 'react-native-config';
import { getConfiguration } from '../../utils/helpers';
import ConfirmationModal from '../../components/ConfirmationModal';
import { BSON } from 'realm';
import { COLORS, icons, SIZES } from '../../constants';

const { useRealm, useQuery } = realmContext;
const usersSubscriptionName = 'users';

const SettingsScreen = ({ navigation }) => {
  const realm = useRealm()
  const dispatch = useDispatch();
  const { user, apkUrl, collector } = useSelector(({ user }) => user)
  const { confirmationModal } = useSelector(({ ui }) => ui)
  const [isModalVisible, setModalVisible] = useState(false);
  const [updateUrl, setUpdateUrl] = useState(null);
  const [rnd, setRnd] = useState(0);
  const [userToUpdate, setUserToUpdate] = useState(null);

  const [activeDropDown, setActiveDropDown] = useState('');

  // const rotation = useRef(new Animated.Value(0)).current; // Initialize animation value
  // const animatedHeight = useRef(new Animated.Value(0)).current; // Initial height is 0


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

    console.log('AW AW')

    dispatch({ type: SET_USER_CONFIG, payload: val })
    // console.log()
    navigation.navigate('View User', JSON.stringify(val))

  }

  const handleReactivateUser = async (user) => {
    const updateUser = realm.objectForPrimaryKey(Users, BSON.ObjectId(user._id));


    if (updateUser && user?.actionType == 'reactivate') {
      let reactivatedUser = realm.write(() => {
        updateUser.isDeleted = false;
      });


      console.log(reactivatedUser, "WEW")
    } else {
      realm.write(() => {
        updateUser.isDeleted = true;
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

  return (
    // <SafeAreaView style={{ flex: 1 }}>
    <ScrollView
      // contentContainerStyle={{ flex: 1}}
      style={{ flex: 1, backgroundColor: COLORS.gray300 }}>
      {
        apkUrl &&
        <UpdateModal
          visible={isModalVisible}
          onClose={closeModal}
          updateUrl={apkUrl}
        />
      }
      <ConfirmationModal
        visible={confirmationModal == 'update_user'}
        onClose={() => {
          dispatch({ type: CLOSE_CONFIRMATION_MODAL });
          setUserToUpdate(null);
        }}
        title={'Confirmation'}
        message={`Are you sure you want to ${userToUpdate?.actionType} this user?`}
        handleConfirm={() => {
          // handleCancelTicket(ticketDetails._id)
          handleReactivateUser(userToUpdate);
          setUserToUpdate(null);
          dispatch({ type: CLOSE_CONFIRMATION_MODAL });
        }}
      />

      {selUser && (selUser.role == 'coordinator' && selUser.isAdmin) &&
        <View style={{ padding: 10, backgroundColor: COLORS.gray300, }}>
            <Button title="New User" onPress={() => navigation.navigate('Create User', JSON.stringify(users[0]))} />
            {/* <Button title="" onPress={() => navigation.navigate('Create User', JSON.stringify(users[0]))} /> */}
        </View>
      }

      <View style={{ flex: 1, padding: 10, }}>

        {selUser && (selUser.role == 'coordinator' && selUser.isAdmin &&  ableToViewAppUsers) &&
          <>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={{ padding: 6, color: COLORS.darkgray, fontWeight: '500' }}>
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
                  borderBottomWidth: .5,
                  borderBottomColor: COLORS.secondary,
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
                            width: '90%',
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
                    borderBottomWidth: .5,
                    borderBottomColor: COLORS.secondary,
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
                              width: '90%',
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
                    borderBottomWidth: .5,
                    borderBottomColor: COLORS.secondary,
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

          {(selUser && selUser.isAdmin) &&
            <>
              <Text style={{ padding: 6, color: COLORS.darkgray, fontWeight: '500', marginTop: 10 }}>
                Map
              </Text>
              <TouchableOpacity style={{ paddingVertical: 1 }} onPress={() => navigation.navigate('MapScreen', {})}>
                <View
                  style={{
                    backgroundColor: COLORS.gray400,
                    padding: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                  <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                    Map Users
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          }

          <Text style={{ padding: 6, color: COLORS.darkgray, fontWeight: '500', marginTop: 10 }}>
            Printer
          </Text>
          <TouchableOpacity style={{ paddingVertical: 1 }} onPress={() => navigation.navigate('TestPrinter', {})}>
            <View style={{
              backgroundColor: COLORS.gray400,
              padding: 10,
              flexDirection: 'row',
              alignItems: 'center',
              // borderRadius: rowList === 0 ? 10 : rowList === lists.length - 1 ? 10 : 0,
              // borderTopRightRadius: rowList === 0 ? 10 : 0,
              // borderTopLeftRadius: rowList === 0 ? 10 : 0,
              // borderBottomRightRadius: rowList === lists.length - 1 ? 10 : 0,
              // borderBottomLeftRadius: rowList === lists.length - 1 ? 10 : 0,
            }}>
              <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                Test Printer
              </Text>
            </View>
          </TouchableOpacity>


          <Text style={{ padding: 6, color: COLORS.darkgray, fontWeight: '500', marginTop: 10 }}>
            App Version {`${Config.APP_VERSION + '-' + String(Config.ATLAS_APP_ID_PROD).split('-')[0]}`}
          </Text>


          <TouchableOpacity disabled={!apkUrl} style={{ paddingVertical: 1 }} onPress={() => openModal()}>
            <View style={{
              backgroundColor: COLORS.gray400,
              padding: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                Update Application
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={{ padding: 6, color: COLORS.darkgray, fontWeight: '500', marginTop: 10 }}>
            Security
          </Text>
          <TouchableOpacity style={{ paddingVertical: 1 }} onPress={() => navigation.navigate('Permissions', {})}>
            <View style={{
              backgroundColor: COLORS.gray400,
              padding: 10,
              flexDirection: 'row',
              alignItems: 'center',
              // borderRadius: rowList === 0 ? 10 : rowList === lists.length - 1 ? 10 : 0,
              // borderTopRightRadius: rowList === 0 ? 10 : 0,
              // borderTopLeftRadius: rowList === 0 ? 10 : 0,
              // borderBottomRightRadius: rowList === lists.length - 1 ? 10 : 0,
              // borderBottomLeftRadius: rowList === lists.length - 1 ? 10 : 0,
            }}>
              <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                Permissions
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={{ paddingVertical: 1 }} onPress={() => signOut()}>
            <View style={{
              backgroundColor: COLORS.gray400,
              padding: 10,
              flexDirection: 'row',
              alignItems: 'center',
              // borderRadius: rowList === 0 ? 10 : rowList === lists.length - 1 ? 10 : 0,
              // borderTopRightRadius: rowList === 0 ? 10 : 0,
              // borderTopLeftRadius: rowList === 0 ? 10 : 0,
              // borderBottomRightRadius: rowList === lists.length - 1 ? 10 : 0,
              // borderBottomLeftRadius: rowList === lists.length - 1 ? 10 : 0,
            }}>
              <Image
                source={icons.back}
                style={{ height: 15, width: 15, tintColor: COLORS.black900 }}
              />
              <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>
                Logout
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        {/* </View> */}

        {/* <View style={{ flex: 1, padding: 10 }}> */}

      </View>
    </ScrollView>
    // </SafeAreaView>

  );
};



export default SettingsScreen