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
  const apkUrl = Config.APK_URL;

  const screen = useScreenSize();

  // --- Load local users first (offline-first) ---
  const loadUsers = async () => {
    let localUsers = await api.listUsers(); // SQLite cache


    setUsersList(localUsers);

    const authenticatedEmail = user?.email || collector || '';

    setDeletedUsers(localUsers.filter(u => u.is_deleted && u.email !== authenticatedEmail));
    setUsersCoord(
      localUsers.filter(u => u.role === 'coordinator' && !u.is_deleted && u.email !== authenticatedEmail)
    );
    setTellersCoord(
      localUsers.filter(u => u.role === 'teller' && !u.is_deleted && u.email !== authenticatedEmail)
    );
  };

  // --- Supabase realtime subscription for offline-first sync ---
  useEffect(() => {
    loadUsers();
  }, []);

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

  const selUser = usersList.find(u => u.email === (user?.email || collector)) || {};

  const ableToViewDeletedUsers = getConfiguration(selUser, 'deletedUsers')?.isCheck;
  const ableToViewAppUsers = getConfiguration(selUser, 'appUsers')?.isCheck;
  const ableToViewMap = getConfiguration(selUser, 'mapUsers')?.isCheck;




  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.gray300 }}>
      <ScrollView style={{ backgroundColor: COLORS.gray300 }}>
        {apkUrl && (
          <UpdateModal visible={isModalVisible} onClose={() => setModalVisible(false)} updateUrl={apkUrl} required={false} />
        )}

        <ConfirmationModal
          visible={confirmationModal === 'update_user'}
          onClose={() => {
            dispatch({ type: CLOSE_CONFIRMATION_MODAL });
            setUserToUpdate(null);
          }}
          title="Confirmation"
          message={`Are you sure you want to ${userToUpdate?.actionType} this user?`}
          handleConfirm={() => {
            handleReactivateUser(userToUpdate);
            setUserToUpdate(null);
            dispatch({ type: CLOSE_CONFIRMATION_MODAL });
          }}
        />

        {/* New User Button */}
        {(selUser?.role === 'coordinator' && selUser?.is_admin) ? (
          <View style={{ padding: 10 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Create User', JSON.stringify(selUser))}
              style={{
                backgroundColor: COLORS.secondaryTransparent,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.white }}>NEW USER</Text>
            </TouchableOpacity>
          </View>
        ) : <View></View>}

        {/* App Users */}
         {(selUser?.role === 'coordinator' && selUser?.is_admin && ableToViewAppUsers) ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 6 }}>
              <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '500' }}>App Users</Text>
              {collector !== user?.email && (
                <TouchableOpacity onPress={handleSetDefault} style={{ padding: 10 }}>
                  <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '500' }}>Set Default</Text>
                </TouchableOpacity>
              )}
            </View>

            {usersCoord.length > 0 && (
              <>
                <TouchableOpacity
                  onPress={() => toggleDropdown('coordinators')}
                  style={{
                    padding: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.gray600,
                    borderBottomLeftRadius: SIZES.radius / 3,
                    borderBottomRightRadius: SIZES.radius / 3,
                  }}
                >
                  <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>Coordinators</Text>
                  <Image
                    source={icons.arrow_down}
                    style={{
                      height: 18,
                      width: 18,
                      tintColor: COLORS.primary,
                      transform: [{ rotate: activeDropDown === 'coordinators' ? '0deg' : '-90deg' }],
                    }}
                  />
                </TouchableOpacity>
                {activeDropDown === 'coordinators' && (
                  <ScrollView style={{ height: 200 }}>
                    {usersCoord.map((list, index) => {
                      const displayName = String(list.email).split('@')[0];
                      const bgColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;
                      return (
                        <Animated.View
                          key={list.id}
                          entering={FadeInDown.delay(index * 100).duration(500)}
                          style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 1, backgroundColor: collector === list.email ? COLORS.primary : bgColor }}
                        >
                          <TouchableOpacity
                            onLongPress={() => handleDoublePress(list)}
                            onPress={() => handleSelectCollector(list)}
                            style={{ width: '80%', paddingVertical: 14, justifyContent: 'center' }}
                          >
                            <Text style={{ fontSize: 16, fontWeight: '500', color: collector === list.email ? COLORS.white : COLORS.black900, paddingLeft: 10 }}>
                              {displayName}
                            </Text>
                          </TouchableOpacity>

                          {selUser?.role === 'coordinator' && selUser?.is_admin && collector !== list.email && (
                            <View style={{ width: '20%', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
                              <TouchableOpacity
                                disabled={!list.device_id}
                                style={{ width: '10%', opacity: list.device_id ? 1 : 0.5 }}
                                onPress={() => {
                                  dispatch({ type: OPEN_CONFIRMATION_MODAL, payload: 'update_user' });
                                  setUserToUpdate({ ...list, actionType: 'revoke session' });
                                }}
                              >
                                <Image source={icons.revokeDevice} style={{ height: 24, width: 24, resizeMode: 'contain' }} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={{ width: '10%' }}
                                onPress={() => {
                                  dispatch({ type: OPEN_CONFIRMATION_MODAL, payload: 'update_user' });
                                  setUserToUpdate({ ...list, actionType: 'deactivate' });
                                }}
                              >
                                <Image source={icons.deactivate_account} style={{ height: 26, width: 26, resizeMode: 'contain', tintColor: COLORS.red }} />
                              </TouchableOpacity>
                            </View>
                          )}
                        </Animated.View>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}

            { 
            tellersCoord.length > 0 && (
              <>
                <TouchableOpacity
                  onPress={() => toggleDropdown('tellers')}
                  style={{
                    padding: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.gray600,
                    borderBottomLeftRadius: SIZES.radius / 3,
                    borderBottomRightRadius: SIZES.radius / 3,
                    marginTop: 6,
                  }}
                >
                  <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>Tellers</Text>
                  <Image
                    source={icons.arrow_down}
                    style={{
                      height: 18,
                      width: 18,
                      tintColor: COLORS.primary,
                      transform: [{ rotate: activeDropDown === 'tellers' ? '0deg' : '-90deg' }],
                    }}
                  />
                </TouchableOpacity>

                {activeDropDown === 'tellers' && (
                  <ScrollView style={{ height: 200 }} keyboardShouldPersistTaps="handled">
                    {tellersCoord.map((list, index) => {
                      const displayName = String(list.email).split('@')[0];
                      const bgColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;
                      return (
                        <Animated.View
                          key={list.id}
                          entering={FadeInDown.delay(index * 100).duration(500)}
                          style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 1, backgroundColor: collector === list.email ? COLORS.primary : bgColor }}
                        >
                          <TouchableOpacity
                            onLongPress={() => handleDoublePress(list)}
                            onPress={() => handleSelectCollector(list)}
                            style={{ width: '80%', paddingVertical: 1, justifyContent: 'center' }}
                          >
                            <Text style={{ fontSize: 16, fontWeight: '500', color: collector === list.email ? COLORS.white : COLORS.black900, paddingLeft: 10 }}>
                              {displayName}
                            </Text>
                          </TouchableOpacity>

                          {selUser?.role === 'coordinator' && selUser?.is_admin && (
                            <View style={{ width: '20%', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
                              <TouchableOpacity
                                disabled={!list.device_id}
                                style={{ width: '10%', opacity: list.device_id ? 1 : 0.5 }}
                                onPress={() => {
                                  dispatch({ type: OPEN_CONFIRMATION_MODAL, payload: 'update_user' });
                                  setUserToUpdate({ ...list, actionType: 'revoke session' });
                                }}
                              >
                                <Image source={icons.revokeDevice} style={{ height: 24, width: 24, resizeMode: 'contain' }} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={{ width: '10%' }}
                                onPress={() => {
                                  dispatch({ type: OPEN_CONFIRMATION_MODAL, payload: 'update_user' });
                                  setUserToUpdate({ ...list, actionType: 'deactivate' });
                                }}
                              >
                                <Image source={icons.deactivate_account} style={{ height: 26, width: 26, resizeMode: 'contain', tintColor: COLORS.red }} />
                              </TouchableOpacity>
                            </View>
                          )}
                        </Animated.View>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )
            }
          </>
        ) : <View></View>} 
        
        
        {/* Preferences */}
         {(selUser?.role === 'coordinator' && selUser?.is_admin && ableToViewMap) ? (
          <>
            <Text style={{ padding: 6, color: COLORS.primary, fontSize: 12, fontWeight: '500', marginTop: 10 }}>Preferences</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MapScreen')}>
              <View style={{ padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.gray600, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: 'bold' }}>Map Users</Text>
                <Image source={icons.go} style={{ height: 15, width: 15, tintColor: COLORS.black900 }} />
              </View>
            </TouchableOpacity>
          </>
        ) : <View></View>}  
      </ScrollView>

      {/* Fixed Logout */}
      <View style={{ position: 'absolute', bottom: 20, left: 0, right: 0, padding: 10 }}>
          <TouchableOpacity onPress={forceSync} style={{ marginBottom: 10 }}>
          <View style={{ backgroundColor: COLORS.gray400, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>Force Sync</Text>
          </View>
        </TouchableOpacity>
                  <TouchableOpacity onPress={fullResync} style={{ marginBottom: 10 }}>
          <View style={{ backgroundColor: COLORS.gray400, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>Sync Bettings</Text>
          </View>
        </TouchableOpacity>
                  <TouchableOpacity onPress={exportDatabase} style={{ marginBottom: 10 }}>
          <View style={{ backgroundColor: COLORS.gray400, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>Export DB</Text>
          </View>
        </TouchableOpacity>
                <TouchableOpacity onPress={clearAllStorage} style={{ marginBottom: 10 }}>
          <View style={{ backgroundColor: COLORS.gray400, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>Clear Async Storage</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={{ marginBottom: 10 }}>
          <View style={{ backgroundColor: COLORS.gray400, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>Delete DB</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={signOut}>
          <View style={{ backgroundColor: COLORS.gray400, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
