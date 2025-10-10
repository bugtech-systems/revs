import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SET_SUMMARIZED_USER } from '../../redux/actions/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, icons, SIZES } from '../../constants';
// import { useOffline } from '../../context/OfflineProvider';
// import supabase from '../../utils/supabaseClient';

import { api } from '../../utils/offlineSync';

const TellersScreen = ({ navigation }) => {
    // const { api } = useOffline();
  const dispatch = useDispatch();
  const { collector, user, selectedUser } = useSelector(({ user }) => user);
  const [searchQuery, setSearchQuery] = useState('');
  const [userTeller, setUserTeller] = useState([]);

  const userNow = selectedUser || user;

  // 🔹 Load tellers
  const loadTellers = async () => {
    try {
      // const currentUser = await getUserByEmail(userNow);
      // const referralId = currentUser?._id || user._id;
      // const tellers = await getTellersByReferral(referralId);

      let filters = {};

  filters.is_deleted = false;
  filters.role = 'teller';
  filters.referral = userNow.id;

  const localTellers = await api.listUsers({
    filters: filters
  });
  console.log(userNow, "LOCAL COORDINATORS")

  if (localTellers) {
    setUserTeller(localTellers);
  }
    } catch (err) {
      console.error('Error loading tellers:', err);
    }
  };

  // 🔹 Handle messaging
  const handleMessageNavigation = async (recepientId) => {
    // try {
    //   const message = await getFirstMessage(recepientId, user?._id);
    //   navigation.navigate('Messenger', JSON.stringify(message?._id || recepientId));
    // } catch (err) {
    //   console.error('Error navigating to messages:', err);
    // }
    try {
    
         let data = await api.listMessages({
          filters: {is_deleted: false, recepient: recepientId, created_by: userNow.id}
       })



      if (data && data.length > 0) {
        navigation.navigate('Messenger', JSON.stringify(data[0].id));
      } else {
        navigation.navigate('Messenger', JSON.stringify(recepientId));
      }
    } catch (err) {
      console.error("Error navigating to Messenger:", err);
    }
  };

  const handleSelectCollector = (val) => {
    dispatch({ type: SET_SUMMARIZED_USER, payload: val.email });
    navigation.navigate('UserSummaryReport', JSON.stringify({ collector: val.email }));
  };

  const handleDoublePress = (val) => {
    navigation.navigate('View User', JSON.stringify(val));
  };

  const handleSearch = (query) => setSearchQuery(query);

  const renderSearchInput = () => (
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
        shadowRadius: 6
      }}
    >
      <TextInput
        value={searchQuery}
        onChangeText={handleSearch}
        placeholder="Search"
        placeholderTextColor={COLORS.gray800}
        style={{ height: 40, paddingLeft: 10, width: '90%', color: COLORS.black }}
      />
      <Image
        source={icons.search}
        style={{ height: '12%', width: '12%', padding: 10 }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );

  const renderItem = ({ item, index }) => {
    const displayName = String(item.email).split('@')[0];
    const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray200;

    return (
      <Animated.View key={index} entering={FadeInDown.delay(index * 100).duration(500)}>
        <TouchableOpacity
          onLongPress={() => (user?.is_admin ? handleDoublePress(item) : console.log('Not Admin'))}
          onPress={() => handleSelectCollector(item)}
          style={{ flexDirection: 'row', paddingVertical: 1, backgroundColor, width: '100%' }}
        >
          <View style={{ backgroundColor, borderRadius: SIZES.radius, padding: 10, flexDirection: 'column', alignItems: 'flex-start', width: '50%' }}>
            <Text style={{ fontSize: 18, color: COLORS.black900, fontWeight: 'bold' }}>
              {displayName.toUpperCase()}
            </Text>
            <Text style={{ fontWeight: '500', fontSize: 14, color: COLORS.darkGray2 }}>{item.address}</Text>
          </View>
          <View style={{ width: '50%', alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row', padding: 10 }}>
            <TouchableOpacity onPress={() => handleMessageNavigation(item.id)} style={{ paddingHorizontal: 10 }}>
              <Image source={icons.send_message} style={{ height: 35, width: 35, resizeMode: 'contain' }} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  useEffect(() => {
    loadTellers();
  }, [collector, selectedUser]);

  const filteredList = searchQuery
    ? userTeller.filter(a => String(a.email).toLowerCase().includes(searchQuery.toLowerCase()))
    : userTeller;

  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: COLORS.gray300 }}>
      {renderSearchInput()}
      <FlatList
        data={filteredList}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
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

export default TellersScreen;