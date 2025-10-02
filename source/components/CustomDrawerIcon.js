import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import supabase from '../utils/supabaseClient';
import { getLocalUser } from '../utils/db'; // SQLite helper for offline-first
import { COLORS, icons } from '../constants';
import { useSelector } from 'react-redux';

const CustomDrawerIcon = ({ route, navigation, navType, selectedUser, headerTitle }) => {
  const [ownUser, setOwnUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const collector = useSelector(state => state.user.collector);

  // Load local user first (offline-first)
  useEffect(() => {
    (async () => {
      let localUser = await getLocalUser(collector);

      if (!localUser) {
        // Fallback: fetch from Supabase online
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', collector)
          .single();
        if (!error && data) localUser = data;
      }

      if (localUser) {
        setOwnUser(localUser);
        setDisplayName(localUser.email.split('@')[0]);
      }
    })();
  }, [collector]);

  // Subscribe to Supabase realtime updates (offline-first sync)
  useEffect(() => {
    if (!collector) return;

    const channel = supabase
      .channel(`users:email=eq.${collector}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `email=eq.${collector}` }, payload => {
        setOwnUser(payload.new);
        setDisplayName(payload.new.email.split('@')[0]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [collector]);

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
            if (ownUser?.is_admin) {
              Alert.alert('Admin', `View user: ${JSON.stringify(ownUser)}`);
            } else {
              console.log('Not admin');
            }
          }}
          onPress={onHeaderPress}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: route ? COLORS.white : COLORS.primary }}>
            {String(displayName).toUpperCase()}
          </Text>

          {selectedUser && (
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.primary }}>
              {' / ' + String(selectedUser).split('@')[0].toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CustomDrawerIcon;
