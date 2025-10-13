import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createStackNavigator } from '@react-navigation/stack';
import { realmContext } from './RealmContext';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { OfflineModeButton } from './OfflineModeButton';
import { COLORS, icons, SIZES } from './constants';
import { Image, Text, View, PermissionsAndroid, TouchableOpacity, SafeAreaView, Modal, Alert } from 'react-native';
import { useUser } from '@realm/react';
import { useDispatch, useSelector } from 'react-redux';
import { CLOSE_ALERT_MODAL, OPEN_ALERT_MODAL, SET_COLLECTOR, SET_USER } from './redux/actions/types';
import { getConfiguration, getDeviceDetails } from './utils/helpers';
import Config from 'react-native-config';
import { Betting, Users } from './Models';
import Dashboard from './screens/Dashboard';
import { BSON } from 'realm';
import Geolocation from 'react-native-geolocation-service';
import { SyncComponent } from './components/SyncComponent';
import TicketForm from './screens/TicketForm';
import NotifService from './utils/NotificationService';
import Dashboard2 from './screens/Dashboard2';
import TicketForm3 from './screens/TicketForm3';
import ViewTicket from './screens/ViewTicket';
import ReviewScreen from './screens/ReviewScreen';
import ViewImage from './screens/ViewImage';
import TestScreen from './screens/TestScreen';
import SummaryReportUser from './screens/SummaryReportUser';
import CreateUserForm from './screens/CreateUserForm';
import ViewUserForm from './screens/ViewUserForm';
import ViewSoldOuts from './screens/ViewSoldOuts';
import TipScreen from './screens/TipScreen';
import PermissionScreen from './screens/PermissionScreen';
import CurrentLocation from './screens/CurrentLocation';
import MapScreen from './screens/MapScreen';
import UserOptionsForm from './screens/UserOptionsForm';
import VoidScreen from './screens/VoidScreen';
import Receipt from './screens/Receipt';
import Transactions from './screens/drawers/Transactions';
import Winnings from './screens/drawers/Winnings';
import Results2 from './screens/drawers/Results2';
import SummaryReport from './screens/drawers/SummaryReport';
import CancelledTickets from './screens/drawers/CancelledTickets';
import SettingsScreen from './screens/drawers/SettingsScreen';
import TellersScreen from './screens/drawers/TellersScreen';
import SoldOuts from './screens/drawers/SoldOuts';
import CoordinatorsScreen from './screens/drawers/CoordinatorsScreen';
import Messenger from './screens/Messenger';
import Inbox from './screens/drawers/Inbox';
import TestPrinter2 from './screens/TestPrinter2';
import LinearGradient from 'react-native-linear-gradient';
import moment from 'moment-timezone';
import * as Progress from 'react-native-progress';
import CustomAlertModal from './components/CustomAlertModal';
import EmptyScreen from './screens/EmptyScreen';
// import SettingsScreen from './screens/drawers/CoordinatorsScreen';

import DeviceInfo, { useDeviceName } from 'react-native-device-info';
import CashFlow from './screens/drawers/CashFlow';
import CombinationsScreen from './screens/Combinations';




const { useRealm, useQuery } = realmContext;
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const headerRight = () => {
	return <OfflineModeButton />;
};

function CustomDrawerIcon({ route, navigation, navType, selectedUser, headerTitle, }) {
	const { collector, user, summarizedUser } = useSelector(({ user }) => user);
	const { alertModal } = useSelector(({ ui }) => ui);

	const dispatch = useDispatch();
	const onwUserEmail = useUser();

	let users = useQuery(Users, doc => {
		return doc.filtered(
			'email == $0',
			collector
		);
	}, [collector])

	let ownUser = useQuery(Users, doc => {
		return doc.filtered(
			'email == $0',
			onwUserEmail.profile.email
		);
	}, [user])

	let displayName = String(onwUserEmail.profile.email).split('@')[0];


	return (
		<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
			<TouchableOpacity
				onPress={() => {
					navType == 'drawer' ? navigation.openDrawer() : navigation.goBack()
				}}
				style={{
					marginLeft: 10,
					width: 30,
					alignItems: 'center',
					justifyContent: 'center',

				}}
			>
				<Image
					source={navType == 'drawer' ? icons.drawer : icons.backHeader}
					style={{ height: 25, width: '100%', tintColor: route !== null ? COLORS.white : COLORS.black }}
				/>
			</TouchableOpacity>
			<View
				// onPress={() => navigation.navigate('Settings')}
				style={{ paddingHorizontal: 10, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
				<Text style={{ color: route !== null ? COLORS.white : COLORS.black, fontSize: 20, fontWeight: '500' }}>
					{headerTitle}
				</Text>
				{/* <SyncComponent /> */}
				<TouchableOpacity
					onLongPress={() => { ownUser[0]?.isAdmin ? navigation.navigate('View User', JSON.stringify(ownUser[0])) : console.log('Not admin') }}
					onPress={() => (getConfiguration(ownUser[0], 'mapUsers')?.isCheck && (users[0]?.coordinates == '' || users[0]?.coordinates == null)) ? dispatch({ type: OPEN_ALERT_MODAL, payload: 'maps' }) : getConfiguration(ownUser[0], 'mapUsers')?.isCheck ? navigation.navigate('MapScreen', { collector }) : selectedUser && getConfiguration(users[0], 'mapUsers')?.isCheck ? navigation.navigate('MapScreen', collector) : navigation.navigate('Settings')}
					style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
				>
					<Text style={{ fontSize: 13, fontWeight: 'bold', color: route !== null ? COLORS.white : (summarizedUser || selectedUser) ? COLORS.darkGray2 : COLORS.primary }}>{String(displayName).toUpperCase()}</Text>
					{
						selectedUser &&
						<Text style={{ fontSize: 13, fontWeight: 'bold', color: (selectedUser && summarizedUser) ? COLORS.darkGray2 : COLORS.primary }}> / {String(String(selectedUser).split('@')[0]).toUpperCase()}</Text>
					}

					{
						summarizedUser &&
						<Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.primary }}> / {String(String(summarizedUser).split('@')[0]).toUpperCase()}</Text>
					}

				</TouchableOpacity>

			</View>
		</View>
	);
}


