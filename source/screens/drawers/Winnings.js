import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  View,
  Platform,
  Alert,
} from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import moment from 'moment-timezone';
import DateTimePicker from '@react-native-community/datetimepicker';
import SelectDropdown from 'react-native-select-dropdown';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, icons } from '../../constants';
import { formatNumberWithComma, getConfiguration } from '../../utils/helpers';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import SQLite from 'react-native-sqlite-storage';
import supabase from '../../utils/supabaseClient';
// import { supabase } from '../../supabaseClient'; // <-- create this client separately

const db = SQLite.openDatabase({ name: 'offline.db', location: 'default' });

const drawTimes = [
  { id: 0, name: 'All Time' },
  { id: 1, name: '2pm' },
  { id: 2, name: '5pm' },
  { id: 3, name: '9pm' },
];

const Winnings = ({ navigation }) => {
  const dispatch = useDispatch();
  const { collector, user } = useSelector(({ user }) => user);

  const [date, setDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]); // tickets/winnings
  const [users, setUsers] = useState([]);
  const [show, setShowDate] = useState(false);
  const [filterTime, setFilterTime] = useState('All Time');
  const [includeAll, setIncludeAll] = useState(false);

  // setup SQLite tables
  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT,
          firstName TEXT,
          role TEXT,
          lastSummary TEXT
        );`
      );
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS bettings (
          id TEXT PRIMARY KEY,
          ticketNo TEXT,
          owner_id TEXT,
          gameTime TEXT,
          winning REAL,
          isWinTo BOOLEAN,
          isDeleted BOOLEAN,
          inputType TEXT,
          timestamp TEXT
        );`
      );
    });
  }, []);

  // fetch from Supabase when online, otherwise fallback to SQLite
  const fetchData = useCallback(async () => {
    const state = await NetInfo.fetch();
    const startOfDay = moment(date).startOf('day').toISOString();
    const endOfDay = moment(date).endOf('day').toISOString();

    if (state.isConnected) {
      try {
        // fetch users
        const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('*')
          .eq('email', collector);
        if (userErr) throw userErr;
        setUsers(userData);

        // fetch bettings
        let query = supabase
          .from('bettings')
          .select('*')
          .gte('timestamp', startOfDay)
          .lt('timestamp', endOfDay)
          .eq('isDeleted', false)
          .eq('inputType', 'normal')
          .gt('winning', 0);

        if (userData?.length) {
          if (!includeAll) {
            query = query.eq('owner_id', userData[0].id);
          }
        }

        const { data: bettingData, error: bettingErr } = await query;
        if (bettingErr) throw bettingErr;
        setItems(bettingData);

        // cache into SQLite
        db.transaction(tx => {
          tx.executeSql(`DELETE FROM users;`);
          tx.executeSql(`DELETE FROM bettings;`);
          userData.forEach(u => {
            tx.executeSql(
              `INSERT OR REPLACE INTO users (id,email,firstName,role,lastSummary) VALUES (?,?,?,?,?);`,
              [u.id, u.email, u.firstName, u.role, u.lastSummary]
            );
          });
          bettingData.forEach(b => {
            tx.executeSql(
              `INSERT OR REPLACE INTO bettings (id,ticketNo,owner_id,gameTime,winning,isWinTo,isDeleted,inputType,timestamp) VALUES (?,?,?,?,?,?,?,?,?);`,
              [
                b.id,
                b.ticketNo,
                b.owner_id,
                b.gameTime,
                b.winning,
                b.isWinTo ? 1 : 0,
                b.isDeleted ? 1 : 0,
                b.inputType,
                b.timestamp,
              ]
            );
          });
        });
      } catch (err) {
        console.log('Supabase fetch error:', err);
      }
    } else {
      // offline: load from SQLite
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM users WHERE email = ?;`,
          [collector],
          (_, res) => {
            const rows = res.rows.raw();
            setUsers(rows);
          }
        );
        tx.executeSql(
          `SELECT * FROM bettings WHERE isDeleted = 0 AND inputType = 'normal' AND winning > 0 AND timestamp >= ? AND timestamp < ?;`,
          [startOfDay, endOfDay],
          (_, res) => {
            const rows = res.rows.raw();
            setItems(rows);
          }
        );
      });
    }
  }, [date, includeAll, collector]);

  useEffect(() => {
    fetchData();
  }, [date, includeAll]);

  const onChangeDate = (event, selectedDate) => {
    if (event?.type === 'set') {
      setDate(selectedDate);
    }
    setShowDate(false);
  };

      function renderHeader() {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={showDatePicker}
                    // onPress={() => navigation.navigate('TestPaginate', {})}
                    style={{ width: '48%', borderColor: COLORS.white, borderWidth: 1, borderRadius: 8, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }}
                >
                    <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                        <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{date == undefined || '' ? '' : moment(date).format('MM/DD/YYYY')}</Text>
                        <Image
                            source={icons.calendar}
                            style={{ height: 30, width: 30, tintColor: COLORS.black }}
                        />
                    </View>
                </TouchableOpacity>
                <SelectDropdown
                    data={drawTimes}
                    onSelect={(selectedItem, index) => {
                        handleTimeSelect(selectedItem.name)
                        // Alert.alert(selectedItem, index)
                    }}

                    style={{ width: '48%', alignItems: 'center', justifyContent: 'center' }}
                    defaultValueByIndex={0}
                    renderButton={(selectedItem, isOpened) => {
                        return (
                            <TouchableOpacity
                                // disabled={true}
                                style={{ width: '48%', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.white, borderRadius: 8, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }
                                }>
                                <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: 10 }}>
                                    <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{filterTime !== '' ? String(filterTime).toUpperCase() : 'Select Time'}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    renderItem={(item, index, isSelected) => {
                        return (
                            <View style={{ ...styles.dropdownItemStyle, ...(isSelected && { backgroundColor: '#D2D9DF' }) }}>
                                <Text style={styles.dropdownItemTxtStyle}>{item.name}</Text>
                            </View>
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                    dropdownStyle={styles.dropdownMenuStyle}
                />
            </View>
        )
    }

  const handleSearch = query => setSearchQuery(query);

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
          backgroundColor: COLORS.white,
          elevation: 2,
          shadowRadius: 6,
          marginTop: 10,
        }}>
        <TextInput
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search by Ticket#"
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

  function renderTicketList(listData) {
    const renderItem = ({ item, index }) => {
      const winPrize = item.isWinTo
        ? getConfiguration(users[0], 'withWin200').value
        : getConfiguration(users[0], 'winStraight').value;

      const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

      return (
        <Animated.View
          entering={FadeInDown.delay(index * 100).duration(500)}
          exiting={FadeOutDown.delay(index * 100).duration(500)}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                'Winning Ticket',
                JSON.stringify({ ...item, agent: users[0]?.firstName })
              )
            }
            style={{
              paddingVertical: 10,
              backgroundColor,
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'flex-start',
            }}>
            <Text
              style={{
                width: '40%',
                flexGrow: 1,
                textAlign: 'left',
                left: 10,
                fontSize: 18,
                color: COLORS.black,
              }}>
              {item.ticketNo}
            </Text>
            <Text
              style={{
                fontSize: 18,
                width: '30%',
                textAlign: 'center',
                color:
                  item.gameTime == '2pm'
                    ? '#3897e7'
                    : item.gameTime == '5pm'
                    ? '#ff9d3e'
                    : item.gameTime == '9pm'
                    ? COLORS.black600
                    : COLORS.black,
              }}>
              {String(item.gameTime).toUpperCase()}
            </Text>
            <Text
              style={{
                fontSize: 18,
                width: '30%',
                textAlign: 'center',
                color: COLORS.black,
              }}>
              ₱{formatNumberWithComma(item.winning * winPrize)}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    return (
      <>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            backgroundColor: COLORS.gray400,
            borderBottomWidth: 1,
            borderColor: COLORS.gray600,
          }}>
          <Text
            style={{
              fontWeight: 'bold',
              color: COLORS.black,
              fontSize: 16,
              width: '40%',
              textAlign: 'left',
              left: 10,
            }}>
            TICKET#
          </Text>
          <Text
            style={{
              textAlign: 'center',
              width: '30%',
              fontWeight: 'bold',
              color: COLORS.black,
              fontSize: 16,
            }}>
            GAME TIME
          </Text>
          <Text
            style={{
              textAlign: 'center',
              width: '30%',
              fontWeight: 'bold',
              color: COLORS.black,
              fontSize: 16,
            }}>
            Winnings
          </Text>
        </View>
        <FlatList
          data={listData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ padding: 8, alignItems: 'center' }}>
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 14,
                  color: COLORS.gray600,
                  fontWeight: '500',
                }}>
                No records found.
              </Text>
            </View>
          }
        />
      </>
    );
  }

  let filteredList =
    filterTime == 'All Time'
      ? items
      : items.filter(a => a.gameTime == filterTime);
  filteredList = searchQuery
    ? filteredList.filter(a => String(a.ticketNo).includes(searchQuery))
    : filteredList;

  let totalWins = filteredList.reduce(
    (n, { isWinTo, winning }) =>
      n +
      winning *
        (isWinTo
          ? getConfiguration(users[0], 'withWin200').value
          : getConfiguration(users[0], 'winStraight').value),
    0
  );

  return (
    <SafeAreaProvider style={styles.wrapper}>
      <View style={{ flex: 1, width: '100%' }}>
        {renderSearchInput()}
        {show && (
          <DateTimePicker
            testID="dateTimePicker"
            value={date}
            mode="date"
            display="default"
            onChange={onChangeDate}
            maximumDate={new Date()}
            neutralButton={{ label: 'Clear' }}
          />
        )}
        <View
          style={{
            height: 50,
            marginTop: 10,
            marginBottom: 10,
            borderBottomWidth: 1,
            borderTopWidth: 1,
            borderColor: COLORS.gray600,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
          <View style={{ flexDirection: 'column', width: '40%' }}>
            <Text style={styles.fontsHeader}>Total Hits</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
              {formatNumberWithComma(filteredList.length)}
            </Text>
          </View>
          <View style={{ flexDirection: 'column', width: '40%' }}>
            <Text style={styles.fontsHeader}>Total Winnings</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
              {formatNumberWithComma(totalWins)}
            </Text>
          </View>
        </View>
        {renderTicketList(filteredList)}
      </View>
    </SafeAreaProvider>
  );
};

export default Winnings;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    padding: 10,
    backgroundColor: "#F1F2F4",
  },
  fontsHeader: {
    color: '#0d0d0e',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
