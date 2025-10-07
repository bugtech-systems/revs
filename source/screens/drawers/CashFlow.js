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
  Switch,
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
import { useSelector } from 'react-redux';
import CreateIcon from 'react-native-vector-icons/MaterialIcons';
import { cutString, formatNumber, formatNumberWithComma } from '../../utils/helpers';
import supabase from '../../utils/supabaseClient';

// import { supabase } from '../../lib/supabaseClient'; // ⬅️ import your supabase client

const drawTimes = [
  { id: 0, name: 'All Types' },
  { id: 1, name: 'Expense' },
  { id: 2, name: 'Payment' },
  { id: 3, name: 'Borrow' },
];

export default function CashFlowTab() {
  const { collector, user, selectedUser } = useSelector(({ user }) => user);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
    const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredList, setFilteredList] = useState([]);
  const [selectedType, setSelectedType] = useState('All Types');
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [viewinput_type, setViewinput_type] = useState('');
  const [filterTime, setFilterTime] = useState(drawTimes[0].name);
  const [searchQuery, setSearchQuery] = useState('');
  const [input_type, setinput_type] = useState('Expense');
  const [allCashflows, setAllCashflows] = useState([]);
  const [downlines, setDownlines] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
const [inputType, setInputType] = useState('Expense');
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    owner: '',
    owner_name: '',
    user: user?.id,
    updated_by: null,
    created_at: moment().toDate(),
    updated_at: moment().toDate(),
    is_deleted: false,
    input_type: 'expense',
  });

  const startOfDay = moment(date).startOf('day').toISOString();
  const endOfDay = moment(date).endOf('day').toISOString();
  const searchBarOffset = useSharedValue(0);
  const searchBarOpacity = useSharedValue(1);
    const expandSearchBarWrapper = useSharedValue(1);

  const collectorName = selectedUser ? selectedUser : collector;

  // ✅ Fetch users (downlines)
  const fetchUsers = useCallback(async () => {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', collectorName)
      .single();

    if (userError || !userData) return;

    const { data: downlineData } = await supabase
      .from('users')
      .select('*')
      .contains('uplines', [userData._id]);

    setDownlines(downlineData || []);
  }, [collectorName]);

  // ✅ Fetch cashflows
  const fetchCashflows = useCallback(async () => {
    const { data, error } = await supabase
      .from('cashflow')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cashflows:', error);
      return;
    }
    setAllCashflows(data || []);
  }, []);

  // ✅ Handle adding a cashflow
  const handleSubmitCashflow = async () => {
    const payload = {
      amount: parseFloat(formData.amount),
      description: formData.description || '',
      owner: formData.owner || '',
      owner_name: formData.owner_name || '',
      user: user?.id,
      input_type: formData.input_type,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: null,
    };

    const { error } = await supabase.from('cashflow').insert([payload]);

    if (error) {
      console.error('Error creating cashflow:', error);
      Alert.alert('Error', 'Something went wrong while saving.');
    } else {
      Alert.alert('CashFlow Created', 'The cashflow entry has been saved.');
      setModalVisible(false);
      fetchCashflows();
      resetForm();
    }
  };


      const handleCloseViewModal = () => {
        const defaultType = 'Expense';
        Keyboard.dismiss()
        setModalVisible(false);
        // setInputType(type);
        setFormData({
            amount: '',
            description: '',
            owner: '',
            owner_name: '',
            user: user?.id,
            updated_by: null,
            created_at: moment().toDate(),
            updated_at: moment().toDate(),
            is_deleted: false,
            input_type: defaultType,
        });
        setSearch('');
        setSearchResults([]);
        setInputType(defaultType)

    }

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      owner: '',
      owner_name: '',
      user: user?.id,
      input_type: 'expense',
      is_deleted: false,
      created_at: moment().toDate(),
      updated_at: moment().toDate(),
      updated_by: null,
    });
    setSearch('');
  };
    const handleSelectUser = (user, type) => {
        setFormData((prev) => ({
            ...prev,
            owner: user.id,
            owner_name: user?.first_name,
        }));
        setSearch(user.first_name);
        setSearchResults([]);
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
            updated_at: moment().toDate(),
        }));
    };

  

  // ✅ Filter list based on date, type, and search
  const filterCashflows = useCallback(() => {
    let filtered = allCashflows.filter(
      (item) =>
        new Date(item.created_at) >= new Date(startOfDay) &&
        new Date(item.created_at) < new Date(endOfDay)
    );

    if (selectedType !== 'All Types') {
      const selected = selectedType.toLowerCase();
      if (selected === 'payment') {
        filtered = filtered.filter(
          (item) => item.input_type === 'payment' || item.input_type === 'borrow'
        );
      } else {
        filtered = filtered.filter((item) => item.input_type === selected);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.owner_name?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          String(i.amount)?.includes(q)
      );
    }

    setFilteredList(filtered);
  }, [allCashflows, selectedType, searchQuery, date]);

  useEffect(() => {
    fetchUsers();
    fetchCashflows();
  }, []);

  useEffect(() => {
    filterCashflows();
  }, [selectedType, date, searchQuery, allCashflows]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCashflows().then(() => setRefreshing(false));
  };

   function calculatePayablesDifference(cashflows, user, date) {
        const currentUserId = String(user.id);

        // Format the selected date for comparison
        const startOfDay = moment(date).startOf('day').toDate();
        const endOfDay = moment(date).endOf('day').toDate();

        // Helper function to filter by type, date, user, and deletion
        const filterByType = (type) =>
            cashflows
                .filter(item =>
                    item.input_type?.toLowerCase() === type &&
                    !item.is_deleted &&
                    item.user === currentUserId &&
                    new Date(item.created_at) >= startOfDay &&
                    new Date(item.created_at) <= endOfDay
                )
                .reduce((sum, item) => sum + item.amount, 0);

        const totalBorrow = filterByType('borrow');
        const totalPayment = filterByType('payment');
        const totalExpense = filterByType('expense');

        const totalPayable = totalBorrow - totalPayment;

        return {
            totalBorrow,
            totalPayment,
            totalExpense,
            totalPayable,
        };
    }

  const handleViewModal = (item) => {
    setinput_type(item.input_type === 'expense'
      ? 'Expense'
      : item.input_type === 'borrow'
      ? 'Borrow'
      : 'Payment');
    setModalType('view');
    setViewinput_type(item.input_type);
    setFormData({ ...item, amount: String(item.amount) });
    setSearch(item.owner_name);
    setModalVisible(true);
  };

      const handleSearch = (query) => {
        setSearchQuery(query);
    };

        const handleTimeSelect = (item) => {
        console.log(item, "THE ITEMSSSSSSS")
        setSelectedType(item);
        setFilterTime(item);
    };


     const showDatePicker = () => {
        console.log('nag show')
        setShowDate(true);
    };

    const onChangeDate = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        console.log(event?.type, "THE EVENT")
        if (event?.type == 'neutralButtonPressed') {
            setShowDate(Platform.OS === 'ios');
            // setFilterDate(false)
            setDate(moment().toDate());
            // return
        } else if (event?.type == 'set') {
            setShowDate(Platform.OS === 'ios');
            setDate(currentDate);
            // setFilterDate(true);
        } else if (event?.type == 'dismissed') {
            setShowDate(Platform.OS === 'ios');
            setDate(date);
            // setFilterDate(false)
        }
    };
  // keep UI same:
  // ... renderHeader(), renderSearchInput(), renderTickerList() and Modal (unchanged)

  function renderSearchInput() {
        return (
            <Animated.View
                style={[
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        zIndex: 10,
                    },
                ]}
            >
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: '90%',
                        borderWidth: 1,
                        borderRadius: 6,
                        borderColor: COLORS.white,
                        backgroundColor: COLORS.white,
                        //   elevation: 2,
                        shadowRadius: 6,
                    }}
                >
                    <TextInput
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholder="Search some text here.."
                        placeholderTextColor={COLORS.gray800}
                        style={{
                            height: 40,
                            paddingLeft: 10,
                            width: '90%',
                            color: COLORS.black,
                        }}
                    />
                    <Image
                        source={icons.search}
                        style={{ height: '12%', width: '12%', padding: 10 }}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={{ alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => {
                        setModalVisible(true),
                        setModalType('create')
                    }}
                >
                    <CreateIcon name="edit-note" size={42} color={COLORS.black800} />
                </TouchableOpacity>
            </Animated.View>
        );
    }
  // Return UI (same as before)
  function renderHeader() {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                <TouchableOpacity
                    activeOpacity={.9}
                    onPress={showDatePicker}
                    // onPress={() => navigation.navigate('TestPaginate', {})}
                    style={{ width: '48%', borderColor: COLORS.white, borderRadius: 8, backgroundColor: COLORS.white }}
                >
                    <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                        <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{date == undefined || '' ? '' : moment(date).format('MM/DD/YYYY')}</Text>
                        <Image
                            source={icons.calendar}
                            style={{ height: 30, width: 30, tintColor: COLORS.black }}
                        />
                    </View>
                </TouchableOpacity>
                <SelectDropdown
                    activeOpacity={.9}
                    data={drawTimes}
                    onSelect={(selectedItem, index) => {
                        handleTimeSelect(selectedItem.name)
                    }}

                    style={{ width: '48%', alignItems: 'center', justifyContent: 'center' }}
                    defaultValueByIndex={0}
                    renderButton={(selectedItem, isOpened) => {
                        return (
                            <TouchableOpacity
                                // disabled={true}
                                activeOpacity={1}
                                style={{ width: '48%', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.white, borderRadius: 8, backgroundColor: COLORS.white, }
                                }>
                                <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: 10 }}>
                                    <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{filterTime !== '' ? String(filterTime).toUpperCase() : 'Select Time'}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    renderItem={(item, index, isSelected) => {
                        return (
                            <View style={{ ...styles.dropdownItemStyle, ...(isSelected && { backgroundColor: '#D2D9DF' }) }}>
                                <Text style={styles.dropdownItemTxtStyle}>{item.name}</Text>
                            </View>
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                    dropdownStyle={styles.dropdownMenuStyle}
                />


            </View>
        )
    }


    function renderTickerList(listData) {

        const displayList = filteredList.filter(item => {
            const isBorrow = item.input_type?.toLowerCase() === 'borrow';

            if (filterTime?.toLowerCase() === 'payment' && isBorrow) return false;

            if (searchQuery?.trim() && isBorrow) {
                const lowerSearch = searchQuery.toLowerCase();
                const matches =
                    item.owner_name?.toLowerCase().includes(lowerSearch) ||
                    item.description?.toLowerCase().includes(lowerSearch) ||
                    String(item.amount)?.toLowerCase().includes(lowerSearch) ||
                    item.input_type?.toLowerCase().includes(lowerSearch);
                return matches;
            }

            return true;
        });

        const scrollHandler = useAnimatedScrollHandler({
            onScroll: (event, ctx) => {
                const currentY = event.contentOffset.y;
                if (ctx.prevY === undefined) ctx.prevY = 0;

                const goingDown = currentY > ctx.prevY;

                if (goingDown && searchBarOffset.value === 0) {
                    searchBarOffset.value = -100;
                    searchBarOpacity.value = 0;
                    expandSearchBarWrapper.value = 1;
                } else if (!goingDown && searchBarOffset.value === -100) {
                    searchBarOffset.value = -50;
                    searchBarOpacity.value = 1;
                    expandSearchBarWrapper.value = 0;
                }

                ctx.prevY = currentY;
            },
        });

        const renderItem = ({ item, index }) => {
            let total = 0;
            item?.combinations?.forEach(data => total += data.amount);
            const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

            return (
                <Animated.View
                    entering={FadeInDown.delay(index * 100).duration(500)}
                    exiting={FadeOutDown.delay(index * 100).duration(500)}
                >
                    <TouchableOpacity
                        onLongPress={() => user.is_admin && console.log(item, "ON LONG PRESS DUDE.")}
                        onPress={() => handleViewModal(item)}
                        style={{
                            paddingLeft: 10,
                            backgroundColor: backgroundColor,
                            width: '100%',
                            flexDirection: 'row',
                            paddingVertical: 14,
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                        }}
                    >
                        <View style={{ width: '50%' }}>
                            <Text style={{
                                fontSize: 19,
                                fontWeight: 'bold',
                                color:
                                    item.input_type === 'borrow' || item.input_type === 'payment'
                                        ? COLORS.black900
                                        : item.input_type === 'expense'
                                            ? COLORS.transparentRed
                                            : COLORS.black,
                            }}>
                                {String(item.input_type).toUpperCase()}
                            </Text>

                            {['borrow', 'payment'].includes(item.input_type) ? (
                                <>
                                    <Text style={{ fontWeight: 'bold', color: COLORS.darkGray2, fontSize: 14 }}>
                                        <Text style={{ fontWeight: '500', fontSize: 13 }}>
                                            {item.input_type === 'borrow' ? 'From: ' : 'To: '}
                                        </Text>
                                        {String(item.owner_name).toUpperCase()}
                                    </Text>
                                </>
                            ) : (
                                <Text style={{ fontWeight: '500', color: COLORS.darkGray2, fontSize: 14 }}>
                                    <Text style={{ fontWeight: '500', fontSize: 13 }}>Note: </Text>
                                    {String(cutString(item.description, 15)).toUpperCase()}
                                </Text>
                            )}
                        </View>

                        <View style={{ width: '50%', alignItems: 'flex-end', paddingRight: 10 }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 12, color: COLORS.darkGray2 }}>
                                {moment(item.created_at).format('MMMM DD, YYYY hh:mm A')}
                            </Text>
                            <Text style={{ fontWeight: 'bold', fontSize: 20, color: COLORS.warningBorderColor }}>
                                {formatNumber(Number(item.amount).toFixed(2))}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            );
        };

        return (
            <>
                {renderSearchInput()}

                <Animated.FlatList
                    data={displayList}
                    keyExtractor={(item, index) => item._id}
                    renderItem={renderItem}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={{ padding: 8, alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
                                No records found.
                            </Text>
                        </View>
                    }
                    ListFooterComponent={
                        displayList.length > 0 && (
                            <View style={{ padding: 8, alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
                                    End of results.
                                </Text>
                            </View>
                        )
                    }
                />
            </>
        );
    }

    const result = calculatePayablesDifference(allCashflows, user, date);
  
  
  return (
    <SafeAreaProvider style={styles.wrapper}>
      <View style={{ flex: 1, width: '100%' }}>
        {renderHeader()}
                {showDate && (
                    <DateTimePicker
                        testID="dateTimePicker"
                        value={date}
                        mode="date"
                        display="default"
                        onChange={onChangeDate}
                        minimumDate={new Date(user?.last_summary)}
                        maximumDate={new Date(moment().toDate())}
                        negativeButton={{ label: "Cancel", }}
                        neutralButton={{ label: "Clear", }}
                    />
                )}
                <Modal
                    animationType="fade"
                    transparent
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <TouchableWithoutFeedback
                        onPress={() => {
                            handleCloseViewModal()
                        }}
                    >
                        <View style={styles.centeredView}>
                            <TouchableWithoutFeedback onPress={() => { }}>

                                <View style={styles.modalView}>

                                    {/* Type Selector */}
                                    <Text style={{ ...styles.label, color: COLORS.darkGray2 }}>{viewinput_type !== 'create' ? 'Type:' : 'Select Type:'}</Text>
                                    <View style={{...styles.dropdown, justifyContent: modalType !== 'create' ? 'flex-start' : 'center'}}>
                                        {
                                            modalType !== 'create' ? 
                                            <>
                                                {['Expense', 'Payment', 'Borrow'].map((type) => {
                                            return (
                                            //         String(viewinput_type).toLowerCase() == String(type).toLowerCase() ? (
                                            //             <TouchableOpacity key={type} onPress={() => handleTypeChange(type)}>
                                            //     <Text style={{...styles.dropdownItem, backgroundColor: COLORS.primaryTransparent1}}>
                                            //         {type}
                                            //     </Text>
                                            // </TouchableOpacity>
                                            //         ) 
                                            //         :
                                            //     (
                                            <TouchableOpacity key={type} disabled={modalType !== 'create' ? true : false} onPress={() => handleTypeChange(type)}>
                                                <Text style={[
                                                    styles.dropdownItem,
                                                    input_type === type && styles.selectedDropdownItem,
                                                ]}>
                                                    {type}
                                                </Text>
                                            </TouchableOpacity>
                                                // )
                                        )}
                                        )}
                                            </>
                                             :
                                            <>
                                                {['Expense', 'Payment', 'Borrow'].map((type) => {
                                            return (
                                            //         String(viewinput_type).toLowerCase() == String(type).toLowerCase() ? (
                                            //             <TouchableOpacity key={type} onPress={() => handleTypeChange(type)}>
                                            //     <Text style={{...styles.dropdownItem, backgroundColor: COLORS.primaryTransparent1}}>
                                            //         {type}
                                            //     </Text>
                                            // </TouchableOpacity>
                                            //         ) 
                                            //         :
                                            //     (
                                            <TouchableOpacity key={type} disabled={modalType !== 'create' ? true : false} onPress={() => handleTypeChange(type)}>
                                                <Text style={[
                                                    styles.dropdownItem,
                                                    input_type === type && styles.selectedDropdownItem,
                                                    { fontWeight: 'bold', fontSize: 18 }
                                                ]}>
                                                    {type}
                                                </Text>
                                            </TouchableOpacity>
                                                // )
                                        )}
                                        )}
                                            </>
                                        }
                                    </View>

                                    {/* Dynamic Fields */}
                                    {input_type === 'Expense' && (
                                        <>
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    width: '100%',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        flexDirection: 'column',
                                                        width: '100%',
                                                        alignItems: 'flex-start',
                                                        justifyContent: 'flex-start'
                                                    }}
                                                >
                                                    <Text style={{ ...styles.label, color: COLORS.darkGray2 }}>Amount:</Text>
                                                    <TextInput
                                                        style={{ ...styles.input, width: '100%', color: COLORS.black, fontSize: 18, fontWeight: '600' }}
                                                        editable={modalType === 'create' ? true : false}
                                                        keyboardType="numeric"
                                                        value={formData.amount}
                                                        onChangeText={(val) => handleInputChange('amount', val)}
                                                    />
                                                </View>
                                            </View>
                                            <Text style={{ ...styles.label, color: COLORS.darkGray2 }}>Description:</Text>
                                            <TextInput
                                                style={[styles.input, { height: 70, color: COLORS.black, fontSize: 18, fontWeight: '600' }]}
                                                multiline
                                                editable={modalType === 'create' ? true : false}
                                                textAlignVertical='top'
                                                numberOfLines={4}
                                                value={formData.description}
                                                onChangeText={(val) => handleInputChange('description', val)}
                                            />
                                        </>
                                    )}

                                    {(input_type === 'Payment' || input_type === 'Borrow') && (
                                        <>

                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    width: '100%',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}
                                            >

                                                <View
                                                    style={{
                                                        flexDirection: 'column',
                                                        width: '40%',
                                                        alignItems: 'flex-start',
                                                        justifyContent: 'flex-start'
                                                    }}
                                                >
                                                    <Text style={{ ...styles.label, color: COLORS.darkGray2 }}>Amount:</Text>
                                                    <TextInput
                                                        style={{ ...styles.input, width: '100%', color: COLORS.black, fontSize: 18, fontWeight: '600', }}
                                                        keyboardType="numeric"
                                                        editable={modalType === 'create' ? true : false}
                                                        value={formData.amount}
                                                        onChangeText={(val) => handleInputChange('amount', val)}
                                                    />
                                                </View>
                                                <View
                                                    style={{
                                                        flexDirection: 'column',
                                                        width: '55%',
                                                        alignItems: 'flex-start',
                                                        justifyContent: 'flex-start'
                                                    }}
                                                >

                                                    <Text style={{ ...styles.label, color: COLORS.darkGray2 }}>{input_type === 'Payment' ? 'Payment to:' : 'Borrow from:'}</Text>
                                                    <View style={styles.suggestionWrapper}>
                                                        {search.length > 0 && searchResults.length > 0 && (
                                                            <Text style={styles.suggestionText}>
                                                                <Text style={styles.inputText}>{search}</Text>
                                                                {searchResults[0]?.first_name.substring(search.length)}
                                                            </Text>
                                                        )}

                                                        <TextInput
                                                            style={[styles.input, styles.suggestionInput, { color: COLORS.black, fontSize: 18, fontWeight: '600'}]}
                                                            // placeholder="Search user"
                                                            editable={modalType === 'create' ? true : false}
                                                            value={search}
                                                            onChangeText={(text) => {
                                                                setSearch(text);
                                                                const results = downlines.filter((u) =>
                                                                    u?.first_name.toLowerCase().startsWith(text.toLowerCase())
                                                                );
                                                                setSearchResults(results);
                                                            }}
                                                            onPressIn={() => {
                                                                if (search.length > 0 && searchResults.length > 0) {
                                                                    const selected = searchResults[0];
                                                                    handleSelectUser(selected);
                                                                    setSearch(String(selected?.first_name).toUpperCase()); // Autocomplete
                                                                    setSearchResults([]);
                                                                }
                                                            }}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                            <Text style={{ ...styles.label, color: COLORS.darkGray2 }}>Description:</Text>
                                            <TextInput
                                                style={[styles.input, { height: 70,  color: COLORS.black, fontSize: 18, fontWeight: '600' }]}
                                                editable={modalType === 'create' ? true : false}
                                                multiline
                                                textAlignVertical='top'
                                                numberOfLines={4}
                                                value={formData.description}
                                                onChangeText={(val) => handleInputChange('description', val)}
                                            />

                                        </>
                                    )}

                                    {/* Submit Button */}
                                    <TouchableOpacity style={{...styles.submitButton, backgroundColor: COLORS.secondary, borderWidth: 1, elevation: 2,}} onPress={() => {
                                        modalType === 'create' ? handleSubmitCashflow() : handleCloseViewModal()
                                    }}>
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{modalType === 'create' ? 'SUBMIT' : 'CLOSE'}</Text>
                                    </TouchableOpacity>
                                    {/* <TouchableOpacity style={{...styles.submitButton, marginTop: 6, backgroundColor: COLORS.white}} onPress={handleSubmitCashflow}>
                                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{'REMOVE'}</Text>
                                    </TouchableOpacity> */}
                                </View>
                            </TouchableWithoutFeedback>

                        </View>
                    </TouchableWithoutFeedback>

                </Modal>
                <View style={{ paddingLeft: 10, height: 60, paddingTop: 10, paddingBottom: 10, marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, flexDirection: 'column', width: '100%', alignItems: 'flex-start', justifyContent: 'center' }}>
                        <Text style={styles.fontsHeader}>Total Expenses</Text>
                        <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(result?.totalExpense)}</Text>

                    </View>
                    <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
                        <Text style={styles.fontsHeader}>Total Payables</Text>
                        <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(result?.totalPayable)}</Text>
                    </View>
                </View>

                {renderTickerList(filteredList)}
                
                {showAll && (() => {
                    const payablesByUser = filteredList.reduce((acc, item) => {
                        if (item.input_type === 'borrow') {
                            const userId = item.user?.toString();
                            if (!userId || userId === user.id.toString()) return acc;

                            const userName = item.owner_name || 'Unknown User';

                            if (!acc[userId]) {
                                acc[userId] = { name: userName, total: 0 };
                            }

                            acc[userId].total += parseFloat(item.amount || '0');
                        }
                        return acc;
                    }, {});

                    const otherUsers = Object.entries(payablesByUser);

                    if (otherUsers.length === 0) return null;

                    return (
                        <View style={styles.summaryBox}>

                            <Text style={styles.summaryTitle}>Other Users' Total Payables</Text>
                            {otherUsers.map(([userId, { name, total }]) => (
                                <View key={userId} style={{ marginBottom: 10 }}>
                                    <Text style={styles.summaryTitle}>{name}</Text>
                                    <Text style={styles.summaryAmount}>₱{formatNumberWithComma(total)}</Text>
                                </View>
                            ))}
                        </View>
                    );
                })()}
      </View>
    </SafeAreaProvider>
  );
}

