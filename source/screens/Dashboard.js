import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, Switch, Alert, Image, Platform, PermissionsAndroid, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment-timezone';
import { useSelector, useDispatch } from 'react-redux';
import { COLORS, SIZES } from '../constants/theme';
import icons from '../constants/icons';
import { formatNumber, getConfiguration } from '../utils/helpers';
// import { useOffline } from '../context/OfflineProvider';
// import { useOfflineSync } from '../context/OfflineSyncProvider';

import {
  fetchUser, api
} from "../utils/offlineSync";
import { useSync } from '../context/SyncContext';

const Dashboard = ({ navigation }) => {
//   const { dataVersion, api } = useOfflineSync()
  
  const {  lastSync } = useSync();
  const { user, collector, selectedUser } = useSelector(({user}) => user);

  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [includeAll, setIncludeAll] = useState(false);

  const [own_user, setOwnUser] = useState(null);
  const [bettings, setBettings] = useState([]);
  const [draws, setDraws] = useState([]);



  const able_to_set_last_summary = getConfiguration(user ? user : { is_admin: false, role: 'teller', configurations: [] }, 'lastSummaryReport')?.isCheck;


  // Load bettings & draws offline-first


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
    // Update local DB last_summary
    console.log('Last Summary Updated')
    await api.updateUser(own_user.id, {last_summary: moment(new Date(date)).tz("Asia/Manila").endOf('day').toISOString()});
    setOwnUser({ ...own_user, last_summary: date });
  };

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
      <TouchableOpacity
        onPress={showDatePicker}
        style={{ width: '85%', flexDirection: 'row', borderWidth: 1, backgroundColor: COLORS.white, borderRadius: 8, elevation: 4 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 5, width: '100%' }}>
          <Text style={{ fontSize: 20, fontWeight: '500', color: COLORS.black, paddingHorizontal: 6 }}>
            {moment(date).format('MM/DD/YYYY')}
          </Text>
          <Image source={icons.calendar} style={{ height: 40, width: 40, tintColor: COLORS.black }} />
        </View>
      </TouchableOpacity>

      <View style={{ width: '15%', justifyContent: 'center', alignItems: 'flex-end' }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => (user?.is_admin || able_to_set_last_summary) && handle_last_summary()}
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
          <Image source={icons.printer} style={{ height: 30, width: 30, tintColor: COLORS.white }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderList = (bettings) => {
    let grand_gross = 0;
    let grand_hits = 0;
    let grand_comm = 0;
    let grand_net = 0;

    const grouped_bettings = ['2pm', '5pm', '9pm'].map((game_time) => {
      const bets = bettings.filter(b => b.game_time === game_time);

      let gross = bets.reduce((sum, b) => Number(sum) + Number(b.gross), 0);
      let hits = bets.reduce((sum, b) => Number(sum) + Number(b.winning || 0), 0);
      let comm = bets.reduce((sum, b) => Number(sum) + Number(b.commission || 0), 0);
      let net = gross - hits - comm;
	
			// let winning = bettings.reduce((n, { winning }) => n + (winning * winPrize), 0);

      grand_gross += Number(gross);
    //   grand_hits += hits;
    //   grand_comm += comm;
    //   grand_net += net;
      return { game_time: game_time, bettings: bets, gross, hits, comm, net };
    });





	let grossCards = grouped_bettings.map((a, index) => {
			let { game_time, bettings, gross, hits, comm } = a;
			let currentDraw = draws.filter(dr => dr.game_time == game_time)[0];
			let isWin200 = currentDraw?.is_win_to ? getConfiguration(own_user, 'withWin200')?.isCheck : false;
			let winPrize = isWin200 ? getConfiguration(own_user, 'withWin200').value : getConfiguration(own_user, 'winStraight').value
				
			// grand_gross = Number(grand_gross) + Number(gross);
			let commsTotal = 0
			let genCommsTotal = 0;

			for (let bet of bettings) {
				if(bet?.commissions){
						commsTotal += bet?.commissions?.filter(coms => String(coms.referral) == String(own_user?.id)).reduce((n, { amount }) => n + amount, 0);
				}
			}
			genCommsTotal += gross * (own_user?.com_rate / 100);
			let comms = commsTotal ? commsTotal : 0;
			grand_comm = grand_comm + comms;
			let winning = hits * winPrize;

			let net = gross - winning - genCommsTotal;
			grand_hits = grand_hits + winning;
			grand_net = grand_net + net;
// console.log(game_time, 'ggg')
			return (
				<View
					key={game_time}
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
						width: '100%'
					}}>
					<View style={{ minHeight: 40, flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: 10 }}>
						<Text style={{ color: COLORS.black, fontWeight: 'bold' }}>
							{game_time}
						</Text>
						<Text style={{ color: COLORS.black, fontWeight: 'bold' }}>
							{currentDraw && currentDraw.combination ? String(currentDraw.combination).split('').join('-') : 'Pending'}
						</Text>

					</View>
					<View style={{ borderTopWidth: 1, paddingVertical: 10, borderColor: COLORS.gray700, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around' }}>
						<View style={{ width: '25%', height: 55, borderColor: COLORS.gray700, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={styles.textRow}>
								GROSS
							</Text>
							<Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
								{Number(gross).toFixed(0)}
							</Text>
						</View>
						<View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.gray700, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={{ ...styles.textRow }}>
								HITS
							</Text>
							<Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>

								{Number(winning).toFixed(0)}
							</Text>
						</View>
						<View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.gray700, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={{ ...styles.textRow }}>
								COMM
							</Text>
							<Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
								{Number(comms).toFixed(0)}
							</Text>
						</View>
						<View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.gray700, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={{ ...styles.textRow }}>
								NET
							</Text>
							<Text style={{ fontWeight: '400', textAlign: 'center', paddingTop: 10, color: Math.sign(Number(net)) == -1 ? COLORS.red : COLORS.black }}>
								{Number(net ? net : 0).toFixed(0)}
							</Text>
						</View>
					</View>
				</View>
			)
		})



    return (
      <>
      <View style={{ width: '100%', height: 150, alignItems: 'flex-start', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, borderColor: '#0CC27D', backgroundColor: '#0CC27D', elevation: 8, marginVertical: 10 }}>
					<View style={{ height: 50, flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: 10 }}>
						<Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>
							GRAND TOTAL
						</Text>
						<Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>
							{moment(date).format('MMMM DD, YYYY')}
						</Text>

					</View>
					<View style={{ borderTopWidth: 1, paddingTop: 10, borderColor: COLORS.white2, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around' }}>
						<View style={{ width: '25%', height: 90, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={styles.textRow}>
								GROSS
							</Text>
							<Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
					            {formatNumber(grand_gross)}
							</Text>
						</View>
						<View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={{ ...styles.textRow, fontFamily: 'Poppins-Italic', }}>
								HITS
							</Text>
							<Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>

								{formatNumber(grand_hits)}
							</Text>
						</View>
						<View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={{ ...styles.textRow }}>
								COMM
							</Text>
							<Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
								{formatNumber(grand_comm)}
							</Text>
						</View>
						<View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={{ ...styles.textRow }}>
								NET
							</Text>
							<Text style={{ fontWeight: 'bold', textAlign: 'center', paddingTop: 10, color: Math.sign(formatNumber(grand_net)) == -1 ? COLORS.red : COLORS.black }}>
								{formatNumber(grand_net ? grand_net : 0)}

							</Text>
						</View>
					</View>
				</View>


				<View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', justifyContent: '' }}>
					{grossCards}
				</View>

      
        {/* GRAND TOTAL */}

        {/* BETTING CARDS */}
       
      </>
    );
  };

  useEffect(() => {
    setOwnUser(selectedUser)
    request_notification_permission();
  }, [selectedUser, collector]);
  
  useEffect(() => {
  
  console.log('SOMETHING CHANGED', collector);
  setBettings([]);
  setDraws([]);
  
    (async () => {
      if (!collector) return;
		let selectedCollector = await fetchUser(collector);
		

//   const today = new Date().toISOString(); 

// Start and end of the day
const start_of_day = moment(new Date(date)).tz("Asia/Manila").startOf('day').toISOString();
const end_of_day = moment(new Date(date)).tz("Asia/Manila").endOf('day').toISOString();

// Build filters
let filters = {
	is_deleted: false,
	input_type: "normal"
};

if (includeAll) {
  filters = {
    ...filters,
    uplines: { op: "contains", value: [selectedCollector.id] },
    timestamp: { op: "between", from: start_of_day, to: end_of_day },
  };
} else {
  filters = {
    ...filters,
    owner_id: selectedCollector.id,
    timestamp: { op: "between", from: start_of_day, to: end_of_day },
  };
}



      let localBettings = await api.listBettings({
        filters: {...filters, input_type: 'normal'},
        orderBy: 'timestamp DESC',
        bulk: true
        // limit: 20,
      });



    

      let localDraws = await api.listDraws({
       filters: { 
        draw_date:  { 
           op: "between",
	      from: start_of_day,
	      to: end_of_day,
        }}
      });
      
      setBettings(localBettings);
      setDraws(localDraws);
    })();
    
    return () => {


	}
  }, [date, includeAll, own_user, lastSync]);


console.log(bettings.length, 'BETS', draws.length, own_user?.email)


  return (
  	<SafeAreaView style={{ ...styles.wrapper }}>
			<ScrollView style={{ width: '100%' }}>
				<View style={{ padding: 10, }}>
					{renderHeader()}
					{user && user?.role !== 'teller' &&
						<View style={{ ...styles.toggleRow }}>
							<Switch
								trackColor={{ true: '#00ED64' }}
								onValueChange={() => {
								/* 	if (realm.syncSession?.state !== 'active') {
										Alert.alert(
											'Switching subscriptions does not affect Realm data when the sync is offline.',
										);
									} */
									setIncludeAll(!includeAll);
								}}
								value={includeAll}
							/>
							<Text style={{ ...styles.toggleText, color: COLORS.black, fontWeight: '500' }}>Show All</Text>
						</View>
					}
					{renderList(bettings)}
				</View>
				{show ?
					<DateTimePicker
						testID="dateTimePicker"
						value={date}
						mode="date"
						minimumDate={new Date(user?.is_admin && user?.last_summary ? null : user?.last_summary)}
						maximumDate={new Date(moment().toDate())}
						display="default"
						onChange={onChange}
						negativeButton={{ label: "Cancel", }}
						neutralButton={{ label: "Clear", }}
					/>
					:
					null
					} 
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
		// justifyContent: 'flex-start',
		justifyContent: 'center',
		backgroundColor: '#f1f1f1',
		// padding: 10
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
		paddingVertical: 6
	},
	toggleText: {
		flex: 1,
		fontSize: 16
	},
})