import { Alert, Image, StyleSheet, Text, Switch, TouchableOpacity, View, ScrollView, FlatList, Platform } from 'react-native'
import React, { useEffect, useState } from 'react'
import { COLORS, SIZES } from '../../constants/theme'
import icons from '../../constants/icons'
import moment from 'moment-timezone'
import { realmContext } from '../../RealmContext'
import { useUser, useApp } from '@realm/react';
import { Betting, Draws, Users } from '../../Models'
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import Animated, { FadeInDown, ZoomIn, } from 'react-native-reanimated';
import { formatNumber, getConfiguration } from '../../utils/helpers';


const { useRealm, useQuery } = realmContext;
const ownItemsSubscriptionName = 'bettings';


const SummaryReport = ({ navigation }) => {
  const { collector } = useSelector(({ user }) => user);
  const dispatch = useDispatch()
  const realm = useRealm()
  const userRealm = useApp();
  const [includeAll, setIncludeAll] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [rnd, setRnd] = useState(0);
  const [show, setShowDate] = useState(null);

  const users = useQuery(Users, user => {
    return user.filtered(
      'email == $0',
      collector,
    );
  }, [collector]);


  let userNow = users[0] ? users[0]._id : "";

  let isWin200 = getConfiguration(users[0], 'withWin200')?.isCheck;
  

  const items = useQuery(Betting, data => {
    let startOfDay = moment(startDate).startOf('day').toDate();
    let endOfDay = moment(endDate).endOf('day').toDate();
    


    if (new Date(startOfDay) <= new Date(users[0]?.lastSummary)) {
      startOfDay = moment(users[0]?.lastSummary).endOf('day').toDate();
    }

    if (new Date(endOfDay) <= new Date(users[0]?.lastSummary)) {
      startOfDay = moment().add(1, 'd').endOf('day').toDate();
      endOfDay = moment().add(1, 'd').endOf('day').toDate();
    }



    // if (includeAll) {
      return data.filtered('isDeleted == false && inputType == "normal" && timestamp >= $1 && timestamp < $2', String(userNow), startOfDay, endOfDay).sorted('timestamp', true)
    // } else {
      // return data.filtered('isDeleted == false && inputType == "normal" && timestamp >= $0 && timestamp < $1 && owner_id == $2', startOfDay, endOfDay, String(userNow)).sorted('timestamp')
    // }

  }, [startDate, endDate]);

  // DATE
  const onChangeDate = (event, selectedDate) => {
    if (show === 'start') {
    const currentDate = selectedDate || startDate;
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
    const currentDate = selectedDate || endDate;
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

    return;
  };

  const showDatePicker = (val) => {
    // console.log(val, 'show Date')
    setShowDate(val);
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

  let renderTotals = () => {
    let totalGross = 0;
    let totalComms = 0;
    let totalHits = 0;
    let totalNet = 0;
    let genTotal = 0;
    let genCommsTotal = 0;
  
    totalGross = items.reduce((n, { gross }) => n + gross, 0)
    totalHits = items.map(item => {
      let winPrize = (isWin200 && item.isWinTo) ? getConfiguration(users[0], 'withWin200').value : getConfiguration(users[0], 'winStraight').value
  
      item.totalWin = item.winning * winPrize;
      return item;
    }).reduce((n, { totalWin }) => n + totalWin, 0)
  
    // for (let bet of items) {
    //   totalComms += bet.commissions.filter(coms => String(coms.referral) == String(users[0]._id)).reduce((n, { amount }) => n + amount, 0);
    // }
  
    totalComms = items.reduce((total, bet) => {
      return total + bet.commissions
        .filter(coms => String(coms.referral) === String(users[0]?._id))
        .reduce((n, { amount }) => n + amount, 0);
    }, 0);
  
    genCommsTotal += totalGross * (users[0]?.comRate / 100);
    totalNet = totalGross - genCommsTotal;
    genTotal = totalNet - totalHits;


    // console.log(totalComms, "THE TOTAL COMMSS!!")

    return (
      <View style={{ height: 50, marginHorizontal: 10, paddingTop: 10, paddingBottom: 10, marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, flexDirection: 'column', paddingHorizontal: 10, width: '100%', alignItems: 'flex-start' }}>
          <Text style={styles.fontsHeader1}>Gross</Text>
          <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumber(totalGross)}</Text>
        </View>

        <View style={{ flex: 1, flexDirection: 'column', width: '100%', alignItems: 'flex-start' }}>
          <Text style={styles.fontsHeader}>Comm</Text>
          {/* <Text style={{ color: COLORS.black, fontSize: 16 }}>{Math.floor(totalComms).toFixed(0)}</Text> */}
          <Text style={{ color: COLORS.black, fontSize: 16 }}>{formatNumber(totalComms)}</Text>
        </View>
        <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
          <Text style={styles.fontsHeader1}>Net</Text>
          <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumber(totalNet)}</Text>
        </View>
        <View style={{ flex: 1, flexDirection: 'column', width: '100%', alignItems: 'flex-start' }}>
          <Text style={styles.fontsHeader}>Hits</Text>
          <Text style={{ color: COLORS.black, fontSize: 16 }}>{formatNumber(totalHits)}</Text>
        </View>

        <View style={{ flex: 1, flexDirection: 'column', width: '40%', alignItems: 'flex-start' }}>
          <Text style={styles.fontsHeader1}>Total</Text>
          <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumber(genTotal)}</Text>
        </View>
      </View>
    )
  }

  const groups = items.reduce((groups, item) => {
    const date = moment(item.timestamp).format('YYYY-MM-DD');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {});

  // Edit: to add it in the array format instead
  const groupArrays = Object.keys(groups).map((date) => {
    return {
      date,
      bets: groups[date]
    };
  });

  


  // const renderItem = ({ item, index }) => {
  //   let { date, bets } = item;

  //   let grandGross = 0;
  //   let grandHits = 0;
  //   let grandComm = 0;
  //   let grandNet = 0;
  //   let grandCommsTotal = 0;

  //   grandGross = bets.reduce((n, { gross }) => n + gross, 0);
  //   grandCommsTotal += grandGross * (users[0]?.comRate / 100);


  //   // for (let bet of bets) {
  //   //   grandComm += bet.commissions.filter(coms => String(coms.referral) == String(users[0]._id)).reduce((n, { amount }) => n + amount, 0);
  //   // }

  //   grandComm = bets.reduce((total, bet) => {
  //     return total + bet.commissions
  //       .filter(coms => String(coms.referral) === String(users[0]?._id))
  //       .reduce((n, { amount }) => n + amount, 0);
  //   }, 0);

  //   grandHits = bets.map(item => {
  //     let winPrize = (isWin200 && item.isWinTo) ? getConfiguration(users[0], 'withWin200').value : getConfiguration(users[0], 'winStraight').value

  //     item.totalWin = item.winning * winPrize;
  //     return item;
  //   }).reduce((n, { totalWin }) => n + totalWin, 0);
  //   let net = grandGross - grandHits - grandCommsTotal;


  //   let gameTime2pmCombinations = bets.filter((data) => { return data.gameTime == '2pm' });
  //   let gameTime5pmCombinations = bets.filter((data) => { return data.gameTime == '5pm' });
  //   let gameTime9pmCombinations = bets.filter((data) => { return data.gameTime == '9pm' });

  //   // Game time 2PM
  //   let gameTime2pmGross = 0;
  //   let gameTime2pmHits = 0;
  //   let gameTime2pmComm = 0;
  //   let gameTime2pmNet = 0;
  //   let gameTime2pmCommsTotal = 0;

  //   // Game time 5PM
  //   let gameTime5pmGross = 0;
  //   let gameTime5pmHits = 0;
  //   let gameTime5pmComm = 0;
  //   let gameTime5pmNet = 0;
  //   let gameTime5pmCommsTotal = 0;


  //   // Game time 9PM
  //   let gameTime9pmGross = 0;
  //   let gameTime9pmHits = 0;
  //   let gameTime9pmComm = 0;
  //   let gameTime9pmNet = 0;
  //   let gameTime9pmCommsTotal = 0;


  //   gameTime2pmGross = gameTime2pmCombinations.reduce((n, { gross }) => n + gross, 0);
  //   gameTime2pmCommsTotal += gameTime2pmGross * (users[0]?.comRate / 100);
    
  //   gameTime2pmComm = gameTime2pmCombinations.reduce((total, bet) => {
  //     return total + bet.commissions
  //       .filter(coms => String(coms.referral) === String(users[0]?._id))
  //       .reduce((n, { amount }) => n + amount, 0);
  //   }, 0);

  //   gameTime2pmHits = gameTime2pmCombinations.map(data => {
  //     let winPrize = (isWin200 && data.isWinTo) ? getConfiguration(users[0], 'withWin200').value : getConfiguration(users[0], 'winStraight').value
  //     data.totalWin = data.winning * winPrize;
  //     return data;
  //   }).reduce((n, { totalWin }) => n + totalWin, 0);

  //   gameTime2pmNet = gameTime2pmGross - gameTime2pmHits - gameTime2pmCommsTotal;
  //   // let net = grandGross - grandHits - grandCommsTotal;


  //   gameTime5pmGross = gameTime5pmCombinations.reduce((n, { gross }) => n + gross, 0);
  //   gameTime5pmCommsTotal += gameTime5pmGross * (users[0]?.comRate / 100);

  //   gameTime5pmComm = gameTime5pmCombinations.reduce((total, bet) => {
  //     return total + bet.commissions
  //       .filter(coms => String(coms.referral) === String(users[0]?._id))
  //       .reduce((n, { amount }) => n + amount, 0);
  //   }, 0);
    
  //   gameTime5pmHits = gameTime5pmCombinations.map(data => {
  //     let winPrize = (isWin200 && data.isWinTo) ? getConfiguration(users[0], 'withWin200').value : getConfiguration(users[0], 'winStraight').value
  //     data.totalWin = data.winning * winPrize;
  //     return data;
  //   }).reduce((n, { totalWin }) => n + totalWin, 0);

  //   gameTime5pmNet = gameTime5pmGross - gameTime5pmHits - gameTime5pmCommsTotal;
  //   gameTime9pmGross = gameTime9pmCombinations.reduce((n, { gross }) => n + gross, 0);
  //   gameTime9pmCommsTotal = gameTime9pmGross * (users[0]?.comRate / 100);

  //   gameTime9pmComm = gameTime9pmCombinations.reduce((total, bet) => {
  //     return total + bet.commissions
  //       .filter(coms => String(coms.referral) === String(users[0]?._id))
  //       .reduce((n, { amount }) => n + amount, 0);
  //   }, 0);

  //   gameTime9pmHits = gameTime9pmCombinations.map(data => {
  //     let winPrize = (isWin200 && data.isWinTo) ? getConfiguration(users[0], 'withWin200').value : getConfiguration(users[0], 'winStraight').value
  //     data.totalWin = data.winning * winPrize;
  //     return data;
  //   }).reduce((n, { totalWin }) => n + totalWin, 0);

  //   // gameTime9pmNet = gameTime9pmGross - Number(gameTime9pmHits + gameTime9pmComm);
  //   gameTime9pmNet = gameTime9pmGross - gameTime9pmHits - gameTime9pmCommsTotal;


  //   return (
  //     <View key={index} style={{ width: '100%', height: 240, alignItems: 'flex-start', padding: 10, justifyContent: 'space-between', marginVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#0CC27D', backgroundColor: '#0CC27D', elevation: 2, shadowRadius: 6 }}>
  //       <View style={{ height: 40, flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: 10 }}>
  //         <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>
  //           {moment(date).format('MMM DD, YYYY')}
  //         </Text>

  //       </View>
  //       <View style={{ borderTopWidth: 1, paddingTop: 10, borderColor: COLORS.white2, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around' }}>
  //         <View style={{ width: '25%', borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
  //           <Text style={styles.textRow}>
  //             GROSS
  //           </Text>
  //           <Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
  //             {formatNumber(grandGross)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
  //           <Text style={{ ...styles.textRow }}>
  //             HITS
  //           </Text>
  //           <Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
  //             {formatNumber(grandHits)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
  //           <Text style={{ ...styles.textRow }}>
  //             COMM
  //           </Text>
  //           <Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
  //             {formatNumber(grandComm)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
  //           <Text style={{ ...styles.textRow }}>
  //             NET
  //           </Text>
  //           <Text style={{ fontWeight: 'bold', textAlign: 'center', paddingTop: 10, color: Math.sign(Number(net)) == -1 ? COLORS.red : COLORS.black }}>
  //             {formatNumber(net ? net : 0)}

  //           </Text>
  //         </View>
  //       </View>

  //       <View style={{ height: 36, width: '100%', borderTopWidth: .5, borderColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
  //         <Text style={{ opacity: .2, position: 'absolute', fontWeight: 'bold', color: COLORS.lightGray4, left: '20%', width: '100%', fontSize: 45, textAlign: 'left' }}>
  //           2:00 PM
  //         </Text>
  //         <View style={{ width: '25%', alignItems: 'center', justifyContent: 'center' }}>
  //           {/* <Text style={{...styles.textRowValue, textAlign: 'center' }}> */}
  //           <Text style={{ color: COLORS.black, fontWeight: '400', }}>
  //             {formatNumber(gameTime2pmGross)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
  //           <Text style={{ color: COLORS.black, fontWeight: '400', }}>
  //             {formatNumber(gameTime2pmHits)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
  //           <Text style={{ color: COLORS.black, fontWeight: '400', }}>
  //             {formatNumber(gameTime2pmComm)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
  //           <Text style={{ color: Math.sign(Number(gameTime2pmNet)) == -1 ? COLORS.red : COLORS.black, fontWeight: '500', textAlign: 'center', }}>
  //             {formatNumber(gameTime2pmNet)}
  //           </Text>
  //         </View>
  //       </View>

  //       <View style={{ height: 36, width: '100%', borderTopWidth: .5, borderColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
  //         {/* <Text style={{ opacity: .2, position: 'absolute', fontWeight: 'bold', color: COLORS.black, fontSize: 45, width: '100%', textAlign: 'center'}}> */}
  //         <Text style={{ opacity: .2, position: 'absolute', fontWeight: 'bold', color: COLORS.lightGray4, width: '100%', fontSize: 45, textAlign: 'center' }}>
  //           5:00 PM
  //         </Text>
  //         <View style={{ width: '25%', alignItems: 'center', justifyContent: 'center' }}>
  //           <Text style={{ color: COLORS.black, fontWeight: '400', }}>
  //             {formatNumber(gameTime5pmGross)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', alignItems: 'center', borderLeftWidth: 1, borderColor: COLORS.white, justifyContent: 'center' }}>
  //           <Text style={{ color: COLORS.black, fontWeight: '400', }}>
  //             {formatNumber(gameTime5pmHits)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', alignItems: 'center', borderLeftWidth: 1, borderColor: COLORS.white, justifyContent: 'center' }}>
  //           <Text style={{ color: COLORS.black, fontWeight: '400', }}>
  //             {formatNumber(gameTime5pmComm)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', alignItems: 'center', borderLeftWidth: 1, borderColor: COLORS.white, justifyContent: 'center' }}>
  //           <Text style={{ color: Math.sign(Number(gameTime5pmNet)) == -1 ? COLORS.red : COLORS.black, fontWeight: '500', textAlign: 'center', }}>
  //             {formatNumber(gameTime5pmNet)}
  //           </Text>
  //         </View>
  //       </View>

  //       <View style={{ height: 36, width: '100%', borderTopWidth: .5, borderColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
  //         <Text style={{ opacity: .2, position: 'absolute', fontWeight: '500', color: COLORS.lightGray4, right: '20%', width: '100%', fontSize: 45, textAlign: 'right' }}>
  //           9:00 PM
  //         </Text>
  //         <View style={{ width: '25%', alignItems: 'center', justifyContent: 'center' }}>
  //           <Text style={{ color: COLORS.black, fontWeight: '400', }}>
  //             {formatNumber(gameTime9pmGross)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
  //           <Text style={{ color: COLORS.black, fontWeight: '400', }}>
  //             {formatNumber(gameTime9pmHits)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
  //           <Text style={{ color: COLORS.black, fontWeight: '400', }}>
  //             {formatNumber(gameTime9pmComm)}
  //           </Text>
  //         </View>
  //         <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
  //           <Text style={{ color: Math.sign(Number(gameTime9pmNet)) == -1 ? COLORS.red : COLORS.black, fontWeight: '500', textAlign: 'center', }}>
  //             {formatNumber(gameTime9pmNet)}
  //           </Text>
  //         </View>
  //       </View>
  //     </View>
  //   )
  // }

  

  useEffect(() => {
      let lastDate = users[0]?.lastSummary ? moment(users[0]?.lastSummary).startOf('day').toDate() : moment().startOf('day').toDate();
      let data = realm.objects(Betting).filtered('isDeleted == false && ANY uplines == $0 && timestamp > $1', String(users[0]?._id), lastDate);
    
    
      if (includeAll) {
        realm.subscriptions.update(mutableSubs => {
          mutableSubs.removeByName(ownItemsSubscriptionName);
          mutableSubs.add(data, {name: ownItemsSubscriptionName});
        });
      } else {
        realm.subscriptions.update(mutableSubs => {
          mutableSubs.removeByName(ownItemsSubscriptionName);
          mutableSubs.add(
            realm.objects(Betting).filtered(`owner_id == $0 && isDeleted == false`, String(users[0]?._id)),
            {name: ownItemsSubscriptionName},
          );
        });
      }
    }, [realm, users[0], includeAll]);

  console.log('TRIGGERED')
  
  return (
    <SafeAreaProvider style={styles.wrapper}>
      {/* <View style={{ flex: 1, width: '100%', borderWidth: 1, }}> */}
      {show && (
        <DateTimePicker
          testID="summDatePicker"
          value={show == 'start' ? startDate : endDate}
          mode="date"
          display="calendar"
          onChange={onChangeDate}
          minimumDate={new Date(users[0]?.lastSummary)}
          maximumDate={new Date(moment().toDate())}
          negativeButton={{ label: "Cancel", }}
          neutralButton={{ label: "Clear", }}
        />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', padding: 10 }}>
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
      
      {renderTotals()}
      {users[0] && users[0].role !== 'teller' &&
        <View style={{ ...styles.toggleRow, }}>
          <Switch
            trackColor={{ true: '#00ED64' }}
            onValueChange={() => {
              if (realm.syncSession?.state !== 'active') {
                Alert.alert(
                  'Switching subscriptions does not affect Realm data when the sync is offline.',
                );
              }
              setIncludeAll(!includeAll);
            }}
            value={includeAll}
          />
          <Text style={styles.toggleText}>Show All</Text>

        </View>
      }
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ marginHorizontal: 10}}
      >


        {
          groupArrays.map((item, index) => {
            let { date, bets } = item;

            let grandGross = 0;
            let grandHits = 0;
            let grandComm = 0;
            let grandNet = 0;
            let grandCommsTotal = 0;
        
            grandGross = bets.reduce((n, { gross }) => n + gross, 0);
            grandCommsTotal += grandGross * (users[0]?.comRate / 100);
        
        
            // for (let bet of bets) {
            //   grandComm += bet.commissions.filter(coms => String(coms.referral) == String(users[0]._id)).reduce((n, { amount }) => n + amount, 0);
            // }
        
            grandComm = bets.reduce((total, bet) => {
              return total + bet.commissions
                .filter(coms => String(coms.referral) === String(users[0]?._id))
                .reduce((n, { amount }) => n + amount, 0);
            }, 0);
        
            grandHits = bets.map(item => {
              let winPrize = (isWin200 && item.isWinTo) ? getConfiguration(users[0], 'withWin200').value : getConfiguration(users[0], 'winStraight').value
        
              item.totalWin = item.winning * winPrize;
              return item;
            }).reduce((n, { totalWin }) => n + totalWin, 0);
            let net = grandGross - grandHits - grandCommsTotal;
        
        
            let gameTime2pmCombinations = bets.filter((data) => { return data.gameTime == '2pm' });
            let gameTime5pmCombinations = bets.filter((data) => { return data.gameTime == '5pm' });
            let gameTime9pmCombinations = bets.filter((data) => { return data.gameTime == '9pm' });
        
            // Game time 2PM
            let gameTime2pmGross = 0;
            let gameTime2pmHits = 0;
            let gameTime2pmComm = 0;
            let gameTime2pmNet = 0;
            let gameTime2pmCommsTotal = 0;
        
            // Game time 5PM
            let gameTime5pmGross = 0;
            let gameTime5pmHits = 0;
            let gameTime5pmComm = 0;
            let gameTime5pmNet = 0;
            let gameTime5pmCommsTotal = 0;
        
        
            // Game time 9PM
            let gameTime9pmGross = 0;
            let gameTime9pmHits = 0;
            let gameTime9pmComm = 0;
            let gameTime9pmNet = 0;
            let gameTime9pmCommsTotal = 0;
        
        
            gameTime2pmGross = gameTime2pmCombinations.reduce((n, { gross }) => n + gross, 0);
            gameTime2pmCommsTotal += gameTime2pmGross * (users[0]?.comRate / 100);
            
            gameTime2pmComm = gameTime2pmCombinations.reduce((total, bet) => {
              return total + bet.commissions
                .filter(coms => String(coms.referral) === String(users[0]?._id))
                .reduce((n, { amount }) => n + amount, 0);
            }, 0);
        
            gameTime2pmHits = gameTime2pmCombinations.map(data => {
              let winPrize = (isWin200 && data.isWinTo) ? getConfiguration(users[0], 'withWin200').value : getConfiguration(users[0], 'winStraight').value
              data.totalWin = data.winning * winPrize;
              return data;
            }).reduce((n, { totalWin }) => n + totalWin, 0);
        
            gameTime2pmNet = gameTime2pmGross - gameTime2pmHits - gameTime2pmCommsTotal;
            // let net = grandGross - grandHits - grandCommsTotal;
        
        
            gameTime5pmGross = gameTime5pmCombinations.reduce((n, { gross }) => n + gross, 0);
            gameTime5pmCommsTotal += gameTime5pmGross * (users[0]?.comRate / 100);
        
            gameTime5pmComm = gameTime5pmCombinations.reduce((total, bet) => {
              return total + bet.commissions
                .filter(coms => String(coms.referral) === String(users[0]?._id))
                .reduce((n, { amount }) => n + amount, 0);
            }, 0);
            
            gameTime5pmHits = gameTime5pmCombinations.map(data => {
              let winPrize = (isWin200 && data.isWinTo) ? getConfiguration(users[0], 'withWin200').value : getConfiguration(users[0], 'winStraight').value
              data.totalWin = data.winning * winPrize;
              return data;
            }).reduce((n, { totalWin }) => n + totalWin, 0);
        
            gameTime5pmNet = gameTime5pmGross - gameTime5pmHits - gameTime5pmCommsTotal;
            gameTime9pmGross = gameTime9pmCombinations.reduce((n, { gross }) => n + gross, 0);
            gameTime9pmCommsTotal = gameTime9pmGross * (users[0]?.comRate / 100);
        
            gameTime9pmComm = gameTime9pmCombinations.reduce((total, bet) => {
              return total + bet.commissions
                .filter(coms => String(coms.referral) === String(users[0]?._id))
                .reduce((n, { amount }) => n + amount, 0);
            }, 0);
        
            gameTime9pmHits = gameTime9pmCombinations.map(data => {
              let winPrize = (isWin200 && data.isWinTo) ? getConfiguration(users[0], 'withWin200').value : getConfiguration(users[0], 'winStraight').value
              data.totalWin = data.winning * winPrize;
              return data;
            }).reduce((n, { totalWin }) => n + totalWin, 0);
        
            // gameTime9pmNet = gameTime9pmGross - Number(gameTime9pmHits + gameTime9pmComm);
            gameTime9pmNet = gameTime9pmGross - gameTime9pmHits - gameTime9pmCommsTotal;
        
        

            return (
              <Animated.View 
                entering={ZoomIn.delay(index * 100).duration(500)} // Staggered animation
                key={index} style={{ width: '100%', height: 240, alignItems: 'flex-start', padding: 10, justifyContent: 'space-between', marginVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#0CC27D', backgroundColor: '#0CC27D', elevation: 2, shadowRadius: 6 }}>
                <View style={{ height: 40, flexDirection: 'row', justifyContent: 'space-between', width: '100%', padding: 10 }}>
                  <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>
                    {moment(date).format('MMM DD, YYYY')}
                  </Text>
        
                </View>
                <View style={{ borderTopWidth: 1, paddingTop: 10, borderColor: COLORS.white2, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around' }}>
                  <View style={{ width: '25%', borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
                    <Text style={styles.textRow}>
                      GROSS
                    </Text>
                    <Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
                      {formatNumber(grandGross)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
                    <Text style={{ ...styles.textRow }}>
                      HITS
                    </Text>
                    <Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
                      {formatNumber(grandHits)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
                    <Text style={{ ...styles.textRow }}>
                      COMM
                    </Text>
                    <Text style={{ ...styles.textRowValue, textAlign: 'center', paddingTop: 10 }}>
                      {formatNumber(grandComm)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', borderLeftWidth: 1, height: 55, borderColor: COLORS.white2, alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
                    <Text style={{ ...styles.textRow }}>
                      NET
                    </Text>
                    <Text style={{ fontWeight: 'bold', textAlign: 'center', paddingTop: 10, color: Math.sign(Number(net)) == -1 ? COLORS.red : COLORS.black }}>
                      {formatNumber(net ? net : 0)}
        
                    </Text>
                  </View>
                </View>
        
                <View style={{ height: 36, width: '100%', borderTopWidth: .5, borderColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ opacity: .2, position: 'absolute', fontWeight: 'bold', color: COLORS.lightGray4, left: '20%', width: '100%', fontSize: 45, textAlign: 'left' }}>
                    2:00 PM
                  </Text>
                  <View style={{ width: '25%', alignItems: 'center', justifyContent: 'center' }}>
                    {/* <Text style={{...styles.textRowValue, textAlign: 'center' }}> */}
                    <Text style={{ color: COLORS.black, fontWeight: '400', }}>
                      {formatNumber(gameTime2pmGross)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.black, fontWeight: '400', }}>
                      {formatNumber(gameTime2pmHits)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.black, fontWeight: '400', }}>
                      {formatNumber(gameTime2pmComm)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: Math.sign(Number(gameTime2pmNet)) == -1 ? COLORS.red : COLORS.black, fontWeight: '500', textAlign: 'center', }}>
                      {formatNumber(gameTime2pmNet)}
                    </Text>
                  </View>
                </View>
        
                <View style={{ height: 36, width: '100%', borderTopWidth: .5, borderColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* <Text style={{ opacity: .2, position: 'absolute', fontWeight: 'bold', color: COLORS.black, fontSize: 45, width: '100%', textAlign: 'center'}}> */}
                  <Text style={{ opacity: .2, position: 'absolute', fontWeight: 'bold', color: COLORS.lightGray4, width: '100%', fontSize: 45, textAlign: 'center' }}>
                    5:00 PM
                  </Text>
                  <View style={{ width: '25%', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.black, fontWeight: '400', }}>
                      {formatNumber(gameTime5pmGross)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', alignItems: 'center', borderLeftWidth: 1, borderColor: COLORS.white, justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.black, fontWeight: '400', }}>
                      {formatNumber(gameTime5pmHits)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', alignItems: 'center', borderLeftWidth: 1, borderColor: COLORS.white, justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.black, fontWeight: '400', }}>
                      {formatNumber(gameTime5pmComm)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', alignItems: 'center', borderLeftWidth: 1, borderColor: COLORS.white, justifyContent: 'center' }}>
                    <Text style={{ color: Math.sign(Number(gameTime5pmNet)) == -1 ? COLORS.red : COLORS.black, fontWeight: '500', textAlign: 'center', }}>
                      {formatNumber(gameTime5pmNet)}
                    </Text>
                  </View>
                </View>
        
                <View style={{ height: 36, width: '100%', borderTopWidth: .5, borderColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ opacity: .2, position: 'absolute', fontWeight: '500', color: COLORS.lightGray4, right: '20%', width: '100%', fontSize: 45, textAlign: 'right' }}>
                    9:00 PM
                  </Text>
                  <View style={{ width: '25%', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.black, fontWeight: '400', }}>
                      {formatNumber(gameTime9pmGross)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.black, fontWeight: '400', }}>
                      {formatNumber(gameTime9pmHits)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.black, fontWeight: '400', }}>
                      {formatNumber(gameTime9pmComm)}
                    </Text>
                  </View>
                  <View style={{ width: '25%', borderLeftWidth: 1, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: Math.sign(Number(gameTime9pmNet)) == -1 ? COLORS.red : COLORS.black, fontWeight: '500', textAlign: 'center', }}>
                      {formatNumber(gameTime9pmNet)}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )
            
          })
        }
        {groupArrays.length > 0 &&
                    <View style={{ flex: 1, padding: 14, alignItems: 'center', justifyContent: 'center', width: '100%'}}>
                      <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
                        End of results.
                      </Text>
                    </View>
                  }
                  {
                    groupArrays.length == 0 &&
                    <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: COLORS.darkGray2, fontSize: 14, fontWeight: '500' }}>
                        No records found.
                      </Text>
                    </View>
        
                  }
      </ScrollView>
      {/* <FlatList
        data={groupArrays}
        keyExtractor={(item, index) => index}
        contentContainerStyle={{ marginHorizontal: 10}}
        renderItem={renderItem}
        ListFooterComponent={
          groupArrays.length > 0 && 
          <View style={{ margin: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gray300 }}>
          <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
            End of results.
          </Text>
        </View>
        }
        ListEmptyComponent={
          <View style={{ width: '100%', padding: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
              No records found.
            </Text>
          </View>
        }
      /> */}

      {/* </View> */}
    </SafeAreaProvider>
  )
}

export default SummaryReport

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    // backgroundColor: COLORS.green,
    // borderWidth: 1,
    margin: 0,
  },
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    // padding: 10,
    backgroundColor: COLORS.gray300
  },
  fontsHeader: {
    color: COLORS.black,
    fontSize: 12,
  },
  fontsHeader1: {
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
  textRow: {
    fontWeight: 'bold',
    fontSize: 16,
    color: COLORS.black,
  },
  textRowValue: {
    color: COLORS.black,
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