import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, Image, Alert, TouchableOpacity, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import supabase from './utils/supabaseClient';
import { SessionContext } from './context/SessionContext';
import { SET_USER, SET_COLLECTOR } from './redux/actions/types';
import { COLORS, SIZES, icons } from './constants';
import NotifService from './utils/NotificationService';
import Dashboard from './screens/Dashboard';
import TicketForm from './screens/TicketForm';
import Winnings from './screens/drawers/Winnings';
import Transactions from './screens/drawers/Transactions';
import SettingsScreen from './screens/drawers/SettingsScreen';
import CustomDrawerIcon from './components/CustomDrawerIcon';
import { getConfiguration, getDayRange, requestLocationPermission, useDeviceCheck } from './utils/helpers';
import CashFlow from './screens/drawers/CashFlow';
import CancelledTickets from './screens/drawers/CancelledTickets';
import Inbox from './screens/drawers/Inbox';
import CoordinatorsScreen from './screens/drawers/CoordinatorsScreen';
import TellersScreen from './screens/drawers/TellersScreen';
import Results2 from './screens/drawers/Results2';
import SummaryReport from './screens/drawers/SummaryReport';
import SoldOuts from './screens/drawers/SoldOuts';
import ReviewScreen from './screens/ReviewScreen';
import Receipt from './screens/Receipt';
import ViewTicket from './screens/ViewTicket';
import VoidScreen from './screens/VoidScreen';
import PermissionScreen from './screens/PermissionScreen';
import TipScreen from './screens/TipScreen';
import ViewSoldOuts from './screens/ViewSoldOuts';
import TestPrinter2 from './screens/TestPrinter2';
import TicketForm3 from './screens/TicketForm3';
import Messenger from './screens/Messenger';
import SummaryReportUser from './screens/SummaryReportUser';
import ViewUserForm from './screens/ViewUserForm';
import UserOptionsForm from './screens/UserOptionsForm';
import { WelcomeView } from './WelcomeView';
import ViewShot from './screens/ViewShot';
import moment from 'moment-timezone';
import { fetchDraws } from './redux/actions/bettingActions';
import MapScreen from './screens/MapScreen';
import { fetchUserByEmail, signOut, updateUser } from './redux/actions/user.actions';
import DeviceInfo, { useDeviceName } from 'react-native-device-info';
import { api } from './utils/offlineSync';
import { verifyDeviceForUser, verifyRequiredPermissions } from './utils/deviceAuth';
import LoginDevices from './screens/LoginDevices';
import { SyncComponent } from './components/SyncComponent';
import CombinationsScreen from './screens/Combinations';
import UsersTree from './screens/UsersTree';
import FormSheet from './screens/FormSheet';
import { useNavigation } from '@react-navigation/native';
import { PermissionsAndroid } from 'react-native';



