import { FlatList, Image, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl, Alert, Platform } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import moment from 'moment-timezone'
import { useSelector, useDispatch } from 'react-redux'
import { CLOSE_CONFIRMATION_MODAL, OPEN_CONFIRMATION_MODAL, SET_LOADING, STOP_LOADING } from '../../redux/actions/types';
import axios from 'axios';
import { COLORS, icons, SIZES } from '../../constants'
import Config from 'react-native-config';
import { formatNumberWithComma } from '../../utils/helpers';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import ConfirmationModal from '../../components/ConfirmationModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import SelectDropdown from 'react-native-select-dropdown'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import SQLite from 'react-native-sqlite-storage';

const drawTimes = [
  { id: 0, name: 'All Time' },
  { id: 1, name: '2pm' },
  { id: 2, name: '5pm' },
  { id: 3, name: '9pm' },
]

const db = SQLite.openDatabase({ name: 'localDB.db', location: 'default' });

const SoldOuts = ({ navigation }) => {
  const { collector, selectedUser } = useSelector(({ user }) => user);
  const { loading, confirmationModal } = useSelector(({ ui }) => ui);
  const dispatch = useDispatch();

  // Date & Time States
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [show, setShowDate] = useState(null);
  const [filterTime, setFilterTime] = useState(drawTimes[0].name);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Data States
  const [users, setUsers] = useState([]);
  const [draws, setDraws] = useState([]);
  const [items, setItems] = useState([]);

  // Derived States
  const [filteredData, setFilteredData] = useState([]);

  /** Fetch Users */
  const fetchUsers = async () => {
    const emailToFetch = selectedUser || collector;
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM Users WHERE email = ? LIMIT 1',
        [emailToFetch],
        (_, { rows }) => setUsers(rows.raw()),
        (t, error) => console.log('Error fetching users', error)
      );
    });
  };

  /** Fetch Draws */
  const fetchDraws = async () => {
    if (!users[0]) return;
    const startOfDay = moment(startDate).startOf('day').toISOString();
    const endOfDay = moment(endDate).endOf('day').toISOString();
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM Draws WHERE drawDate >= ? AND drawDate <= ? ORDER BY drawDate ASC`,
        [startOfDay, endOfDay],
        (_, { rows }) => setDraws(rows.raw()),
        (t, error) => console.log('Error fetching draws', error)
      );
    });
  };

  /** Fetch Items */
  const fetchItems = async () => {
    if (!users[0]) return;
    const startOfDay = moment(startDate).startOf('day').toISOString();
    const endOfDay = moment(endDate).endOf('day').toISOString();
    const ownerId = users[0]._id;

    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM Betting WHERE isDeleted = 0 AND inputType = 'sold' AND timestamp >= ? AND timestamp <= ? AND owner_id = ? ORDER BY timestamp DESC`,
        [startOfDay, endOfDay, ownerId],
        (_, { rows }) => setItems(rows.raw()),
        (t, error) => console.log('Error fetching items', error)
      );
    });
  };

  /** Filtered Data */
  useEffect(() => {
    let filteredList = filterTime === 'All Time' ? items : items.filter(a => a.gameTime === filterTime);
    if (searchQuery) {
      filteredList = filteredList.filter(a => String(a.ticketNo).includes(String(searchQuery)));
    }
    setFilteredData(filteredList);
  }, [items, filterTime, searchQuery]);

  /** Fetch data whenever user or date changes */
  useEffect(() => {
    fetchUsers();
  }, [collector, selectedUser]);

  useEffect(() => {
    fetchDraws();
    fetchItems();
  }, [users, startDate, endDate]);

  /** Handle Refresh */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      fetchDraws();
      fetchItems();
      setSearchQuery('');
      setRefreshing(false);
    }, 2000);
  }, [users, startDate, endDate]);

  /** Handle Sold Out */
  const getTimeRange = () => {
    const card2pm = draws.find(a => a.gameTime === '2pm');
    const card5pm = draws.find(a => a.gameTime === '5pm');
    const card9pm = draws.find(a => a.gameTime === '9pm');

    if (!card2pm && !card5pm && !card9pm) return '2pm';
    if (card2pm && !card5pm) return '5pm';
    if (card5pm && !card9pm) return '9pm';
    return '';
  };

  const handleSoldOut = async () => {
    if (!users[0]) return;
    const { email } = users[0];
    const gameTime = getTimeRange();

    if (!gameTime) return;

    dispatch({ type: SET_LOADING });

    try {
      const res = await axios.get(`${Config.API_URL}/apiv2/v1/bettings/soldout?gameTime=${gameTime}&email=${email}`);
      if (!res.data.success) Alert.alert('No Sold-out Available');
    } catch (err) {
      console.log(err);
      Alert.alert('Something Went Wrong!');
    } finally {
      dispatch({ type: STOP_LOADING });
    }
  };

  /** Date Picker */
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || startDate;
    if (show === 'start') {
      if (event?.type === 'neutralButtonPressed') setStartDate(new Date());
      else if (event?.type === 'set') setStartDate(currentDate);
    } else {
      if (event?.type === 'neutralButtonPressed') setEndDate(new Date());
      else if (event?.type === 'set') setEndDate(currentDate);
    }
    setShowDate(Platform.OS === 'ios' ? true : null);
  };

  const showDatePicker = val => setShowDate(val);

  const handleTimeSelect = item => setFilterTime(item);

  /** UI Render Functions */
  function renderHeader() {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
        <TouchableOpacity onPress={() => showDatePicker('start')} activeOpacity={0.9} style={{ width: '48%' }}>
          <View style={{ height: 40, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 4, shadowRadius: SIZES.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, width: '100%', padding: 5 }}>
            <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{moment(startDate).format('MM/DD/YYYY')}</Text>
            <Image source={icons.calendar} style={{ height: 30, width: 30, tintColor: COLORS.black }} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => showDatePicker('end')} activeOpacity={0.9} style={{ width: '48%' }}>
          <View style={{ height: 40, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 4, shadowRadius: SIZES.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, width: '100%', padding: 5 }}>
            <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{moment(endDate).format('MM/DD/YYYY')}</Text>
            <Image source={icons.calendar} style={{ height: 30, width: 30, tintColor: COLORS.black }} />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSearchInput() {
    return (
      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '48%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by Ticket#"
            placeholderTextColor={COLORS.gray800}
            style={{ height: 40, paddingLeft: 10, width: '90%', color: COLORS.black }}
          />
          <View style={{ padding: 4 }}>
            <Image source={icons.search} style={{ height: 25, width: 25, resizeMode: 'contain' }} resizeMode="contain" />
          </View>
        </TouchableOpacity>

        <SelectDropdown
          data={drawTimes}
          onSelect={(selectedItem) => handleTimeSelect(selectedItem.name)}
          defaultValueByIndex={0}
          renderButton={(selectedItem, isOpened) => (
            <TouchableOpacity style={{ width: '48%', alignItems: 'center', justifyContent: 'center', borderColor: COLORS.gray600, borderWidth: 1, borderRadius: 8, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }}>
              <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: 10 }}>
                <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{filterTime !== '' ? String(filterTime).toUpperCase() : 'Select Time'}</Text>
              </View>
            </TouchableOpacity>
          )}
          renderItem={(item, index, isSelected) => (
            <View style={{ ...styles.dropdownItemStyle, ...(isSelected && { backgroundColor: '#D2D9DF' }) }}>
              <Text style={styles.dropdownItemTxtStyle}>{item.name}</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          dropdownStyle={styles.dropdownMenuStyle}
        />
      </View>
    );
  }

  function renderTickerList(listData) {
    const renderItem = ({ item, index }) => {
      let total = 0;
      item?.combinations?.forEach(data => total += data.amount);
      const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

      return (
        <Animated.View entering={FadeInDown.delay(index * 100).duration(500)} exiting={FadeOutDown.delay(index * 100).duration(500)}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ViewSoldOut', JSON.stringify(item))}
            style={{ paddingHorizontal: SIZES.padding, borderColor: COLORS.gray600, width: '100%', flexDirection: 'row', paddingVertical: SIZES.padding * 2, alignItems: 'flex-start', justifyContent: 'space-around', backgroundColor: backgroundColor }}
          >
            <Text style={{ fontWeight: '600', fontSize: 18, width: '33%', textAlign: 'left', color: COLORS.black600, overflow: 'hidden' }}>
              {moment(item?.timestamp).format('MMM DD, YYYY hh:mm A')}
            </Text>
            <Text style={{ textAlign: 'center', paddingRight: 10, fontSize: 18, width: '33%', fontWeight: 'bold', color: item.gameTime == '2pm' ? '#3897e7'
: item.gameTime == '5pm' ? '#ff9f1c' : '#2ec4b6' }}>
              {item.gameTime?.toUpperCase()}
            </Text>
            <Text style={{ textAlign: 'right', fontSize: 18, width: '33%', fontWeight: 'bold', color: COLORS.black }}>
              {formatNumberWithComma(total)}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    return (
      <FlatList
        data={listData}
        keyExtractor={(item, index) => `${item._id}_${index}`}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    );
  }

  
  let filteredList = filterTime == 'All Time' ? items : items.filter(a => a.gameTime == filterTime);
  filteredList = searchQuery ? items.filter(a => String(a.ticketNo).includes(String(searchQuery))) : filteredList

  let totalGross = filteredList.reduce((n, { gross }) => n + gross, 0);
  let totalWins = filteredList.reduce((n, { winning }) => n + winning, 0);

  let totalWinsDummy = 3.34


  return (
  <SafeAreaProvider>
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.lightGray }}>
      <View style={{ flex: 1, padding: SIZES.padding }}>
        {renderHeader()}
        {renderSearchInput()}

        <View style={{ height: 50, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 10, marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
            <Text style={styles.fontsHeader}>Total Gross</Text>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(totalGross)}</Text>
          </View>
          <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
            <Text style={styles.fontsHeader}>Total Hits</Text>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{Number(totalWins).toFixed(2)}</Text>
          </View>
        </View>

        {/* Ticker list */}
        <View style={{ flex: 1 }}>
          {renderTickerList(filteredData)}
        </View>

        {/* Date Picker */}
        {show && (
          <DateTimePicker
            value={show === 'start' ? startDate : endDate}
            mode="date"
            display="default"
            onChange={onChangeDate}
            maximumDate={new Date()}
          />
        )}

        {confirmationModal?.isVisible && (
          <ConfirmationModal
            title={confirmationModal?.title}
            message={confirmationModal?.message}
            onConfirm={confirmationModal?.onConfirm}
            onCancel={() => dispatch({ type: CLOSE_CONFIRMATION_MODAL })}
          />
        )}
      </View>

      {/* Sold Out Button fixed at bottom */}
      <TouchableOpacity
        onPress={handleSoldOut}
        style={{
          position: 'absolute',
          bottom: 20,
          left: SIZES.padding,
          right: SIZES.padding,
          padding: 12,
          backgroundColor: COLORS.primary,
          borderRadius: 8,
          alignItems: 'center',
          elevation: 4,
          shadowRadius: 4,
        }}
      >
        <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 18 }}>Sold Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  dropdownMenuStyle: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    elevation: 2,
    shadowRadius: 4,
  },
  dropdownItemStyle: {
    padding: 10,
  },
  dropdownItemTxtStyle: {
    fontSize: 16,
    color: COLORS.black,
  },
  
});

export default SoldOuts;