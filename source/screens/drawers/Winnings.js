import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, Switch, View, Platform, Alert } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import moment from 'moment-timezone'
import DateTimePicker from '@react-native-community/datetimepicker';
import SelectDropdown from 'react-native-select-dropdown'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import { COLORS, icons } from '../../constants'
import { formatNumberWithComma, getConfiguration } from '../../utils/helpers';
import Animated, { BounceOutDown, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { api, fetchUser } from '../../utils/offlineSync';
import { fetchBettings } from '../../redux/actions/bettingActions';
// import { useOffline } from '../../context/OfflineProvider';


const drawTimes = [
    {
        id: 0,
        name: 'All Time'
    },
    {
        id: 1,
        name: '2pm'
    },
    {
        id: 2,
        name: '5pm'
    },
    {
        id: 3,
        name: '9pm'
    },
]

const Winnings = ({ navigation }) => {
    const dispatch = useDispatch()
    const { collector, user, selectedUser } = useSelector(({ user }) => user);
    // const { dataVersion, api, fetchUser } = useOffline()
    const [date, setDate] = useState(new Date())
    const [show, setShowDate] = useState(false);
    const [selectedTime, setSelectedTime] = useState(null);
    const [time, setTime] = useState(new Date())
    const [showTime, setShowTime] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredData, setFilteredData] = useState([]);
    const [itemsPerPage, setItemsPerPage] = useState(Number(10));
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [includeAll, setIncludeAll] = useState(false);
    const [filterTime, setFilterTime] = useState('')
    const [items, setItems] = useState([]);
    

    // DATE
    const onChangeDate = (event, selectedDate) => {
        const currentDate = selectedDate || date;
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

    //TIME
    const onChangeTime = (selectedTime) => {
        const currentTime = selectedTime || time;
        setShowTime(Platform.OS === 'ios');
        if (filteredData) {
            const selectedOption = filteredData.find(item => {
                return item.game_time == selectedTime
            }
            );
            if (selectedOption) {
                setSelectedTime(selectedOption);
            } else {
                setSelectedTime(null);
            }
        }

        setTime(currentTime);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);

    };

    function renderSearchInput() {
        return (
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6, marginTop: 10 }}>
                <TextInput
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholder='Search by Ticket#'
                    placeholderTextColor={COLORS.gray800}
                    style={{ height: 40, paddingLeft: 10, width: '90%', color: COLORS.black }}
                />
                <Image
                    source={icons.search}
                    style={{ height: '12%', width: '12%', padding: 10, }}
                    resizeMode='contain'

                />
            </TouchableOpacity>
            // <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{drawTime == undefined || '' ? 'Select Draw Time' : moment(date).format('MM/DD/YYYY')}</Text>
        )
    }

    function renderTicketList(listData) {
        const renderItem = ({ item, index }) => {
            // let amount = 0;

            let winPrize = item?.is_win_to ? getConfiguration(user, 'withWin200').value : getConfiguration(user, 'winStraight').value
            const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;


            return (
                <Animated.View
                    key={index}
                    entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
                    exiting={FadeOutDown.delay(index * 100).duration(500)}
                >

                    <TouchableOpacity
                        onPress={() => {
                            // dispatch({ type: SET_ACTIVE_USER, payload: collector })
                            navigation.navigate('Winning Ticket', JSON.stringify({ ...item, agent: user.firstName }))

                        }}
                        style={{ paddingVertical: 10, backgroundColor: backgroundColor, width: '100%', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' }}
                    // style={{ flex: 1, alignItems: 'flex-start', borderColor: COLORS.gray600, justifyContent: 'flex-start', width: '100%', flexDirection: 'row', marginTop: index == 0 ? 0 : 12, paddingTop: 12, paddingHorizontal: 10, borderTopWidth: index == 0 ? 0 : 1, }}
                    >
                        <Text style={{ width: '40%', flexGrow: 1, textAlign: 'left', left: 10, fontSize: 18, color: COLORS.black, }}>
                            {item.ticket_no}
                        </Text>
                        <Text style={{ fontSize: 16, width: '30%', textAlign: 'center', fontSize: 18, color: item.game_time == '2pm' ? '#3897e7' : item.game_time == '5pm' ? '#ff9d3e' : item.game_time == '9pm' ? COLORS.black600 : null }}>
                            {String(item.game_time).toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 16, width: '30%', textAlign: 'center', fontSize: 18, color: COLORS.black }}>
                            ₱{formatNumberWithComma(item.winning * winPrize)}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

            )
        }

        return (
            <>
                <View style={{ alignItems: 'center', width: '100%', flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.gray600, color: COLORS.black, justifyContent: 'space-around', backgroundColor: COLORS.gray400, alignItems: 'flex-start' }}>
                    <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16, width: '40%', flexGrow: 1, textAlign: 'left', left: 10 }}>
                        TICKET#
                    </Text>
                    <Text style={{ textAlign: 'center', width: '30%', fontWeight: 'bold', color: COLORS.black, fontSize: 16, }}>
                        GAME TIME
                    </Text>
                    <Text style={{ textAlign: 'center', width: '30%', fontWeight: 'bold', color: COLORS.black, fontSize: 16, }}>
                        Winnings
                    </Text>
                </View>
                <FlatList
                    data={listData}
                    keyExtractor={(item, index) => item.id}
                    renderItem={renderItem}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={true}
                    ListEmptyComponent={
                        <View style={{ padding: 8, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
                                No records found.
                            </Text>
                        </View>
                    }
                    ListFooterComponent={
                        listData.length > 0 &&
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

    const toggleModal = () => {
        setIsModalVisible(false);
    };
    const handleSelect = (item) => {
        setItemsPerPage(item.value);
        toggleModal();
    };


    useEffect(() => {
        setFilterTime(drawTimes[0].name)
    }, [])



    
      useEffect(() => {
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
        uplines: { op: "json_contains_batch", value: [String(selectedCollector.id)] },
        timestamp: { op: "between", from: start_of_day, to: end_of_day },
        winning: {op: ">", value: 0},
        winning: {op: "!=", value: "0"}
      };
    } else {
      filters = {
        ...filters,
        owner_id: selectedCollector.id,
        timestamp: { op: "between", from: start_of_day, to: end_of_day },
         winning: {op: ">", value: 0},
        winning: {op: "!=", value: "0"}
      };
    }
    
    
          let localBettings = await dispatch(fetchBettings({...filters, input_type: 'normal'}));
    
    
        //   let localBettings = await api.listBettings({
        // filters: {...filters, input_type: 'normal'},
        //     orderBy: 'timestamp DESC',
        //     // limit: 20,
        //   });
          
          setItems(localBettings);
        })();
        
        return () => {
    
    
        }
      }, [date, includeAll, collector]);
    
    
    
    
    function renderHeader() {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                <TouchableOpacity
                    activeOpacity={1}
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

    let filteredList = filterTime == 'All Time' ? items : items.filter(a => a.game_time == filterTime);
    filteredList = searchQuery ? items.filter(a => String(a.ticket_no).includes(String(searchQuery))) : filteredList
    let totalWins = filteredList.reduce((n, { is_win_to, winning }) => n + (Number(winning) * (is_win_to ? getConfiguration(selectedUser, 'withWin200').value : getConfiguration(selectedUser, 'winStraight').value)), 0);

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
                        minimumDate={new Date(selectedUser?.last_summary)}
                        maximumDate={new Date(moment().toDate())}
                        negativeButton={{ label: "Cancel", }}
                        neutralButton={{ label: "Clear", }}
                    />
                )}
                <View style={{ height: 50, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 10, marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
                        <Text style={styles.fontsHeader}>Total Hits</Text>
                        <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{`${formatNumberWithComma(filteredList.length)}`}</Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
                        <Text style={styles.fontsHeader}>Total Winnings</Text>
                        <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(totalWins)}</Text>
                    </View>
                </View>
                {(user && (user.role !== 'teller' || getConfiguration(user, 'showAllData')?.isCheck)) &&
                    <View style={styles.toggleRow}>
                        <Switch
                            trackColor={{ true: '#00ED64' }}
                            onValueChange={() => {
                                // if (realm.syncSession?.state !== 'active') {
                                //     Alert.alert(
                                //         'Switching subscriptions does not affect Realm data when the sync is offline.',
                                //     );
                                // }
                                setIncludeAll(!includeAll);
                            }}
                            value={includeAll}
                        />
                        <Text style={styles.toggleText}>Show All</Text>
                    </View>}
                {renderTicketList(filteredList)}
            </View>
        </SafeAreaProvider>
    )
}

