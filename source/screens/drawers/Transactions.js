import { FlatList, Image, StyleSheet, Text, TextInput, Alert, TouchableOpacity, View, RefreshControl, Switch, Platform } from 'react-native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import moment from 'moment-timezone'
// import { realmContext } from '../RealmContext'
import DateTimePicker from '@react-native-community/datetimepicker';
import SelectDropdown from 'react-native-select-dropdown'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import Animated, { BounceOutDown, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { COLORS, icons } from '../../constants'
import { formatNumberWithComma, getConfiguration, getDayRange, getTransactionDayRange } from '../../utils/helpers';
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
];


const Transactions = ({ navigation }) => {
  // const { api, dataVersion, bumpVersion } = useOffline();
  const dispatch = useDispatch();
  const { user, selectedUser } = useSelector(({ user }) => user);
    const { dataVersion } = useSelector(({ sync }) => sync);
  const [date, setDate] = useState(new Date())
  const [show, setShowDate] = useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [filterTime, setFilterTime] = useState(drawTimes[0].name)
  const [searchQuery, setSearchQuery] = useState('');
  const [includeAll, setIncludeAll] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);



  const userNow = selectedUser ? selectedUser?.id : user?.id;

  
  
  const updateTickets =  getConfiguration(user, 'updateTickets')?.isCheck;


  const load = async () => {
    // const { start_of_day, end_of_day  } = getTransactionDayRange(date)
    const { start_of_day, end_of_day  } = getDayRange(date)
    // Start and end of the day
    
  console.log(start_of_day, end_of_day, 'date range')
    
    let filters = {
    	is_deleted: false,
	    input_type: "normal"
    }
    // filters.is_deleted = false;
    if (includeAll) {
  filters = {
    ...filters,
    uplines: { op: "contains", value: [userNow] },
    timestamp: { op: "between", from: start_of_day, to: end_of_day },
  };
} else {
  filters = {
    ...filters,
    owner_id: userNow,
    timestamp: { op: "between", from: start_of_day, to: end_of_day },
  };
}




     let localBettings = await dispatch(fetchBettings({...filters, input_type: 'normal'}));

    
      setItems(localBettings);
      setLoading(false);
    };



  console.log(updateTickets, "CAN EDIT?")

    useEffect(() => {
    load();
  }, [show, date, userNow, includeAll, dataVersion]);
  

  console.log("THE ITEM", show)

  // DATE
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    console.log(event?.type, "THE EVENT", currentDate)
    if (event?.type == 'neutralButtonPressed') {
      setShowDate(Platform.OS === 'ios');
      // setFilterDate(false)
      setDate(new Date());
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
    // setShowTime(false)
    setFilterTime(item);
    // toggleModal();
  };


  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    setTimeout(() => {
      setRefreshing(false);
      load();
      
      // bumpVersion();
      setSearchQuery('');
      // setFilteredData(items)
      setLoading(false);
    }, 2000);
  }, [date, userNow, includeAll, dataVersion]);


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
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.white, marginTop: 10, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }}>
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
      const backgroundColor = index % 2 === 0 ? COLORS.gray300 : COLORS.gray200;



      return (
        <Animated.View
          entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
          exiting={FadeOutDown.delay(index * 100).duration(500)}
          key={index}
        >
          <TouchableOpacity
          key={index}
            // disabled={moment(date).isAfter(today) ? false : true}
            onLongPress={() => {
              if (updateTickets) {
                // dispatch({ type: SET_ACTIVE_USER, payload: collector })
                handleLongPress(item)
              }
            }}
            onPress={() => {
              // dispatch({ type: SET_ACTIVE_USER, payload: collector })
              navigation.navigate('ViewTicket', JSON.stringify(item))
            }}
            // style={{ paddingHorizontal: 10, borderColor: COLORS.gray600, width: '100%', flexDirection: 'row', marginTop: index == 0 ? 0 : 12, paddingTop: 12, borderTopWidth: index == 0 ? 0 : 1, alignItems: 'flex-start', justifyContent: 'space-around', }}
            style={{ paddingLeft: 10, backgroundColor: backgroundColor, width: '100%', flexDirection: 'row', paddingVertical: 14, justifyContent: 'space-around', alignItems: 'flex-start' }}
          >

            <Text style={{ textAlign: 'left', fontSize: 18, width: '30%', color: COLORS.black, }}>
              {item.ticket_no}
            </Text>
            <Text style={{ textAlign: 'left', fontSize: 18, width: '30%', fontWeight: 'bold', color: item.game_time == '2pm' ? '#3897e7' : item.game_time == '5pm' ? '#ff9d3e' : item.game_time == '9pm' ? COLORS.black600 : null }}>
              {String(item.game_time).toUpperCase()}
            </Text>
            <Text style={{ textAlign: 'left', width: '30%', fontSize: 18, color: COLORS.black, }}>
              ₱{Number(total)}
            </Text>
            <View style={{ width: '10%', alignItems: 'center', justifyContent: 'center' }}>
              {

                (item?.is_complete && !item?.is_validated)
                ?
                <Image
                  source={icons.exclamation}
                  style={{ height: 15, width: 15, resizeMode: 'contain', tintColor: COLORS.warningBorderColor }}
                /> : <></>
              }
            </View>

          </TouchableOpacity>
        </Animated.View>
      )
    }

    return (
      <>
        <View style={{ paddingLeft: 10, width: '100%', flexDirection: 'row', borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, color: COLORS.black, justifyContent: 'flex-start', backgroundColor: COLORS.gray400, alignItems: 'flex-start' }}>
          <Text style={{ textAlign: 'left', fontWeight: 'bold', color: COLORS.black, fontSize: 16, width: '30%' }}>
            Ticket#
          </Text>
          <Text style={{ textAlign: 'left', width: '30%', fontWeight: 'bold', color: COLORS.black, fontSize: 16, }}>
            GAME TIME
          </Text>
          <Text style={{ textAlign: 'left', width: '30%', fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>
            AMOUNT
          </Text>
        </View>

        <FlatList
          data={listData}
          keyExtractor={(item, index) => item.id}
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




  let filteredList = filterTime == 'All Time' ? items : items.filter(a => a.game_time == filterTime);
  filteredList = searchQuery ? items.filter(a => String(a.ticket_no).includes(String(searchQuery))) : filteredList

  let totalGross = filteredList.reduce((n, { gross }) => n + Number(gross), 0);


  console.log(totalGross, "GROSSY")


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

        <View style={{ paddingLeft: 10, paddingTop: 10, marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, flexDirection: 'column', width: '30%', }}>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16}}>{`Total Tickets`}</Text>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16, }}>{`${formatNumberWithComma(filteredList.length)}`}</Text>
            {/* <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(filteredList.length)}</Text> */}
            {/* <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(totalGross)}</Text> */}

          </View>
          <View style={{ flex: 1, flexDirection: 'column', width: '30%',  }}>
<Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16}}>{`Total Sales`}</Text>
<Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{`${formatNumberWithComma(totalGross)}`}</Text>
          </View>
          

{(selectedUser && selectedUser.role !== 'teller' && getConfiguration(selectedUser, 'showAllData')?.isCheck) &&
          <View style={{ width: '30%', alignItems: 'flex-end', flexDirection: 'column' }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10}}>
            <Text style={{ color: COLORS.black900, fontSize: 12, fontWeight: 'bold' }}>Show All</Text>
          <Switch
              trackColor={{ true: '#00ED64' }}
              onValueChange={() => {
              console.log(!includeAll)
                setIncludeAll(!includeAll);
              }}
              value={includeAll}
            />   
          </View>
            </View>
         
          }

          {/* <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
            
          </View> */}
        </View>
        
        {renderTickerList(filteredList)}

      </View>
    </SafeAreaProvider>
  )
}

export default Transactions

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
  itemText: {
    padding: 8
  },
  timeText: {
    padding: 12
  }
})