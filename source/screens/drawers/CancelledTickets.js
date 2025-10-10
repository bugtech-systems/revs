import { 
  FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, 
  View, RefreshControl, Platform 
} from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import moment from 'moment-timezone';
import DateTimePicker from '@react-native-community/datetimepicker';
import SelectDropdown from 'react-native-select-dropdown';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import SQLite from 'react-native-sqlite-storage';
import { COLORS, icons } from '../../constants';
import { formatNumberWithComma, getConfiguration, getDayRange } from '../../utils/helpers';
import supabase from '../../utils/supabaseClient';
// import { useOffline } from '../../context/OfflineProvider';
import { Switch } from 'react-native';
import { api } from '../../utils/offlineSync';

// Open SQLite database
const db = SQLite.openDatabase({ name: 'local.db', location: 'default' });

const drawTimes = [
  { id: 0, name: 'All Time' },
  { id: 1, name: '2pm' },
  { id: 2, name: '5pm' },
  { id: 3, name: '9pm' },
];

const CancelledTickets = ({ navigation }) => {
  const { selectedUser, user } = useSelector(({ user }) => user);
  // const { api, dataVersion, bumpVersion } = useOffline();
  const [date, setDate] = useState(new Date());
  const [show, setShowDate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTime, setFilterTime] = useState(drawTimes[0].name);
  const [includeAll, setIncludeAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const userNow = selectedUser ? selectedUser.id : user.id;

  // const { start_of_day, end_of_day  } = getDayRange(date);

// Local timezone start and end of day (if you prefer local)


  
  const load = async () => {
    console.log(date, 'LOOOADED')
    const { start_of_day, end_of_day  } = getDayRange(date)
    // Start and end of the day
    
  console.log(start_of_day, end_of_day, 'date range')
    
    let filters = {
      is_deleted: true,
      input_type: "normal"
    }
    // filters.is_deleted = false;
    if (includeAll) {
  filters = {
    ...filters,
    uplines: { op: "contains", value: [userNow] },
    timestamp: { op: "between", from: start_of_day, to: end_of_day },
  };
} else {
  filters = {
    ...filters,
    owner_id: userNow,
    timestamp: { op: "between", from: start_of_day, to: end_of_day },
  };
}



      let localBettings = await api.listBettings({
        filters: {...filters, input_type: 'normal'},
        orderBy: 'created_at DESC',
        // limit: 20,
      });

    
      setFilteredData(localBettings);
      setLoading(false);
    };

  // useEffect(() => {
  //   const load = async () => {
  //     try {
  //       setLoading(true);

  //       // Get start and end of selected day using moment
  //       // const start_of_day = moment(date).startOf('day').toISOString();
  //       // const end_of_day = moment(date).endOf('day').toISOString();

  //       console.log('Date Range:', start_of_day, end_of_day);

  //       // Filters for bettings belonging to the current user
  //       // and not deleted, within the selected day
  //       const filters = {
  //         owner_id: user?.id,
  //         is_deleted: true,
  //         timestamp: { op: 'between', from: start_of_day, to: end_of_day },
  //       };

  //       console.log('Filters:', filters);

  //       // Query local bettings with filtering + sorting
  //       const localBettings = await api.listBettings({
  //         filters,
  //         orderBy: 'created_at DESC',
  //         limit: 20,
  //       });

  //       console.log('Loaded Bettings:', localBettings);

  //       setFilteredData(localBettings);
  //     } catch (error) {
  //       console.error('Error loading bettings:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   load();
  // }, [date, user, dataVersion]);
    

  useEffect(() => {
  (async () => {
     await load()
  })()
  }, [date, userNow, filterTime, includeAll]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    setTimeout(() => {
      load()
      // bumpVersion();
      setSearchQuery('');
      // setFilteredData(items)
      setLoading(false);
    setRefreshing(false);
    }, 2000);
  }, [date, userNow, includeAll]);

  // --- UI Components ---
  const renderHeader = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
      <TouchableOpacity
        activeOpacity={.9}
        onPress={() => setShowDate(true)}
        style={styles.headerButton}>
        <View style={styles.headerButtonInner}>
          <Text style={styles.headerDate}>{moment(date).format('MM/DD/YYYY')}</Text>
          <Image source={icons.calendar} style={styles.headerIcon} />
        </View>
      </TouchableOpacity>
      <SelectDropdown
        data={drawTimes}
        onSelect={(selectedItem) => setFilterTime(selectedItem.name)}
        defaultValueByIndex={0}
        renderButton={(selectedItem) => (
          <TouchableOpacity style={styles.headerButton}>
            <View style={styles.headerButtonInner}>
              <Text style={styles.headerDate}>{filterTime.toUpperCase()}</Text>
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

  const renderSearchInput = () => (
    <TouchableOpacity style={styles.searchBox}>
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder='Search by Ticket#'
        placeholderTextColor={COLORS.gray800}
        style={styles.searchInput}
      />
      <Image source={icons.search} style={styles.searchIcon} resizeMode='contain' />
    </TouchableOpacity>
  );

  const renderTicketList = (listData) => {
    const renderItem = ({ item, index }) => {
      let total = item.gross || 0;


      
      const backgroundColor = index % 2 === 0 ? COLORS.gray300 : COLORS.gray200;

      return (
        <Animated.View entering={FadeInDown.delay(index * 100).duration(500)} exiting={FadeOutDown.delay(index * 100).duration(500)}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ViewTicket', JSON.stringify(item))}
            style={{ paddingLeft: 10, backgroundColor: backgroundColor, width: '100%', flexDirection: 'row', paddingVertical: 14, justifyContent: 'space-around', alignItems: 'flex-start' }}
          >
            {/* <Text style={styles.ticketCol}> */}
            <Text style={{ textAlign: 'left', fontSize: 18, width: '30%', color: COLORS.black, }}>
              {item.ticket_no}
            </Text>
            {/* <Text style={[styles.ticketCol, { fontWeight: 'bold', color: item.game_time === '2pm' ? '#3897e7' : item.game_time === '5pm' ? '#ff9d3e' : COLORS.black }]}> */}
            <Text style={{ textAlign: 'left', fontSize: 18, width: '30%', fontWeight: 'bold', color: item.game_time == '2pm' ? '#3897e7' : item.game_time == '5pm' ? '#ff9d3e' : item.game_time == '9pm' ? COLORS.black600 : null }}>
              {String(item.game_time).toUpperCase()}
            </Text>
            {/* <Text style={styles.ticketCol}> */}
            <Text style={{ textAlign: 'left', width: '30%', fontSize: 18, color: COLORS.black, }}>
              ₱{formatNumberWithComma(total)} {item.input_type === 'sold' ? `(SO)` : ''}
            </Text>
            <View style={{ width: '10%', alignItems: 'center', justifyContent: 'center' }}>
                          {
            
                            (item?.isComplete && !item?.isValidated)
                            &&
                            <Image
                              source={icons.exclamation}
                              style={{ height: 15, width: 15, resizeMode: 'contain', tintColor: COLORS.warningBorderColor }}
                            />
                          }
                        </View>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    return (
      <>
      <View style={{ paddingLeft: 10, width: '100%', flexDirection: 'row', borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, color: COLORS.black, justifyContent: 'flex-start', backgroundColor: COLORS.gray400, alignItems: 'flex-start' }}>
          <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16, width: '30%' }}>
            Ticket#
          </Text>
          <Text style={{ textAlign: 'left', width: '30%', fontWeight: 'bold', color: COLORS.black, fontSize: 16, }}>
            GAME TIME
          </Text>
          <Text style={{ textAlign: 'left', width: '30%', fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>
            AMOUNT
          </Text>
        </View>
      <FlatList
        data={listData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No records found.</Text>}
        ListFooterComponent={
            listData.length > 0 &&
            <View style={{ padding: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
                End of results.
              </Text>
            </View>
          }
      />
      </>
    );
  };

  console.log(filteredData, "FILTERED")

    let filteredList = filterTime == 'All Time' ? filteredData : filteredData.filter(a => a.game_time == filterTime);
  filteredList = searchQuery ? filteredData.filter(a => String(a.ticket_no).includes(String(searchQuery))) : filteredList
  let totalGross = filteredList.reduce((n, { gross }) => n + gross, 0);
  
  
  return (
  <>
    <SafeAreaProvider style={styles.wrapper}>
      {renderHeader()}
      {renderSearchInput()}
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDate(false);
            if (event?.type === 'set') setDate(selectedDate);
          }}
        />
      )}
        <View style={{ paddingLeft: 10, paddingTop: 10, marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, flexDirection: 'column', width: '30%', }}>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16}}>Total Tickets</Text>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(filteredList.length)}</Text>

          </View>
          <View style={{ flex: 1, flexDirection: 'column', width: '30%', }}>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16}}>Total Amount</Text>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(totalGross)}</Text>
          </View>
          
          {(selectedUser && selectedUser?.role !== 'teller' && getConfiguration(selectedUser, 'showAllData')?.isCheck) &&
                    <View style={{ width: '30%', alignItems: 'flex-end', flexDirection: 'column' }}>
                      <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10}}>
                      <Text style={{ color: COLORS.black900, fontSize: 12, fontWeight: 'bold' }}>Show All</Text>
                    <Switch
                        trackColor={{ true: '#00ED64' }}
                        onValueChange={() => {
                        console.log(!includeAll)
                          setIncludeAll(!includeAll);
                        }}
                        value={includeAll}
                      />   
                    </View>
                      </View>
                   
                    }
          
        </View>
      {renderTicketList(filteredList)}
    </SafeAreaProvider>
    </>
  );
};