export default Winnings

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'flex-end',
        // backgroundColor: COLORS.green,
        // borderWidth: 1,
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
    modalContentPageLimit: {
        backgroundColor: 'white',
        borderColor: COLORS.white,
        elevation: 8,
        borderWidth: 1,
        padding: 20,
        alignItems: 'flex-start',
        flex: 1,
        height: '35%',
        width: '100%',
        // alignItems: 'center',
        // justifyContent: 'center',
        position: 'absolute',
        marginLeft: 10,
        top: '100%'
        // width: '100%',

        // maxHeight: '50%',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // borderBottomWidth: 1
        // marginVertical: 10,
    },
    pageInfo: {
        fontSize: 16,
        textAlign: 'center',
        color: COLORS.black

    },
    dropdownButtonStyle: {
        width: 35,
        borderBottomWidth: 1,
        // height: 50,
        // backgroundColor: COLORS.black,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        // paddingHorizontal: 12,
    },
    dropdownButtonTxtStyle: {
        // flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#151E26',
    },
    dropdownButtonArrowStyle: {
        fontSize: 28,
    },
    dropdownButtonIconStyle: {
        fontSize: 12,
        marginRight: 8,
    },
    dropdownMenuStyle: {
        backgroundColor: COLORS.gray600,
        fontSize: 14,
        position: 'absolute',
        width: '60%',
        position: 'absolute',
        // top: 50,
        // bottom: 10,
        // height: 50,
        textAlign: 'center',
        backgroundColor: '#E9ECEF',
        borderRadius: 8,
    },
    dropdownItemStyle: {
        width: 490,
        flexDirection: 'row',
        // borderWidth: 1,
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
    dropdownItemIconStyle: {
        fontSize: 28,
        marginRight: 8,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
    },
    modalContent: {
        width: 300,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center'
    },
    item: {
        // padding: 6,
        // borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    modalTitle: {
        fontSize: 20,
        marginBottom: 20,
        color: COLORS.white2,

    },
    itemText: {
        padding: 8
    },
    timeText: {
        padding: 12
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
    },
    toggleText: {
        flex: 1,
        fontSize: 16,
        color: COLORS.black
    },

})