const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const DrawerNavigation = () => {
  const { user, collector, selectedUser } = useSelector(state => state.user);
  const curUser = selectedUser ? selectedUser : user;

    const [draws, setDraws] = useState([]);
  const [latestDraw, setLatestDraw] = useState(null);
  const dispatch = useDispatch();

  const fetchDrawItems = async () => {
  try {
    // 1. Compute date range
    let endDate = moment().tz("Asia/Manila").subtract(1, 'days');
    let startDate = moment().tz("Asia/Manila").subtract(7, "days");

      const { start_of_day, end_of_day  } = getDayRange( startDate, endDate)

      console.log(start_of_day, end_of_day, "start_of_day, end_of_daystart_of_day, end_of_day")
    

    // 2. Fetch all draws within range
        let localDraws = await dispatch(fetchDraws({ 
          draw_date:  { 
            op: "between",
            from: start_of_day,
            to: end_of_day,
          }
        }));

    // 3. Parse into proper format
    const parsedDraws = localDraws.map(draw => ({
      ...draw,
      draw_date: new Date(draw.draw_date),
      game_time: draw.game_time,        // IMPORTANT: must be present
      combination: draw.combination,
      is_win_to: draw.is_win_to
    }));

    setDraws(parsedDraws);

    // ---------------------------
    // 4. GROUP BY DATE
    // ---------------------------
    const groupsByDate = parsedDraws.reduce((acc, draw) => {
      const dateKey = moment(draw.draw_date).format("YYYY-MM-DD");
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(draw);
      return acc;
    }, {});

    // ---------------------------
    // 5. FIND LATEST COMPLETED DRAW DAY (2PM, 5PM, 9PM)
    // ---------------------------
    const sortedDates = Object.keys(groupsByDate).sort().reverse(); // latest first

    let latestCompleted = null;

    for (const date of sortedDates) {
      const items = groupsByDate[date];

      const has2pm = items.some(d => d.game_time === "2pm");
      const has5pm = items.some(d => d.game_time === "5pm");
      const has9pm = items.some(d => d.game_time === "9pm");

      if (has2pm && has5pm && has9pm) {
        latestCompleted = {
          date,
          draws: items
        };
        break;
      }
    }

    // 6. Save latest completed draw
    if (latestCompleted) {
      setLatestDraw(latestCompleted); // <-- You add this state
    } else {
      setLatestDraw(null);
    }

  } catch (err) {
    console.error("Error fetching draws:", err);
  }
  };


  const generateDrawerScreenOptions = (label, icon, headerTitle, navigation) => ({
    headerTitle: '',
    drawerActiveBackgroundColor: COLORS.secondaryTransparent,
    drawerInactiveTintColor: COLORS.secondary,
    drawerActiveTintColor: COLORS.white,
    drawerLabel: label,
    drawerLabelStyle: { fontSize: 16, fontWeight: 'bold' },
    headerLeft: () => (
      <CustomDrawerIcon route={null} navigation={navigation} navType={'drawer'} selectedUser={selectedUser} headerTitle={headerTitle} />
    ),
    // headerRight: () => <View></View>,
    headerRight: () => {
      
      return (
        String(headerTitle).toLowerCase() == 'results' ?
        <TouchableOpacity
          onPress={() => navigation.navigate('ViewTip', {
                      resultDate: latestDraw?.date,

          })}
          // onPress={() => console.log(latestDraw, "LATLAT")}
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
            }}>
              Tip
          </Text>
        </TouchableOpacity>
        :
        String(headerTitle).toLowerCase() == 'dashboard' ?
            <SyncComponent />
            :
            null
        )
    },
    drawerIcon: ({ focused }) => (
      <View style={{ paddingHorizontal: 20 }}>
        <Image source={icon} style={{ width: 20, height: 20, tintColor: focused ? COLORS.white : COLORS.secondary }} />
      </View>
    ),
  });

    useEffect(() => {
    fetchDrawItems()

  }, [])

  return (
    <Drawer.Navigator screenOptions={{ drawerType: 'slide', overlayColor: 'rgba(138, 133, 133, 0.59)', swipeEdgeWidth: 100 }}>
      <Drawer.Screen name="Dashboard" component={Dashboard} options={({ navigation }) => generateDrawerScreenOptions('Dashboard', icons.dashboard, 'Dashboard', navigation)} />
      {(getConfiguration(curUser, 'ticketForm')?.isCheck) ? (
        <>
          <Drawer.Screen name="Play" component={TicketForm} options={({ navigation }) => generateDrawerScreenOptions('Play', icons.play, 'Play', navigation)} />
          <Drawer.Screen name="Winnings" component={Winnings} options={({ navigation }) => generateDrawerScreenOptions('Winnings', icons.winnings, 'Winnings', navigation)} />
          <Drawer.Screen name="Transactions" component={Transactions} options={({ navigation }) => generateDrawerScreenOptions('Transactions', icons.tickets, 'Transactions', navigation)} />
        </>
      ) : <></>} 

      {(getConfiguration(curUser, 'cashFlow')?.isCheck) && (
        <>
          <Drawer.Screen name="CashFlow" component={CashFlow} options={({ navigation }) => generateDrawerScreenOptions('Cash Flow', icons.cashFlow, 'Cash Flow', navigation)} />
        </>
      )}

      {(getConfiguration(curUser, 'cancelled_tickets')?.isCheck || curUser?.is_admin) ?
        (
          <Drawer.Screen name="CancelledTickets" component={CancelledTickets} options={({ navigation }) => generateDrawerScreenOptions('Cancelled Tickets', icons.cancelled_ticket, 'Cancelled Tickets', navigation)} />
        )
        : 
        <></>
      }

      {(getConfiguration(curUser, 'inbox')?.isCheck) && (
              <>
      <Drawer.Screen name="Inbox" component={Inbox} options={({ navigation }) => generateDrawerScreenOptions('Inbox', icons.send_message, 'Inbox', navigation)} />
              </>
      )}

      {(getConfiguration(curUser, 'coordinators')?.isCheck || getConfiguration(curUser, 'tellers')?.isCheck) && (
        <>
          <Drawer.Screen name="CoordinatorsScreen" component={CoordinatorsScreen} options={({ navigation }) => generateDrawerScreenOptions('Coordinators', icons.coordinator, 'Coordinators', navigation)} />
          <Drawer.Screen name="TellersScreen" component={TellersScreen} options={({ navigation }) => generateDrawerScreenOptions('Tellers', icons.teller, 'Tellers', navigation)} />
        </>
      )}


      {(getConfiguration(curUser, 'ticketForm')?.isCheck) && (
        <>
          <Drawer.Screen name="Results" component={Results2} options={({ navigation }) => generateDrawerScreenOptions('Results', icons.results, 'Results', navigation)} />
          <Drawer.Screen name="Summary Report" component={SummaryReport} options={({ navigation }) => generateDrawerScreenOptions('Summary Report', icons.summary, 'Summary Report', navigation)} />

        </>
      )}


      {(getConfiguration(curUser, 'soldouts')?.isCheck) && (
        <>
          <Drawer.Screen name="Sold Outs" component={SoldOuts} options={({ navigation }) => generateDrawerScreenOptions('Sold Outs', icons.soldout, 'Sold Outs', navigation)} />

        </>
      )}






      {getConfiguration(curUser, 'ticketForm') && (
        <Drawer.Screen name="Settings" component={SettingsScreen} options={({ navigation }) => generateDrawerScreenOptions('Settings', icons.settings, 'Settings', navigation)} />
      )}

    </Drawer.Navigator>
  );
};


