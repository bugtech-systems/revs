import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    ScrollView,
    Alert,
    RefreshControl,   // ✅ ADD THIS
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DeviceInfo from 'react-native-device-info';
import moment from 'moment-timezone';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserByEmail, updateUser } from '../redux/actions/user.actions';
import { COLORS, SIZES } from '../constants';
import { getConfiguration } from '../utils/helpers';

// const DeviceCard = ({ item, onRemove }) => {

//     console.log(item, "THE ITEMS IN DEVICE CARD")
    
    
//     return (
//         <View style={styles.card}>
//             <View style={styles.cardHeader}>
//                 <View style={styles.row}>
//                     <Icon
//                         name={item.isCurrent ? 'desktop-outline' : 'phone-portrait-outline'}
//                         size={18}
//                         color="#4FC3F7"
//                     />
//                     <Text style={styles.cardTitle}>
//                         {item.isCurrent ? 'Current device' : 'Other device'}
//                     </Text>

//                     {item.isCurrent && (
//                         <Icon
//                             name="checkmark-circle"
//                             size={18}
//                             color="#4CAF50"
//                             style={{ marginLeft: 6 }}
//                         />
//                     )}
//                 </View>

//                 {!item.isCurrent && (
//                     <TouchableOpacity onPress={() => onRemove(item.id)}>
//                         <Icon name="trash-outline" size={18} color="#FF5252" />
//                     </TouchableOpacity>
//                 )}
//             </View>

//             <InfoRow label="Operating system" value={item.device_os} />
//             <InfoRow label="Device Name" value={item.device_name} />
//             <InfoRow label="System version" value={item.os_version} />
//             <InfoRow label="Equipment brand" value={item.device_brand} />
//             <InfoRow label="Device model" value={item.device_model} />
//             <InfoRow label="IP region" value={item.device_ip} />
//         </View>
//     );
// };


const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{String(value).toUpperCase()}</Text>
    </View>
);

