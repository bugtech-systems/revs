import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { COLORS, icons } from '../constants';
import { useSelector } from 'react-redux';
import { fetchUser } from '../utils/offlineSync';
import supabase from '../utils/supabaseClient';

const CustomDrawerIcon = ({ route, navigation, navType, headerTitle }) => {
  const {user, selectedUser, collector} = useSelector(({user}) => user);
  const [ownUser, setOwnUser] = useState(null);
  const [displayName, setDisplayName] = useState('');


  console.log(collector, "SELECTED")

  // // Load local user first (offline-first)
  useEffect(() => {
    (async () => {
      let localUser = await fetchUser(user?.email);

      if (!localUser) {
        // Fallback: fetch from Supabase online
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', user?.email)
          // .single();
        if (!error && data) localUser = data[0];
      }

      if (localUser) {
        setOwnUser(localUser);
        setDisplayName(String(user?.email).split('@')[0].toUpperCase());
      }
    })();
  }, [user]);

  // // Subscribe to Supabase realtime updates (offline-first sync)

  const onHeaderPress = () => {
    if (!ownUser) return;

    const mapConfig = ownUser.configuration?.find(c => c.key === 'map_users');

    if (mapConfig?.is_check) {
      navigation.navigate('MapScreen', { collector: ownUser.email });
    } else {
      navigation.navigate('Settings');
    }
  };





  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <TouchableOpacity
        onPress={() => (navType === 'drawer' ? navigation.openDrawer() : navigation.goBack())}
        style={{ marginLeft: 10, width: 30, alignItems: 'center', justifyContent: 'center' }}
      >
        <Image
          source={navType === 'drawer' ? icons.drawer : icons.backHeader}
          style={{
            height: 25,
            width: '100%',
            tintColor: route ? COLORS.white : COLORS.black,
          }}
        />
      </TouchableOpacity>

      <View style={{ paddingHorizontal: 10, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
        <Text style={{ color: route ? COLORS.white : COLORS.black, fontSize: 20, fontWeight: '500' }}>
          {headerTitle}
        </Text>

        <TouchableOpacity
          onLongPress={() => {
            if (user?.is_admin) {
              Alert.alert('Admin', `View user: ${JSON.stringify(selectedUser)}`);
            } else {
              console.log('Not admin');
            }
          }}
          onPress={onHeaderPress}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: route ? COLORS.white : COLORS.primary }}>
            {displayName}
          </Text>

          {(collector && user?.email != collector) && (
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.primary }}>
              {' / ' + String(collector).split('@')[0].toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CustomDrawerIcon;
