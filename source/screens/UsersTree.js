import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  SafeAreaView,
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import UserNode from './UserNode';
import { COLORS, icons } from '../constants';
import { api } from '../utils/offlineSync';
import moment from 'moment-timezone';

/* ================= HELPERS ================= */

const sanitizeUsers = (users = []) =>
  users
    .filter(u => !u?.is_deleted)
    .map(u => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      address: u.address,
      com_rate: u.com_rate,
      uplines: Array.isArray(u.uplines) ? u.uplines : [],
    }));

const buildUsersTree = users => {
  const map = {};
  const roots = [];

  users.forEach(u => {
    map[u.id] = { ...u, children: [] };
  });

  users.forEach(u => {
    const directUpline = u.uplines[u.uplines.length - 1];
    if (directUpline && map[directUpline]) {
      map[directUpline].children.push(map[u.id]);
    } else {
      roots.push(map[u.id]);
    }
  });

  return roots;
};

/* ================= COMPONENT ================= */

const TABS = {
  NETWORK: 'network',
  PERFORMANCE: 'performance',
  COMMISSIONS: 'commissions',
};

const UsersTree = () => {
  const { user } = useSelector(({ user }) => user);

  const [usersList, setUsersList] = useState([]);
  const [activeTab, setActiveTab] = useState(TABS.NETWORK);
  const [show, setShow] = useState(false);  

  const treeData = useMemo(() => {
    const cleanUsers = sanitizeUsers(usersList);
    return buildUsersTree(cleanUsers);
  }, [usersList]);

  const loadUsers = async () => {
    const localUsers = await api.listUsers(); // SQLite cache
    setUsersList(localUsers);
  };

  const loadBettings = async () => {
    const localBettings = await api.listBettings(); // SQLite cache
  }

    const onChange = (event, selected_date) => {
      setShow(false)
    // setBettings([])
    // setDraws([])
    
      if (event?.type === 'neutralButtonPressed') {
        setShow(Platform.OS === 'ios');
        setDate(new Date());
      } else if (event?.type === 'set') {
        setShow(Platform.OS === 'ios');
        setDate(selected_date || date);
      } else {
        setShow(Platform.OS === 'ios');
      }
    };
  
  useEffect(() => {
    loadUsers();
  }, [user]);

  /* ================= RENDER ================= */

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TabButton
        label="Network"
        active={activeTab === TABS.NETWORK}
        onPress={() => setActiveTab(TABS.NETWORK)}
      />
      <TabButton
        label="Performance"
        active={activeTab === TABS.PERFORMANCE}
        onPress={() => setActiveTab(TABS.PERFORMANCE)}
      />
      <TabButton
        label="Commissions"
        active={activeTab === TABS.COMMISSIONS}
        onPress={() => setActiveTab(TABS.COMMISSIONS)}
      />
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case TABS.NETWORK:
        return (
          <ScrollView contentContainerStyle={styles.content}>
            {treeData.map(root => (
              <UserNode key={root.id} user={root} />
            ))}
          </ScrollView>
        );

      case TABS.PERFORMANCE:
        return (
          // <View style={{...styles.placeholder, flex: 1, alignItems: 'flex-start', justifyContent: 'flex-start', padding: 10}}>
          //   <View style={{ borderWidth: 1, width: '100%', flexDirection: 'row', padding: 16, justifyContent: 'space-between', alignItems: 'center', borderTopRightRadius: 8, borderTopLeftRadius: 8,}}>
          //     <TouchableOpacity style={{ borderWidth: 1, width: "48%", alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', padding: 6, borderRadius: 6}}>
          //       <Text style={{ fontSize: 14, color: COLORS.black }}>
          //         {moment().format('DD-MM-YYYY')}
          //       </Text>
                
          //       <Image 
          //         source={icons.calendar}
          //         resizeMode="contain"
          //         style={{
          //           width: 18,
          //           height: 18,
          //           tintColor: COLORS.black,
          //           // marginTop: 10,
          //         }}
          //       />

          //     </TouchableOpacity>

          //     <TouchableOpacity style={{ borderWidth: 1, width: "48%", alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', padding: 6, borderRadius: 6}}>
          //       <Text style={{ fontSize: 14, color: COLORS.black }}>
          //         SEARCH BY NAME
          //       </Text>

          //       <Image 
          //         source={icons.search}
          //         resizeMode="contain"
          //         style={{
          //           width: 18,
          //           height: 18,
          //           tintColor: COLORS.black,
          //           // marginTop: 10,
          //         }}
          //       />
          //     </TouchableOpacity>

          //     {show ?
					// <DateTimePicker
					// 	testID="dateTimePicker"
					// 	value={date}
					// 	mode="date"
					// 	// minimumDate={new Date(selectedUser?.is_admin && selectedUser?.last_summary ? null : selectedUser?.last_summary)}
					// 	// minimumDate={new Date(selectedUser?.last_summary)}
					// 	// maximumDate={new Date(moment().toDate())}
					// 	display="default"
					// 	onChange={() => {
          //     console.log('CHANGE MADE')
          //   }}
					// 	negativeButton={{ label: "Cancel", }}
					// 	neutralButton={{ label: "Clear", }}
					// />
					// :
					// null
					// } 
              

          //   </View>
          //   {/* <Text style={styles.placeholderText}>
          //     Performance data coming soon
          //   </Text> */}
          // </View>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Performance monitoring Coming Soon!
            </Text>
          </View>
        );

      case TABS.COMMISSIONS:
        return (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Commission Summary Coming Soon!
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderTabs()}
      {renderContent()}
    </SafeAreaView>
  );
};

/* ================= TAB BUTTON ================= */

const TabButton = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.tab, active && styles.activeTab]}
  >
    <Text style={[styles.tabText, active && styles.activeTabText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default UsersTree;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },

  /* Tabs */
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.secondary,
  },
  tabText: {
    fontSize: 14,
    color: '#777',
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.secondary,
    fontWeight: '700',
  },

  /* Content */
  content: {
    padding: 16,
  },

  /* Placeholder */
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
  },
});
