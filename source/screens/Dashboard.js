import { SafeAreaView, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Switch, Platform, PermissionsAndroid } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import { COLORS, SIZES } from '../constants/theme'
import icons from '../constants/icons'
import moment from 'moment-timezone'
import { realmContext } from '../RealmContext'
import { Betting, Draws, Users, Combinations, Messages } from '../Models';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector, useDispatch } from 'react-redux';
import { formatNumber, getConfiguration } from '../utils/helpers';
import { SET_LOADING, STOP_LOADING } from '../redux/actions/types';
import Config from 'react-native-config'

const { useRealm, useQuery } = realmContext;

const ownItemsSubscriptionName = 'bettings';
const drawsSubscriptionName = 'draws';
const combinationsSubscriptionName = 'combinations';
const usersSubscriptionName = 'users';

const Dashboard = ({ navigation }) => {
	const realm = useRealm();
	const dispatch = useDispatch();
	const { collector, user } = useSelector(({ user }) => user);
	const [date, setDate] = useState(new Date());
	const [show, setShow] = useState(false);
	const [includeAll, setIncludeAll] = useState(false);

	const ableToSetLastSummary = getConfiguration(user, 'lastSummaryReport')?.isCheck;

	console.log(user.appVersion, 'the user')
	
	const users = useQuery(Users, (doc) => doc.filtered('email == $0', collector), [collector]);
	const userNow = users[0] ? users[0]?._id : "";
	
	const items = useQuery(Betting, data => {
		
		let startOfDay = moment(date).startOf('day').toDate();
		let endOfDay = moment(date).endOf('day').toDate();
	
		if (new Date(date) <= new Date(users[0]?.lastSummary)) {
			startOfDay = moment().add(1, 'd').endOf('day').toDate();
			endOfDay = moment().add(1, 'd').endOf('day').toDate();
		}

		if (includeAll) {
			return data.filtered('ANY uplines == $0 && isDeleted == false && inputType == "normal" && timestamp >= $1 && timestamp < $2', String(userNow), startOfDay, endOfDay)
		} else {
			return data.filtered('isDeleted == false && inputType == "normal" && owner_id == $0 && timestamp >= $1 && timestamp < $2', String(userNow), startOfDay, endOfDay)
		}

		// return data;
	}, [date, includeAll, users]);

	const draws = useQuery(Draws, digit => {
		
		let startOfDay = moment(date).startOf('day').toDate();
		let endOfDay = moment(date).endOf('day').toDate();
	
		return digit
		.filtered(
			'drawDate > $0 && drawDate < $1',
			startOfDay, endOfDay
		)
		.sorted('drawDate')
	}, [date]);

	const onChange = (event, selectedDate) => {
		const currentDate = selectedDate || date;
		console.log(event?.type, "THE EVENT")
		if (event?.type == 'neutralButtonPressed') {
		  setShow(Platform.OS === 'ios');
		//   setFilterDate(false)
		  setDate(moment().toDate());
		  // return
		} else if (event?.type == 'set') {
		  setShow(Platform.OS === 'ios');
		  setDate(currentDate);
		  setFilterDate(true);
		} else if (event?.type == 'dismissed') {
		  setShow(Platform.OS === 'ios');
		  setDate(date);
		  // setFilterDate(false)
		}
	  };

	const showDatePicker = () => {
		setShow(true);
	};

	const requestNotificationPermission = async () => {
		if (Platform.OS === 'android') {
		  try {
			const hasPermission = await PermissionsAndroid.check('android.permission.POST_NOTIFICATIONS');
			if (!hasPermission) {
			  await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS', {
				title: 'Notification Permission',
				message: 'App needs access to send notifications for updates.',
				buttonNeutral: 'Ask Me Later',
				buttonNegative: 'Cancel',
				buttonPositive: 'OK',
			  });
			}
		  } catch (error) {
			console.error('Notification Permission Error:', error);
		  }
		}
	  };
	
	const handleLastSummary = async () => {
		realm.write(() => {
			users[0].lastSummary = date;
		});
	}
	
	
	function renderHeader() {
		return (
			<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
				<TouchableOpacity
					activeOpacity={.9}
					onPress={showDatePicker}
					style={{ width: '80%', backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.white, borderRadius: 8, elevation: 4 }}
				>
					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
						<Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{date == undefined || '' ? '' : moment(date).format('MM/DD/YYYY')}</Text>
						<Image
							source={icons.calendar}
							style={{ height: 40, width: 40, tintColor: COLORS.black }}
						/>
					</View>
				</TouchableOpacity>
				<View
						style={{
							alignItems: 'flex-end',
							justifyContent: 'center',
							width: '20%', 
						}}
					>
				<TouchableOpacity
					// disabled={ableToSetLastSummary ? false : true}
					// onPress={() => navigation.navigate('Receipt')}
					activeOpacity={.9}
					onLongPress={() => user?.isAdmin && ableToSetLastSummary ? handleLastSummary() : console.log('Not Admin')}
					// onPress={() => navigation.navigate('Inbox', {})}
					style={{
						alignItems: 'center',
						justifyContent: 'center',
						borderWidth: 1,
						backgroundColor: '#0a5388',
						borderColor: '#0a5388',
						borderRadius: 10,
						padding: 12,
						width: '80%',
						// baseWidth: 1,
						// elevation: 4,
						shadowRadius: 6
						// paddingHorizontal: 6,
					}}
				>
					
						<Image
							source={icons.printer}
							style={{ height: 30, width: 30, resizeMode: 'contain', tintColor: COLORS.white }}
						/>
				</TouchableOpacity>
					</View>
			</View>
		)
	}

	const renderList = (data) => {
		let grandGross = 0;
		let grandHits = 0;
		let grandComm = 0;
		let grandNet = 0;

		let grossCards = data.map((a, index) => {
			let { gameTime, bettings } = a;
			let gross = bettings.reduce((n, { gross }) => n + gross, 0);
			let currentDraw = draws.filter(dr => dr.gameTime == gameTime)[0];

			
			let isWin200 = currentDraw?.isWinTo ? getConfiguration(users[0], 'withWin200')?.isCheck : false;
			let winPrize = isWin200 ? getConfiguration(users[0], 'withWin200').value : getConfiguration(users[0], 'winStraight').value

			grandGross = grandGross + gross;
			let commsTotal = 0
			let genCommsTotal = 0;

			for (let bet of bettings) {
				commsTotal += bet.commissions.filter(coms => String(coms.referral) == String(users[0]?._id)).reduce((n, { amount }) => n + amount, 0);
			}
			genCommsTotal += gross * (users[0]?.comRate / 100);
			let comms = commsTotal ? commsTotal : 0;
			grandComm = grandComm + comms;
			let winning = bettings.reduce((n, { winning }) => n + (winning * winPrize), 0);

			let net = gross - winning - genCommsTotal;
			grandHits = grandHits + winning;
			grandNet = grandNet + net;

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
						width: '100%'
					}}>
					<View style={{ minHeight: 40, flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: 10 }}>
						<Text style={{ color: COLORS.black, fontWeight: 'bold' }}>
							{gameTime}
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
							{moment(date).format('MM DD, YYYY')}
						</Text>

					</View>
					<View style={{ borderTopWidth: 1, paddingTop: 10, borderColor: COLORS.white2, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around' }}>
						<View style={{ width: '25%', height: 90, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={styles.textRow}>
								GROSS
							</Text>
							<Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
					            {formatNumber(grandGross)}
							</Text>
						</View>
						<View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={{ ...styles.textRow, fontFamily: 'Poppins-Italic', }}>
								HITS
							</Text>
							<Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>

								{formatNumber(grandHits)}
							</Text>
						</View>
						<View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={{ ...styles.textRow }}>
								COMM
							</Text>
							<Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
								{formatNumber(grandComm)}
							</Text>
						</View>
						<View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
							<Text style={{ ...styles.textRow }}>
								NET
							</Text>
							<Text style={{ fontWeight: 'bold', textAlign: 'center', paddingTop: 10, color: Math.sign(formatNumber(grandNet)) == -1 ? COLORS.red : COLORS.black }}>
								{formatNumber(grandNet ? grandNet : 0)}

							</Text>
						</View>
					</View>
				</View>


				<View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', justifyContent: '' }}>
					{grossCards}
				</View>

			</>

		)
	}

	useEffect(() => {
		let lastDate = users[0]?.lastSummary ? moment(users[0]?.lastSummary).startOf('day').toDate() : moment().startOf('day').toDate();
		let lastDraw = moment().subtract(21, 'days').startOf('day').toDate()


		let data = realm.objects(Betting).filtered('ANY uplines == $0 || owner_id == $0 && timestamp > $1', String(user?._id), lastDate);
		let drawsDataArray = realm.objects(Draws).filtered('drawDate > $0', lastDraw);;

		let messages = realm.objects(Messages).filtered(`isDeleted == false && createdBy == $0 || recepient == $0`, String(user?._id))
		
		const currentUser = realm.objects(Users);
		let combinationsData = realm.objects(Combinations);


		realm.subscriptions.update(mutableSubs => {
			mutableSubs.removeByName(ownItemsSubscriptionName);
			mutableSubs.add(data, { name: ownItemsSubscriptionName });
			mutableSubs.add(messages);
			mutableSubs.add(combinationsData, { name: combinationsSubscriptionName });
			mutableSubs.add(currentUser, { name: usersSubscriptionName });
			mutableSubs.add(drawsDataArray, { name: drawsSubscriptionName });
		});
	}, [realm, user]);


	useEffect(() => {
		requestNotificationPermission();
	}, [])


	useEffect(() => {
		// requestNotificationPermission();
		dispatch({ type: SET_LOADING })
		let loadData = setTimeout(() => {
			dispatch({ type: STOP_LOADING })
		}, 10000)
		return () => clearTimeout(loadData);
	}, [])
	
	let bets2pm = items.filter(item => item.gameTime == '2pm');
	let bets5pm = items.filter(item => item.gameTime == '5pm');
	let bets9pm = items.filter(item => item.gameTime == '9pm');


	console.log("DASHBOARD SCREEN")

	return (
		<SafeAreaView style={{ ...styles.wrapper }}>
			<ScrollView style={{ width: '100%' }}>
				<View style={{ padding: 10, }}>
					{renderHeader()}
					{users[0] && users[0]?.role !== 'teller' &&
						<View style={{ ...styles.toggleRow }}>
							<Switch
								trackColor={{ true: '#00ED64' }}
								onValueChange={() => {
									if (realm.syncSession?.state !== 'active') {
										Alert.alert(
											'Switching subscriptions does not affect Realm data when the sync is offline.',
										);
									}
									setIncludeAll(!includeAll);
								}}
								value={includeAll}
							/>
							<Text style={{ ...styles.toggleText, color: COLORS.black, fontWeight: '500' }}>Show All</Text>
						</View>
					}
					{renderList([{ gameTime: '2pm', bettings: bets2pm }, { gameTime: '5pm', bettings: bets5pm }, { gameTime: '9pm', bettings: bets9pm }])}
				</View>
				{show ?
					<DateTimePicker
						testID="dateTimePicker"
						value={date}
						mode="date"
						minimumDate={new Date(users[0]?.isAdmin && users[0]?.lastSummary ? null : users[0]?.lastSummary)}
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
	)
}

export default Dashboard

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		alignItems: 'center',
		width: '100%',
		// justifyContent: 'flex-start',
		justifyContent: 'center',
		backgroundColor: COLORS.gray300,
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