import { FlatList, Image, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl, Alert, Platform } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import moment from 'moment-timezone'
import { useSelector, useDispatch } from 'react-redux'
import { CLOSE_CONFIRMATION_MODAL, OPEN_CONFIRMATION_MODAL, SET_LOADING, STOP_LOADING } from '../../redux/actions/types';
import axios from 'axios';
import { COLORS, icons, SIZES } from '../../constants'
import { formatNumberWithComma, getDayRange } from '../../utils/helpers';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import ConfirmationModal from '../../components/ConfirmationModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import SelectDropdown from 'react-native-select-dropdown'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { api } from '../../utils/offlineSync';
import { useSync } from '../../context/SyncContext';


const drawTimes = [
  { id: 0, name: 'All Time' },
  { id: 1, name: '2pm' },
  { id: 2, name: '5pm' },
  { id: 3, name: '9pm' },
]


const SoldOuts = ({ navigation }) => {
  const {  lastSync } = useSync();
  const { selectedUser, user } = useSelector(({ user }) => user);
  const { confirmationModal } = useSelector(({ ui }) => ui);
  const dispatch = useDispatch();

  // Date & Time States
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [show, setShowDate] = useState(null);
  const [filterTime, setFilterTime] = useState(drawTimes[0].name);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [rnd, setRnd] = useState(null);
  const [loading, setLoading] = useState(false);

  // Data States
  const [draws, setDraws] = useState([]);
  const [items, setItems] = useState([]);

  // Derived States
  const [filteredData, setFilteredData] = useState([]);
  const ownUser = selectedUser?.id ? selectedUser?.id : user?.id

  /** Fetch Users */


  /** Fetch Draws */


  /** Fetch Items */
  const fetchItems = useCallback(async () => {
    if (!ownUser) return;
    
    const { start_of_day, end_of_day  } = getDayRange(startDate, endDate)

    // Start and end of the day
    
  // console.log(start_of_day, end_of_day, 'date range')
    
    let filters = {
        timestamp: { op: "between", from: start_of_day, to: end_of_day },
        input_type: 'sold',
        is_deleted: false
    }




      let localBettings = await api.listBettings({
        filters: filters,
        orderBy: 'created_at DESC',
        // limit: 20,
      });
      

      setItems(localBettings);
      // setLoading(false);

  }, [startDate, endDate,  ownUser, rnd, lastSync]);


  const fetchDraws = useCallback(async () => {
    if (!ownUser) return;
    
    const { start_of_day, end_of_day  } = getDayRange(new Date(), new Date())

    // Start and end of the day
    
  // console.log(start_of_day, end_of_day, 'date range')
    





      
          let localDraws = await api.listDraws({
             filters: { 
              draw_date:  { 
                 op: "between",
              from: start_of_day,
              to: end_of_day,
              }}
            });

    
      setDraws(localDraws)
      // setLoading(false);

  }, [startDate, endDate,  ownUser, rnd, lastSync]);


  /** Filtered Data */
  useEffect(() => {
    let filteredList = filterTime === 'All Time' ? items : items.filter(a => a.game_time === filterTime);
    if (searchQuery) {
      filteredList = filteredList.filter(a => String(a.ticket_no).includes(String(searchQuery)));
    }
    setFilteredData(filteredList);
  }, [items, filterTime, searchQuery, lastSync]);

  useEffect(() => {
    fetchDraws();
    fetchItems();
  }, [selectedUser, startDate, endDate, rnd, lastSync]);

  /** Handle Refresh */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      // fetchDraws();
      setRnd(Math.random())
      fetchItems();
      setSearchQuery('');
      setRefreshing(false);
    }, 2000);
  }, [startDate, endDate, lastSync]);

  /** Handle Sold Out */
  const getTimeRange = () => {
    const card2pm = draws.find(a => a.game_time === '2pm');
    const card5pm = draws.find(a => a.game_time === '5pm');
    const card9pm = draws.find(a => a.game_time === '9pm');
console.log(card2pm, card5pm, card2pm, 'ggddr')

    if (!card2pm && !card5pm && !card9pm) return '2pm';
    if (card2pm && !card5pm) return '5pm';
    if (card5pm && !card9pm) return '9pm';
    return '';
  };

  const handleSoldOut = async () => {
    setLoading(true)
    console.log('HANDLE SOLDOUT')
    if (!selectedUser) return;
    const { email } = selectedUser;
    const gameTime = getTimeRange();
console.log(gameTime, 'GME')
    if (!gameTime) return;

    dispatch({ type: SET_LOADING });

    try {
    
      const res = await axios.get(`https://sharewin.pro/apiv2/v1/bettingsv2/soldout?gameTime=${gameTime}&email=${email}`);
      setRnd(Math.random());
      await fetchItems();
      if (!res.data.success) Alert.alert('No Sold-out Available');
      
    } catch (err) {
      console.log(err);
      Alert.alert('Something Went Wrong!');
    } finally {
      setRnd(Math.random());
      dispatch({ type: STOP_LOADING });
      setLoading(false)
      await fetchItems()
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
      let total = item?.combinations?.reduce((n, { amount }) => Number(n) + Number(amount), 0)
      const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

      return (
        <Animated.View entering={FadeInDown.delay(index * 100).duration(500)} exiting={FadeOutDown.delay(index * 100).duration(500)}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ViewSoldOut', JSON.stringify(item))}
            style={{ paddingHorizontal: SIZES.padding, borderColor: COLORS.gray600, width: '100%', flexDirection: 'row', paddingVertical: SIZES.padding * 2, alignItems: 'flex-start', justifyContent: 'space-around', backgroundColor: backgroundColor }}
          >
            <Text style={{ fontWeight: '600', fontSize: 15, width: '40%', textAlign: 'left', color: COLORS.black600, overflow: 'hidden' }}>
              {moment(item.timestamp).tz("Asia/Manila").format('MM-DD-YYYY hh:mm a')}
            </Text>
            <Text style={{width: '30%', textAlign: 'center', paddingRight: 10, fontSize: 18, width: '33%', fontWeight: 'bold', color: item.game_time == '2pm' ? '#3897e7'
: item.game_time == '5pm' ? '#ff9f1c' : '#2ec4b6' }}>
              {item.game_time?.toUpperCase()}
            </Text>
            <Text style={{ textAlign: 'left', fontSize: 18, width: '20%', fontWeight: 'bold', color: COLORS.black }}>
              {formatNumberWithComma(total)}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    return (
      <FlatList
        data={listData}
        keyExtractor={(item, index) => `${item.id}_${index}`}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    );
  }

  
  let filteredList = filterTime == 'All Time' ? items : items.filter(a => a.game_time == filterTime);
  filteredList = searchQuery ? items.filter(a => String(a.ticket_no).includes(String(searchQuery))) : filteredList

  let totalGross = filteredList.reduce((n, { gross }) => Number(n) + Number(gross), 0);
  let totalWins = filteredList.reduce((n, { winning }) => Number(n) + Number(winning), 0);



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
        disabled={loading}
      >
        <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 18 }}>Sold Out </Text>
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