// keep all your styles below untouched
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 10,
  },
  dropdownItemStyle: { padding: 10 },
  dropdownMenuStyle: { backgroundColor: COLORS.white },
  dropdownItemTxtStyle: { color: COLORS.black },
  toggleRow: {
        flexDirection: 'row',
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    toggleText: {
        fontSize: 16,
        fontWeight: '600',
        paddingRight: 10
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: COLORS.gray400,
    },
    filterButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
    },
    activeFilter: {
        backgroundColor: COLORS.primary,
    },
    filterText: {
        color: COLORS.black,
    },
    itemContainer: {
        padding: 12,
        borderBottomWidth: 1,
        borderColor: COLORS.gray300,
    },
    amountText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    descText: {
        fontSize: 14,
        color: '#555',
    },
    metaText: {
        fontSize: 12,
        color: '#999',
    },
    summaryBox: {
        padding: 12,
        borderTopWidth: 1,
        borderColor: COLORS.gray300,
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fafafa',
    },
    summaryTitle: {
        fontSize: 14,
        color: '#333',
    },
    summaryAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    wrapper: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: 10,
        backgroundColor: COLORS.gray300
    },
    fontsHeader: {
        color: COLORS.black,
        fontWeight: 'bold',
        fontSize: 12,
    },
    dropdownMenuStyle: {
        backgroundColor: COLORS.gray600,
        fontSize: 14,
        position: 'absolute',
        width: '60%',
        position: 'absolute',
        textAlign: 'center',
        backgroundColor: '#E9ECEF',
        borderRadius: 8,
    },
    dropdownItemStyle: {
        width: 490,
        flexDirection: 'row',
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
    dropdownItemTxtStyle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '500',
        color: '#151E26',
    },
    item: {
        borderBottomColor: '#ccc',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#00000099',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        elevation: 5,
        flexDirection: 'column',
    },
    dropdown: {
        flexDirection: 'row',
        marginBottom: 12,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: 10,
    },
    dropdownItem: {
        padding: 10,
        backgroundColor: '#ddd',
        // opacity: .7,
        borderRadius: 6,
        borderWidth: .7,
        borderColor: '#ddd',
        // marginRight: 8,
        color: COLORS.black900,
        fontSize: 16,
        // fontWeight: '500',
        textAlign: 'center',
        width: 125
    },
    selectedDropdownItem: {
        backgroundColor: COLORS.secondary,
        color: 'white',
        opacity: 1,
        elevation: 2,
        shadowColor: COLORS.primary,
    },
    viewSelectedDropdownItem: {
        backgroundColor: COLORS.primaryTransparent1,
    },
    label: {
        fontWeight: 'bold',
        marginBottom: 4,
        marginTop: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#999',
        padding: 10,
        borderRadius: 8,
        // fontWeight: 'bold',
        marginBottom: 10,
    },
    searchItem: {
        padding: 8,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderColor: '#ccc',
    },
    submitButton: {
        marginTop: 16,
        backgroundColor: '#2196F3',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
    },
    suggestionWrapper: {
        position: 'relative',
        width: '100%',
    },
    suggestionText: {
        position: 'absolute',
        top: 15,
        left: 10,
        color: '#aaaa',
        zIndex: 1,
    },
    inputText: {
        fontWeight: '500'
    },
    suggestionInput: {
        zIndex: 2,
        backgroundColor: 'transparent',
        fontWeight: '500'
    },
});
