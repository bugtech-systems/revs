import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, Switch, Alert, Image, Platform, PermissionsAndroid, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment-timezone';
import { useSelector } from 'react-redux';
import { COLORS, SIZES } from '../constants/theme';
import icons from '../constants/icons';
import { formatNumber, getConfiguration } from '../utils/helpers';
import { getLocalUser, get_local_bettings, get_local_draws, update_local_user_last_summary } from '../utils/db'; // SQLite helpers
import { api } from '../utils/offlineSync';
import supabase from '../utils/supabaseClient';

const Dashboard = ({ navigation }) => {
  const { user } = useSelector(({ user }) => user);

  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [includeAll, setIncludeAll] = useState(false);

  const [own_user, setOwnUser] = useState(null);
  const [bettings, setBettings] = useState([]);
  const [draws, setDraws] = useState([]);

  const able_to_set_last_summary = getConfiguration(user ?? { isAdmin: false, role: 'teller', configurations: [] }, 'last_summary_report')?.isCheck;

  // Load local user (SQLite first, then Supabase fallback)
  useEffect(() => {
    (async () => {
      let localUser = await getLocalUser(user?.email);
      if (!localUser) {
        const { data, error } = await supabase.from('users').select('*').eq('id', user?.id).single();
        if (data) localUser = data;
      }
      if (localUser) setOwnUser(localUser);
    })();
  }, [user]);

  // Load bettings & draws offline-first
  useEffect(() => {
    (async () => {


		// console.log(own_user, "OWM USER")
      if (!own_user) return;

      const start_of_day = moment(date).startOf('day').format('YYYY-MM-DD');
      const end_of_day = moment(date).endOf('day').format('YYYY-MM-DD');

      // Fetch bettings from SQLite
    //   let localBettings = await get_local_bettings({
    //     owner_id: own_user.id,
    //     is_deleted: 0,
    //     timestamp_from: start_of_day,
    //     timestamp_to: end_of_day,
    //     orderBy: 'updated_at DESC',
    //     limit: 20,
    //   });

	 const localBettings = await get_local_bettings({
        owner_id: own_user.id,
        date: date, // selected date from DatePicker
      });
      setBettings(localBettings);
	
      // Fetch draws from SQLite
      let localDraws = await get_local_draws({
        draw_date_from: start_of_day,
        draw_date_to: end_of_day,
      });

    //   setBettings(localBettings);
      setDraws(localDraws);
    })();
  }, [date, includeAll, own_user]);

  const onChange = (event, selected_date) => {
    if (event?.type === 'neutralButtonPressed') {
      setShow(Platform.OS === 'ios');
      setDate(moment().toDate());
    } else if (event?.type === 'set') {
      setShow(Platform.OS === 'ios');
      setDate(selected_date || date);
    } else {
      setShow(Platform.OS === 'ios');
    }
  };

  const showDatePicker = () => setShow(true);

  const request_notification_permission = async () => {
    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check('android.permission.POST_NOTIFICATIONS');
        if (!hasPermission) {
          await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
        }
      } catch (error) {
        console.error('Notification Permission Error:', error);
      }
    }
  };

  const handle_last_summary = async () => {
    await own_user && update_local_user_last_summary(own_user.id, date);
    setOwnUser({ ...own_user, last_summary: date });
  };

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
      <View style={{ flexGrow: 1 }}>
        <TouchableOpacity
          onPress={showDatePicker}
          style={{ backgroundColor: COLORS.white, borderRadius: 8, elevation: 4 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 5 }}>
            <Text style={{ fontSize: 20, fontWeight: '500', color: COLORS.black, paddingHorizontal: 10 }}>
              {moment(date).format('MM/DD/YYYY')}
            </Text>
            <Image source={icons.calendar} style={{ height: 40, width: 40, tintColor: COLORS.black }} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ justifyContent: 'center', alignItems: 'flex-end', marginHorizontal: 10 }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => own_user?.is_admin && able_to_set_last_summary && handle_last_summary()}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            backgroundColor: '#0a5388',
            borderColor: '#0a5388',
            borderRadius: 10,
            padding: 12,
          }}
        >
          <Image source={icons.printer} style={{ height: 25, width: 25, tintColor: COLORS.white }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderList = () => {
    let grand_gross = 0;
    let grand_hits = 0;
    let grand_comm = 0;
    let grand_net = 0;

    const grouped_bettings = ['2pm', '5pm', '9pm'].map((game_time) => {
      const bets = bettings.filter(b => b.game_time === game_time);

      let gross = bets.reduce((sum, b) => sum + Number(b.gross), 0);
      let hits = bets.reduce((sum, b) => sum + (b.winning || 0), 0);
      let comm = bets.reduce((sum, b) => sum + (b.commission || 0), 0);
      let net = gross - hits - comm;

      grand_gross += Number(gross);
      grand_hits += hits;
      grand_comm += comm;
      grand_net += net;

      return { gameTime: game_time, bettings: bets, gross, hits, comm, net };
    });

    let grossCards = grouped_bettings.map((a) => {
      const { gameTime, bettings } = a;
      const gross = bettings.reduce((n, { gross }) => Number(n) + Number(gross), 0);
      const currentDraw = draws.find(dr => dr.gameTime === gameTime);

      const isWin200 = currentDraw?.isWinTo ? getConfiguration(user, 'withWin200')?.isCheck : false;
      const winPrize = isWin200 ? getConfiguration(user, 'withWin200')?.value : getConfiguration(user, 'winStraight')?.value;

      let commsTotal = 0;
      let genCommsTotal = gross * (user?.comRate / 100);

      for (let bet of bettings) {
        commsTotal += bet.commissions.filter(coms => String(coms.referral) === String(user?._id)).reduce((n, { amount }) => n + amount, 0);
      }
      const comms = commsTotal || 0;

      const winning = bettings.reduce((n, { winning }) => n + (winning * winPrize), 0);
      const net = gross - winning - genCommsTotal;

      grand_gross += Number(gross);
      grand_comm += comms;
      grand_hits += winning;
      grand_net += net;

      return (
        <View
          key={gameTime}
          style={{
            minHeight: 100,
            borderWidth: 1,
            borderRadius: 12,
            borderColor: COLORS.white,
            backgroundColor: COLORS.white,
            marginVertical: 5,
            elevation: 4,
            shadowRadius: SIZES.radius,
            flexDirection: 'column',
            width: '100%',
          }}
        >
          <View style={{ minHeight: 40, flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: 10 }}>
            <Text style={{ color: COLORS.black, fontWeight: 'bold' }}>{gameTime}</Text>
            <Text style={{ color: COLORS.black, fontWeight: 'bold' }}>
              {currentDraw?.combination ? String(currentDraw.combination).split('').join('-') : 'Pending'}
            </Text>
          </View>

          <View style={{ borderTopWidth: 1, paddingVertical: 10, borderColor: COLORS.gray700, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around' }}>
            {['GROSS', 'HITS', 'COMM', 'NET'].map((label, idx) => {
              let value = 0;
              if (label === 'GROSS') value = gross;
              if (label === 'HITS') value = winning;
              if (label === 'COMM') value = comms;
              if (label === 'NET') value = net;

              return (
                <View
                  key={label}
                  style={{
                    width: '25%',
                    height: 55,
                    borderLeftWidth: idx === 0 ? 0 : 1,
                    borderColor: COLORS.gray700,
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    flexDirection: 'column',
                  }}
                >
                  <Text style={styles.textRow}>{label}</Text>
                  <Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10, color: label === 'NET' && net < 0 ? COLORS.red : COLORS.black }}>
                    {Number(value ?? 0).toFixed(0)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      );
    });

    return (
      <>
        {/* GRAND TOTAL CARD */}
        <View style={{ width: '100%', height: 150, alignItems: 'flex-start', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, borderColor: '#0CC27D', backgroundColor: '#0CC27D', elevation: 8, marginVertical: 10 }}>
          <View style={{ height: 50, flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: 10 }}>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>GRAND TOTAL</Text>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{moment(date).format('MM DD, YYYY')}</Text>
          </View>
          <View style={{ borderTopWidth: 1, paddingTop: 10, borderColor: COLORS.white2, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around' }}>
            {['GROSS', 'HITS', 'COMM', 'NET'].map((label, idx) => {
              let value = 0;
              if (label === 'GROSS') value = grand_gross;
              if (label === 'HITS') value = grand_hits;
              if (label === 'COMM') value = grand_comm;
              if (label === 'NET') value = grand_net;

              return (
                <View
                  key={label}
                  style={{
                    width: '25%',
                    height: 90,
                    borderLeftWidth: idx === 0 ? 0 : 1,
                    borderColor: COLORS.white2,
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    flexDirection: 'column',
                  }}
                >
                  <Text style={styles.textRow}>{label}</Text>
                  <Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10, color: label === 'NET' && value < 0 ? COLORS.red : COLORS.black }}>
                    {formatNumber(value ?? 0)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* BETTING CARDS */}
        <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>{grossCards}</View>
      </>
    );
  };

  useEffect(() => {
    request_notification_permission();
  }, []);

  return (
    <SafeAreaView style={{ ...styles.wrapper }}>
      <ScrollView style={{ width: '100%' }}>
        <View style={{ padding: 10 }}>
          {renderHeader()}

          {user && user?.role !== 'teller' && (
            <View style={{ ...styles.toggleRow }}>
              <Switch
                trackColor={{ true: '#00ED64' }}
                onValueChange={() => setIncludeAll(!includeAll)}
                value={includeAll}
              />
              <Text style={{ ...styles.toggleText, color: COLORS.black, fontWeight: '500' }}>Show All</Text>
            </View>
          )}

          {renderList()}
        </View>

        {show && (
          <DateTimePicker
            testID="dateTimePicker"
            value={date}
            mode="date"
            minimumDate={new Date(user?.is_admin && user?.last_summary ? null : user?.last_summary)}
            maximumDate={new Date(moment().toDate())}
            display="default"
            onChange={onChange}
            negativeButton={{ label: 'Cancel' }}
            neutralButton={{ label: 'Clear' }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Dashboard;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    backgroundColor: COLORS.gray300,
  },
  textRow: {
    fontWeight: 'bold',
    fontSize: 16,
    color: COLORS.black,
  },
  textRowValue: {
    color: COLORS.black,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  toggleText: {
    flex: 1,
    fontSize: 16,
  },
});
