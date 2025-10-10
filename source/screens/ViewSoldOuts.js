import React, { useCallback, useEffect, useState } from 'react';
import { Image, View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSelector } from 'react-redux';
import { COLORS, icons, SIZES } from '../constants';
import { formatNumberWithComma } from '../utils/helpers';
import { nowISO } from '../utils/offlineSync';
// import { useApp } from '@realm/react';
import { api } from '../utils/offlineSync';



const drawTimes = [
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

const ownItemsSubscriptionName = 'ownItems';

const ViewSoldOuts = ({ route, navigation }) => {
  const ticketDetails = JSON.parse(route.params);
  
  // const userRealm = useApp();
  const [show, setShowDate] = useState(false);
  const { collector, user, selectedUser } = useSelector(({ user }) => user);






  console.log(ticketDetails, 'ITEMS')

  const showDatePicker = () => {
    setShowDate(true);
  };





  const handleCancelTicket = useCallback(
    async (id) => {
      // if the realm exists, get the Item with a particular _id and delete it
      const item = await api.getBetting(id) ; // search for a realm object with a primary key that is an objectId
      if (item) {
        if (item.owner_id != selectedUser.id && !user.is_admin) {
          Alert.alert("You can't delete someone else's ticket!");
        } else {    
         await api.updateBetting(id, {is_deleted: true, updated_at: nowISO()}) ; // search for a realm object with a primary key that is an objectId
          //   console.log(dataExplorerMessage);
        }
        navigation.goBack()
      }
    },
    [collector, ticketDetails],
  );




  const renderBet = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.betText}>{`${String(item.combination)}  =  ${item.straight}/${item.ramble}`}</Text>
    </View>
  );





  let betsObject = {};


  ticketDetails.combinations.forEach(a => {
    if (!betsObject[a.combination]) {
      betsObject[a.combination] = { straight: a.targetAmount, ramble: a.rambleAmount }
    } else {
      betsObject[a.combination].straight += a.targetAmount
      betsObject[a.combination].ramble += a.rambleAmount
    }
  })


  let bets = Object.entries(betsObject).map(([key, value]) => {
    return { combination: key, ...value };
  });

  let totalGross = ticketDetails.gross;

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, width: '100%'}}>

      {/* <View style={{ paddingHorizontal: 10, marginTop: 10, marginBottom: 20, borderColor: COLORS.gray600, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' }}> */}
              <View style={{ paddingLeft: 10, height: 50, paddingTop: 10, paddingBottom: 10, marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.gray600, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' }}>

<View style={{ flex: 1, flexDirection: 'column', width: '100%', alignItems: 'flex-start' }}>
            <Text style={styles.fontsHeader}>Total Gross:</Text>
            <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{formatNumberWithComma(totalGross)}</Text>

          </View>


        
        {/* <View style={{ display: 'flex', flexDirection: 'row', flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-start' }}>
          <Text style={{ fontWeight: 'bold', color: COLORS.black, marginRight: 5 }}>GROSS:</Text>
          <Text style={{ fontWeight: 'bold', color: COLORS.black, fontSize: 16 }}>{totalGross}</Text>
        </View> */}

      </View>
      <FlatList
        data={bets}
        numColumns={2}
        renderItem={renderBet}
        columnWrapperStyle={styles.row}
        keyExtractor={(item, index) => index.toString()}
      />
      {user?.is_admin &&
        <View style={{ flexDirection: 'row', flex: 1, width: '100%', alignItems: 'flex-end', justifyContent: 'center', }}>
          <TouchableOpacity activeOpacity={.6}
            onPress={() => handleCancelTicket(ticketDetails.id)}
            style={{ elevation: 10, shadowRadius: SIZES.radius, borderRadius: SIZES.radius, width: '40%', }}>
            <LinearGradient colors={['#d85a58', '#bb473a', '#892c2f']} style={styles.linearGradientCancel}>
              <Text style={styles.buttonTextCancel}>
                Delete
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      }
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 10,
    backgroundColor: COLORS.gray300
  },
  linearGradientCancel: {
    width: '100%',
    // height: 40,
    padding: 5,
    paddingLeft: 15,
    paddingRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  row: {
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  betText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.black,
    textAlign: 'left',
    paddingVertical: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  fontsHeader: {
    color: COLORS.black,
    fontWeight: 'bold',
    fontSize: 12,
  },
  detailsContainer: {
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    // marginBottom: 5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.black900
  },
  linearGradient: {
    height: 40,
    paddingLeft: 15,
    paddingRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    width: '100%'
  },
  buttonTextCancel: {
    fontSize: 16,
    fontWeight: 'bold',
    // textAlign: 'center',
    fontFamily: 'Gill Sans',
    textAlign: 'center',
    // margin: 10,
    color: '#ffffff',
    // width: '30%',
    backgroundColor: 'transparent',
  },
  linearGradientOk: {
    width: '100%',
    height: 40,
    paddingLeft: 15,
    paddingRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  buttonTextOk: {
    fontSize: 16,
    fontWeight: 'bold',
    // textAlign: 'center',
    fontFamily: 'Gill Sans',
    textAlign: 'center',
    // margin: 10,
    color: '#ffffff',
    // width: '30%',
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    // borderWidth: 1,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray400,
    paddingBottom: 5,
    marginBottom: 5,
    marginTop: 6,
    paddingHorizontal: 10
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    width: '25%',
    textAlign: 'left',
    color: COLORS.black
  },
  betRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 10,
    width: '100%'
    // paddingVertical: 5,
  },

  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    // marginTop: 20,

  },
  button: {
    // paddingVertical: 10,
    // paddingHorizontal: 20,
    borderRadius: 16,
    height: 40,
    alignItems: 'center',
    width: '30%',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'red',
  },
  reprintButton: {
    backgroundColor: '#1f5d8e',
  },
  okButton: {
    backgroundColor: 'green',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ViewSoldOuts;