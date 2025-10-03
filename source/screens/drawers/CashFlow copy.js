import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl, Modal, Pressable, TouchableWithoutFeedback, Keyboard } from 'react-native'
import React, { useEffect, useState } from 'react'
import moment from 'moment-timezone'
import DateTimePicker from '@react-native-community/datetimepicker';
import SelectDropdown from 'react-native-select-dropdown'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { COLORS, icons } from '../../constants'
import { cutString, formatNumber, formatNumberWithComma } from '../../utils/helpers';
import CreateIcon from 'react-native-vector-icons/MaterialIcons'; 
import SQLite from 'react-native-sqlite-storage';
import { supabase } from '../../lib/supabase'   // <-- your supabase client

// Open local SQLite
const db = SQLite.openDatabase({ name: 'offline.db', location: 'default' });

const drawTimes = [
  { id: 0, name: 'All Types' },
  { id: 1, name: 'Expense' },
  { id: 2, name: 'Payment' },
  { id: 3, name: 'Borrow' },
];

const CashFlow = ({ navigation }) => {
  const dispatch = useDispatch()
  const { collector, user, selectedUser } = useSelector(({ user }) => user);

  const [date, setDate] = useState(new Date())
  const [show, setShowDate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTime, setFilterTime] = useState(drawTimes[0].name)
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]); // local cashflow entries

  // ensure tables exist
  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS betting (
          id TEXT PRIMARY KEY,
          amount REAL,
          description TEXT,
          inputType TEXT,
          owner TEXT,
          owner_name TEXT,
          createdAt TEXT,
          updatedAt TEXT,
          isDeleted INTEGER DEFAULT 0,
          isSynced INTEGER DEFAULT 0
        )
      `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT,
          name TEXT
        )
      `);
    });
  }, []);

  // fetch from SQLite
  const fetchLocalData = () => {
    const startOfDay = moment(date).startOf('day').toISOString();
    const endOfDay = moment(date).endOf('day').toISOString();

    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM betting 
         WHERE isDeleted = 0 
         AND createdAt >= ? AND createdAt <= ?
         ORDER BY createdAt DESC`,
        [startOfDay, endOfDay],
        (_, results) => {
          const rows = results.rows;
          let data = [];
          for (let i = 0; i < rows.length; i++) {
            data.push(rows.item(i));
          }
          setItems(data);
        }
      );
    });
  };

  useEffect(() => {
    fetchLocalData();
  }, [date, filterTime, searchQuery]);

  // refresh (pull from Supabase + update SQLite)
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('betting')
        .select('*')
        .gte('createdAt', moment(date).startOf('day').toISOString())
        .lte('createdAt', moment(date).endOf('day').toISOString());

      if (!error && data) {
        // replace local copy
        db.transaction(tx => {
          data.forEach(item => {
            tx.executeSql(
              `INSERT OR REPLACE INTO betting 
              (id, amount, description, inputType, owner, owner_name, createdAt, updatedAt, isDeleted, isSynced)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
              [
                item.id, item.amount, item.description, item.inputType, 
                item.owner, item.owner_name, item.createdAt, item.updatedAt,
                item.isDeleted ? 1 : 0
              ]
            );
          });
        });
        fetchLocalData();
      }
    } catch (err) {
      console.error(err);
    }
    setRefreshing(false);
  };

  function calculateTotals(flows) {
    return flows.reduce((totals, item) => {
      const amt = parseFloat(item.amount) || 0;
      if (item.inputType === 'expense') totals.expenses += amt;
      else if (item.inputType === 'borrow' || item.inputType === 'lend') totals.payables += amt;
      else if (item.inputType === 'payment') totals.payables -= amt;
      return totals;
    }, { expenses: 0, payables: 0 });
  }

  // === Render UI (same as before, only data source changed) ===
  const renderTickerList = (listData) => {
    const renderItem = ({ item, index }) => {
      const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;
      return (
        <Animated.View entering={FadeInDown.delay(index * 100).duration(500)} exiting={FadeOutDown.delay(index * 100).duration(500)}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ViewTicket', JSON.stringify(item))}
            style={{ paddingLeft: 10, backgroundColor, width: '100%', flexDirection: 'row', paddingVertical: 14, justifyContent: 'space-between' }}
          >
            <View style={{ width: '50%' }}>
              <Text style={{ fontSize: 18, fontWeight: '600' }}>{item.inputType.toUpperCase()}</Text>
              <Text style={{ fontSize: 14, color: COLORS.darkGray2 }}>
                {item.description}
              </Text>
            </View>
            <View style={{ width: '50%', alignItems: 'flex-end', paddingRight: 10 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 12, color: COLORS.darkGray2 }}>
                {moment(item?.createdAt).format('MMMM DD, YYYY hh:mm A')}
              </Text>
              <Text style={{ fontWeight: 'bold', fontSize: 20, color: COLORS.warningBorderColor }}>
                {formatNumber(Number(item?.amount).toFixed(2))}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    return (
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    );
  };

  const { expenses: totalExpenses, payables: totalPayables } = calculateTotals(items);

  return (
    <SafeAreaProvider style={styles.wrapper}>
      <View style={{ flex: 1, width: '100%' }}>
        {/* header, search, modal unchanged... */}
        {renderTickerList(items)}
        <View style={{ flexDirection: 'row', padding: 10 }}>
          <Text>Total Expenses: {formatNumberWithComma(totalExpenses)}</Text>
          <Text>Total Payables: {formatNumberWithComma(totalPayables)}</Text>
        </View>
      </View>
    </SafeAreaProvider>
  );
};

export default CashFlow;

const styles = StyleSheet.create({
  wrapper: { flex: 1, padding: 10, backgroundColor: COLORS.gray300 }
});
