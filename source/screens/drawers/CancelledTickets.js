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
import { formatNumberWithComma } from '../../utils/helpers';
import supabase from '../../utils/supabaseClient';

// Open SQLite database
const db = SQLite.openDatabase({ name: 'local.db', location: 'default' });

const drawTimes = [
  { id: 0, name: 'All Time' },
  { id: 1, name: '2pm' },
  { id: 2, name: '5pm' },
  { id: 3, name: '9pm' },
];

const CancelledTickets = ({ navigation }) => {
  const { collector, selectedUser } = useSelector(({ user }) => user);

  const [date, setDate] = useState(new Date());
  const [show, setShowDate] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTime, setFilterTime] = useState(drawTimes[0].name);

  // --- Fetch Cancelled Tickets from SQLite ---
  const fetchTickets = useCallback(() => {
    const startOfDay = moment(date).startOf('day').toISOString();
    const endOfDay = moment(date).endOf('day').toISOString();

    db.transaction(tx => {
      let sql = `
        SELECT * FROM bettings
        WHERE is_deleted = 1 
        AND timestamp >= ? AND timestamp < ?
      `;
      let params = [startOfDay, endOfDay];

      if (!collector?.isAdmin) {
        sql += ` AND owner_id = ?`;
        params.push(collector?.id); // assumes collector has `id`
      }

      if (filterTime !== 'All Time') {
        sql += ` AND game_time = ?`;
        params.push(filterTime.toLowerCase());
      }

      if (searchQuery) {
        sql += ` AND ticketNo LIKE ?`;
        params.push(`%${searchQuery}%`);
      }

      sql += ` ORDER BY timestamp DESC`;

      tx.executeSql(sql, params, (txObj, { rows }) => {
        let data = [];
        for (let i = 0; i < rows.length; i++) {
          data.push(rows.item(i));
        }
        setFilteredData(data);
      });
    });
  }, [date, filterTime, searchQuery, collector]);

  // --- Sync with Supabase (when online) ---
  const syncWithSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('bettings')
        .select('*')
        .eq('is_deleted', true)
        .gte('timestamp', moment(date).startOf('day').toISOString())
        .lt('timestamp', moment(date).endOf('day').toISOString());

      if (error) throw error;

      db.transaction(tx => {
        data.forEach(ticket => {
          tx.executeSql(
            `INSERT OR REPLACE INTO bettings 
              (id, ticketNo, game_time, gross, is_deleted, timestamp, owner_id, isComplete, isValidated, inputType)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ticket.id,
              ticket.ticketNo,
              ticket.game_time,
              ticket.gross,
              ticket.is_deleted ? 1 : 0,
              ticket.timestamp,
              ticket.owner_id,
              ticket.isComplete ? 1 : 0,
              ticket.isValidated ? 1 : 0,
              ticket.inputType
            ]
          );
        });
      });

      fetchTickets();
    } catch (err) {
      console.error('Supabase sync error:', err);
    }
  };

  // --- Initial load + sync ---
  useEffect(() => {
    fetchTickets();
    syncWithSupabase();
  }, [date, filterTime, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    syncWithSupabase().finally(() => setRefreshing(false));
  };

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

  const renderTicketList = () => {
    const renderItem = ({ item, index }) => {
      let total = item.gross || 0;
      const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

      return (
        <Animated.View entering={FadeInDown.delay(index * 100).duration(500)} exiting={FadeOutDown.delay(index * 100).duration(500)}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ViewTicket', item)}
            style={{ ...styles.ticketRow, backgroundColor }}
          >
            <Text style={styles.ticketCol}>{item.ticketNo}</Text>
            <Text style={[styles.ticketCol, { fontWeight: 'bold', color: item.game_time === '2pm' ? '#3897e7' : item.game_time === '5pm' ? '#ff9d3e' : COLORS.black }]}>
              {String(item.game_time).toUpperCase()}
            </Text>
            <Text style={styles.ticketCol}>₱{formatNumberWithComma(total)} {item.inputType === 'sold' ? `(SO)` : ''}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    return (
      <FlatList
        data={filteredData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No records found.</Text>}
      />
    );
  };

  return (
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
      {renderTicketList()}
    </SafeAreaProvider>
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
  ticketCol: { fontSize: 18, width: '30%', color: COLORS.black },
  emptyText: { textAlign: 'center', fontSize: 14, color: COLORS.gray600, marginTop: 20 },
  dropdownMenuStyle: { backgroundColor: '#E9ECEF', borderRadius: 8 },
  dropdownItemStyle: { padding: 10 },
  dropdownItemTxtStyle: { fontSize: 16, fontWeight: '500' }
});