import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SET_SUMMARIZED_USER } from '../../redux/actions/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import moment from 'moment-timezone';
import NetInfo from "@react-native-community/netinfo";
// import { supabase } from '../../lib/supabaseClient'; // 🔹 your Supabase client
import { executeSql } from '../../utils/db';
import supabase from '../../utils/supabaseClient';
import { COLORS, icons } from '../../constants';

const CoordinatorsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { collector, user, selectedUser } = useSelector(({ user }) => user);

  const [usersCoord, setUsersCoord] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const today = moment().tz('Asia/Manila').toDate();

  // 🔹 Fetch coordinators (Supabase online / SQLite offline)
  const fetchCoordinators = async () => {
    try {
      const userNow = selectedUser ? selectedUser : collector;

      // check connectivity
      const net = await NetInfo.fetch();

      if (net.isConnected) {
        // ✅ Online → fetch from Supabase
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('is_deleted', false)
          .eq('role', 'coordinator')
          .eq('referral', userNow)
          .order('email', { ascending: true });

        if (error) throw error;

        setUsersCoord(data || []);

        // also update SQLite cache
        if (data && data.length > 0) {
          await executeSql("DELETE FROM users WHERE role = 'coordinator' AND referral = ?", [userNow]);
          for (let u of data) {
            await executeSql(
              `INSERT OR REPLACE INTO users 
                (_id, email, address, role, referral, is_deleted) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [u.id, u.email, u.address, u.role, u.referral, u.is_deleted ? 1 : 0]
            );
          }
        }
      } else {
        // 🚫 Offline → fallback to SQLite
        const result = await executeSql(
          "SELECT * FROM users WHERE is_deleted = 0 AND role = 'coordinator' AND referral = ? ORDER BY email ASC",
          [userNow]
        );
        const rows = [];
        for (let i = 0; i < result.rows.length; i++) {
          rows.push(result.rows.item(i));
        }
        setUsersCoord(rows);
      }
    } catch (err) {
      console.error("Error fetching coordinators:", err);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  function renderSearchInput() {
    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          borderWidth: 1,
          borderRadius: 6,
          borderColor: COLORS.white,
          marginVertical: 10,
          backgroundColor: COLORS.white,
          elevation: 2,
          shadowRadius: 6,
        }}
      >
        <TextInput
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search"
          placeholderTextColor={COLORS.gray800}
          style={{
            height: 40,
            paddingLeft: 10,
            width: '90%',
            color: COLORS.black,
          }}
        />
        <Image
          source={icons.search}
          style={{ height: '12%', width: '12%', padding: 10 }}
          resizeMode="contain"
        />
      </TouchableOpacity>
    );
  }

  // 🔹 Select collector → go to UserSummaryReport
  const handleSelectCollector = (val) => {
    dispatch({ type: SET_SUMMARIZED_USER, payload: val.email });
    navigation.navigate('UserSummaryReport', JSON.stringify({ collector: val.email }));
  };

  // 🔹 Navigate to View User
  const handleDoublePress = (val) => {
    if (user && user.isAdmin) {
      navigation.navigate('View User', JSON.stringify(val));
    } else {
      console.log('Not Admin');
    }
  };

  // 🔹 Navigate to Messenger (check if a conversation already exists)
  const handleMessageNavigation = async (recepientId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('is_deleted', false)
        .eq('recepient', recepientId)
        .eq('createdBy', user?._id);

      if (error) throw error;

      if (data && data.length > 0) {
        navigation.navigate('Messenger', JSON.stringify(data[0].id));
      } else {
        navigation.navigate('Messenger', JSON.stringify(recepientId));
      }
    } catch (err) {
      console.error("Error navigating to Messenger:", err);
    }
  };

  const renderItem = ({ item, index }) => {
    let displayName = String(item.email).split('@')[0];
    const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

    return (
      <Animated.View
        key={index}
        entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
      >
        <TouchableOpacity
          onLongPress={() => (user && user.isAdmin) ? handleDoublePress(item) : console.log('Not Admin')}
          onPress={() => handleSelectCollector(item)}
          style={{
            paddingVertical: 1,
            flexDirection: 'row',
            backgroundColor: backgroundColor,
            width: '100%',
          }}
        >
          <View
            style={{
              borderWidth: 1,
              borderColor: backgroundColor,
              padding: 10,
              flexDirection: 'column',
              alignItems: 'flex-start',
              paddingLeft: 10,
              width: '50%',
            }}
          >
            <Text style={{ fontSize: 18, color: COLORS.black900, fontWeight: '500' }}>
              {String(displayName).toUpperCase()}
            </Text>
            <Text style={{ fontWeight: '500', fontSize: 14, color: COLORS.darkGray2 }}>
              {item.address}
            </Text>
          </View>
          <View
            style={{
              width: '50%',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: 10,
              flexDirection: 'row',
            }}
          >
            <TouchableOpacity
              style={{ paddingHorizontal: 10 }}
              onPress={() => handleMessageNavigation(item._id)}
            >
              <Image
                source={icons.send_message}
                style={{ height: 35, width: 35, resizeMode: 'contain' }}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  useEffect(() => {
    fetchCoordinators();
  }, [collector, selectedUser]);

  let filteredList = usersCoord;
  filteredList = searchQuery
    ? filteredList.filter(
        (a) =>
          String(a.email).toLowerCase().includes(String(searchQuery).toLowerCase()) ||
          String(a.address).toLowerCase().includes(String(searchQuery).toLowerCase())
      )
    : filteredList;

  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: COLORS.gray300 }}>
      {renderSearchInput()}

      <FlatList
        data={filteredList}
        renderItem={renderItem}
        keyExtractor={(item, index) => index}
        scrollEnabled
        ListEmptyComponent={
          <View style={{ padding: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
              No records found.
            </Text>
          </View>
        }
        ListFooterComponent={
          filteredList.length > 0 && (
            <View style={{ padding: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
                End of results.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

export default CoordinatorsScreen;