function CustomDrawerContent(props) {
	const { collector, user, selectedUser } = useSelector(({ user }) => user);
	const realm = useRealm()


	let users = useQuery(Users, doc => {
		return doc.filtered(
			'email == $0',
			collector
		);
	}, [collector])

	let userNow = users[0] ? users[0]?._id : user?._id;
	let curUser = users[0] ? users[0] : { isAdmin: false, role: "teller" };
	const myCoordinators = realm.objects(Users).filtered('isDeleted == false && role == "coordinator" && referral == $0', String(userNow)).sorted('email');


	return (
		<SafeAreaView style={{ flex: 1 }}>
			<DrawerContentScrollView {...props}>
				<LinearGradient
					colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
				>

					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
						<DrawerItem
							label="Dashboard"
							style={{ width: '100%', backgroundColor: COLORS.primaryTransparent2, borderRadius: 12 }}
							// headerTitleStyle={{ borderWidth: 1,}}
							labelStyle={{ textAlign: 'left', fontSize: 20, color: COLORS.secondary, fontWeight: '500' }}
							onPress={() => props.navigation.navigate('Dashboard')}
							icon={() => {
								return (
									<View style={{ width: '20%', alignItems: 'center', justifyContent: 'center', }}>
										<Image
											source={icons.reactivate_account}
											style={{ height: 25, width: 25, tintColor: COLORS.black }}
										/>
									</View>
								)
							}}
						/>
					</View>

					{getConfiguration(users[0], 'ticketForm')?.isCheck &&
						<>
							<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
								<DrawerItem
									label="Play"
									onPress={() => props.navigation.navigate('Play')}
									style={{ width: '100%', backgroundColor: COLORS.primaryTransparent2, borderRadius: 12 }}
									labelStyle={{ textAlign: 'left', fontSize: 20, color: COLORS.secondary, fontWeight: '500' }}
									icon={() => {
										return (
											<View style={{ width: '20%', alignItems: 'center', justifyContent: 'center', }}>
												<Image
													source={icons.reactivate_account}
													style={{ height: 25, width: 25, tintColor: COLORS.black }}
												/>
											</View>
										)
									}}
								/>
							</View>

							<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
								<DrawerItem
									label="Transactions"
									onPress={() => props.navigation.navigate('Transactions')}
									style={{ width: '100%', backgroundColor: COLORS.primaryTransparent2, borderRadius: 12 }}
									labelStyle={{ textAlign: 'left', fontSize: 20, color: COLORS.secondary, fontWeight: '500' }}
									icon={() => {
										return (
											<View style={{ width: '20%', alignItems: 'center', justifyContent: 'center', }}>
												<Image
													source={icons.reactivate_account}
													style={{ height: 25, width: 25, tintColor: COLORS.black }}
												/>
											</View>
										)
									}}
								/>
							</View>

							<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
								<DrawerItem
									label="Winnings"
									onPress={() => props.navigation.navigate('Winnings')}
									style={{ width: '100%', backgroundColor: COLORS.primaryTransparent2, borderRadius: 12 }}
									// style={{ width: '80%'}}
									labelStyle={{ textAlign: 'left', fontSize: 20, color: COLORS.secondary, fontWeight: '500' }}
									icon={() => {
										return (
											<View style={{ width: '20%', alignItems: 'center', justifyContent: 'center', }}>
												<Image
													source={icons.reactivate_account}
													style={{ height: 25, width: 25, tintColor: COLORS.black }}
												/>
											</View>
										)
									}}
								/>
							</View>

							<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
								<DrawerItem
									label="Results"
									onPress={() => props.navigation.navigate('Results')}
									style={{ width: '100%', backgroundColor: COLORS.primaryTransparent2, borderRadius: 12 }}
									// style={{ width: '80%'}}
									labelStyle={{ textAlign: 'left', fontSize: 20, color: COLORS.secondary, fontWeight: '500' }}
									icon={() => {
										return (
											<View style={{ width: '20%', alignItems: 'center', justifyContent: 'center', }}>
												<Image
													source={icons.reactivate_account}
													style={{ height: 25, width: 25, tintColor: COLORS.black }}
												/>
											</View>
										)
									}}
								/>
							</View>

							<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
								<DrawerItem
									label="Summary Report"
									onPress={() => props.navigation.navigate('Summary Report')}
									// style={{ width: '80%'}}
									style={{ width: '100%', backgroundColor: COLORS.primaryTransparent2, borderRadius: 12 }}
									labelStyle={{ textAlign: 'left', fontSize: 20, color: COLORS.secondary, fontWeight: '500' }}
									icon={() => {
										return (
											<View style={{ width: '20%', alignItems: 'center', justifyContent: 'center', }}>
												<Image
													source={icons.reactivate_account}
													style={{ height: 25, width: 25, tintColor: COLORS.black }}
												/>
											</View>
										)
									}}
								/>
							</View>
						</>

					}

					{curUser.isAdmin &&
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
							<DrawerItem
								label="Cancelled Tickets"
								onPress={() => props.navigation.navigate('CancelledTickets')}
								// style={{ width: '80%'}}
								style={{ width: '100%', backgroundColor: COLORS.primaryTransparent2, borderRadius: 12 }}
								labelStyle={{ textAlign: 'left', fontSize: 20, color: COLORS.secondary, fontWeight: '500' }}
								icon={() => {
									return (
										<View style={{ width: '20%', alignItems: 'center', justifyContent: 'center', }}>
											<Image
												source={icons.reactivate_account}
												style={{ height: 25, width: 25, tintColor: COLORS.black }}
											/>
										</View>
									)
								}}
							/>
						</View>
					}



					{getConfiguration(users[0], 'coordinators')?.isCheck &&
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>

							{/* Icon container */}
							{/* <View style={{ width: '10%', alignItems: 'center', justifyContent: 'center', padding: 4}}>
							<Image 
								source={icons.reactivate_account}
								style={{ height: 30, width: 30, resizeMode: 'contain' }}
							/>	
						</View> */}

							{/* Drawer Title */}
							<DrawerItem
								icon={() => {
									return (
										<View style={{ width: '20%', alignItems: 'center', justifyContent: 'center', }}>
											<Image
												source={icons.reactivate_account}
												style={{ height: 25, width: 25, tintColor: COLORS.black }}
											/>
										</View>
									)
								}}
								style={{ width: '100%', backgroundColor: COLORS.primaryTransparent2, borderRadius: 12 }}
								label="Coordinators"
								// headerTitleStyle={{}}
								labelStyle={{ textAlign: 'left', fontSize: 20, color: COLORS.secondary, fontWeight: '500' }}
								onPress={() => props.navigation.navigate('CoordinatorsScreen')}
							/>

							{/* Badge Data Count */}
							<View
								style={{
									position: 'absolute',
									width: '20%',
									alignItems: 'center',
									justifyContent: 'center',
									paddingVertical: 10
								}}
							>
								<View style={{ backgroundColor: COLORS.primary, borderColor: COLORS.primary, borderRadius: SIZES.radius, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
									<Text style={{ color: COLORS.white, fontSize: 12, textAlign: 'center' }}>
										{myCoordinators.length}
									</Text>
								</View>
							</View>
						</View>
					}

					{getConfiguration(users[0], 'tellers')?.isCheck &&
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
							<DrawerItem
								label="Tellers"
								onPress={() => props.navigation.navigate('TellersScreen')}
								style={{ width: '100%', backgroundColor: COLORS.primaryTransparent2, borderRadius: 12 }}
								labelStyle={{ textAlign: 'left', fontSize: 20, color: COLORS.secondary, fontWeight: '500' }}
								icon={() => {
									return (
										<View style={{ width: '20%', alignItems: 'center', justifyContent: 'center', }}>
											<Image
												source={icons.reactivate_account}
												style={{ height: 25, width: 25, tintColor: COLORS.black }}
											/>
										</View>
									)
								}}
							/>
						</View>
					}
					{getConfiguration(users[0], 'soldouts')?.isCheck &&
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
							<DrawerItem
								label="Sold Outs"
								onPress={() => props.navigation.navigate('Sold Outs')}
								style={{ width: '100%', backgroundColor: COLORS.primaryTransparent2, borderRadius: 12 }}
								labelStyle={{ textAlign: 'left', fontSize: 20, color: COLORS.secondary, fontWeight: '500' }}
								icon={() => {
									return (
										<View style={{ width: '20%', alignItems: 'center', justifyContent: 'center', }}>
											<Image
												source={icons.reactivate_account}
												style={{ height: 25, width: 25, tintColor: COLORS.black }}
											/>
										</View>
									)
								}}
							/>
						</View>
					}

					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
						<DrawerItem
							label="Settings"
							onPress={() => props.navigation.navigate('Settings')}
							style={{ width: '100%', backgroundColor: COLORS.primaryTransparent2, borderRadius: 12 }}
							labelStyle={{ textAlign: 'left', fontSize: 20, color: COLORS.secondary, fontWeight: '500' }}
							icon={() => {
								return (
									<View style={{ width: '20%', alignItems: 'center', justifyContent: 'center', }}>
										<Image
											source={icons.reactivate_account}
											style={{ height: 25, width: 25, tintColor: COLORS.black }}
										/>
									</View>
								)
							}}
						/>
					</View>

					{/* <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: "flex-end"}}>
	<Text style={{ color: COLORS.black}}>
		Logout
	</Text>
  </View> */}
					{/* <View style={{ flex: 1, borderWidth: 1}}>
  <DrawerItem 
	  label={"Logout"}
	onPress={() => signOut()}
  />
  
  </View> */}
					{/* Additional Custom Content */}
				</LinearGradient>

			</DrawerContentScrollView>
		</SafeAreaView>
	);
};


const DrawerNavigation = (granted) => {
	const { collector, user, selectedUser } = useSelector(({ user }) => user);
	const realm = useRealm()
	const today = moment().tz('Asia/Manila').toDate();
	const startOfDay = moment(today).startOf('day').toDate();
	const endOfDay = moment(today).endOf('day').toDate();


	const onwUserEmail = useUser();
	let collectorName = selectedUser ? selectedUser : collector;



	let users = useQuery(Users, doc => {
		return doc.filtered(
			'email == $0',
			collectorName
		);
	}, [collectorName, selectedUser])




	let curUser = users[0] ? users[0] : { isAdmin: false, role: "teller" };
	let userNow = users[0] ? users[0]?._id : user?._id;

	const myCoordinators = useQuery(Users, coordinatorsData => {
		return coordinatorsData.filtered(`isDeleted == false && role == "coordinator" && referral == $0`, String(userNow)).sorted('email')
	}, [users[0], realm])

	const myTellers = useQuery(Users, tellersData => {
		return tellersData.filtered(`isDeleted == false &&  role == "teller" && referral == $0`, String(userNow)).sorted('email')
	}, [users[0], realm])

	const myTickets = useQuery(Betting, bettingData => {
		return bettingData.filtered(`timestamp >= $0 && timestamp < $1 && owner_id == $2`, startOfDay, endOfDay, String(userNow)).sorted('timestamp', true)
	}, [collectorName, realm])

	// const myCoordinators = realm.objects(Users).filtered('isDeleted == false && role == "coordinator" && referral == $0', String(userNow)).sorted('email');
	// const myTellers = realm.objects(Users).filtered('isDeleted == false &&  role == "teller" && referral == $0', String(userNow)).sorted('email');
	// const myTickets = realm.objects(Betting).filtered('timestamp >= $0 && timestamp < $1 && owner_id == $2', startOfDay, endOfDay, String(userNow)).sorted('timestamp', true)
	const myCancelledTickets = myTickets.filter(ticket => { return ticket.isDeleted == true });
	const myCreatedTickets = myTickets.filter(ticket => { return ticket.isDeleted == false });


	return (
		<Drawer.Navigator
			// initialRouteName='Ticket Form3'
			// drawerContentContainerStyle={{ backgroundColor: COLORS.transparent }}
			// drawerContent={(props) => <CustomDrawerContent {...props} />}
			screenOptions={{
				// drawerAllowFontScaling: false,
				overlayColor: 'rgba(138, 133, 133, 0.59)',
				drawerType: 'slide',
				drawerStyle: {
					// backgroundColor: COLORS.transparent, // Makes the drawer background transparent
					elevation: 0, // Removes shadow on Android
					shadowOpacity: 0, // Removes shadow on iOS
					width: '55%', // Adjust width if necessary
				},
				sceneContainerStyle: {
					// backgroundColor: 'rgba(255, 255, 255, 0)', // Makes the main screen background transparent
				},
				swipeEdgeWidth: 100,
				swipeEnabled: true,

				drawerContentStyle: {
					// backgroundColor: COLORS.white,
					backgroundColor: 'rgba(255, 255, 255, 0.16)', // Makes the main screen background transparent
				}
			}}
		>
			<Drawer.Screen
				name="Dashboard"
				// options={{ title: `${'Howdy' + ' ' + String(collector.split('@')[0]).toUpperCase() + '-24'}`, drawerLabel: 'Dashboard', headerTitleAlign: 'left', headerRight }} 
				options={({ navigation }) => ({
					// headerTitleAlign: 'left',
					headerTitle: '',
					drawerAllowFontScaling: true,
					drawerLabel: `Dashboard`,
					drawerActiveBackgroundColor: COLORS.secondaryTransparent,
					drawerInactiveTintColor: COLORS.secondary,
					drawerActiveTintColor: COLORS.white,
					drawerItemStyle: {
						right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
						width: '95%',
						justifyContent: 'space-between',
					},
					drawerLabelStyle: { fontSize: 16, fontWeight: 'bold', },
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Dashboard'} />
					),
					headerRight: () => (
						<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
							<SyncComponent />
						</View>
					),
					drawerIcon: ({ focused }) => (
						<View style={{ paddingHorizontal: 20, }}>
							<Image
								source={icons.dashboard}
								style={{ height: 20, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
							/>
						</View>
					)
				})
				}
				component={Dashboard}
			/>

			{getConfiguration(users[0], 'ticketForm')?.isCheck &&

				<Drawer.Screen
					name="Play"
					component={TicketForm}
					options={({ navigation }) => ({
						headerTitle: '',
						drawerAllowFontScaling: true,
						headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
						drawerActiveBackgroundColor: COLORS.secondaryTransparent,
						drawerInactiveTintColor: COLORS.secondary,
						drawerActiveTintColor: COLORS.white,
						// drawerItemStyle: { borderRadius: 12, width: '90%', alignSelf: 'center' },
						drawerItemStyle: {
							right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
							width: '95%',
							justifyContent: 'space-between',

						},
						drawerLabelStyle: { fontSize: 16, fontWeight: 'bold', },
						headerLeft: () => (
							<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Play'} />
						),
						headerRight: () => (
							<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
								<SyncComponent />
								{/* <View style={{ width: '30%', alignItems: 'center'}}> */}
								{/* <TouchableOpacity
										onPress={() => navigation.navigate('Inbox')}
										style={{ borderWidth: 1, padding: 2, borderColor: COLORS.primary, backgroundColor: '#0a5388', borderRadius: 10,  shadowRadius: 10, alignItems: 'center', justifyContent: 'center', }}
									>
										<Image 
											source={icons.messenger}
											style={{ height: 35, width: 35, resizeMode: 'contain', tintColor: COLORS.white}}
										/>
									</TouchableOpacity> */}
								{/* </View> */}
							</View>
						),
						drawerIcon: ({ focused }) => (
							<View style={{ paddingHorizontal: 20, }}>
								<Image
									source={icons.play}
									style={{ height: 20, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
								/>
							</View>
						)
					})}
				/>
			}
			{getConfiguration(users[0], 'ticketForm')?.isCheck &&
				<Drawer.Screen
					name="Winnings"
					options={({ navigation }) => ({
						headerTitle: '',
						drawerAllowFontScaling: true,
						// headerTitleStyle: { color: COLORS.black },
						drawerActiveBackgroundColor: COLORS.secondaryTransparent,
						drawerInactiveTintColor: COLORS.secondary,
						drawerActiveTintColor: COLORS.white,
						// drawerItemStyle: { borderRadius: 12, width: '90%', alignSelf: 'center' },
						drawerItemStyle: {
							right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
							width: '95%',
							justifyContent: 'space-between',

						},
						drawerLabelStyle: { fontSize: 16, fontWeight: 'bold', },
						drawerLabel: 'Winnings',
						headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
						headerLeft: () => (
							<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Winnings'} />
						),
						headerRight: () => (
							<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
								<SyncComponent />
								{/* <View style={{ width: '30%', alignItems: 'center'}}> */}
								{/* <TouchableOpacity
										onPress={() => navigation.navigate('Inbox')}
										style={{ borderWidth: 1, padding: 2, borderColor: COLORS.primary, backgroundColor: '#0a5388', borderRadius: 10,  shadowRadius: 10, alignItems: 'center', justifyContent: 'center', }}
									>
										<Image 
											source={icons.messenger}
											style={{ height: 35, width: 35, resizeMode: 'contain', tintColor: COLORS.white}}
										/>
									</TouchableOpacity> */}
								{/* </View> */}
							</View>
						),
						drawerIcon: ({ focused }) => (
							<View style={{ paddingHorizontal: 20 }}>
								<Image
									source={icons.winnings}
									style={{ height: 20, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
								/>
							</View>
						)
					})}
					component={Winnings}
				/>
			}
			{getConfiguration(users[0], 'ticketForm')?.isCheck &&
				<Drawer.Screen name="Transactions" component={Transactions} options={({ navigation }) => ({
					headerTitle: '',
					// drawerLabel: `${myCreatedTickets.length > 0 ? 'Transactions' + '   ' + '(' + myCreatedTickets.length + ')' : 'Transactions'}`,
					drawerLabel: ({ focused }) => {
								return (
									<View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
										<View style={{ width: '70%', alignItems: 'flex-start', justifyContent: 'center' }}>
										<Text style={{ fontSize: 14, fontWeight: 'bold', color: focused ? COLORS.white : COLORS.secondary }}>
											Transactions
											{/* {
												myCoordinators.length > 0 ? "Coordinators" : 'Coordinators'
											} */}
										</Text>
										</View>
										<View style={{ width: '30%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6}}>
										<Text style={{ paddingHorizontal: 10, fontSize: 12, fontWeight: 'bold', color: focused ? COLORS.white : COLORS.secondary,  }}>
											{myCreatedTickets.length > 100 ? '99+' : !myCreatedTickets.length ? '' : myCreatedTickets.length }
										</Text>
										</View>
									</View>
								)
							},
					drawerAllowFontScaling: true,
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					drawerActiveBackgroundColor: COLORS.secondaryTransparent,
					drawerInactiveTintColor: COLORS.secondary,
					drawerActiveTintColor: COLORS.white,
					drawerLabelStyle: { fontSize: 16, fontWeight: 'bold' },
					// drawerItemStyle: { borderRadius: 12, width: '90%', alignSelf: 'center' },

					drawerItemStyle: {
						right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
						width: '95%',
						justifyContent: 'space-between',

					},

					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Transactions'} />
					),
					headerRight: () => (
						<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
							<SyncComponent />
							{/* <View style={{ width: '30%', alignItems: 'center'}}> */}
							{/* <TouchableOpacity
									onPress={() => navigation.navigate('Inbox')}
									style={{ borderWidth: 1, padding: 2, borderColor: COLORS.primary, backgroundColor: '#0a5388', borderRadius: 10,  shadowRadius: 10, alignItems: 'center', justifyContent: 'center', }}
								>
									<Image 
										source={icons.messenger}
										style={{ height: 35, width: 35, resizeMode: 'contain', tintColor: COLORS.white}}
									/>
								</TouchableOpacity> */}
							{/* </View> */}
						</View>
					),
					drawerIcon: ({ focused }) => (
						<View style={{ paddingHorizontal: 20 }}>
							<Image
								source={icons.tickets}
								style={{ height: 20, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
							/>
						</View>
					)
				})} />
			}

			{(getConfiguration(users[0], 'cashFlow')?.isCheck && curUser?.isAdmin) &&
				<Drawer.Screen name="CashFlow" component={CashFlow} options={({ navigation }) => ({
					headerTitle: '',
					drawerAllowFontScaling: true,
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					drawerLabel: 'Cash Flow',
					// drawerLabel: `${myCreatedTickets.length > 0 ? 'Transactions' + '   ' + '(' + myCreatedTickets.length + ')' : 'Transactions'}`,
					drawerActiveBackgroundColor: COLORS.secondaryTransparent,
					drawerInactiveTintColor: COLORS.secondary,
					drawerActiveTintColor: COLORS.white,
					drawerLabelStyle: { fontSize: 16, fontWeight: 'bold' },
					// drawerItemStyle: { borderRadius: 12, width: '90%', alignSelf: 'center' },
					drawerItemStyle: {
						right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
						width: '95%',
						justifyContent: 'space-between',

					},

					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Cash Flow'} />
					),
					headerRight: () => (
						<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
							<SyncComponent />
							{/* <View style={{ width: '30%', alignItems: 'center'}}> */}
							{/* <TouchableOpacity
									onPress={() => navigation.navigate('Inbox')}
									style={{ borderWidth: 1, padding: 2, borderColor: COLORS.primary, backgroundColor: '#0a5388', borderRadius: 10,  shadowRadius: 10, alignItems: 'center', justifyContent: 'center', }}
								>
									<Image 
										source={icons.messenger}
										style={{ height: 35, width: 35, resizeMode: 'contain', tintColor: COLORS.white}}
									/>
								</TouchableOpacity> */}
							{/* </View> */}
						</View>
					),
					drawerIcon: ({ focused }) => (
						<View style={{ paddingHorizontal: 20 }}>
							<Image
								source={icons.cashFlow}
								style={{ height: 25, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
							/>
						</View>
					)
				})} />
			}

			{curUser?.isAdmin &&
				<Drawer.Screen name="CancelledTickets" component={CancelledTickets} options={({ navigation }) => ({
					// drawerLabel: 'Cancelled Tickets',
					// drawerLabel: `${myCancelledTickets.length > 0 ? 'Cancelled Tickets' + '  ' + '(' + myCancelledTickets.length + ')' : 'Cancelled Tickets'}`,
					drawerLabel: ({ focused }) => {
								return (
									<View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
										<View style={{ width: '70%', alignItems: 'flex-start', justifyContent: 'center' }}>
										<Text style={{ fontSize: 14, fontWeight: 'bold', color: focused ? COLORS.white : COLORS.secondary }}>
											Cancelled Tickets
											{/* {
												myCoordinators.length > 0 ? "Coordinators" : 'Coordinators'
											} */}
										</Text>
										</View>
										<View style={{ width: '30%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6}}>
										<Text style={{ paddingHorizontal: 10, fontSize: 12, fontWeight: 'bold', color: focused ? COLORS.white : COLORS.secondary,  }}>
											{myCancelledTickets.length > 100 ? '99+' : !myCancelledTickets.length ? '' : myCancelledTickets.length }
										</Text>
										</View>
									</View>
								)
							},
					headerTitle: '',
					drawerAllowFontScaling: true,
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					drawerActiveBackgroundColor: COLORS.secondaryTransparent,
					drawerInactiveTintColor: COLORS.secondary,
					drawerActiveTintColor: COLORS.white,
					// drawerItemStyle: { borderRadius: 12, width: '90%', alignSelf: 'center' },
					drawerItemStyle: {
						right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
						width: '95%',
						justifyContent: 'space-between',

					},
					drawerLabelStyle: { fontSize: 16, fontWeight: 'bold', },
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Cancelled Tickets'} />
					),
					headerRight: () => (
						<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
							<SyncComponent />
							{/* <View style={{ width: '30%', alignItems: 'center'}}> */}
							{/* <TouchableOpacity
									onPress={() => navigation.navigate('Inbox')}
									style={{ borderWidth: 1, padding: 2, borderColor: COLORS.primary, backgroundColor: '#0a5388', borderRadius: 10,  shadowRadius: 10, alignItems: 'center', justifyContent: 'center', }}
								>
									<Image 
										source={icons.messenger}
										style={{ height: 35, width: 35, resizeMode: 'contain', tintColor: COLORS.white}}
									/>
								</TouchableOpacity> */}
							{/* </View> */}
						</View>
					),
					drawerIcon: ({ focused }) => (
						<View style={{ paddingHorizontal: 20 }}>
							<Image
								source={icons.cancelled_ticket}
								style={{ height: 20, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
							/>
						</View>
					)

				})} />
			}

			<Drawer.Screen name="Inbox" component={Inbox} options={({ navigation }) => ({
				// drawerLabel: 'Cancelled Tickets',
				// drawerLabel: `${myCancelledTickets.length > 0 ? 'Cancelled Tickets' + '  ' + '(' + myCancelledTickets.length + ')' : 'Cancelled Tickets'}`,
				// drawerLabel: 'Messages',
				drawerLabel: ({ focused }) => {
								return (
									<View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
										<View style={{ width: '70%', alignItems: 'flex-start', justifyContent: 'center' }}>
										<Text style={{ fontSize: 14, fontWeight: 'bold', color: focused ? COLORS.white : COLORS.secondary }}>
											Messages
											{/* {
												myCoordinators.length > 0 ? "Coordinators" : 'Coordinators'
											} */}
										</Text>
										</View>
										{/* <View style={{ width: '30%', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 6}}>
										<Text style={{ paddingHorizontal: 10, borderRadius: 12, backgroundColor: focused ? COLORS.white : COLORS.success500, fontSize: 12, fontWeight: 'bold', color: COLORS.secondary, }}>
											{myCoordinators.length > 100 ? '99+' : myCoordinators.length } new
										</Text>
										</View> */}
									</View>
								)
							},
				headerTitle: '',
				drawerAllowFontScaling: true,
				headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
				drawerActiveBackgroundColor: COLORS.secondaryTransparent,
				drawerInactiveTintColor: COLORS.secondary,
				drawerActiveTintColor: COLORS.white,
				// drawerItemStyle: { borderBottomWidth: .5, borderRadius: 12, width: '90%', alignSelf: 'center' },
				drawerItemStyle: {
					right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
					width: '95%',
					justifyContent: 'space-between',

				},
				drawerLabelStyle: { fontSize: 16, fontWeight: 'bold', },
				headerLeft: () => (
					<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Messages'} />
				),
				headerRight: () => (
					<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
						<SyncComponent />
						{/* <View style={{ width: '30%', alignItems: 'center'}}> */}
						{/* <TouchableOpacity
									onPress={() => navigation.navigate('Inbox')}
									style={{ borderWidth: 1, padding: 2, borderColor: COLORS.primary, backgroundColor: '#0a5388', borderRadius: 10,  shadowRadius: 10, alignItems: 'center', justifyContent: 'center', }}
								>
									<Image 
										source={icons.messenger}
										style={{ height: 35, width: 35, resizeMode: 'contain', tintColor: COLORS.white}}
									/>
								</TouchableOpacity> */}
						{/* </View> */}
					</View>
				),
				drawerIcon: ({ focused }) => (
					<View style={{ paddingHorizontal: 20 }}>
						<Image
							source={icons.send_message}
							style={{ height: 20, width: 20, resizeMode: 'contain' }}
						/>
					</View>
				)

			})} />

			{(getConfiguration(users[0], 'coordinators')?.isCheck || getConfiguration(users[0], 'tellers')?.isCheck) &&
				<>
					<Drawer.Screen name="CoordinatorsScreen"
						options={({ navigation }) => ({
							headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
							drawerLabel: ({ focused }) => {
								return (
									<View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
										<View style={{ width: '70%', alignItems: 'flex-start', justifyContent: 'center' }}>

										<Text style={{ fontSize: 14, fontWeight: 'bold', color: focused ? COLORS.white : COLORS.secondary }}>
											Coordinators
											{/* {
												myCoordinators.length > 0 ? "Coordinators" : 'Coordinators'
											} */}
										</Text>
										</View>
										<View style={{ width: '30%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6}}>
										<Text style={{ paddingHorizontal: 10, fontSize: 12, fontWeight: 'bold', color: focused ? COLORS.white : COLORS.secondary, }}>
											{myCoordinators.length > 100 ? '99+' : !myCoordinators.length ? '' : myCoordinators.length }
										</Text>
										</View>
									</View>
								)
							},
							// drawerLabel: `${myCoordinators.length > 0 ? "Coordinators" + "   " + '(' + myCoordinators.length + ')' : 'Coordinators'}`,
							// drawerLabel: `Coordinators (${myCoordinators.length})`,
							headerTitle: '',
							drawerAllowFontScaling: true,
							drawerActiveBackgroundColor: COLORS.secondaryTransparent,
							drawerInactiveTintColor: COLORS.secondary,
							drawerActiveTintColor: COLORS.white,
							// drawerItemStyle: { borderRadius: 12, width: '90%', alignSelf: 'center' },
							drawerItemStyle: {
right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
								width: '95%',
								justifyContent: 'space-between',

							},

							drawerLabelStyle: { fontSize: 16, fontWeight: 'bold', },
							headerLeft: () => (
								<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Coordinators'} />
							),
							headerRight: () => (
								<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
									<SyncComponent />
									{/* <View style={{ width: '30%', alignItems: 'center'}}> */}
									{/* <TouchableOpacity
										onPress={() => navigation.navigate('Inbox')}
										style={{ borderWidth: 1, padding: 2, borderColor: COLORS.primary, backgroundColor: '#0a5388', borderRadius: 10,  shadowRadius: 10, alignItems: 'center', justifyContent: 'center', }}
									>
										<Image 
											source={icons.messenger}
											style={{ height: 35, width: 35, resizeMode: 'contain', tintColor: COLORS.white}}
										/>
									</TouchableOpacity> */}
									{/* </View> */}
								</View>
							),
							drawerIcon: ({ focused }) => (
								<View style={{ paddingHorizontal: 20 }}>
									<Image
										source={icons.coordinator}
										style={{ height: 20, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
									/>
								</View>
							)
						})}
						component={CoordinatorsScreen} />
					<Drawer.Screen name="TellersScreen"
						options={({ navigation }) => ({
							headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
							headerTitle: '',
							drawerActiveBackgroundColor: COLORS.secondaryTransparent,
							drawerInactiveTintColor: COLORS.secondary,
							drawerActiveTintColor: COLORS.white,
							// drawerItemStyle: { borderRa
							drawerAllowFontScaling: true,
							// drawerLabel: `${myTellers.length > 0 ? 'Tellers' + '  ' + '(' + myTellers.length + ')' : 'Tellers'}`,
							drawerLabel: ({ focused }) => {
								return (
									<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
										<View style={{ width: '70%', alignItems: 'flex-start', justifyContent: 'center' }}>
										<Text style={{ fontSize: 14, fontWeight: 'bold', color: focused ? COLORS.white : COLORS.secondary }}>
											Tellers
											{/* {
												myCoordinators.length > 0 ? "Coordinators" : 'Coordinators'
											} */}
										</Text>
										</View>
										<View style={{ width: '30%', paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center'}}>
										<Text style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: focused ? COLORS.white : COLORS.secondary, }}>
											{myTellers.length > 100 ? '99+' : !myTellers.length ? '' : myTellers.length }
										</Text>
										</View>
									</View>
								)
							},
							drawerItemStyle: {
								right: 14,
								borderTopRightRadius: SIZES.radius / 3,
								borderBottomRightRadius: SIZES.radius / 3,
								width: '95%',
								justifyContent: 'space-between',

							},
							drawerLabelStyle: { fontSize: 16, fontWeight: 'bold', },
							headerLeft: () => (
								<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Tellers'} />
							),
							headerRight: () => (
								<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
									<SyncComponent />
									{/* <View style={{ width: '30%', alignItems: 'center'}}> */}
									{/* <TouchableOpacity
										onPress={() => navigation.navigate('Inbox')}
										style={{ borderWidth: 1, padding: 2, borderColor: COLORS.primary, backgroundColor: '#0a5388', borderRadius: 10,  shadowRadius: 10, alignItems: 'center', justifyContent: 'center', }}
									>
										<Image 
											source={icons.messenger}
											style={{ height: 35, width: 35, resizeMode: 'contain', tintColor: COLORS.white}}
										/>
									</TouchableOpacity> */}
									{/* </View> */}
								</View>
							),
							drawerIcon: ({ focused }) => (
								<View style={{ paddingHorizontal: 20 }}>
									<Image
										source={icons.teller}
										style={{ height: 20, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
									/>
								</View>
							)
						})}
						component={TellersScreen} />
				</>
			}
			{getConfiguration(users[0], 'ticketForm')?.isCheck &&
				<Drawer.Screen
					name="Results"
					component={Results2}
					options={({ navigation }) => ({
						headerTitle: '',
						drawerAllowFontScaling: true,
						headerTitleStyle: { color: COLORS.black },
						drawerActiveBackgroundColor: COLORS.secondaryTransparent,
						drawerInactiveTintColor: COLORS.secondary,
						drawerActiveTintColor: COLORS.white,
						// drawerItemStyle: { borderRadius: 12, width: '90%', alignSelf: 'center' },
						drawerItemStyle: {
							right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
							width: '95%',
							justifyContent: 'space-between',

						},

						drawerLabelStyle: { fontSize: 16, fontWeight: 'bold', },
						drawerLabel: 'Results',
						headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
						headerRight: () => (
							<TouchableOpacity
								onPress={() => navigation.navigate('ViewTip', {})}
								style={{
									marginRight: 20,
									width: 30,
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<Text
									style={{
										fontWeight: 'bold',
										fontSize: 15,
										color: COLORS.primary
									}}
								>Tip</Text></TouchableOpacity>),
						headerLeft: () => (
							<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Results'} />
						),
						drawerIcon: ({ focused }) => (
							<View style={{ paddingHorizontal: 20 }}>
								<Image
									source={icons.results}
									style={{ height: 20, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
								/>
							</View>
						)
					})
					}
				/>
			}
			{getConfiguration(users[0], 'ticketForm')?.isCheck &&
				<Drawer.Screen name="Summary Report" component={SummaryReport} options={({ navigation }) => ({
					headerTitle: '',
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					drawerActiveBackgroundColor: COLORS.secondaryTransparent,
					drawerInactiveTintColor: COLORS.secondary,
					drawerAllowFontScaling: true,
					drawerActiveTintColor: COLORS.white,
					// drawerItemStyle: { borderRadius: 12, width: '90%', alignSelf: 'center' },
					drawerItemStyle: {
						right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
						width: '95%',
						justifyContent: 'space-between',

					},

					drawerLabelStyle: { fontSize: 16, fontWeight: 'bold', },
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Summary Report'} />
					),
					headerRight: () => (
						<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
							<SyncComponent />
						</View>
					),
					drawerIcon: ({ focused }) => (
						<View style={{ paddingHorizontal: 20 }}>
							<Image
								source={icons.summary}
								style={{ height: 20, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
							/>
						</View>
					)
				})} />

			}



			{getConfiguration(users[0], 'soldouts')?.isCheck &&
				<>
					<Drawer.Screen name="Sold Outs"
						options={({ navigation }) => ({
							headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
							headerTitle: '',
							drawerLabel: 'Sold Outs',
							drawerAllowFontScaling: true,
							drawerActiveBackgroundColor: COLORS.secondaryTransparent,
							drawerInactiveTintColor: COLORS.secondary,
							drawerActiveTintColor: COLORS.white,
							drawerItemStyle: {
								right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
								width: '95%',
								justifyContent: 'space-between',

							},
							// drawerItemStyle: { borderRadius: 12, width: '90%', alignSelf: 'center' },

							drawerLabelStyle: { fontSize: 16, fontWeight: 'bold', },
							headerLeft: () => (
								<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Sold Outs'} />
							),
							headerRight: () => (
								<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
									<SyncComponent />
								</View>
							),
							drawerIcon: ({ focused }) => (
								<View style={{ paddingHorizontal: 20 }}>
									<Image
										source={icons.soldout}
										style={{ height: 20, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
									/>
								</View>
							)
						})}
						component={SoldOuts} />
				</>
			}
			<Drawer.Screen name="Settings"
				options={({ navigation }) => ({
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					drawerLabel: 'Settings',
					headerTitle: '',
					drawerAllowFontScaling: true,
					drawerActiveBackgroundColor: COLORS.secondaryTransparent,
					drawerInactiveTintColor: COLORS.secondary,
					drawerActiveTintColor: COLORS.white,
					// drawerItemStyle: { borderRadius: 12, width: '90%', alignSelf: 'center' },
					drawerItemStyle: {
						right: 14,
						borderTopRightRadius: SIZES.radius / 3,
						borderBottomRightRadius: SIZES.radius / 3,
						width: '95%',
						justifyContent: 'space-between',

					},

					drawerLabelStyle: { fontSize: 16, fontWeight: 'bold', },
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={'Settings'} />
					),
					headerRight: () => (
						<OfflineModeButton />
					),
					drawerIcon: ({ focused }) => (
						<View style={{ paddingHorizontal: 20 }}>
							<Image
								source={icons.settings}
								style={{ height: 20, width: 20, resizeMode: 'contain', tintColor: focused ? COLORS.white : COLORS.secondary }}
							/>
						</View>
					)
				})}
				component={SettingsScreen} />
		</Drawer.Navigator>
	);
};


const StackNavigates = ({ navigation }) => {
	const { selectedUser, user } = useSelector(({ user }) => user);
	const dispatch = useDispatch();
	const realm = useRealm()
	const ownUser = useUser();
	const { loading, result } = useDeviceName(); // { loading: true, result: "Becca's iPhone 6"}




	console.log(loading, result, "LODS RES")


	const signOut = useCallback(async (userId) => {
		let user = realm.objectForPrimaryKey(Users, BSON.ObjectId(userId));
		if (user?.deviceId == 'revoke') {
			realm.write(() => {
				user.deviceId = '';
			});
		}
		await ownUser?.logOut();
		dispatch({ type: SET_COLLECTOR, payload: null })
		dispatch({ type: SET_USER, payload: null })
	}, [ownUser, dispatch]);

	// Check if deviceMacAddress is same with current device

	const checkAndUpdateUserDevice = async (userId) => {

		console.log('cheking')


		try {
			let user = realm.objectForPrimaryKey(Users, BSON.ObjectId(userId));



			console.log(user, "USEEEEEEEEEEER@@@@")


			const deviceDetails = DeviceInfo.getUniqueId().then((uniqueId) => {
				console.log(uniqueId, "<<<<< DEVICE UNIQUE ID HERE!")
				console.log(user?.deviceId, "EXISTING USER DEVICE ID")

				if (user?.deviceId !== '' && user?.deviceId && user?.deviceId !== uniqueId) {
					console.log('NOT MATCH DEVICE ID')
					// INFORM USER THAT YOU CAN ONLY USE ONE DEVICE PER USER
					Alert.alert('This device is not recognized.',
						'Contact your administrator for assistance.',
						[
							//  {text: 'Ask me later', onPress: () => console.log('Ask me later pressed')},
							//  {text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
							{ text: 'OK', onPress: () => signOut(user._id) },
						]
					)
				} else if (!user?.deviceId) {
		/* 			realm.write(() => {
						user.deviceId = uniqueId;
					}); */
				}

			});
		} catch (error) {
			console.error("Failed to update user device:", error);
		}
	};




	useEffect(() => {
		async function validateDevice() {
			if (user) {
				let userDevice = await checkAndUpdateUserDevice(user._id)
				console.log(userDevice, "THE DEVICE ID")
			}
		}

		// Comment out the function below when DEVELOPMENT mode.
		// validateDevice();
	}, [user])

	return (
		<Stack.Navigator
		>
			<Stack.Screen
				name="Drawer"
				component={DrawerNavigation}
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="VoidScreen"
				component={VoidScreen}
				options={({ navigation, route }) => ({
					headerTitle: '',
					headerTitleStyle: { color: COLORS.white },
					headerStyle: { backgroundColor: COLORS.secondary },
					headerLeft: () => (
						<CustomDrawerIcon route={route} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'View Ticket'} />
					),
				})}
			/>
			<Stack.Screen
				name="Receipt"
				component={Receipt}
				options={({ navigation }) => ({
					title: 'Receipt Template',
					headerTitleStyle: { color: COLORS.white },
					headerStyle: { backgroundColor: COLORS.secondary },
					headerLeft: () => (
						<TouchableOpacity
							onPress={() => navigation.goBack()}
							style={{ padding: 10, alignItems: 'center', justifyContent: 'center', }}
						>
							<Image
								source={icons.back}
								style={{
									height: 20,
									width: 20,
									tintColor: COLORS.white
								}} />
						</TouchableOpacity>),
				})}
			/>
			<Stack.Screen name="TestPrinter" component={TestPrinter2} options={({ navigation, route }) => ({
				headerTitle: '',
				headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
				headerLeft: () => (
					<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Test Printer'} />
				),
			})
			}
			/>
			<Stack.Screen
				name="Dashboard2"
				component={Dashboard2}
				options={({ navigation }) => ({
					title: 'Dashboard',
					headerTitleAlign: 'left',
					drawerLabel: 'Dashboard',
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={null} headerTitle={'Settings'} />
					),
				})}
			/>
			<Stack.Screen
				name="UpdateTicket"
				component={TicketForm3}
				options={({ navigation }) => ({
					headerTitle: '',
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={null} headerTitle={'Update Ticket'} />
					),
				})}
			/>
			<Stack.Screen
				name="Winning Ticket"
				component={ViewTicket}
				options={({ navigation }) => ({
					headerTitle: '',
					headerTitleStyle: { color: COLORS.black, fontWeight: 'bold' },
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Winning Ticket'} />
					),
				})}
			/>
			<Stack.Screen
				name="ViewTicket"
				component={ReviewScreen}
				options={({ navigation, route }) => ({
					headerTitle: '',
					headerTitleStyle: { color: COLORS.white },
					headerStyle: { backgroundColor: COLORS.secondary },
					headerLeft: () => (
						<CustomDrawerIcon route={route} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'View Ticket'} />
					),
				})}
			/>
			<Stack.Screen
				name="ViewImage"
				component={ViewImage}
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="Test"
				component={TestScreen}
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				component={SummaryReportUser}
				name="UserSummaryReport"
				options={({ navigation }) => ({
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					headerTitle: '',
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Summary Report'} />
					),
					headerRight: () => (
						<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
							<SyncComponent />
						</View>
					),
				})
				}
			/>
			<Stack.Screen
				component={CreateUserForm}
				name="Create User"
				options={({ navigation }) => ({
					drawerLabel: () => null,
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					headerTitle: '',
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Create User'} />
					),
				})
				}
			/>
			<Stack.Screen
				component={ViewUserForm}
				name="View User"
				options={({ navigation }) => ({
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					headerTitle: '',
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'View User'} />
					),
					headerRight: () => (
						user?.isAdmin ?
							<TouchableOpacity
								onPress={() => navigation.navigate('UserOptions', JSON.stringify({ selectedUser }))}
								style={{ padding: 10, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
								<Text style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.primary }}>Options</Text>
							</TouchableOpacity> : null),
				})
				}
			/>
			<Stack.Screen name="ViewSoldOut" component={ViewSoldOuts}
				options={({ navigation }) => ({
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					headerTitle: '',
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'View Sold-out'} />
					),
				})}
			/>
			<Stack.Screen name="ViewTip" component={TipScreen}
				options={({ navigation }) => ({
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					headerTitle: '',
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'View Tip'} />
					),
				})
				}
			/>
			<Stack.Screen
				name="Permissions"
				component={PermissionScreen}
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="CurrentLocation"
				component={CurrentLocation}
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="MapScreen"
				component={MapScreen}
				options={{ headerShown: false }}
			/>
			<Stack.Screen name="UserOptions" component={UserOptionsForm}
				options={({ navigation }) => ({
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					headerTitle: '',
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'User Options'} />
					),
				})
				}
			/>
			<Stack.Screen name="Messenger" component={Messenger}
				options={({ navigation }) => ({
					headerShown: false,
				})
				}
			/>
			<Stack.Screen name="EmptyScreen" component={EmptyScreen}
				options={({ navigation }) => ({
					headerShown: false,
				})
				}
			/>
			<Stack.Screen
				name="Combinations"
				component={CombinationsScreen}
				options={({ navigation, route }) => ({
					headerTitle: '',
					headerTitleStyle: { color: COLORS.white },
					headerStyle: { backgroundColor: COLORS.secondary },
					headerLeft: () => (
						<CustomDrawerIcon route={route} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Combinations'} />
					),
				})}
			/>
		</Stack.Navigator>
	)
}

export function StackNavigator({ navigation }) {
	const { loading, alertModal } = useSelector(({ ui }) => ui);
	const userRealm = useUser();
	const realm = useRealm()
	const dispatch = useDispatch();
	const [isModalVisible, setModalVisible] = useState(false);
	const { collector, user } = useSelector(({ user }) => user);
	let { email } = userRealm.profile;

	// Initialize Notifications
	const notif = useMemo(() => new NotifService((reg) => console.log("Initializing Push notification", reg)), []);

	let users = useQuery(Users, doc => {
		return doc.filtered(
			'email == $0',
			email
		);
	}, [email])

	const handleInitUser = () => {
		console.log('Authenticated User:', email)
		if (!collector) {
			dispatch({ type: SET_COLLECTOR, payload: email })
		}

		if (users[0]) {
			let configuration = users[0].configuration;
			let userObject = {
				_id: users[0]._id,
				email: users[0].email,
				firstName: users[0].firstName,
				lastName: users[0].lastName,
				appVersion: users[0].appVersion,
				commission: users[0].commission,
				comPortion: users[0].comPortion,
				comRate: users[0].comRate,
				isAdmin: users[0].isAdmin,
				uplines: users[0].uplines,
				coordinates: users[0].uplines,
				lastSummary: users[0].lastSummary,
				receiptTemplate: users[0].receiptTemplate,
				configuration: users[0].configuration
			}
			dispatch({ type: SET_USER, payload: userObject })
		}

		if (users[0] && (Config.APP_VERSION != users[0]?.appVersion)) {
			setModalVisible(true)
		}
	}

	const requestLocationPermission = async () => {
		try {
			const granted = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
				{
					title: 'Geolocation Permission',
					message: 'Can we access your location?',
					buttonNeutral: 'Ask Me Later',
					buttonNegative: 'Cancel',
					buttonPositive: 'OK',
				},
			);
			// console.log('granted', granted);
			if (granted === 'granted') {
				console.log('You can use Geolocation');
				return true;
			} else {
				console.log('You cannot use Geolocation');
				return false;
			}
		} catch (err) {
			return false;
		}
	};

	const getCurrentLocation = () => {
		const result = requestLocationPermission();
		result.then(res => {
			if (res) {
				Geolocation.getCurrentPosition(
					position => {
						let { coords } = position;
						if (users[0]) {
							realm.write(async () => {
								users[0].coordinates = `${coords.latitude}|${coords.longitude}`;
							})
						}
					},
					error => {
						console.log(error.code, error.message);
					},
					{ enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
				);
			}
		});
	};

	useEffect(() => {
		if (email) {
			handleInitUser()
		}
	}, [users])

	useEffect(() => {
		if (email) {
			getCurrentLocation()
		}
	}, [realm])

	useEffect(() => {
		if (email) {
			if (getConfiguration(users[0], 'soldouts')?.isCheck) {
				notif.cancelAllNotif()
				notif.scheduleNotif()
				console.log('Current user is included to allowed users for Push Notification')
			} else {
				console.log('User not Included to allowed users for Push Notification')
			}
		}
	}, [])

	return (
		<SafeAreaProvider>
			<NavigationContainer>
				<CustomAlertModal
					visible={alertModal == 'maps' ? true : false}
					onClose={() => {
						dispatch({ type: CLOSE_ALERT_MODAL, payload: null });
						// setConfirmTecket(null)
						// setUserToUpdate(null);
					}}
					title={'Confirmation'}
					message={`User location not found.`}
					handleConfirm={() => {
						dispatch({ type: CLOSE_ALERT_MODAL, payload: null });
					}}
				/>
				{
					loading &&
					<Modal
						visible={true}
						transparent={true}
						animationType='fade'
					>
						<View
							style={{
								flex: 1,
								width: '100%',
								alignItems: 'center',
								justifyContent: 'center',
								backgroundColor: COLORS.transparentBlack7
							}}
						>

							<Progress.CircleSnail color={['blue', 'yellow', 'red']} />
						</View>
					</Modal>
				}
				<StackNavigates />
			</NavigationContainer>
		</SafeAreaProvider>
	)
}