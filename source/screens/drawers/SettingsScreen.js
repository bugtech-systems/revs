import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Animated, { FadeInDown } from 'react-native-reanimated';
import UpdateModal from '../../components/UpdateModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { COLORS, icons, SIZES } from '../../constants';
import Config from 'react-native-config';
import supabase from '../../utils/supabaseClient';
import {
  CLOSE_CONFIRMATION_MODAL,
  OPEN_CONFIRMATION_MODAL,
  SET_ACTIVE_USER,
  SET_COLLECTOR,
  SET_USER,
  SET_USER_CONFIG,
} from '../../redux/actions/types';
import { getLocalUsers, saveLocalUsers } from '../../utils/db';
import { useScreenSize, getConfiguration } from '../../utils/helpers';
import { api, clearAllStorage, deleteDB, forceSync } from '../../utils/offlineSync';
import { exportDatabase } from '../../utils/exportHelper';
import useBatchedPull from '../../hooks/useBatchPulling';


const SettingsScreen = ({ navigation }) => {
  const { width, height } = Dimensions.get('window');
  const dispatch = useDispatch();
  const {
    isPulling,
    currentTable,
    progress,
    recordsProcessed,
    error,
    lastPull,
    results,
    pullFromSupabase,
    pullTables,
    fullResync,
    abortPull,
    resetPullState
  } = useBatchedPull();

  const { user, collector } = useSelector(({ user }) => user);
  const { confirmationModal } = useSelector(({ ui }) => ui);

  const [usersList, setUsersList] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [usersCoord, setUsersCoord] = useState([]);
  const [tellersCoord, setTellersCoord] = useState([]);
  const [activeDropDown, setActiveDropDown] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [userToUpdate, setUserToUpdate] = useState(null);
  const [loading, setLoading] = useState(false);
  const apkUrl = Config.APK_URL;

  const screen = useScreenSize();

  // --- Load local users first (offline-first) ---
  const loadUsers = async () => {

    let localUsers = await api.listUsers(); // SQLite cache


    console.log(localUsers, "LOCAL NA TOKAL")
    
    setUsersList(localUsers);

    const authenticatedEmail = user?.email || collector || '';
    let deletedUsers = localUsers?.filter(u => u?.is_deleted && u?.email !== authenticatedEmail);
    let usersCoordinators = localUsers?.filter(u => u?.role === 'coordinator' && !u?.is_deleted && u?.email !== authenticatedEmail);
    let usersTellers = localUsers?.filter(u => u?.role === 'teller' && !u?.is_deleted && u?.email !== authenticatedEmail)


    setDeletedUsers(deletedUsers)
    setUsersCoord(usersCoordinators)
    setTellersCoord(usersTellers);

    return;
  };

  // --- Supabase realtime subscription for offline-first sync ---
  useEffect(() => {
    loadUsers();
  }, []);


  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  const handleSelectCollector = val => {
    dispatch({ type: SET_COLLECTOR, payload: val.email });
    dispatch({ type: SET_ACTIVE_USER, payload: val });
    navigation.navigate('Dashboard', JSON.stringify({ user: val.email }));
  };

  const handleDoublePress = val => {
    dispatch({ type: SET_USER_CONFIG, payload: val });
    navigation.navigate('View User', JSON.stringify(val));
  };

  const handleReactivateUser = async user => {
    // Offline-first: update SQLite first
    const updatedUsers = usersList.map(u =>
      u.id === user.id
        ? {
          ...u,
          is_deleted:
            user.actionType === 'reactivate'
              ? false
              : user.actionType === 'deactivate'
                ? true
                : u.is_deleted,
        }
        : u
    );
    setUsersList(updatedUsers);
    await saveLocalUsers(updatedUsers);

    // Online sync
    await supabase.from('users').update({
      is_deleted: user.actionType === 'reactivate' ? false : user.actionType === 'deactivate' ? true : user.is_deleted,
    }).eq('id', user.id);
  };

  const toggleDropdown = key => {
    setActiveDropDown(prev => (prev === key ? '' : key));
  };

  const handleDelete = async () => {

    await deleteDB()
    // now safe to write to RNFS.DownloadDirectoryPath

  }



  // const signOut = useCallback(() => {
  //   dispatch({ type: SET_COLLECTOR, payload: null });
  //   dispatch({ type: SET_USER, payload: null });
  // }, [dispatch]);
  // logged in user and then navigates to the welcome screen
  const signOut = useCallback(async () => {
    try {
      // Supabase logout
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Realm logout if needed
      // Redux cleanup
      dispatch({ type: SET_COLLECTOR, payload: null });
      dispatch({ type: SET_USER, payload: null });
      clearAllStorage();

      // Optional: navigate to login/welcome screen
      // navigation.navigate('Welcome');
    } catch (err) {
      console.error('Error signing out:', err.message);
      Alert.alert('Logout Failed', err.message);
    }
  }, [dispatch, navigation]);


  const handleSetDefault = () => {
    const authenticatedEmail = user?.email;
    dispatch({ type: SET_COLLECTOR, payload: authenticatedEmail });
    dispatch({ type: SET_ACTIVE_USER, payload: null });
  };

  const selUser = user;

  const ableToViewDeletedUsers = getConfiguration(selUser, 'deletedUsers')?.isCheck;
  const ableToViewAppUsers = getConfiguration(selUser, 'appUsers')?.isCheck;
  const ableToViewMap = getConfiguration(selUser, 'mapUsers')?.isCheck;





  console.log(selUser.role, "selUserselUserselUserselUserselUser")


  return (
    <SafeAreaView style={{ flex: 1, position: 'relative', backgroundColor: COLORS.gray400 }}>
      <ScrollView
        // contentContainerStyle={{ flex: 1}}
        style={{ backgroundColor: '#f1f1f1' }}>
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

        {selUser && (selUser.role == 'coordinator' && selUser.is_admin) &&
          // <View style={{ padding: 10, backgroundColor: COLORS.gray300, }}>
          //     <Button title="New User" 
          // onPress={() => navigation.navigate('Create User', JSON.stringify(users[0]))} 
          // />
          //     {/* <Button title="" onPress={() => navigation.navigate('Create User', JSON.stringify(users[0]))} /> */}
          // </View>
          <View style={{ padding: 10, backgroundColor: '#f1f1f1' }}>

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

          {selUser && (selUser.role == 'coordinator' && selUser.is_admin && ableToViewAppUsers) &&
            <>
              <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ padding: 6, color: COLORS.primary, fontSize: 12, fontWeight: '500' }}>
                  App Users
                </Text>
                {
                  collector !== selUser?.email &&
                  <TouchableOpacity
                    onPress={() => handleSetDefault()}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 10
                    }}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '500' }}>
                      Set Default
                    </Text>
                  </TouchableOpacity>
                }
              </View>
              <View style={{ borderWidth: 1, paddingVertical: SIZES.semiRadius, paddingHorizontal: SIZES.padding, backgroundColor: '#ffff', borderColor: '#ffff', elevation: 1, borderRadius: SIZES.semiRadius }}>
                {usersCoord.length != 0 &&

                  <TouchableOpacity
                    onPress={() => setActiveDropDown((activeDropDown) => activeDropDown == 'coordinators' ? '' : 'coordinators')}
                    style={{
                      // marginTop: 10,
                      padding: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      // borderBottomWidth: 1,
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
                    {/* <Image
                  source={icons.arrow_down}
                  style={{ height: 18, width: 18, resizeMode: 'contain', tintColor: COLORS.primary, transform: [{ rotate: activeDropDown == 'coordinators' ? '0deg' : '-90deg' }] }}
                /> */}
                    <View style={{ borderWidth: 1, padding: SIZES.padding / 2, borderColor: COLORS.gray400, backgroundColor: COLORS.gray400, transform: [{ rotate: activeDropDown == 'coordinators' ? '90deg' : '0deg' }], borderRadius: SIZES.semiRadius /  1.5}}>
                      <Image
                        source={icons.go}
                        style={{ height: 15, width: 15, tintColor: COLORS.black900 }}
                      />
                    </View>
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
                        const backgroundColor = index % 2 === 0 ? '#ffff' : COLORS.gray200;

                        return (
                          <Animated.View
                            key={index}
                            entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
                            style={{
                              width: '100%',
                              flexDirection: 'row',
                              // padding: 10,
                              borderRadius: 6,
                              justifyContent: 'space-between',
                              backgroundColor: backgroundColor,

                              // justifyContent: 'center', 
                            }}
                          >
                            <TouchableOpacity
                              onLongPress={() => handleDoublePress(list)}
                              onPress={() => handleSelectCollector(list)}
                              style={{
                                width: '80%',
                                paddingVertical: 14,
                                justifyContent: 'center',                                // borderWidth: 1, 
                              }}
                            >
                              <Text style={{ fontSize: 16, fontWeight: '500', color: collector == list.email ? COLORS.secondary : COLORS.black900, paddingLeft: 10, fontWeight: collector == list.email ? 'bold' : '500' }}>
                                {displayName}
                              </Text>
                            </TouchableOpacity>
                            {
                              selUser && (selUser.role == 'coordinator' && selUser.is_admin && collector !== list.email) ?
                                <View style={{ width: '20%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
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
                      onPress={() => setActiveDropDown((activeDropDown) => activeDropDown == 'tellers' ? '' : 'tellers')}
                      // onPress={toggleDropdown}
                      style={{
                        marginTop: 6,
                        padding: 6,
                        flexDirection: 'row',
                        // backgroundColor:  activeDropDown == 'tellers' ? COLORS.gray400 : COLORS.gray300,
                        // backgroundColor: COLORS.gray400,
                        // borderBottomWidth: 1,
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
                      {/* <Image
                    source={icons.arrow_down}
                    style={{ height: 18, width: 18, resizeMode: 'contain', tintColor: COLORS.primary, transform: [{ rotate: activeDropDown == 'tellers' ? '0deg' : '-90deg' }] }}
                  /> */}
                      <View style={{ borderWidth: 1, padding: SIZES.padding / 2, borderColor: COLORS.gray400, backgroundColor: COLORS.gray400, transform: [{ rotate: activeDropDown == 'tellers' ? '-90deg' : '0deg' }], borderRadius: SIZES.semiRadius / 1.5 }}>
                        <Image
                          source={icons.go}
                          style={{ height: 15, width: 15, tintColor: COLORS.black900 }}
                        />
                      </View>
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
                        const backgroundColor = index % 2 === 0 ? '#ffff' : COLORS.gray200;

                        return (
                          <Animated.View
                            key={index}
                            entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
                            style={{
                              // height: animatedHeight, 
                              overflow: 'hidden',
                              width: '100%',
                              flexDirection: 'row',
                              borderRadius: 6,
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

                              <Text style={{ fontSize: 16, fontWeight: collector == list.email ? 'bold' : '500', color: collector == list.email ? COLORS.white : COLORS.black900, paddingLeft: 10 }}>
                                {displayName}
                              </Text>
                            </TouchableOpacity>
                            {
                              selUser && (selUser.role == 'coordinator' && selUser.is_admin) ?
                                <View style={{ width: '20%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
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
                        // borderBottomWidth: 1,
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
                      {/* <Image
                    source={icons.arrow_down}
                    style={{ height: 18, width: 18, resizeMode: 'contain', tintColor: COLORS.primary, transform: [{ rotate: activeDropDown == 'deletedUsers' ? '0deg' : '-90deg' }] }}
                  /> */}
                      <View style={{ borderWidth: 1, padding: SIZES.padding / 2, borderColor: COLORS.gray400, backgroundColor: COLORS.gray400, transform: [{ rotate: activeDropDown == 'deletedUsers' ? '-90deg' : '0deg' }], borderRadius: SIZES.semiRadius / 1.5 }}>
                                              <Image
                          source={icons.go}
                          style={{ height: 15, width: 15, tintColor: COLORS.black900 }}
                        />
                      </View>
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
                        const backgroundColor = index % 2 === 0 ? '#ffff' : COLORS.gray200;

                        // console.log(list, 'LISTA HA DEETED')
                        

                        return (
                          <Animated.View
                            key={index}
                            entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
                            // onLongPress={() => handleDoublePress(list)}
                            // onPress={() => handleSelectCollector(list)}
                            style={{
                              paddingVertical: 1,
                              justifyContent: 'center',
                              borderRadius: 6
                            }}>
                            <View
                              style={{
                                backgroundColor: collector == list.email ? COLORS.primary : backgroundColor,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                              <Text style={{ fontSize: 16, color: COLORS.black900, fontWeight: '500', paddingLeft: 10 }}>
                                {String(displayName).toUpperCase()}
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
              </View>

            </>
          }
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>

            {selUser && (selUser.role == 'coordinator' && selUser.is_admin && ableToViewMap) &&
              <>
                <Text style={{ padding: 6, color: COLORS.primary, fontSize: 12, fontWeight: '500', marginTop: 10 }}>
                  Preferences
                </Text>
                <TouchableOpacity
                  style={{
                    paddingVertical: 1,
                    marginVertical: SIZES.padding / 2,
                    backgroundColor: '#ffffff',
                    elevation: 1,
                    padding: 10,
                    borderTopRightRadius: 12,
                    borderTopLeftRadius: 12,
                    flexDirection: 'row',
                    paddingVertical: 14,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottomLeftRadius: 12,
                    borderColor: COLORS.gray200,
                    borderBottomRightRadius: 12,
                    borderWidth: 1,
                    // borderBottomWidth: 1,
                    borderBottomColor: COLORS.gray600
                  }}
                  onPress={() => navigation.navigate('MapScreen', {})}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
                    <Image 
                      source={icons.mapUsers}
                      style={{
                        height: 30,
                        width: 30,
                        tintColor: COLORS.secondary,
                        resizeMode: 'contain',
                      }}
                    />
                    <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold', paddingHorizontal: 10 }}>
                      Map Users
                    </Text>
                  </View>

                  <Image
                    source={icons.go}
                    style={{ height: 15, width: 15, tintColor: COLORS.black900 }}
                  />
                </TouchableOpacity>
              </>
            }

            {/* <Text style={{ padding: 6, color: COLORS.primary, fontSize: 12, fontWeight: '500', marginTop: 10 }}>
            Printer
          </Text> */}
            <TouchableOpacity
              style={{
                paddingVertical: 1,
                marginVertical: SIZES.padding / 2,
                backgroundColor: '#ffffff',
                elevation: 1,
                padding: 10,
                borderTopRightRadius: 12,
                borderTopLeftRadius: 12,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomLeftRadius: 12,
                borderColor: COLORS.gray200,
                borderBottomRightRadius: 12,
                borderWidth: 1,
                // borderBottomWidth: 1,
                borderBottomColor: COLORS.gray600
              }}
              onPress={() => navigation.navigate('TestPrinter', {})}
            >

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
                    <Image 
                      source={icons.testPrint}
                      style={{
                        height: 30,
                        width: 30,
                        tintColor: COLORS.secondary,
                        resizeMode: 'contain',
                      }}
                    />
                    <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold', paddingHorizontal: 10 }}>
                      Test Printer
                    </Text>
                  </View>
                    <Image
                      source={icons.go}
                      style={{ height: 15, width: 15, tintColor: COLORS.black900 }}
                    />
            </TouchableOpacity>


            {/* <Text style={{ padding: 6, color: COLORS.primary, fontSize: 12, fontWeight: '500', marginTop: 10 }}>
            App Version {`${Config.APP_VERSION + '-' + String(Config.ATLAS_APP_ID_QA).split('-')[0]}`}
          </Text> */}


            <TouchableOpacity
              disabled={!apkUrl}
              style={{
                elevation: 1,
                marginVertical: SIZES.padding / 2,
                backgroundColor: '#ffffff',
                padding: 10,
                paddingVertical: 14,
                borderTopRightRadius: 12,
                borderTopLeftRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomLeftRadius: 12,
                borderColor: COLORS.gray200,
                borderBottomRightRadius: 12,
                borderWidth: 1,
                // borderBottomWidth: 1,
                borderBottomColor: COLORS.gray600
              }}
              onPress={() => openModal()}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
                    <Image 
                      source={icons.android}
                      style={{
                        height: 30,
                        width: 30,
                        tintColor: COLORS.secondary,
                        resizeMode: 'contain',
                      }}
                    />
                    
              <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold', paddingHorizontal: 10 }}>
                Update Application
              </Text>
                  </View>
              <Image
                source={icons.go}
                style={{ height: 15, width: 15, tintColor: COLORS.black900 }}
              />
            </TouchableOpacity>

            <Text style={{ padding: 6, color: COLORS.primary, fontSize: 12, fontWeight: '500', marginTop: 10 }}>
              Security
            </Text>
            <TouchableOpacity 
              style={{ 
                paddingVertical: 1,
                backgroundColor: '#ffffff',
                  elevation: 1,
                  padding: 10,
                  paddingVertical: 14,
                  borderTopRightRadius: 12,
                  borderTopLeftRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  borderBottomLeftRadius: 12,
                  borderColor: COLORS.gray200,
                  borderBottomRightRadius: 12,
                  borderWidth: 1,
                  // borderBottomWidth: 1,
                  borderBottomColor: COLORS.gray600 
              }} onPress={() => navigation.navigate('Permissions', {})}>

                 <Image 
                      source={icons.configuration}
                      style={{
                        height: 30,
                        width: 30,
                        tintColor: COLORS.secondary,
                        resizeMode: 'contain',
                      }}
                    />

                <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold', paddingHorizontal: 10 }}>
                  Permissions
                </Text>

            </TouchableOpacity>
          </View>
          {height < 600 &&

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
      {height > 600 &&


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

export default SettingsScreen;
