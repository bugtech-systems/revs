import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView, Modal } from 'react-native';
import React, { useEffect, useState, useMemo } from 'react';
import icons from '../constants/icons';
import moment from 'moment-timezone';
import { realmContext } from '../RealmContext';
import { useApp } from '@realm/react';
import { Betting, Users } from '../Models';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { formatNumber, getConfiguration } from '../utils/helpers';
import { COLORS, SIZES } from '../constants';
import { SET_SUMMARIZED_USER } from '../redux/actions/types';

const { useRealm, useQuery } = realmContext;

const SummaryReportUser = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const { summarizedUser } = useSelector(({ user }) => user);
  const [includeAll, setIncludeAll] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [show, setShowDate] = useState(null);

  // Query user
  const users = useQuery(Users, user =>
    user.filtered('email == $0', summarizedUser), [summarizedUser]
  );
  const userObj = users[0];

  // Memoize config values
  const isWin200 = useMemo(() => getConfiguration(userObj, 'withWin200')?.isCheck, [userObj]);
  const win200Value = useMemo(() => getConfiguration(userObj, 'withWin200')?.value, [userObj]);
  const winStraightValue = useMemo(() => getConfiguration(userObj, 'winStraight')?.value, [userObj]);
  const comRate = userObj?.comRate || 0;

  // Query bettings
  const items = useQuery(Betting, data => {
    let startOfDay = moment(startDate).startOf('day').toDate();
    let endOfDay = moment(endDate).endOf('day').toDate();
    let userNow = userObj ? userObj._id : "";

    if (new Date(startOfDay) <= new Date(userObj?.lastSummary)) {
      startOfDay = moment(userObj?.lastSummary).endOf('day').toDate();
    }

    if (includeAll) {
      return data.filtered('ANY uplines == $0 && isDeleted == false && inputType == "normal" && timestamp >= $1 && timestamp < $2', String(userNow), startOfDay, endOfDay).sorted('timestamp', true);
    } else {
      return data.filtered('isDeleted == false && inputType == "normal" && timestamp >= $0 && timestamp < $1 && owner_id == $2', startOfDay, endOfDay, String(userNow)).sorted('timestamp', true);
    }
  }, [startDate, endDate, includeAll, userObj]);

  // Date picker logic
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || (show === 'start' ? startDate : endDate);
    if (show === 'start') {
      if (event?.type === 'neutralButtonPressed') {
        setShowDate(null); // Always close modal after selection
        setStartDate(moment().toDate());
      } else if (event?.type === 'set') {
        setShowDate(null); // Always close modal after selection
        setStartDate(currentDate);
      }
    } else {
      if (event?.type === 'neutralButtonPressed') {
        setShowDate(null); // Always close modal after selection
        setEndDate(moment().toDate());
      } else if (event?.type === 'set') {
        setShowDate(null); // Always close modal after selection
        setEndDate(currentDate);
      }
    }
  };

  const showDatePicker = val => setShowDate(val);

  const groupArrays = useMemo(() => {
    const groups = items.reduce((acc, item) => {
      const date = moment(item.timestamp).format('YYYY-MM-DD');
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
    // Sort dates descending
    return Object.keys(groups)
      .sort((a, b) => moment(b).valueOf() - moment(a).valueOf())
      .map(date => ({ date, bets: groups[date] }));
  }, [items]);

  // Totals calculation
  const totalGross = useMemo(() => items.reduce((n, { gross }) => n + gross, 0), [items]);
  const totalHits = useMemo(() => items.reduce((sum, item) => {
    const winPrize = (isWin200 && item.isWinTo) ? win200Value : winStraightValue;
    return sum + (item.winning * winPrize);
  }, 0), [items, isWin200, win200Value, winStraightValue]);
  const totalComms = useMemo(() => items.reduce((total, bet) =>
    total + bet.commissions
      .filter(coms => String(coms.referral) === String(userObj?._id))
      .reduce((n, { amount }) => n + amount, 0), 0), [items, userObj]);
  const genCommsTotal = useMemo(() => totalGross * (comRate / 100), [totalGross, comRate]);
  const totalNet = useMemo(() => totalGross - genCommsTotal, [totalGross, genCommsTotal]);
  const genTotal = useMemo(() => totalNet - totalHits, [totalNet, totalHits]);

  useEffect(() => {
    return () => {
      dispatch({ type: SET_SUMMARIZED_USER, payload: null });
    };
  }, []);

  return (
    <SafeAreaProvider style={styles.wrapper}>
      <View style={{ flex: 1, width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', padding: 10 }}>
          <TouchableOpacity
            onPress={() => showDatePicker('start')}
            activeOpacity={0.9}
            style={{ width: '48%' }}
          >
            <View style={styles.dateBtnInner}>
              <Text style={styles.dateText}>{moment(startDate).format('MM/DD/YYYY')}</Text>
              <Image source={icons.calendar} style={styles.calendarIcon} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => showDatePicker('end')}
            activeOpacity={0.9}
            style={{ width: '48%' }}
          >
            <View style={styles.dateBtnInner}>
              <Text style={styles.dateText}>{moment(endDate).format('MM/DD/YYYY')}</Text>
              <Image source={icons.calendar} style={styles.calendarIcon} />
            </View>
          </TouchableOpacity>
        </View>

{show && (
        <DateTimePicker
          testID="summDatePicker"
          value={show === 'start' ? startDate : endDate}
          mode="date"
          display="calendar"
          onChange={onChangeDate}
          minimumDate={new Date(userObj?.lastSummary)}
          maximumDate={new Date(moment().toDate())}
          negativeButton={{ label: "Cancel" }}
          neutralButton={{ label: "Clear" }}
        />
      )}

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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ width: '100%', marginBottom: 40, backgroundColor: COLORS.gray300, padding: 10 }}
        >
          {groupArrays.map((item, index) => {
            const { date, bets } = item;
            // Per-day stats
            const grandGross = bets.reduce((n, { gross }) => n + gross, 0);
            const grandCommsTotal = grandGross * (comRate / 100);
            const grandComm = bets.reduce((total, bet) =>
              total + bet.commissions
                .filter(coms => String(coms.referral) === String(userObj?._id))
                .reduce((n, { amount }) => n + amount, 0), 0);
            const grandHits = bets.reduce((sum, item) => {
              const winPrize = (isWin200 && item.isWinTo) ? win200Value : winStraightValue;
              return sum + (item.winning * winPrize);
            }, 0);
            const net = grandGross - grandHits - grandCommsTotal;

            // Game time breakdown
            const gameTimes = ['2pm', '5pm', '9pm'];
            const gameStats = gameTimes.map(time => {
              const combos = bets.filter(data => data.gameTime === time);
              const gross = combos.reduce((n, { gross }) => n + gross, 0);
              const commsTotal = gross * (comRate / 100);
              const comm = combos.reduce((total, bet) =>
                total + bet.commissions
                  .filter(coms => String(coms.referral) === String(userObj?._id))
                  .reduce((n, { amount }) => n + amount, 0), 0);
              const hits = combos.reduce((sum, data) => {
                const winPrize = (isWin200 && data.isWinTo) ? win200Value : winStraightValue;
                return sum + (data.winning * winPrize);
              }, 0);
              const netVal = gross - hits - commsTotal;
              return { gross, comm, hits, net: netVal };
            });

            return (
              <View
                key={index}
                style={styles.dayCard}
              >
                <View style={styles.dayHeader}>
                  <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>
                    {moment(date).format('MMM DD, YYYY')}
                  </Text>
                </View>
                <View style={styles.dayTotalsRow}>
                  <View style={{...styles.dayTotalsCol, borderRightWidth: .5, borderLeftColor: COLORS.white }}><Text style={styles.textRow}>GROSS</Text><Text style={styles.textRowValue}>{formatNumber(grandGross)}</Text></View>
                  <View style={{...styles.dayTotalsCol, borderRightWidth: .5, borderLeftColor: COLORS.white }}><Text style={styles.textRow}>HITS</Text><Text style={styles.textRowValue}>{formatNumber(grandHits)}</Text></View>
                  <View style={{...styles.dayTotalsCol, borderRightWidth: .5, borderLeftColor: COLORS.white }}><Text style={styles.textRow}>COMM</Text><Text style={styles.textRowValue}>{formatNumber(grandComm)}</Text></View>
                  <View style={styles.dayTotalsCol}><Text style={styles.textRow}>NET</Text><Text style={{ fontWeight: 'bold', color: Math.sign(net) === -1 ? COLORS.red : COLORS.black, paddingTop: 10 }}>{formatNumber(net)}</Text></View>
                </View>
                {gameTimes.map((time, i) => (
                  <View key={time} style={styles.gameTimeRow}>
                    <Text style={{ ...styles.gameTimeLabel, textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right' }}>
                      {time === '2pm' ? '2:00 PM' : time === '5pm' ? '5:00 PM' : '9:00 PM'}
                    </Text>
                    <View style={{...styles.gameTimeCol, borderRightWidth: .5, borderLeftColor: COLORS.white }}><Text style={styles.gameTimeValue}>{formatNumber(gameStats[i].gross)}</Text></View>
                    <View style={{...styles.gameTimeCol, borderRightWidth: .5, borderLeftColor: COLORS.white }}><Text style={styles.gameTimeValue}>{formatNumber(gameStats[i].hits)}</Text></View>
                    <View style={{...styles.gameTimeCol, borderRightWidth: .5, borderLeftColor: COLORS.white }}><Text style={styles.gameTimeValue}>{formatNumber(gameStats[i].comm)}</Text></View>
                    <View style={styles.gameTimeCol}><Text style={{ color: Math.sign(gameStats[i].net) === -1 ? COLORS.red : COLORS.black }}>{formatNumber(gameStats[i].net)}</Text></View>
                  </View>
                ))}
              </View>
            );
          })}
          {groupArrays.length > 0 &&
            <View style={{ flex: 1, padding: 14, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
                End of results.
              </Text>
            </View>
          }
          {groupArrays.length === 0 &&
            <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.darkGray2, fontSize: 14, fontWeight: '500' }}>
                No records found.
              </Text>
            </View>
          }
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
};

export default SummaryReportUser;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
    backgroundColor: COLORS.gray300
  },
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
  totalsCol: { flex: 1, flexDirection: 'column', paddingHorizontal: 10, alignItems: 'flex-start' },
  totalsValue: { fontWeight: 'bold', color: COLORS.black, fontSize: 16 },
  fontsHeader: { color: COLORS.black, fontSize: 12, fontWeight: '600', },
  fontsHeader1: { color: COLORS.black, fontWeight: 'bold', fontSize: 12 },
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
  gameTimeRow: { height: 36, width: '100%', borderTopWidth: .5, borderColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gameTimeLabel: { opacity: .2, position: 'absolute', fontWeight: 'bold', color: COLORS.lightGray4, width: '100%', fontSize: 45 },
  gameTimeCol: { width: '25%', alignItems: 'center', justifyContent: 'center', borderColor: COLORS.white },
  gameTimeValue: { color: COLORS.black, fontWeight: '400' },
  footer: { flex: 1, padding: 14, alignItems: 'center', justifyContent: 'center', width: '100%' },
  footerText: { textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' },
  empty: { height: SIZES.height / 1.5, width: '100%', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.darkGray2, fontSize: 14, fontWeight: '500' }
});