export default CancelledTickets;

const styles = StyleSheet.create({
  wrapper: { flex: 1, padding: 10, backgroundColor: COLORS.gray300 },
  headerButton: { width: '48%', borderWidth: 1, borderRadius: 8, backgroundColor: COLORS.white },
  headerButtonInner: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 5 },
  headerDate: { fontSize: 20, color: COLORS.black, fontWeight: '500' },
  headerIcon: { height: 30, width: 30, tintColor: COLORS.black },
  searchBox: { flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 1, borderRadius: 6, marginTop: 10, backgroundColor: COLORS.white },
  searchInput: { height: 40, paddingLeft: 10, width: '90%', color: COLORS.black },
  searchIcon: { height: 20, width: 20 },
  ticketRow: { flexDirection: 'row', padding: 12, justifyContent: 'space-between' },
  ticketCol: { fontSize: 18, width: '30%', color: COLORS.black, textAlign: 'left' },
  emptyText: { textAlign: 'center', fontSize: 14, color: COLORS.gray600, marginTop: 20 },
  dropdownMenuStyle: { backgroundColor: '#E9ECEF', borderRadius: 8 },
  dropdownItemStyle: { padding: 10 },
  dropdownItemTxtStyle: { fontSize: 16, fontWeight: '500' }
});