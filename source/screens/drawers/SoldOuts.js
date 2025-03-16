import { FlatList, Image, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl, Alert, Platform } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import moment from 'moment-timezone'
import { realmContext } from '../../RealmContext'
import { useUser, useApp } from '@realm/react';
import { Betting, Draws, Users } from '../../Models'
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from 'react-native'
import SelectDropdown from 'react-native-select-dropdown'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { CLOSE_CONFIRMATION_MODAL, OPEN_CONFIRMATION_MODAL, SET_ACTIVE_USER, SET_LOADING, STOP_LOADING } from '../../redux/actions/types';
import axios from 'axios';
import { COLORS, icons, SIZES } from '../../constants'
import Config from 'react-native-config';
import { formatNumberWithComma } from '../../utils/helpers';
import Animated, { BounceOutDown, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import ConfirmationModal from '../../components/ConfirmationModal';

const { useRealm, useQuery } = realmContext;
const ownItemsSubscriptionName = 'ownItems';
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

const SoldOuts = ({ navigation }) => {
  const { collector, selectedUser } = useSelector(({ user }) => user);
  const { loading, confirmationModal } = useSelector(({ ui }) => ui);
  const dispatch = useDispatch()
  const realm = useRealm()
  const [date, setDate] = useState(new Date())
  const [grandTotal, setGrandTotal] = useState(0);
  const [show, setShowDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [time, setTime] = useState(new Date())
  const [showTime, setShowTime] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(Number(10));
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const [filterTime, setFilterTime] = useState(drawTimes[0].name)
  const [totalTickets, setTotalTickets] = useState(0)
  // const items = useQuery(Betting, data => { return data.filtered('isDeleted == $0', false, 'timestamp >= $1', moment(moment().toDate()).isAfter(date)) }, [date, fil]);
  const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

  const users = useQuery(Users, userData => {

    if (selectedUser) {
      return userData.filtered(
        `email == $0`, String(selectedUser)
      );
    } else {
    
      return userData.filtered(
        'email == $0',
        collector,
      );
    }
    
  }, [collector, selectedUser]);

  const draws = useQuery(Draws, data => {
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();
    return data.filtered('drawDate >= $0 && drawDate < $1', startOfDay, endOfDay).sorted('drawDate')
  }, [date, users[0]]);

  const items = useQuery(Betting, data => {
    const startOfDay = moment(startDate).startOf('day').toDate();
    const endOfDay = moment(endDate).endOf('day').toDate();
    let userNow = users[0] ? users[0]._id : "";


    console.log(userNow, "DAYUSERNAW")

    return data.filtered('isDeleted == false && inputType == "sold" && timestamp >= $0 && timestamp < $1 && owner_id == $2', startOfDay, endOfDay, String(users[0]._id)).sorted('timestamp', true)
    // return data.filtered('isDeleted == false && timestamp >= $0 && timestamp < $1 && owner_id == $2', startOfDay, endOfDay, String(userNow)).sorted('timestamp', true)
  }, [startDate, endDate, realm, users ]);


  console.log(users[0]._id, "USER NOW")
  console.log(items.length, "SOLD OUT ITEMS")
  
  
  
  function getTimeRange() {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMins = currentTime.getMinutes();
    let card2pm = draws.filter(a => a.gameTime == '2pm')[0];
    let card5pm = draws.filter(a => a.gameTime == '5pm')[0];
    let card9pm = draws.filter(a => a.gameTime == '9pm')[0];
    if (!card2pm && !card5pm && !card9pm) {
      return "2pm";
    } else if (card2pm && !card5pm) {
      return "5pm";
    } else if (card5pm && !card9pm) {
      return "9pm";
    } else {
      return "";
    }
  }

  // // DATE
  // const onChangeDate = (event, selectedDate) => {
  //   const currentDate = selectedDate || date;
  //   if (event?.type == 'neutralButtonPressed') {
  //     setShowDate(Platform.OS === 'ios');
  //     // setFilterDate(false)
  //     setDate(moment().toDate());
  //     // return
  //   } else if (event?.type == 'set') {
  //     setShowDate(Platform.OS === 'ios');
  //     setDate(currentDate);
  //     // setFilterDate(true);
  //   } else if (event?.type == 'dismissed') {
  //     setShowDate(Platform.OS === 'ios');
  //     setDate(date);
  //     // setFilterDate(false)
  //   }
  // };

    // DATE
    const onChangeDate = (event, selectedDate) => {
      const currentDate = selectedDate || startDate;
  
      console.log(show, 'change date prop', selectedDate)
  
      // setShowDate(null)
  
      if (show === 'start') {
        if (event?.type == 'neutralButtonPressed') {
          setShowDate(Platform.OS === 'ios');
          setStartDate(moment().toDate())
        } else if (event?.type == 'set') {
          setShowDate(Platform.OS === 'ios');
          setStartDate(currentDate)
        } else if (event?.type == 'dismissed') {
          setShowDate(Platform.OS === 'ios');
          // setStartDate(startDate)
        }
  
      } else {
        if (event?.type == 'neutralButtonPressed') {
          setShowDate(Platform.OS === 'ios');
          setEndDate(moment().toDate())
        } else if (event?.type == 'set') {
          setShowDate(Platform.OS === 'ios');
          setEndDate(currentDate)
        } else if (event?.type == 'dismissed') {
          setShowDate(Platform.OS === 'ios');
          // setEndDate(startDate)
        }
      }
  
      setRnd(Math.random())
  
    };

    const showDatePicker = (val) => {
      console.log(val, 'show Date')
      setShowDate(val);
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

  const handleSoldOut = async () => {
    let { email } = users[0];
    let gameTime = getTimeRange()
    if (gameTime) {
      dispatch({ type: SET_LOADING })

      await axios.get(`${Config.API_URL}/apiv2/v1/bettings/soldout?gameTime=${gameTime}&email=${email}`)
        .then(async (res) => {
          let { success } = res.data;
          if (!success) {
            Alert.alert('No Sold-out Available')
          }
          dispatch({ type: STOP_LOADING })
        })
        .catch(err => {
          console.log(err)
          Alert.alert('Something Went Wrong!')
          dispatch({ type: STOP_LOADING })
        })
    }


  }

  const handleSearch = (query) => {
    setSearchQuery(query);
    // if (query) {
    //   const lowercasedQuery = query.toLowerCase();
    //   const filtered = filteredData.filter(item =>
    //     item.collector.toLowerCase().includes(lowercasedQuery) ||
    //     item.ticketNo?.includes(lowercasedQuery) ||
    //     item.combination?.includes(lowercasedQuery) ||
    //     item.contact.includes(lowercasedQuery) ||
    //     item.gameTime.toLowerCase().includes(lowercasedQuery)
    //   );
    //   setFilteredQuery(filtered)
    // } else {
    //   setFilteredQuery(items);
    // }
  };

  const filterData = (query, selectedDate) => {
    const lowercasedQuery = query.toLowerCase();
    const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
    let itemToFilter = items;
    const filtered = itemToFilter.filter((item) => {
      const itemDate = moment(item.timestamp).format('YYYY-MM-DD');
      return (
        (item.collector.toLowerCase().includes(lowercasedQuery) ||
          item.ticketNo?.includes(lowercasedQuery) ||
          item.combination?.includes(lowercasedQuery) ||
          item.contact.includes(lowercasedQuery) ||
          item.gameTime.toLowerCase().includes(lowercasedQuery)) &&
        itemDate === formattedDate
      );
    });
    setFilteredData(filtered);
  };

  function renderHeader() {
    return (
      // <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
      //   <TouchableOpacity
      //     activeOpacity={1}
      //     onPress={showDatePicker}
      //     // onPress={() => navigation.navigate('TestPaginate', {})}
      //     style={{ width: '48%', borderColor: COLORS.gray600, borderWidth: 1, borderRadius: 8, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }}
      //   >
      //     <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
      //       <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{date == undefined || '' ? '' : moment(date).format('MM/DD/YYYY')}</Text>
      //       <Image
      //         source={icons.calendar}
      //         style={{ height: 30, width: 30, tintColor: COLORS.black }}
      //       />
      //     </View>
      //   </TouchableOpacity>
      //   <SelectDropdown
      //     data={drawTimes}
      //     onSelect={(selectedItem, index) => {
      //       handleTimeSelect(selectedItem.name)
      //       // Alert.alert(selectedItem, index)
      //     }}

      //     style={{ width: '48%', alignItems: 'center', justifyContent: 'center' }}
      //     defaultValueByIndex={0}
      //     renderButton={(selectedItem, isOpened) => {
      //       return (
      //         <TouchableOpacity
      //           // disabled={true}
      //           style={{ width: '48%', alignItems: 'center', justifyContent: 'center', borderColor: COLORS.gray600, borderWidth: 1, borderRadius: 8, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }
      //           }>
      //           <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: 10 }}>
      //             <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{filterTime !== '' ? String(filterTime).toUpperCase() : 'Select Time'}</Text>
      //           </View>
      //         </TouchableOpacity>
      //       );
      //     }}
      //     renderItem={(item, index, isSelected) => {
      //       return (
      //         <View style={{ ...styles.dropdownItemStyle, ...(isSelected && { backgroundColor: '#D2D9DF' }) }}>
      //           <Text style={styles.dropdownItemTxtStyle}>{item.name}</Text>
      //         </View>
      //       );
      //     }}
      //     showsVerticalScrollIndicator={false}
      //     dropdownStyle={styles.dropdownMenuStyle}
      //   />
      // </View>


      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
              <TouchableOpacity
                onPress={() => showDatePicker('start')}
                activeOpacity={.9}
                // onPress={() => navigation.navigate('TestPaginate', {})}
                style={{ width: '48%', }}
              >
                <View style={{ height: 40, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 4, shadowRadius: SIZES.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, width: '100%', padding: 5 }}>
                  <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{moment(startDate).format('MM/DD/YYYY')}</Text>
                  <Image
                    source={icons.calendar}
                    style={{ height: 30, width: 30, tintColor: COLORS.black }}
                  />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={.9}
                onPress={() => showDatePicker('end')}
                // onPress={() => navigation.navigate('TestPaginate', {})}
                style={{ width: '48%', }}
              >
                <View style={{ height: 40, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 4, shadowRadius: SIZES.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, width: '100%', padding: 5 }}>
                  <Text style={{ paddingLeft: 4, fontSize: 20, color: COLORS.black, fontWeight: '500' }}>{moment(endDate).format('MM/DD/YYYY')}</Text>
                  <Image
                    source={icons.calendar}
                    style={{ height: 30, width: 30, tintColor: COLORS.black }}
                  />
                </View>
              </TouchableOpacity>
            </View>
      
    )
  }

  function renderSearchInput() {
    return (
      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '48%', borderWidth: 1, borderRadius: 6, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }}>
        <TextInput
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder='Search by Ticket#'
          placeholderTextColor={COLORS.gray800}
          style={{ height: 40,  paddingLeft: 10, width: '90%', color: COLORS.black }}
        />
        <View style={{ padding: 4 }}>
          <Image
            source={icons.search}
            style={{ height: 25, width: 25, resizeMode: 'contain'}}
            resizeMode='contain'
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
                style={{ width: '48%', alignItems: 'center', justifyContent: 'center', borderColor: COLORS.gray600, borderWidth: 1, borderRadius: 8, borderColor: COLORS.white, backgroundColor: COLORS.white, elevation: 2, shadowRadius: 6 }
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
      const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;


      return (
        <Animated.View
          entering={FadeInDown.delay(index * 100).duration(500)} // Staggered animation
          exiting={FadeOutDown.delay(index * 100).duration(500)}
        >
          <TouchableOpacity
          activeOpacity={.8}
            // disabled={moment(date).isAfter(today) ? false : true}
            onPress={() => {
              navigation.navigate('ViewSoldOut', JSON.stringify(item))
            }}
            // style={{ paddingLeft: 10, borderColor: COLORS.gray600, width: '100%', flexDirection: 'row', marginTop: index == 0 ? 0 : 12, paddingTop: 12, borderTopWidth: index == 0 ? 0 : 1, alignItems: 'flex-start', justifyContent: 'space-around', }}
            // style={{
            //   paddingLeft: 10, 
            //   backgroundColor: backgroundColor, 
            //   width: '100%', 
            //   flexDirection: 'row', 
            //   paddingVertical: 14, 
            //   justifyContent: 'flex-start', 
            //   alignItems: 'flex-start'
            // }}
            style={{ paddingHorizontal: SIZES.padding, borderColor: COLORS.gray600, width: '100%', flexDirection: 'row', paddingVertical: SIZES.padding * 2, alignItems: 'flex-start', justifyContent: 'space-around', backgroundColor: backgroundColor }}>
            <Text style={{ fontWeight: '500', fontSize: 18, width: '33%', textAlign: 'left', color: COLORS.black600,overflow: 'hidden' }}>
              {moment(item?.timestamp).format('MMM DD, YYYY')}
            </Text>
            <Text style={{ textAlign: 'center', paddingRight: 10, fontSize: 18, width: '33%', fontWeight: 'bold', color: item.gameTime == '2pm' ? '#3897e7' : item.gameTime == '5pm' ? '#ff9d3e' : item.gameTime == '9pm' ? COLORS.black600 : null }}>
              {String(item.gameTime).toUpperCase()}
            </Text>
            <Text style={{ textAlign: 'right', fontWeight: '500', width: '33%', fontSize: 18, color: COLORS.black600, }}>
              ₱{formatNumberWithComma(total)}
            </Text>

          </TouchableOpacity>
        </Animated.View>
      )
    }

    return (
      <>
        <View style={{ paddingLeft: 10, width: '100%', flexDirection: 'row', borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, color: COLORS.black, justifyContent: 'flex-start', backgroundColor: COLORS.gray400, alignItems: 'flex-start' }}>
          <Text style={{ textAlign: 'left', fontWeight: 'bold', color: COLORS.black, fontSize: 16, width: '33%' }}>
            Ticket#
          </Text>
          <Text style={{ textAlign: 'center', width: '33%', fontWeight: 'bold', color: COLORS.black, fontSize: 16, }}>
            GAME TIME
          </Text>
          <Text style={{ textAlign: 'right', width: '33%', fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>
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

  function getCircularReplacer() {
    const ancestors = [];
    return function (key, value) {
      if (typeof value !== "object" || value === null) {
        return value;
      }
      // `this` is the object that value is contained in,
      // i.e., its direct parent.
      while (ancestors.length > 0 && ancestors.at(-1) !== this) {
        ancestors.pop();
      }
      if (ancestors.includes(value)) {
        return "[Circular]";
      }
      ancestors.push(value);
      return value;
    };
  }

  useEffect(() => {
    let cur = users[0] ? users[0]._id : "";
    let filterString = `owner_id == "${cur}"`;


    let data =  realm.objects(Betting).filtered(filterString);
    // let drawsDataArray = realm.objects(Draws);
    // let userData = realm.objects(Users).filtered(`email == "${collector}"`);

    realm.subscriptions.update(mutableSubs => {
      mutableSubs.removeByName(itemSubscriptionName);
      mutableSubs.add(data, { name: ownItemsSubscriptionName });
    });

    // realm.subscriptions.update(mutableSubs => {
    //   mutableSubs.add(userData, { name: 'items3' });
    //   mutableSubs.add(drawsDataArray, { name: drawsSubscriptionName });
    // });



  }, [realm, users])



  let filteredList = filterTime == 'All Time' ? items : items.filter(a => a.gameTime == filterTime);
  filteredList = searchQuery ? items.filter(a => String(a.ticketNo).includes(String(searchQuery))) : filteredList

  let totalGross = filteredList.reduce((n, { gross }) => n + gross, 0);
  let totalWins = filteredList.reduce((n, { winning }) => n + winning, 0);



  // console.log(JSON.stringify(users), "selectedUserselectedUserselectedUser")
  
  
  

  return (
    <SafeAreaProvider style={styles.wrapper}>
      <ConfirmationModal
        visible={confirmationModal == 'sold_out'}
        onClose={() => {
          dispatch({ type: CLOSE_CONFIRMATION_MODAL });
          // setUserToUpdate(null);
        }}
        title={'Confirmation'}
        message={`Are you sure you want to generate Sold Out for ${getTimeRange()}?`}
        handleConfirm={() => {
          // handleCancelTicket(ticketDetails._id)
          // handleReactivateUser(userToUpdate);
          // setUserToUpdate(null);
          handleSoldOut();
          dispatch({ type: CLOSE_CONFIRMATION_MODAL });
        }}
      />
      <View style={{ flex: 1, width: '100%' }}>
        {renderHeader()}
        {renderSearchInput()}
        {show && (
          <DateTimePicker
            testID="dateTimePicker"
            value={show == 'start' ? startDate : endDate}
            // value={date}
            mode="date"
            display="default"
            onChange={onChangeDate}
            minimumDate={new Date(users[0]?.lastSummary)}
            maximumDate={new Date(moment().toDate())}
            negativeButton={{ label: "Cancel", }}
            neutralButton={{ label: "Clear", }}
          />
        )}

        <View style={{ height: 50, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 10, marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
            <Text style={styles.fontsHeader}>Total Gross</Text>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(totalGross)}</Text>
          </View>
          <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
            <Text style={styles.fontsHeader}>Total Hits</Text>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(totalWins)}</Text>
          </View>
        </View>
        {renderTickerList(filteredList)}
        <View
          style={{ marginBottom: 'auto', width: '100%', display: 'flex', justifyContent: 'flex-start' }}
        >
          <Button
            title={`GENERATE (${getTimeRange()})`}
            disabled={(!getTimeRange() || loading)}
            buttonStyle={styles.addToDoButton}
            // onPress={() => setShowNewItemOverlay(true)}
            // onPress={() => handleSoldOut()}
            onPress={() => {
              dispatch({type: OPEN_CONFIRMATION_MODAL, payload: 'sold_out' })
            }}
          />
        </View>
      </View>
    </SafeAreaProvider>
  )
}

export default SoldOuts

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    // backgroundColor: COLORS.green,
    // borderWidth: 1,
    margin: 0,
  },
  addToDoButton: {
    backgroundColor: COLORS.primary,
    width: '100%',
    borderRadius: 4,
    margin: 5,
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
  }

})