export default LoginDevices = () => {
    const [deviceInfo, setDeviceInfo] = useState([]);
    const dispatch = useDispatch()
    const { selectedUser, user } = useSelector(({ user }) => user);
    const [latestUserData, setLatestUserData] = useState(null);
    const [allowedDevices, setAllowedDevices] = useState(1);
    const [refreshing, setRefreshing] = useState(false);

    const [devices, setDevices] = useState([]);
const [currentDeviceId, setCurrentDeviceId] = useState(null);

const onRefresh = async () => {
  try {
    setRefreshing(true);

    await fetchUser(); // 🔄 re-fetch updated login_devices

  } catch (error) {
    console.log('Refresh failed:', error);
  } finally {
    setRefreshing(false);
  }
};

const normalizeDevices = (login_devices) => {
  if (!login_devices) return [];

  // If already array → OK
  if (Array.isArray(login_devices)) return login_devices;

  // If string → parse JSON
  if (typeof login_devices === 'string') {
    try {
      const parsed = JSON.parse(login_devices);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const fetchUser = async () => {
  const user = await dispatch(fetchUserByEmail(selectedUser?.email));

  const parsedDevices = normalizeDevices(user?.login_devices);
  const allowedDevices = getConfiguration(user, 'allowedDevices')?.value;


  // Optional: map if you want to reshape
  const formattedDevices = parsedDevices.map((device) => ({
    id: device.id,
    device_ip: device.device_ip,
    device_os: device.device_os,
    os_version: device.os_version,
    device_name: device.device_name,
    device_brand: device.device_brand,
    device_model: device.device_model,
  }));

  setDevices(formattedDevices);
  setLatestUserData(user)
  setAllowedDevices(allowedDevices)
};

const handleRemoveDevice = async (deviceIdToRemove) => {
  try {
    // ❌ Prevent removing current device
    if (deviceIdToRemove == currentDeviceId) {
      Alert.alert(
        'Action not allowed',
        'You cannot remove the current device.'
      );
      return;
    }

    // 🔄 Get latest user (safe)
    // const freshUser = await dispatch(
    //   fetchUserByEmail(selectedUser?.email)
    // );

    const normalizedDevices = normalizeDevices(latestUserData.login_devices);

    // 🧹 Remove selected device COMPLETELY
    const updatedDevices = normalizedDevices.filter(
      (device) => device.id !== deviceIdToRemove
    );



    console.log(updatedDevices, "updatedDevicesupdatedDevicesupdatedDevicesupdatedDevicesupdatedDevices")
    
    // 💾 Update DB
    await dispatch(
      updateUser(latestUserData.id, {
        login_devices: updatedDevices,
      })
    );

    // ⚡ Update UI instantly
    setDevices(updatedDevices);

    Alert.alert('Device Removed', 'The device has been removed.');

  } catch (error) {
    console.log('Remove device failed:', error);
    Alert.alert('Error', 'Failed to remove device.');
  }
};


useEffect(() => {
  DeviceInfo.getUniqueId().then(setCurrentDeviceId);
}, []);

useEffect(() => {
  if (selectedUser) {
    fetchUser();
  }
}, [selectedUser]);
    


    
    
    return (
        <SafeAreaView style={{...styles.container, padding: 10 }}>
            {/* <FlatList
                data={selectedUser?.login_devices}
                keyExtractor={(item) => item.id}
                // renderItem={({ item }) => (
                //     <DeviceCard item={item} onRemove={handleRemoveDevice} />
                // )}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 100 }}
            /> */}
            

            <ScrollView contentContainerStyle={{ paddingHorizontal: 10 }}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[COLORS.secondary]} // Android
      tintColor={COLORS.secondary} // iOS
    />
  }

            >
                <View style={{ paddingHorizontal: 6, paddingVertical: 10, borderWidth: 1, borderRadius: 12, flexDirection: 'column', backgroundColor: '#ffffffff', borderColor: '#ffffffff', elevation: 2, marginBottom: SIZES.paddig,
                }}>
                            <View style={{ width: '100%', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 10}}>
                <View style={{ width: '40%'}}>
                    <Text style={{ ...styles.label, fontSize: 14, color: COLORS.secondary, fontWeight: '500', textAlign: 'left'}}>
                        ID:
                    </Text>
                </View>

                <View style={{ width: '60%'}}>
                    <Text style={{ fontSize: 15, color: COLORS.secondary, fontWeight: 'bold', textAlign: 'right'}}>
                        {currentDeviceId}
                    </Text>
                </View>
            </View>

            <View style={{ width: '100%', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 10}}>
                <View style={{ width: '60%'}}>
                    <Text style={{ ...styles.label, fontSize: 14, color: COLORS.secondary, fontWeight: '500', textAlign: 'left'}}>
                        ACCOUNT:
                    </Text>
                </View>

                <View style={{ width: '40%'}}>
                    <Text style={{ fontSize: 15, color: COLORS.secondary, fontWeight: 'bold', textAlign: 'right'}}>
                        {String(selectedUser.email).split('@')[0].toUpperCase()}
                    </Text>
                </View>
            </View>
            
            <View style={{ width: '100%', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 10}}>
                <View style={{ width: '60%'}}>
                    <Text style={{ ...styles.label, fontSize: 15, color: COLORS.secondary, fontWeight: '500', textAlign: 'left'}}>
                        Allowed Devices:
                    </Text>
                </View>

                <View style={{ width: '40%'}}>
                    <Text style={{ fontSize: 15, color: COLORS.secondary, fontWeight: 'bold', textAlign: 'right'}}>
                        {allowedDevices}
                    </Text>
                </View>

            </View>
            </View>

{devices.length === 0 ? (
  <View style={styles.emptyContainer}>
    <Icon
      name="shield-checkmark-outline"
      size={60}
      color={COLORS.secondaryTransparent}
    />

    <Text style={styles.emptyTitle}>
      No Devices Registered
    </Text>

    <Text style={styles.emptyText}>
      This account has not been used to log in on any device yet.
    </Text>

    <Text style={styles.emptySubText}>
      Once you sign in from a device, it will appear here for security monitoring.
    </Text>
  </View>
) : (
  [...devices]
    .sort((a, b) => {
      if (a.id === currentDeviceId) return -1;
      if (b.id === currentDeviceId) return 1;
      return 0;
    })
    .map((data) => {
      const isCurrent = data.id === currentDeviceId;

      return (
        <View key={data.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.row}>
              <Icon
                name="phone-portrait"
                size={18}
                color={COLORS.secondary}
              />

              <Text style={styles.cardTitle}>
                {isCurrent ? 'Current device' : 'Other device'}
              </Text>

              {isCurrent && (
                <Icon
                  name="checkmark-circle"
                  size={18}
                  color="#4CAF50"
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>

            {(!isCurrent &&
              user?.email == 'revs-haze@collector.com') && (
              <TouchableOpacity
                onPress={() => handleRemoveDevice(data.id)}
              >
                <Icon
                  name="trash-outline"
                  size={18}
                  color="#FF5252"
                />
              </TouchableOpacity>
            )}
          </View>

          <InfoRow label="Operating system" value={data.device_os} />
          <InfoRow label="Device Name" value={data.device_name} />
          <InfoRow label="OS version" value={data.os_version} />
          <InfoRow label="Equipment brand" value={data.device_brand} />
          <InfoRow label="Device model" value={data.device_model} />
          <InfoRow label="IP address" value={data.device_ip} />
        </View>
      );
    })
)}
</ScrollView>


            {/* <TouchableOpacity style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save Image</Text>
            </TouchableOpacity> */}
        </SafeAreaView>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: '#083B66',
        backgroundColor: '#f1f1f1',
        // paddingHorizontal: 16,
    },
    header: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginVertical: 12,
    },
    card: {
        backgroundColor: '#ffffffff',
        borderRadius: 10,
        elevation: 2,
        padding: 14,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        color: COLORS.secondary,
        fontWeight: '600',
        marginLeft: 6,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 3,
    },
    label: {
        color: COLORS.secondaryTransparent,
        fontWeight: '500',
        fontSize: 12,
    },
    value: {
        color: COLORS.secondary,
        fontSize: 12,
        maxWidth: '60%',
        textAlign: 'right',
        fontWeight: 'bold'
    },
    saveButton: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: '#4FC3F7',
        paddingVertical: 14,
        borderRadius: 8,
    },
    saveButtonText: {
        textAlign: 'center',
        fontWeight: '600',
        color: '#003B5C',
    },
    emptyContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 50,
},

emptyTitle: {
  marginTop: 15,
  fontSize: 16,
  fontWeight: '600',
  color: COLORS.secondary,
},

emptyText: {
  marginTop: 8,
  fontSize: 13,
  textAlign: 'center',
  color: COLORS.secondaryTransparent,
  paddingHorizontal: 20,
},

emptySubText: {
  marginTop: 4,
  fontSize: 12,
  textAlign: 'center',
  color: COLORS.secondaryTransparent,
  paddingHorizontal: 20,
},

refreshButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: COLORS.secondary,
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  marginTop: 20,
},

refreshButtonText: {
  color: '#fff',
  marginLeft: 6,
  fontSize: 13,
  fontWeight: '500',
},
});
