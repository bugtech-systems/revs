import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl, Modal, Pressable, TouchableWithoutFeedback, Keyboard } from 'react-native'
import React, { useEffect, useState } from 'react'
import moment from 'moment-timezone'
import DateTimePicker from '@react-native-community/datetimepicker';
import SelectDropdown from 'react-native-select-dropdown'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import Animated, { BounceOutDown, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Betting, Draws, Users } from '../../Models'
import { COLORS, icons } from '../../constants'
import { realmContext } from '../../RealmContext';
import { cutString, formatNumber, formatNumberWithComma } from '../../utils/helpers';
import CreateIcon from 'react-native-vector-icons/MaterialIcons'; // or any other icon library

const { useRealm, useQuery } = realmContext;

const MOCK_USERS = [
    { _id: 'u1', name: 'LEA-BOY' },
    { _id: 'u2', name: 'LEA-DAN' },
    { _id: 'u3', name: 'REVS-MANILA' },
    { _id: 'u4', name: 'LEA-MAR' },
    { _id: 'u5', name: 'LEA-VAN' },
    { _id: 'u6', name: 'LEA-LIBOY' },

];

const drawTimes = [
    {
        id: 0,
        name: 'All Types'
    },
    {
        id: 1,
        name: 'Expense'
    },
    {
        id: 2,
        name: 'Payment'
    },
    {
        id: 3,
        name: 'Borrow'
    },
];

const dataFlow = [
    { "amount": "1500", "createdAt": "2025-06-26T13:08:12.302Z", "description": "Meeting with new coordinators from san isidro", "inputType": "expense", "isDeleted": false, "owner": "", "updatedAt": "2025-06-26T13:10:46.669Z", "updatedBy": null, "user": "6635633231db62dd9871fb18" },
    { "amount": "3000", "createdAt": "2025-06-21T13:20:17.325Z", "description": "Borrowed funds to pay winnings.", "inputType": "borrow", "isDeleted": false, "owner": "u3", "owner_name": 'REVS-MANILA', "updatedAt": "2025-06-26T13:24:28.563Z", "updatedBy": null, "user": "6635633231db62dd9871fb18" },
    { "amount": "2500", "createdAt": "2025-06-26T13:16:19.036Z", "description": "Partial payment from a borrowed funds to pay June 21, 2025 2pm winnings.", "inputType": "payment", "isDeleted": false, "owner": "u3", "owner_name": 'REVS-MANILA', "updatedAt": "2025-06-26T13:17:42.953Z", "updatedBy": null, "user": "6635633231db62dd9871fb18" }

]

