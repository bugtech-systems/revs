import { Alert, Image, StyleSheet, Text, Switch, TouchableOpacity, View, ScrollView, Platform } from 'react-native';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { COLORS, SIZES } from '../../constants/theme';
import icons from '../../constants/icons';
import moment from 'moment-timezone';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { formatNumber, getConfiguration, getDayRange } from '../../utils/helpers';
import SQLite from 'react-native-sqlite-storage';
import supabase from '../../utils/supabaseClient';
// import { useOffline } from '../../context/OfflineProvider';
import { useOfflineSync } from '../../context/OfflineSyncProvider';


const SummaryReport = ({ navigation }) => {
  const { collector, user, selectedUser } = useSelector(({ user }) => user);
  const { api, dataVersion, bumpVersion } = useOfflineSync();

  const [includeAll, setIncludeAll] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [show, setShowDate] = useState(null);

  // const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const ownUser = selectedUser?.id ? selectedUser?.id : user?.id
  // Fetch user from SQLite or Supabase
  // useEffect(() => {
  //   const fetchUser = async () => {
  //     // First, check local SQLite
  //     db.transaction(tx => {
  //       tx.executeSql(
  //         `SELECT * FROM Users WHERE email = ? LIMIT 1`,
  //         [collector],
  //         (_, { rows }) => {
  //           if (rows.length > 0) setUser(rows._array[0]);
  //         },
  //         (_, error) => console.log('SQLite user fetch error:', error)
  //       );
  //     });

  //     // Optionally, sync from Supabase
  //     const { data: userData, error } = await supabase
  //       .from('Users')
  //       .select('*')
  //       .eq('email', collector)
  //       .limit(1)
  //       .single();
  //     if (userData) setUser(userData);
  //   };
  //   fetchUser();
  // }, [collector]);

  // Memoized config values
  const isWin200 = useMemo(() => getConfiguration(user, 'withWin200')?.isCheck, [user]);
  const win200Value = useMemo(() => getConfiguration(user, 'withWin200')?.value, [user]);
  const winStraightValue = useMemo(() => getConfiguration(user, 'winStraight')?.value, [user]);
  const com_rate = user?.com_rate || 0;

  // Fetch bettings from SQLite
  const fetchItems = useCallback(async () => {
    if (!ownUser) return;
    
    const { start_of_day, end_of_day  } = getDayRange(startDate, endDate)
    // Start and end of the day
    
  console.log(start_of_day, end_of_day, 'date range')
    
    let filters = {}
    if (includeAll) {
  filters = {
    ...filters,
    uplines: { op: "contains", value: ownUser },
    timestamp: { op: "between", from: start_of_day, to: end_of_day },
  };
} else {
  filters = {
    ...filters,
    owner_id: ownUser,
    timestamp: { op: "between", from: start_of_day, to: end_of_day },
  };
}



      let localBettings = await api.listBettings({
        filters: filters,
        orderBy: 'created_at DESC',
        // limit: 20,
      });

    
      setItems(localBettings);
      // setLoading(false);

  }, [startDate, endDate, includeAll, ownUser, dataVersion]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Date picker logic
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || (show === 'start' ? startDate : endDate);
    if (show === 'start') {
      if (event?.type === 'neutralButtonPressed') {
        setShowDate(null);
        setStartDate(moment().toDate());
      } else if (event?.type === 'set') {
        setShowDate(null);
        setStartDate(currentDate);
      }
    } else {
      if (event?.type === 'neutralButtonPressed') {
        setShowDate(null);
        setEndDate(moment().toDate());
      } else if (event?.type === 'set') {
        setShowDate(null);
        setEndDate(currentDate);
      }
    }
  };

  const showDatePicker = val => setShowDate(val);

  // Totals calculation
  const renderTotals = useCallback(() => {
    const totalGross = items.reduce((n, { gross }) => Number(n) + Number(gross), 0);
    const totalHits = items.reduce((sum, item) => {
      const winPrize = Number(isWin200 && item.is_win_to) ? win200Value : winStraightValue;
      return Number(sum) + Number(item.winning * winPrize);
    }, 0);
    const totalComms = items.reduce((total, bet) => {
      return total + bet.commissions
        .filter(coms => String(coms.referral) === String(ownUser))
        .reduce((n, { amount }) => n + amount, 0);
    }, 0);
    
    const genCommsTotal = totalGross * (com_rate / 100);
    const totalNet = totalGross - genCommsTotal;
    const genTotal = totalNet - totalHits;

    return (
      <View style={styles.totalsRow}>
        <View style={styles.totalsCol}>
          <Text style={styles.fontsHeader1}>Gross</Text>
          <Text style={styles.totalsValue}>{formatNumber(totalGross)}</Text>
        </View>
        <View style={styles.totalsCol}>
          <Text style={styles.fontsHeader}>Comm</Text>
          <Text style={styles.totalsValue}>{formatNumber(totalComms)}</Text>
        </View>
        <View style={styles.totalsCol}>
          <Text style={styles.fontsHeader1}>Net</Text>
          <Text style={styles.totalsValue}>{formatNumber(totalNet)}</Text>
        </View>
        <View style={styles.totalsCol}>
          <Text style={styles.fontsHeader}>Hits</Text>
          <Text style={styles.totalsValue}>{formatNumber(totalHits)}</Text>
        </View>
        <View style={styles.totalsCol}>
          <Text style={styles.fontsHeader1}>Total</Text>
          <Text style={styles.totalsValue}>{formatNumber(genTotal)}</Text>
        </View>
      </View>
    );
  }, [items, isWin200, win200Value, winStraightValue, user, com_rate]);

  // Group bets by date and sort descending
  const groupArrays = useMemo(() => {
    const groups = items.reduce((acc, item) => {
      const date = moment(item.timestamp).format('YYYY-MM-DD');
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
    return Object.keys(groups)
      .sort((a, b) => moment(b).valueOf() - moment(a).valueOf())
      .map(date => ({ date, bets: groups[date] }));
  }, [items]);


console.log(com_rate, 'COMM RATE')


  return (
    <SafeAreaProvider style={styles.wrapper}>
      {show && (
        <DateTimePicker
          testID="summDatePicker"
          value={show === 'start' ? startDate : endDate}
          mode="date"
          display="calendar"
          onChange={onChangeDate}
          minimumDate={new Date(user?.last_summary)}
          maximumDate={new Date(moment().toDate())}
          negativeButton={{ label: "Cancel" }}
          neutralButton={{ label: "Clear" }}
        />
      )}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => showDatePicker('start')} activeOpacity={0.9} style={styles.dateBtn}>
          <View style={styles.dateBtnInner}>
            <Text style={styles.dateText}>{moment(startDate).format('MM/DD/YYYY')}</Text>
            <Image source={icons.calendar} style={styles.calendarIcon} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => showDatePicker('end')} activeOpacity={0.9} style={styles.dateBtn}>
          <View style={styles.dateBtnInner}>
            <Text style={styles.dateText}>{moment(endDate).format('MM/DD/YYYY')}</Text>
            <Image source={icons.calendar} style={styles.calendarIcon} />
          </View>
        </TouchableOpacity>
      </View>
      {renderTotals()}
      {user && user.role !== 'teller' && (
        <View style={styles.toggleRow}>
          <Switch
            trackColor={{ true: '#00ED64' }}
            onValueChange={() => setIncludeAll(!includeAll)}
            value={includeAll}
          />
          <Text style={styles.toggleText}>Show All</Text>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ marginHorizontal: 10 }}>
        {groupArrays.map((item, index) => {
          const { date, bets } = item;
          const grandGross = bets.reduce((n, { gross }) => Number(n) + Number(gross), 0);
          const grandCommsTotal = Number(grandGross) * Number(com_rate / 100);
          const grandComm = bets.reduce((total, bet) =>
            Number(total) + bet.commissions
              .filter(coms => String(coms.referral) === String(user?._id))
              .reduce((n, { amount }) => Number(n) + Number(amount), 0), 0);
          const grandHits = bets.reduce((sum, item) => {
            const winPrize = (isWin200 && item.is_win_to) ? win200Value : winStraightValue;
            return Number(sum) + Number(item.winning * winPrize);
          }, 0);
          const net = Number(grandGross - grandHits - grandCommsTotal);

          const game_times = ['2pm', '5pm', '9pm'];
          const gameStats = game_times.map(time => {
            const combos = bets.filter(data => data.game_time === time);
            const gross = combos.reduce((n, { gross }) => Number(n) + Number(gross), 0);
            const commsTotal = Number(gross) * Number(com_rate / 100);
            const comm = combos.reduce((total, bet) =>
              Number(total) + bet.commissions
                .filter(coms => String(coms.referral) === String(user?.id))
                .reduce((n, { amount }) => Number(n) + Number(amount), 0), 0);
            const hits = combos.reduce((sum, data) => {
              const winPrize = (isWin200 && data.is_win_to) ? win200Value : winStraightValue;
              return sum + (data.winning * winPrize);
            }, 0);
            const netVal = gross - hits - commsTotal;
            return { gross, comm, hits, net: netVal };
          });

          return (
            <Animated.View entering={ZoomIn.delay(index * 100).duration(500)} key={date} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{moment(date).format('MMM DD, YYYY')}</Text>
              </View>
              <View style={styles.dayTotalsRow}>
                <View style={{ ...styles.dayTotalsCol, borderRightWidth: 0.5, borderLeftColor: COLORS.white }}>
                  <Text style={styles.textRow}>GROSS</Text>
                  <Text style={styles.textRowValue}>{formatNumber(grandGross)}</Text>
                </View>
                <View style={{ ...styles.dayTotalsCol, borderRightWidth: 0.5, borderLeftColor: COLORS.white }}>
                  <Text style={styles.textRow}>HITS</Text>
                  <Text style={styles.textRowValue}>{formatNumber(grandHits)}</Text>
                </View>
                <View style={{ ...styles.dayTotalsCol, borderRightWidth: 0.5, borderLeftColor: COLORS.white }}>
                  <Text style={styles.textRow}>COMM</Text>
                  <Text style={styles.textRowValue}>{formatNumber(grandComm)}</Text>
                </View>
                <View style={styles.dayTotalsCol}>
                  <Text style={styles.textRow}>NET</Text>
                  <Text style={{ fontWeight: 'bold', color: Math.sign(net) === -1 ? COLORS.red : COLORS.black, paddingTop: 10 }}>
                    {formatNumber(net)}
                  </Text>
                </View>
              </View>
              {game_times.map((time, i) => (
                <View key={time} style={styles.game_timeRow}>
                  <Text style={{ ...styles.game_timeLabel, textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right' }}>
                    {time === '2pm' ? '2:00 PM' : time === '5pm' ? '5:00 PM' : '9:00 PM'}
                  </Text>
                  <View style={{ ...styles.game_timeCol, borderRightWidth: 0.5, borderLeftColor: COLORS.white }}>
                    <Text style={styles.game_timeValue}>{formatNumber(gameStats[i].gross)}</Text>
                  </View>
                  <View style={{ ...styles.game_timeCol, borderRightWidth: 0.5, borderLeftColor: COLORS.white }}>
                    <Text style={styles.game_timeValue}>{formatNumber(gameStats[i].hits)}</Text>
                  </View>
                  <View style={{ ...styles.game_timeCol, borderRightWidth: 0.5, borderLeftColor: COLORS.white }}>
                    <Text style={styles.game_timeValue}>{formatNumber(gameStats[i].comm)}</Text>
                  </View>
                  <View style={styles.game_timeCol}>
                    <Text style={{ color: Math.sign(gameStats[i].net) === -1 ? COLORS.red : COLORS.black }}>
                      {formatNumber(gameStats[i].net)}
                    </Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          );
        })}
        {groupArrays.length > 0 && (
          <View style={styles.footer}><Text style={styles.footerText}>End of results.</Text></View>
        )}
        {groupArrays.length === 0 && (
          <View style={styles.empty}><Text style={styles.emptyText}>No records found.</Text></View>
        )}
      </ScrollView>
    </SafeAreaProvider>
  );
};

export default SummaryReport;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: COLORS.gray300
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    padding: 10
  },
  dateBtn: { width: '48%' },
  dateBtnInner: {
    height: 40,
    backgroundColor: COLORS.white,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.white,
    borderRadius: 8,
    width: '100%',
    padding: 5
  },
  dateText: { paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' },
  calendarIcon: { height: 30, width: 30, tintColor: COLORS.black },
  totalsRow: {
    height: 50,
    marginHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    marginTop: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: COLORS.gray600,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  totalsCol: { flex: 1, flexDirection: 'column', paddingHorizontal: 5, alignItems: 'flex-start' },
  totalsValue: { fontWeight: 'bold', color: COLORS.black, fontSize: 13 },
  fontsHeader: { color: COLORS.black, fontSize: 12, fontWeight: '600', },
  fontsHeader1: { color: COLORS.black, fontWeight: 'bold', fontSize: 11 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  toggleText: { flex: 1, fontSize: 16, color: COLORS.black },
  dayCard: {
    width: '100%',
    height: 240,
    alignItems: 'flex-start',
    padding: 10,
    justifyContent: 'space-between',
    marginVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0CC27D',
    backgroundColor: '#0CC27D',
    elevation: 2,
    shadowRadius: 6
  },
  dayHeader: { height: 40, flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: 10 },
  dayHeaderText: { fontWeight: 'bold', color: COLORS.black, fontSize: 16 },
  dayTotalsRow: { paddingTop: 10, borderColor: COLORS.white2, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around' },
  dayTotalsCol: { width: '25%', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column', borderColor: COLORS.white2 },
  textRow: { fontWeight: 'bold', fontSize: 16, color: COLORS.black },
  textRowValue: { color: COLORS.black, textAlign: 'center', paddingTop: 10 },
  game_timeRow: { height: 36, width: '100%', borderTopWidth: .5, borderColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  game_timeLabel: { opacity: .2, position: 'absolute', fontWeight: 'bold', color: COLORS.lightGray4, width: '100%', fontSize: 45 },
  game_timeCol: { width: '25%', alignItems: 'center', justifyContent: 'center', borderColor: COLORS.white },
  game_timeValue: { color: COLORS.black, fontWeight: '400' },
  footer: { flex: 1, padding: 14, alignItems: 'center', justifyContent: 'center', width: '100%' },
  footerText: { textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' },
  empty: { height: SIZES.height / 1.5, width: '100%', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.darkGray2, fontSize: 14, fontWeight: '500' }
});