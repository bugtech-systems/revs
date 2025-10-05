import React, { useEffect, useState, useContext } from 'react';
import { View, Text, Image, Alert } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
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
import SyncComponent from './SyncComponent';
import CustomDrawerIcon from './components/CustomDrawerIcon';
import { getConfiguration } from './utils/helpers';
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



const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const DrawerNavigation = () => {
  const { user, collector, selectedUser } = useSelector(state => state.user);
  const curUser = selectedUser ? selectedUser : user;

  
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
    headerRight: () => <SyncComponent />,
    drawerIcon: ({ focused }) => (
      <View style={{ paddingHorizontal: 20 }}>
        <Image source={icon} style={{ width: 20, height: 20, tintColor: focused ? COLORS.white : COLORS.secondary }} />
      </View>
    ),
  });


  return (
    <Drawer.Navigator screenOptions={{ drawerType: 'slide', overlayColor: 'rgba(138, 133, 133, 0.59)', swipeEdgeWidth: 100 }}>
      <Drawer.Screen name="Dashboard" component={Dashboard} options={({navigation}) => generateDrawerScreenOptions('Dashboard', icons.dashboard, 'Dashboard', navigation)} />
      {getConfiguration(curUser, 'ticketForm') && (
        <>
          <Drawer.Screen name="Play" component={TicketForm} options={({navigation}) => generateDrawerScreenOptions('Play', icons.play, 'Play', navigation)} />
          <Drawer.Screen name="Winnings" component={Winnings} options={({navigation}) => generateDrawerScreenOptions('Winnings', icons.winnings, 'Winnings', navigation)} />
          <Drawer.Screen name="Transactions" component={Transactions} options={({navigation}) => generateDrawerScreenOptions('Transactions', icons.tickets, 'Transactions', navigation)} />
        </>
      )} 

      {(getConfiguration(curUser, 'cashFlow')?.isCheck) && (
        <>
          <Drawer.Screen name="CashFlow" component={CashFlow} options={({navigation}) => generateDrawerScreenOptions('Cash Flow', icons.cashFlow, 'Cash Flow', navigation)} />
        </>
      )}

      {!curUser?.isAdmin &&
      <>
          <Drawer.Screen name="CancelledTickets" component={CancelledTickets} options={({navigation}) => generateDrawerScreenOptions('Cancelled Tickets', icons.cancelled_ticket, 'Cancelled Tickets', navigation)} />
      
      </>
      }


        <Drawer.Screen name="Inbox" component={Inbox} options={({navigation}) => generateDrawerScreenOptions('Inbox', icons.send_message, 'Inbox', navigation)} />

      {(getConfiguration(curUser, 'coordinators')?.isCheck || getConfiguration(curUser, 'tellers')?.isCheck) && (
        <>
        <Drawer.Screen name="CoordinatorsScreen" component={CoordinatorsScreen} options={({navigation}) => generateDrawerScreenOptions('Coordinators', icons.coordinator, 'Coordinators', navigation)} />
        <Drawer.Screen name="TellersScreen" component={TellersScreen} options={({navigation}) => generateDrawerScreenOptions('Tellers', icons.teller, 'Tellers', navigation)} />
        </>
      )}


{(getConfiguration(curUser, 'ticketForm')?.isCheck) && (
  <>
        <Drawer.Screen name="Results" component={Results2} options={({navigation}) => generateDrawerScreenOptions('Results', icons.results, 'Results', navigation)} />
          <Drawer.Screen name="Summary Report" component={SummaryReport} options={({navigation}) => generateDrawerScreenOptions('Summary Report', icons.summary, 'Summary Report', navigation)} />
  
  </>
  
)}


      {(getConfiguration(curUser, 'soldouts')?.isCheck) && (
        <>
                  <Drawer.Screen name="Sold Outs" component={SoldOuts} options={({navigation}) => generateDrawerScreenOptions('Sold Outs', icons.soldout, 'Sold Outs', navigation)} />

        </>
      )}






      {getConfiguration(curUser, 'ticketForm') && (
        <Drawer.Screen name="Settings" component={SettingsScreen} options={({navigation}) => generateDrawerScreenOptions('Settings', icons.settings, 'Settings', navigation)} />
      )}

    </Drawer.Navigator>
  );
};

export const StackNavigator = () => {
  const { session } = useContext(SessionContext);
  const dispatch = useDispatch();
  const userRedux = useSelector(state => state.user.user);
  const [user, setUser] = useState(userRedux);

  const notif = new NotifService(reg => console.log('Push registered', reg));

  useEffect(() => notif.createDefaultChannels(), []);

  useEffect(() => {
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


  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Drawer" component={DrawerNavigation} />
          <Stack.Screen
            name="ViewTicket"
            component={ReviewScreen}
            options={({ navigation, route }) => ({
              headerTitle: '',
              headerTitleStyle: { color: COLORS.white },
              headerStyle: { backgroundColor: COLORS.secondary },
              headerShown: true
              // headerLeft: () => (
              //   <CustomDrawerIcon route={route} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'View Ticket'} />
              // ),
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
					
  <Stack.Screen
				name="Winning Ticket"
				component={ViewTicket}
				options={({ navigation }) => ({
					headerTitle: '',
					headerTitleStyle: { color: COLORS.black, fontWeight: 'bold' },
					headerStyle: { backgroundColor: '#fffff1', elevation: 6, borderBottomWidth: 1, shadowOpacity: .5, shadowColor: COLORS.black },
          headerShown: true
					// headerLeft: () => (
					// 	<CustomDrawerIcon route={null} navigation={navigation} navType={'screen'} selectedUser={selectedUser} headerTitle={'Winning Ticket'} />
					// ),
				})}
			/>
       
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};