const CashFlow = ({ navigation }) => {
    const dispatch = useDispatch()
    const realm = useRealm()
    const { collector, user, selectedUser } = useSelector(({ user }) => user);
    const [date, setDate] = useState(new Date())
    const [show, setShowDate] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [refreshing, setRefreshing] = React.useState(false);
    const [filterTime, setFilterTime] = useState(drawTimes[0].name)
    const [showTime, setShowTime] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();

    let collectorName = selectedUser ? selectedUser : collector;

    const users = useQuery(Users, user => {
        return user.filtered(
            'email == $0',
            collectorName,
        );
    }, [collectorName]);


    const items = useQuery(Betting, data => {
        let userNow = users[0] ? users[0]._id : "";
        if (new Date(date) <= new Date(user?.lastSummary)) {
            startOfDay = moment().add(1, 'd').endOf('day').toDate();
            endOfDay = moment().add(1, 'd').endOf('day').toDate();
        }
        return data.filtered('isDeleted == false && inputType == "normal" && timestamp >= $0 && timestamp < $1 && owner_id == $2', startOfDay, endOfDay, String(userNow)).sorted('timestamp', true)
    }, [date, users, selectedUser]);

    function calculateTotals(flows) {
        return flows.reduce((totals, item) => {
            const amt = parseFloat(item.amount) || 0;

            if (item.inputType === 'expense') {
                totals.expenses += amt;
            } else if (item.inputType === 'borrow' || item.inputType === 'lend') {
                totals.payables += amt;
            } else if (item.inputType === 'payment') {
                totals.payables -= amt;
            }

            return totals;
        }, { expenses: 0, payables: 0 });
    }



    // DATE
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

    const showDatePicker = () => {
        setShowDate(true);
    };

    const handleTimeSelect = (item) => {
        setShowTime(false)
        setFilterTime(item);
        // toggleModal();
    };


    const onRefresh = React.useCallback(() => {
        let rnd = Math.floor(100 + Math.random() * 900);
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
            setRefreshTrigger(rnd);
            setSearchQuery('');
            setCurrentPage(1)
            // setFilteredData(items)
        }, 2000);
    }, []);


    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleLongPress = (item) => {
        navigation.navigate('UpdateTicket', JSON.stringify(item))
    }

    function renderHeader() {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                <TouchableOpacity
                    activeOpacity={.9}
                    onPress={showDatePicker}
                    // onPress={() => navigation.navigate('TestPaginate', {})}
                    style={{ width: '48%', borderColor: COLORS.white, borderWidth: 1, borderRadius: 8, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }}
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
                        // Alert.alert(selectedItem, index)
                    }}

                    style={{ width: '48%', alignItems: 'center', justifyContent: 'center' }}
                    defaultValueByIndex={0}
                    renderButton={(selectedItem, isOpened) => {
                        return (
                            <TouchableOpacity
                                // disabled={true}
                                activeOpacity={1}
                                style={{ width: '48%', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.white, borderRadius: 8, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }
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

    function renderSearchInput() {
        return (
            <View
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 10, }}
            >
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', width: '90%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }}>
                    <TextInput
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholder='Search some text here..'
                        placeholderTextColor={COLORS.gray800}
                        style={{ height: 40, paddingLeft: 10, width: '90%', color: COLORS.black }}
                    />
                    <Image
                        source={icons.search}
                        style={{ height: '12%', width: '12%', padding: 10, }}
                        resizeMode='contain'

                    />
                </TouchableOpacity>
                {/* <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{drawTime == undefined || '' ? 'Select Draw Time' : moment(date).format('MM/DD/YYYY')}</Text> */}
                <TouchableOpacity
                    style={{ alignItems: 'center', justifyContent: 'center', }}
                    onPress={() => setModalVisible(true)}
                >
                    <CreateIcon
                        name='edit-note'
                        size={42}
                        color={COLORS.black800}
                    // color={'#0CC27D'}
                    />
                </TouchableOpacity>
            </View>
        )
    }

    function renderTickerList(listData) {
        const renderItem = ({ item, index }) => {
            let newDate = new Date();
            let today = moment(newDate).startOf('day')
            let total = 0;
            const amnt = item?.combinations?.map(data => {
                total += data.amount
                return
            })

            delete item.uplines;
            const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;


            return (
                <Animated.View
                    entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
                    exiting={FadeOutDown.delay(index * 100).duration(500)}
                >
                    <TouchableOpacity
                        onLongPress={() => {
                            if (user.isAdmin) {
                                handleLongPress(item)
                            }
                        }}
                        onPress={() => {
                            navigation.navigate('ViewTicket', JSON.stringify(item))
                        }}
                        style={{ paddingLeft: 10, backgroundColor: backgroundColor, width: '100%', flexDirection: 'row', paddingVertical: 14, justifyContent: 'space-between', alignItems: 'flex-start' }}
                    >


                        <View
                            style={{ width: '50%', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}
                        >
                            <Text style={{
                                textAlign: 'left', fontSize: 18,
                                color: item?.inputType === 'borrow' ? COLORS.black900 : item?.inputType === 'payment' ? COLORS.black900 : item?.inputType === 'expense' ? COLORS.transparentRed : COLORS.black, fontWeight: '600',
                            }}>
                                {String(item.inputType).toUpperCase()}
                            </Text>
                            {
                                (item?.inputType == 'borrow' || item?.inputType == 'payment') ?
                                    <Text
                                        style={{
                                            fontWeight: 'bold',
                                            color: COLORS.darkGray2,
                                            fontSize: 14,
                                            textAlign: 'left'
                                        }}
                                    >
                                        <Text style={{ color: COLORS.darkGray2, fontWeight: '500', fontSize: 13 }}>{item?.inputType == 'borrow' ? 'From: ' : 'To: '}</Text>{String(item?.owner_name).toUpperCase()}
                                    </Text>
                                    :
                                    <Text
                                        style={{
                                            fontWeight: 'bold',
                                            color: COLORS.darkGray2,
                                            fontSize: 14,
                                            textAlign: 'left'
                                        }}
                                    >
                                        <Text style={{ color: COLORS.darkGray2, fontWeight: '500', fontSize: 13 }}>
                                            {"Note: "}

                                        </Text>
                                        {String(cutString(item?.description, 15)).toUpperCase()}
                                    </Text>
                            }
                        </View>
                        <View style={{ width: '50%', alignItems: 'flex-end', justifyContent: 'center', flexDirection: 'column', paddingRight: 10, }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 12, color: COLORS.darkGray2 }}>
                                {moment(item?.createdAt).format('MMMM DD, YYYY hh:mm A')}
                            </Text>
                            <Text style={{ fontWeight: 'bold', fontSize: 12, color: COLORS.warningBorderColor, fontSize: 20 }}>
                                {formatNumber(Number(item?.amount).toFixed(2))}
                            </Text>
                        </View>

                    </TouchableOpacity>
                </Animated.View>
            )
        }

        return (
            <>
                <View style={{ paddingLeft: 10, width: '100%', flexDirection: 'row', borderBottomWidth: 3, borderTopWidth: 2, borderColor: COLORS.gray600, color: COLORS.black, justifyContent: 'flex-start', backgroundColor: COLORS.gray400, alignItems: 'flex-start' }}>
                </View>

                <FlatList
                    data={dataFlow}
                    keyExtractor={(item, index) => item._id}
                    renderItem={renderItem}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={true}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={{ padding: 8, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
                                No records found.
                            </Text>
                        </View>
                    }
                    ListFooterComponent={
                        dataFlow.length > 0 &&
                        <View style={{ padding: 8, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
                                End of results.
                            </Text>
                        </View>
                    }
                />
            </>
        )
    }

    let filteredList = filterTime == 'All Time' ? items : items.filter(a => a.gameTime == filterTime);
    filteredList = searchQuery ? items.filter(a => String(a.ticketNo).includes(String(searchQuery))) : filteredList

    let totalGross = filteredList.reduce((n, { gross }) => n + gross, 0);


    const [modalVisible, setModalVisible] = useState(false);
    const [inputType, setInputType] = useState('Expense');
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        owner: '',
        user: user?._id,
        updatedBy: null,
        createdAt: moment().toDate(),
        updatedAt: moment().toDate(),
        isDeleted: false,
        inputType: 'expense',
    });

    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const handleModalSearch = (text) => {
        setSearch(text);
        const results = MOCK_USERS.filter((u) =>
            u.name.toLowerCase().includes(text.toLowerCase())
        );
        setSearchResults(results);
    };

    const handleSelectUser = (user, type) => {
        setFormData((prev) => ({
            ...prev,
            owner: user._id,
        }));
        setSearch(user.name);
        setSearchResults([]);
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
            updatedAt: moment().toDate(),
        }));
    };

    const handleTypeChange = (type) => {
        const defaultType = type.toLowerCase();
        setInputType(type);
        setFormData({
            amount: '',
            description: '',
            owner: '',
            user: user?._id,
            updatedBy: null,
            createdAt: moment().toDate(),
            updatedAt: moment().toDate(),
            isDeleted: false,
            inputType: defaultType,
        });
        setSearch('');
        setSearchResults([]);
    };

    const handleSubmit = () => {
        console.log('Submitted Data:', formData);
        setModalVisible(false);
    };

    const { expenses: totalExpenses, payables: totalPayables } = calculateTotals(dataFlow);

    return (
        <SafeAreaProvider style={styles.wrapper}>
            <View style={{ flex: 1, width: '100%' }}>
                {renderHeader()}
                {renderSearchInput()}
                {show && (
                    <DateTimePicker
                        testID="dateTimePicker"
                        value={date}
                        mode="date"
                        display="default"
                        onChange={onChangeDate}
                        minimumDate={new Date(users[0]?.lastSummary)}
                        maximumDate={new Date(moment().toDate())}
                        negativeButton={{ label: "Cancel", }}
                        neutralButton={{ label: "Clear", }}
                    />
                )}

                {/* Modal */}
                <Modal
                    animationType="slide"
                    transparent
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <TouchableWithoutFeedback
                        onPress={() => {
                            Keyboard.dismiss();
                            setModalVisible(false);
                        }}
                    >
                        <View style={styles.centeredView}>
                            <TouchableWithoutFeedback onPress={() => { }}>

                                <View style={styles.modalView}>

                                    {/* Type Selector */}
                                    <Text style={styles.label}>Select Type:</Text>
                                    <View style={styles.dropdown}>
                                        {['Expense', 'Payment', 'Borrow'].map((type) => (
                                            <TouchableOpacity key={type} onPress={() => handleTypeChange(type)}>
                                                <Text style={[
                                                    styles.dropdownItem,
                                                    inputType === type && styles.selectedDropdownItem,
                                                ]}>
                                                    {type}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {/* Dynamic Fields */}
                                    {inputType === 'Expense' && (
                                        <>
                                            <Text style={styles.label}>Amount:</Text>
                                            <TextInput
                                                style={styles.input}
                                                keyboardType="numeric"
                                                value={formData.amount}
                                                onChangeText={(val) => handleInputChange('amount', val)}
                                            />
                                            <Text style={styles.label}>Description:</Text>
                                            <TextInput
                                                style={[styles.input, { height: 80 }]}
                                                multiline
                                                numberOfLines={4}
                                                value={formData.description}
                                                onChangeText={(val) => handleInputChange('description', val)}
                                            />
                                        </>
                                    )}

                                    {(inputType === 'Payment' || inputType === 'Borrow') && (
                                        <>
                                            <Text style={styles.label}>{inputType === 'Payment' ? 'Payment to:' : 'Borrow from:'}</Text>
                                            <View style={styles.suggestionWrapper}>
                                                {/* Suggestion text (gray) */}
                                                {search.length > 0 && searchResults.length > 0 && (
                                                    <Text style={styles.suggestionText}>
                                                        <Text style={styles.inputText}>{search}</Text>
                                                        {searchResults[0].name.substring(search.length)}
                                                    </Text>
                                                )}

                                                {/* Actual TextInput */}
                                                <TextInput
                                                    style={[styles.input, styles.suggestionInput]}
                                                    // placeholder="Search user"
                                                    value={search}
                                                    onChangeText={(text) => {
                                                        setSearch(text);
                                                        const results = MOCK_USERS.filter((u) =>
                                                            u.name.toLowerCase().startsWith(text.toLowerCase())
                                                        );
                                                        setSearchResults(results);
                                                    }}
                                                    onPressIn={() => {
                                                        if (search.length > 0 && searchResults.length > 0) {
                                                            const selected = searchResults[0];
                                                            handleSelectUser(selected);
                                                            setSearch(selected.name); // Autocomplete
                                                            setSearchResults([]);
                                                        }
                                                    }}
                                                />
                                            </View>
                                            <Text style={styles.label}>Amount:</Text>
                                            <TextInput
                                                style={styles.input}
                                                keyboardType="numeric"
                                                value={formData.amount}
                                                onChangeText={(val) => handleInputChange('amount', val)}
                                            />
                                            <Text style={styles.label}>Description:</Text>
                                            <TextInput
                                                style={[styles.input, { height: 80 }]}
                                                multiline
                                                numberOfLines={4}
                                                value={formData.description}
                                                onChangeText={(val) => handleInputChange('description', val)}
                                            />
                                        </>
                                    )}

                                    {/* Submit Button */}
                                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Submit</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>

                        </View>
                    </TouchableWithoutFeedback>

                </Modal>

                <View style={{ paddingLeft: 10, height: 50, paddingTop: 10, paddingBottom: 10, marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, flexDirection: 'column', width: '100%', alignItems: 'flex-start' }}>
                        <Text style={styles.fontsHeader}>Total Expenses</Text>
                        <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(totalExpenses)}</Text>

                    </View>
                    <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
                        <Text style={styles.fontsHeader}>Total Payables</Text>
                        <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(totalPayables)}</Text>
                    </View>
                </View>
                {renderTickerList(filteredList)}

            </View>
        </SafeAreaProvider>
    )
}

export default CashFlow

const styles = StyleSheet.create({
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
        color: COLORS.darkGray2,
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        width: 125
    },
    selectedDropdownItem: {
        backgroundColor: '#2196F3',
        color: 'white',
        opacity: 1,
        elevation: 2,
        shadowColor: COLORS.primary,
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
        marginBottom: 12,
    },
    suggestionText: {
        position: 'absolute',
        top: 14,
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
})