const StackNavigates = () => {
  const {  isAuthenticated,  batch_number, selectedUser, user } = useSelector(({ user }) => user);
  // const dispatch = useDispatch();
  // const navigation = useNavigation();


  //         const requestLocationPermission = async () => {
  //             try {
  //                 if (Platform.OS === "android") {
  //                     const granted = await PermissionsAndroid.request(
  //                         PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  //                         {
  //                             title: "Location Permission Required",
  //                             message:
  //                                 "This app requires access to your location to function properly.",
  //                             buttonNeutral: "Ask Me Later",
  //                             buttonNegative: "Cancel",
  //                             buttonPositive: "Allow",
  //                         }
  //                     );
      
  //                     if (granted === PermissionsAndroid.RESULTS.GRANTED) {
  //                         console.log("Location permission granted");
  //                         setVisible(false);
  //                     } else {
  //                         console.log("Location permission denied");
  //                     }
  //                 }
  //             } catch (err) {
  //                 console.warn(err);
  //             }
  //         };

  // const checkDevicePermissions = async() => {
  //     const checkPermissions = await verifyRequiredPermissions();

  //   try {

  //     if(!checkPermissions.location_enabled) {
  //       requestLocationPermission()      
  //     }

  //     return;

  //   } catch (err) {
  //     console.log(err, `Something wen't wrong`)
  //   }
  //   }


  // useEffect(async () => {
    
  //   checkDevicePermissions()

  // }, [isAuthenticated])
  

  return (
            <Stack.Navigator
               initialRouteName='Play'
               screenOptions={{ headerShown: false }}
        >
            {isAuthenticated ?
      ( 
      <>
          <Stack.Screen name="Drawer" component={DrawerNavigation} />
                    <Stack.Screen
            name="ViewShot"
            component={ViewShot}
            options={({ navigation, route }) => ({
              headerTitle: '',
              headerTitleStyle: { color: COLORS.white },
              headerStyle: { backgroundColor: COLORS.secondary },
              headerShown: true,
              headerLeft: () => (
                <CustomDrawerIcon route={route} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'View Ticket'} />
              ),
            })}
          />

          <Stack.Screen
        name="form-sheet"
        component={FormSheet}
        options={{
          title: 'Permission Required',
          presentation: "formSheet",
          headerShown: false,
          sheetAllowedDetents: [0.35, 1],
          sheetCornerRadius: 28,
        }}
      />

          
          <Stack.Screen
            name="ViewTicket"
            component={ReviewScreen}
            options={({ navigation, route }) => ({
              headerTitle: '',
              headerTitleStyle: { color: COLORS.white },
              headerStyle: { backgroundColor: COLORS.secondary },
              headerShown: true,
              headerLeft: () => (
                <CustomDrawerIcon route={route} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'View Ticket'} />
              ),
            })}
          />
          <Stack.Screen
            name="UsersTree"
            component={UsersTree}
            options={({ navigation, route }) => ({
              headerTitle: '',
              headerTitleStyle: { color: COLORS.white },
              headerStyle: { backgroundColor: COLORS.secondary },
              headerShown: true,
              headerLeft: () => (
                <CustomDrawerIcon route={route} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Commissioners'} />
              ),
            })}
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
            name="LoginDevices"
            component={LoginDevices}
            options={({ navigation, route }) => ({
              headerShown: true,
              headerTitle: '',
              headerTitleStyle: { color: COLORS.white },
              headerStyle: { backgroundColor: COLORS.secondary },
              headerLeft: () => (
                <CustomDrawerIcon route={route} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Login Devices'} />
              ),
            })}
          />
          			<Stack.Screen
				name="MapScreen"
				component={MapScreen}
				options={{ headerShown: false }}
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
                    source={icons.backHeader}
                    style={{
                      height: 20,
                      width: 20,
                      tintColor: COLORS.white
                    }} />
                </TouchableOpacity>),
            })}
          />
          <Stack.Screen
            name="Combinations"
            component={CombinationsScreen}
            options={({ navigation }) => ({
              headerShown: true,
              title: '',
              headerTitleStyle: { color: COLORS.black, fontWeight: 'bold' },
              headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
              // headerLeft: () => (
              //   <TouchableOpacity
              //     onPress={() => navigation.goBack()}
              //     style={{ padding: 10, alignItems: 'center', justifyContent: 'center', }}
              //   >
              //     <Image
              //       source={icons.backHeader}
              //       style={{
              //         height: 20,
              //         width: 20,
              //         tintColor: COLORS.white
              //       }} />
              //   </TouchableOpacity>),
              headerLeft: () => (
                <CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Combinations'} />
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
              headerShown: true,
              headerLeft: () => (
                <CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Winning Ticket'} />
              ),
            })}
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
              )
            })}
          />
          <Stack.Screen name="TestPrinter" component={TestPrinter2} options={({ navigation, route }) => ({
            headerShown: true,
            headerTitle: '',
            headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
            headerLeft: () => (
              <CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Test Printer'} />
            ),
          })}
          />
          <Stack.Screen
    				component={SummaryReportUser}
    				name="UserSummaryReport"
    				options={({ navigation }) => ({
    					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
    					headerTitle: '',
              headerShown: true,
    					headerLeft: () => (
    						<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Summary Report'} />
    					),
    					headerRight: () => (
    						<View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}>
    						
    						</View>
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
          <Stack.Screen
                  component={ViewUserForm}
                  name="View User"
                  options={({ navigation }) => ({
                    headerShown: true,
                    headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
                    headerTitle: '',
                    headerLeft: () => (
                      <CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'View User'} />
                    ),
                    headerRight: () => (
                      user?.is_admin ?
                        <TouchableOpacity
                          onPress={() => navigation.navigate('UserOptions', JSON.stringify({email: selectedUser?.email}))}
                          style={{ padding: 10, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.primary }}>Options</Text>
                        </TouchableOpacity> : null),
                  })
                  }
                />
                			<Stack.Screen name="UserOptions" component={UserOptionsForm}
				options={({ navigation }) => ({
          headerShown: true,
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
					headerTitle: '',
					headerLeft: () => (
						<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'User Options'} />
					),
				})
				}
			/>
          <Stack.Screen name="Permissions" component={PermissionScreen} options={{ headerShown: false }}/>
         <Stack.Screen
            name="UpdateTicket"
            component={TicketForm3}
            options={({ navigation }) => ({
              headerTitle: '',
              headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
              // headerLeft: () => (
              //   <CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={null} headerTitle={'Update Ticket'} />
              // ),
            })}
          /> 
          </>)
          : 
        <Stack.Screen
            name="Welcome"
            component={WelcomeView}
            options={({ navigation }) => ({
              headerTitle: '',
              headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
              // headerLeft: () => (
              //   <CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={null} headerTitle={'Update Ticket'} />
              // ),
            })}
          /> 
          }
        </Stack.Navigator>
  );
};



