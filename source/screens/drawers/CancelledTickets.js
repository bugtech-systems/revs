import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native'
import React, { useEffect, useState } from 'react'
import moment from 'moment-timezone'
import { realmContext } from '../../RealmContext'
import { Betting, Draws, Users } from '../../Models'
import DateTimePicker from '@react-native-community/datetimepicker';
import SelectDropdown from 'react-native-select-dropdown'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { SET_ACTIVE_USER } from '../../redux/actions/types';
import { COLORS, icons } from '../../constants'
import Animated, { BounceOutDown, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { formatNumberWithComma } from '../../utils/helpers'


const { useRealm, useQuery } = realmContext;
const drawsSubscriptionName = 'draws';
const itemSubscriptionName = 'items';

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

const CancelledTickets = ({ navigation }) => {
  const { collector, selectedUser } = useSelector(({ user }) => user);
  const dispatch = useDispatch()
  const realm = useRealm()
  const [date, setDate] = useState(new Date())
  const [show, setShowDate] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [time, setTime] = useState(new Date())
  const [showTime, setShowTime] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [shows, setShow] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const [filterTime, setFilterTime] = useState(drawTimes[0].name)


  let collectorName = selectedUser ? selectedUser : collector;
  
  const users = useQuery(Users, user => {
    return user.filtered(
      'email == $0',
      collectorName,
    );
  }, [collectorName]);

  const adminAccess = users[0]?.isAdmin;

const items = useQuery(Betting, data => {
  const startOfDay = moment(date).startOf('day').toDate();
  const endOfDay = moment(date).endOf('day').toDate();

  if (adminAccess) {
    // Admin: no owner_id filter
    return data.filtered(
      'isDeleted == true && timestamp >= $0 && timestamp < $1',
      startOfDay,
      endOfDay
    ).sorted('timestamp', true);
  } else {
    // Non-admin: filter by owner_id
    return data.filtered(
      'isDeleted == true && timestamp >= $0 && timestamp < $1 && owner_id == $2',
      startOfDay,
      endOfDay,
      String(users[0]._id)
    ).sorted('timestamp', true);
  }
}, [realm, date, adminAccess]);

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
        return item.gameTime == selectedTime
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

  function renderHeader() {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
        <TouchableOpacity
          activeOpacity={.9}
          onPress={showDatePicker}
          style={{ width: '48%', borderWidth: 1, borderRadius: 8, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }}
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
          }}

          style={{ width: '48%', alignItems: 'center', justifyContent: 'center' }}
          defaultValueByIndex={0}
          renderButton={(selectedItem, isOpened) => {
            return (
              <TouchableOpacity
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
            // disabled={moment(date).isAfter(today) ? false : true}
            onPress={() => {
              // dispatch({ type: SET_ACTIVE_USER, payload: collector })
              navigation.navigate('ViewTicket', JSON.stringify(item))
            }}
            // style={{ paddingHorizontal: 10, borderColor: COLORS.gray600, width: '100%', flexDirection: 'row', marginTop: index == 0 ? 0 : 12, paddingTop: 12, borderTopWidth: index == 0 ? 0 : 1, alignItems: 'flex-start', justifyContent: 'space-around', }}
            style={{
              paddingLeft: 10, backgroundColor: backgroundColor, width: '100%', flexDirection: 'row', paddingVertical: 14, justifyContent: 'flex-start', alignItems: 'flex-start'
            }}
          >

            <Text style={{ fontSize: 18, width: '30%', textAlign: 'left', color: COLORS.black, }}>
              {item.ticketNo}
            </Text>
            <Text style={{ textAlign: 'left', fontSize: 18, width: '30%', fontWeight: 'bold', color: item.gameTime == '2pm' ? '#3897e7' : item.gameTime == '5pm' ? '#ff9d3e' : item.gameTime == '9pm' ? COLORS.black600 : null }}>
              {String(item.gameTime).toUpperCase()}
            </Text>
            <Text style={{ textAlign: 'left', width: '30%', fontSize: 18, color: COLORS.black, }}>
              ₱{Number(total)}  {item.inputType == 'sold' ? `(SO)` : ''}
            </Text>
             <View style={{ width: '10%', alignItems: 'center', justifyContent: 'center' }}>
                          {
            
                            (item?.isComplete && !item?.isValidated)
                            &&
                            <Image
                              source={icons.exclamation}
                              style={{ height: 15, width: 15, resizeMode: 'contain', tintColor: COLORS.warningBorderColor }}
                            />
                          }
                        </View>

          </TouchableOpacity>
        </Animated.View>
      )
    }

    return (
      <>
        <View style={{ paddingLeft: 10, width: '100%', flexDirection: 'row', borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, color: COLORS.black, justifyContent: 'flex-start', backgroundColor: COLORS.gray400, alignItems: 'flex-start' }}>
          <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16, width: '30%' }}>
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
            listData.length > 0 &&
            <View style={{ padding: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
                End of results.
              </Text>
            </View>
          }
        />
      </>
    )
  }

  useEffect(() => {
    let cur = users[0] ? users[0]._id : "";
    let filterString = `owner_id == "${cur}"`;


    // let data =  realm.objects(Betting).filtered(filterString);
    let drawsDataArray = realm.objects(Draws);
    let userData = realm.objects(Users).filtered(`email == "${collector}"`);

    realm.subscriptions.update(mutableSubs => {
      mutableSubs.removeByName(itemSubscriptionName);
      // mutableSubs.add(data, { name: ownItemsSubscriptionName });
    });

    realm.subscriptions.update(mutableSubs => {
      mutableSubs.add(userData, { name: 'items3' });
      mutableSubs.add(drawsDataArray, { name: drawsSubscriptionName });
    });
  }, [realm, users])

  let filteredList = filterTime == 'All Time' ? items : items.filter(a => a.gameTime == filterTime);
  filteredList = searchQuery ? items.filter(a => String(a.ticketNo).includes(String(searchQuery))) : filteredList
  let totalGross = filteredList.reduce((n, { gross }) => n + gross, 0);

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
        <View style={{ paddingLeft: 10, height: 50, paddingTop: 10, paddingBottom: 10, marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, flexDirection: 'column', width: '100%', alignItems: 'flex-start' }}>
            <Text style={styles.fontsHeader}>Total Tickets</Text>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(filteredList.length)}</Text>

          </View>
          <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
            <Text style={styles.fontsHeader}>Total Amount</Text>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(totalGross)}</Text>
          </View>
        </View>
        {renderTickerList(filteredList)}
      </View>
    </SafeAreaProvider>
  )
}
export default CancelledTickets

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
    position: 'absolute',
    marginLeft: 10,
    top: '100%'
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageInfo: {
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.black
  },
  dropdownButtonStyle: {
    width: 35,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownButtonTxtStyle: {
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
  }

})