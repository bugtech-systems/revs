import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
    Image,
    Platform,
    RefreshControl,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment-timezone';
import Animated, {
    useAnimatedScrollHandler,
    useSharedValue,
    FadeInDown,
    FadeOutDown,
} from 'react-native-reanimated';
import { COLORS, icons } from '../../constants';
import SelectDropdown from 'react-native-select-dropdown';
import CreateIcon from 'react-native-vector-icons/MaterialIcons';
import { cutString, formatNumber } from '../../utils/helpers';
import NetInfo from '@react-native-community/netinfo';
import SQLite from 'react-native-sqlite-storage';
import supabase from '../../utils/supabaseClient';


const drawTimes = [
    { id: 0, name: 'All Types' },
    { id: 1, name: 'Expense' },
    { id: 2, name: 'Payment' },
    { id: 3, name: 'Borrow' },
];

const db = SQLite.openDatabase(
    { name: 'cashflow.db', location: 'default' },
    () => console.log('SQLite DB opened'),
    (err) => console.error('SQLite Error:', err)
);

export default function CashFlowTab() {
    const [cashflows, setCashflows] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedType, setSelectedType] = useState('All Types');
    const [date, setDate] = useState(new Date());
    const [showDate, setShowDate] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        owner: '',
        owner_name: '',
        user: '', // replace with auth user id
        inputType: 'expense',
        isDeleted: false,
        createdAt: moment().toDate(),
        updatedAt: moment().toDate(),
        synced: false, // track sync status
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTime, setFilterTime] = useState(drawTimes[0].name);

    // ----------------------
    // SQLite Setup (Table)
    // ----------------------
    useEffect(() => {
        db.transaction((tx) => {
            tx.executeSql(
                `CREATE TABLE IF NOT EXISTS cashflows (
          id TEXT PRIMARY KEY,
          amount REAL,
          description TEXT,
          owner TEXT,
          owner_name TEXT,
          user_id TEXT,
          inputType TEXT,
          isDeleted INTEGER,
          createdAt TEXT,
          updatedAt TEXT,
          synced INTEGER
        );`
            );
        });
        fetchLocalCashflows();
    }, []);

    // ----------------------
    // Fetch from SQLite
    // ----------------------
    const fetchLocalCashflows = () => {
        db.transaction((tx) => {
            tx.executeSql('SELECT * FROM cashflows ORDER BY createdAt DESC;', [], (txObj, results) => {
                let rows = [];
                for (let i = 0; i < results.rows.length; i++) {
                    rows.push(results.rows.item(i));
                }
                setCashflows(rows);
                setFilteredList(rows);
            });
        });
    };

    // ----------------------
    // Save to SQLite
    // ----------------------
    const saveCashflowLocal = (cashflow) => {
        db.transaction((tx) => {
            tx.executeSql(
                `INSERT OR REPLACE INTO cashflows 
          (id, amount, description, owner, owner_name, user_id, inputType, isDeleted, createdAt, updatedAt, synced) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    cashflow.id,
                    cashflow.amount,
                    cashflow.description,
                    cashflow.owner,
                    cashflow.owner_name,
                    cashflow.user,
                    cashflow.inputType,
                    cashflow.isDeleted ? 1 : 0,
                    cashflow.createdAt,
                    cashflow.updatedAt,
                    cashflow.synced ? 1 : 0,
                ],
                () => fetchLocalCashflows()
            );
        });
    };

    // ----------------------
    // Submit New Cashflow
    // ----------------------
    const handleSubmitCashflow = () => {
        const newCashflow = {
            ...formData,
            id: String(Date.now()), // temporary ID
            createdAt: moment().toISOString(),
            updatedAt: moment().toISOString(),
            synced: false,
        };

        saveCashflowLocal(newCashflow);
        Alert.alert('CashFlow Created', 'Saved locally. Will sync when online.');
        setModalVisible(false);
        setFormData({
            ...formData,
            amount: '',
            description: '',
            owner: '',
            owner_name: '',
        });
    };

    // ----------------------
    // Sync with Supabase
    // ----------------------
    const syncWithSupabase = async () => {
        try {
            // 1. Push unsynced local data
            db.transaction((tx) => {
                tx.executeSql('SELECT * FROM cashflows WHERE synced = 0;', [], async (txObj, results) => {
                    let unsynced = [];
                    for (let i = 0; i < results.rows.length; i++) {
                        unsynced.push(results.rows.item(i));
                    }

                    if (unsynced.length > 0) {
                        const { error } = await supabase.from('cashflows').upsert(unsynced);
                        if (!error) {
                            // mark as synced
                            unsynced.forEach((item) => {
                                db.transaction((tx2) => {
                                    tx2.executeSql('UPDATE cashflows SET synced = 1 WHERE id = ?;', [item.id]);
                                });
                            });
                        }
                    }
                });
            });

            // 2. Pull latest from Supabase
            const { data, error } = await supabase.from('cashflows').select('*').order('createdAt', { ascending: false });
            if (data && !error) {
                data.forEach((item) => {
                    saveCashflowLocal({ ...item, synced: true });
                });
            }
        } catch (err) {
            console.error('Sync error:', err);
        }
    };

    // Auto-sync on network connect
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            if (state.isConnected) {
                syncWithSupabase();
            }
        });
        return () => unsubscribe();
    }, []);

    // ----------------------
    // Filtering
    // ----------------------
    useEffect(() => {
        filterCashflows();
    }, [selectedType, date, searchQuery, cashflows]);

    const filterCashflows = () => {
        const startOfDay = moment(date).startOf('day');
        const endOfDay = moment(date).endOf('day');

        let filtered = cashflows.filter((item) => {
            const createdAt = moment(item.createdAt);
            return createdAt.isBetween(startOfDay, endOfDay, null, '[]');
        });

        if (selectedType !== 'All Types') {
            const selected = selectedType.toLowerCase();
            if (selected === 'payment') {
                filtered = filtered.filter((i) => i.inputType === 'payment' || i.inputType === 'borrow');
            } else {
                filtered = filtered.filter((i) => i.inputType === selected);
            }
        }

        if (searchQuery.trim()) {
            const lowerSearch = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (i) =>
                    i.owner_name?.toLowerCase().includes(lowerSearch) ||
                    i.description?.toLowerCase().includes(lowerSearch) ||
                    String(i.amount).includes(lowerSearch) ||
                    i.inputType?.toLowerCase().includes(lowerSearch)
            );
        }

        setFilteredList(filtered);
    };

    // ----------------------
    // Render Item
    // ----------------------
    const renderItem = ({ item, index }) => {
        const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;
        return (
            <Animated.View entering={FadeInDown.delay(index * 100)} exiting={FadeOutDown.delay(index * 100)}>
                <TouchableOpacity style={{ backgroundColor, padding: 10 }}>
                    <Text style={{ fontWeight: 'bold' }}>{item.inputType.toUpperCase()}</Text>
                    <Text>{item.owner_name}</Text>
                    <Text>{item.description}</Text>
                    <Text>{moment(item.createdAt).format('MMMM DD, YYYY hh:mm A')}</Text>
                    <Text>{formatNumber(Number(item.amount).toFixed(2))}</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <SafeAreaProvider style={styles.wrapper}>
            <View style={{ flex: 1 }}>
                {/* Header with filters */}
                {/* ... keep your renderHeader + renderSearchInput code ... */}

                {/* FlatList */}
                <FlatList
                    data={filteredList}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLocalCashflows} />}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', margin: 20 }}>No records found.</Text>}
                />

                {/* Modal for create/view */}
                <Modal visible={modalVisible} transparent animationType="fade">
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalView}>
                            <Text>Amount</Text>
                            <TextInput
                                keyboardType="numeric"
                                value={formData.amount}
                                onChangeText={(val) => setFormData({ ...formData, amount: val })}
                            />
                            <Text>Description</Text>
                            <TextInput value={formData.description} onChangeText={(val) => setFormData({ ...formData, description: val })} />
                            <TouchableOpacity onPress={handleSubmitCashflow}>
                                <Text>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: '#f2f2f2' },
    modalView: {
        flex: 1,
        backgroundColor: '#fff',
        margin: 20,
        padding: 20,
        borderRadius: 12,
        justifyContent: 'center',
    },
});