export const StackNavigator = (navigation) => {
  const { session } = useContext(SessionContext);
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector(({ user }) => user);
  const userRedux = useSelector(state => state.user.user);
  const [selectedUser, setUser] = useState(userRedux);
	const { loading, result } = useDeviceName(); // { loading: true, result: "Becca's iPhone 6"}
  const [deviceValidated, setDeviceValidated] = useState(false);


  const notif = new NotifService(reg => console.log('Push registered', reg));

  useEffect(() => notif.createDefaultChannels(), []);

  useEffect(() => {




    console.log(session, "THE SESYO@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@N")
    
    if (session) {
      const fetchUser = async () => {
        const { data, error } = await supabase.from('users').select('*').eq('email', session.user.email).single();
        if (!error && data) {
          setUser(data);
          dispatch({ type: SET_USER, payload: data });
          dispatch({ type: SET_COLLECTOR, payload: data.email });
        }
      };
      fetchUser();
    }
  }, [session]);



   // 🔥 DEVICE CHECK BEFORE ANYTHING LOADS
  useEffect(() => {
    const runDeviceCheck = async () => {
      if (!isAuthenticated || !user) {
        setDeviceValidated(true);
        return;
      }


      const ok = await verifyDeviceForUser(dispatch, user, navigation);

      if (ok) setDeviceValidated(true);
      // if not ok → signOut already handled
    };

    runDeviceCheck();
    requestLocationPermission();
  }, [isAuthenticated, user]);

  // 🔒 Prevent UI from rendering before device check is done
  if (!deviceValidated) return null; 



  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StackNavigates/>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};