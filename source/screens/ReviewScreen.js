import React, { useCallback, useEffect, useState } from 'react';
import { Image, View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import moment from 'moment-timezone';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { CLOSE_CONFIRMATION_MODAL, CLOSE_WARNING_MODAL, OPEN_CONFIRMATION_MODAL, OPEN_WARNING_MODAL } from '../redux/actions/types';
import { COLORS, icons, SIZES } from '../constants';
import WarningModal from '../components/WarningModal';
import ConfirmationModal from '../components/ConfirmationModal';
import TestScreen from './TestScreen';
import { fixDateTimezone, getConfiguration } from '../utils/helpers';
import { nowISO } from '../utils/offlineSync';
import { api } from '../utils/offlineSync';



const ReviewScreen = ({ route, navigation, onPress }) => {
  const dispatch = useDispatch();
  const ticketDetails = JSON.parse(route.params);
  const [total, setTotal] = useState(0);
  const [game_time, setgame_time] = useState('')
  const [isPrint, setIsPrint] = useState(false);
  const [warningType, setWarningType] = useState('');
  const [disableDeleteButton, setDisableDeleteButton] = useState(false);
  const { collector, user } = useSelector(({ user }) => user);
  const { warningModal, confirmationModal } = useSelector(({ ui }) => ui);
  const [confirmTicket, setConfirmTecket] = useState(null);



  const updateTickets =  getConfiguration(user, 'updateTickets')?.isCheck;

  function getTimeRange() {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMins = currentTime.getMinutes();
    if (currentHour >= 0 && currentHour < 14) {
      return "2pm";
    } else if (currentHour >= 14 && currentHour < 17) {
      return "5pm";
    } else {
      return "9pm";
    }
  }

  const handleCancelTicket = async (ticket) => {

    if (!user?.is_admin && !updateTickets) {
      setWarningType('unauthorize')
      return dispatch({ type: OPEN_WARNING_MODAL })
    } else {

      let ticketCreated = moment(ticket?.timestamp).tz('Asia/Manila'); // Set ticketCreated to Philippines timezone
      const ticketExpiry = ticketCreated.add(3, 'minutes');

      let currentTime = moment().tz('Asia/Manila'); // Get current time in Philippines timezone
console.log(currentTime.isAfter(ticketExpiry), 'TICKET EXPIRE')
      if (currentTime.isAfter(ticketExpiry) && !user?.is_admin) {
        // Alert.alert('Every ticket can only be deleted before 3 minutes after Creation, if you want to proceed please contact Administrator.')
        setWarningType('expire')
        dispatch({ type: OPEN_WARNING_MODAL })
        setDisableDeleteButton(true)
        return;
      } else {
        setConfirmTecket(ticket);
        dispatch({ type: OPEN_CONFIRMATION_MODAL, payload: 'ticket' });
      }
    }



  }

  const handleConfirmButton = useCallback(async (item) => {

    // const item = realm.objectForPrimaryKey(Betting, BSON.ObjectId(_id)); // search for a realm object with a primary key that is an objectId

    try {
    
      if (item) {
        /* realm.write(() => {
          item.is_deleted = true;
        }); */
        setConfirmTecket(null);
        await api.updateBetting(ticketDetails?.id, {is_deleted: true });
        navigation.goBack();
      }
    } catch (error) {
      console.log(error, `Something went wrong.`)
      return
    }
    dispatch({ type: CLOSE_CONFIRMATION_MODAL });
  }, [ticketDetails?.id])
  
   const handleRestore = useCallback(async (item) => {

    // const item = realm.objectForPrimaryKey(Betting, BSON.ObjectId(_id)); // search for a realm object with a primary key that is an objectId
      let localBetting = await api.getBetting(item);

    try {
    console.log(item, localBetting, 'ITEMM')
    
    
    
      if (item) {
        /* realm.write(() => {
          item.is_deleted = true;
        }); */
        setConfirmTecket(null);
        await api.updateBetting(item, {is_deleted: false, updated_at: nowISO});
        navigation.goBack();
      }
    } catch (error) {
      console.log(error, `Something went wrong.`)
      return
    }
    dispatch({ type: CLOSE_CONFIRMATION_MODAL });
  }, [ticketDetails?.id])
  

  const handleConfirmWarning = () => {
  
    dispatch({ type: CLOSE_WARNING_MODAL })
  }
  
  
  

  const renderBet = ({ item }) => (
    <View style={styles.betRow}>
      <Text style={{ ...styles.betText, color: item.is_win_to ? COLORS.danger : COLORS.black }}>{String(item.combination).split('').join('-')}</Text>
      <Text style={{ ...styles.betText, color: item.is_win_to ? COLORS.danger : COLORS.black }}>₱{item.targetAmount.toFixed(0)}</Text>
      <Text style={{ ...styles.betText, color: item.is_win_to ? COLORS.danger : COLORS.black }}>₱{item.rambleAmount.toFixed(0)}</Text>
    </View>
  );

  useEffect(() => {
    const totalAmount = ticketDetails?.combinations?.reduce((acc, combination) => acc + combination.amount, 0);
    let game_time = getTimeRange();

    setgame_time(game_time)
    setTotal(totalAmount)
    // captureImage()
  }, [])

  let totalGross = ticketDetails.combinations.reduce((n, { amount }) => n + amount, 0);

console.log(ticketDetails, 'TICKET INFO')

  return (
    <View style={styles.container}>
      <WarningModal
        visible={warningModal}
        onClose={() => {
          dispatch({ type: CLOSE_WARNING_MODAL });
          // setConfirmTecket(null)
          // setUserToUpdate(null);
        }}
        title={'Confirmation'}
        message={warningType == 'unauthorize' ? `You can't delete someone else's Ticket.` : `Every ticket can only be deleted before 3 minutes after Creation, if you want to proceed please contact Administrator.`}
        handleConfirm={() => {
          handleConfirmWarning()
        }}
      />

      <ConfirmationModal
        visible={confirmationModal == 'ticket'}
        onClose={() => {
          dispatch({ type: CLOSE_CONFIRMATION_MODAL });
          setConfirmTecket(null)
          // setUserToUpdate(null);
        }}
        title={'Confirmation'}
        message={`Ticket can only be deleted before 3 minutes after submittion, Are you sure you want to delete this Ticket?`}
        handleConfirm={() => {
          handleConfirmButton(confirmTicket)
        }}
      />


      <View style={styles.detailsContainer}>
        <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
          <Text style={{ ...styles.detailText }}>Agent:</Text>
          <Text style={styles.detailValue}>{String(ticketDetails.collector).toUpperCase()}</Text>
        </View>
        <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
          <Text style={{ ...styles.detailText }}>Ticket ID:</Text>
          <Text style={styles.detailValue}>{ticketDetails.ticket_no}</Text>
        </View>

        <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
          <Text style={styles.detailText}>Bet Date/Time:</Text>
          <Text style={styles.detailValue}>{moment(new Date(ticketDetails.timestamp).toISOString()).tz("Asia/Manila").format('MMM DD, YYYY')} - {moment(ticketDetails.created_at).tz("Asia/Manila").format('hh:mm A')}</Text>
        </View>
        <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
          <Text style={styles.detailText}>Draw Date:</Text>
          <Text style={styles.detailValue}>{moment(ticketDetails.timestamp).tz("Asia/Manila").format('MMM DD, YYYY')}</Text>
        </View>
        <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
          <Text style={styles.detailText}>Status</Text>
          <Text style={{ ...styles.detailValue, color: (ticketDetails?.is_complete && !ticketDetails?.is_validated) ? COLORS.warningBorderColor : COLORS.black900 }}>{(ticketDetails?.is_complete && !ticketDetails?.is_validated) ? 'Under Review' : (!ticketDetails?.is_complete && !ticketDetails?.is_validated) ? 'Pending Results' : 'Validated'}</Text>
        </View>
        <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
          <Text style={styles.detailText}>Draw Time:</Text>
          <Text style={styles.detailValue}>{String(ticketDetails.game_time).toUpperCase()}</Text>
        </View>
        <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
          <Text style={styles.detailText}>Total Amount:</Text>
          <Text style={styles.detailValue}>{totalGross}</Text>
        </View>
      </View>
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Bet</Text>
        <Text style={styles.headerText}>Straight</Text>
        <Text style={styles.headerText}>Ramble</Text>
      </View>
      <FlatList
        data={ticketDetails.combinations}
        renderItem={renderBet}
        keyExtractor={(item, index) => index.toString()}
      />
            {/* <TouchableOpacity onPress={() => navigation.navigate('ViewShot', { data: ticketDetails})}>
              <Text>
                View Shot
              </Text>
            </TouchableOpacity> */}
      <View style={styles.buttonRow}>
        {(user?.is_admin && !ticketDetails?.is_deleted) ?
          <TouchableOpacity
            disabled={disableDeleteButton}
            activeOpacity={.6}
            onPress={() => handleCancelTicket(ticketDetails)}
            style={{ elevation: 10, shadowRadius: SIZES.radius, borderRadius: SIZES.radius, width: '30%', opacity: disableDeleteButton ? .5 : 1 }}
          >
            <LinearGradient colors={['#d85a58', '#bb473a', '#892c2f']} style={styles.linearGradientCancel}>
              <Text style={styles.buttonTextCancel}>
                Delete
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          :
          <TouchableOpacity activeOpacity={.6}
            // onPress={() => handleCancelTicket(ticketDetails._id)} 
            onPress={() => {
              navigation.goBack()
              // Alert.alert('Cancel Not Available!')
            }}
            style={{ width: '30%' }}>
            <LinearGradient colors={['#d85a58', '#bb473a', '#892c2f']} style={styles.linearGradientCancel}>
              <Text style={styles.buttonTextCancel}>
                Back
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        }
        {/* {user?.is_admin ? */}

          <TouchableOpacity activeOpacity={.6} onPress={() => console.log('Reprint Not Available!')} style={{ width: '30%' }}>
            <TestScreen data={ticketDetails} isPrint={(ticketDetails.isPrint || isPrint)} onPrint={() => setIsPrint(true)} />
          </TouchableOpacity>
          {/* :
          <TouchableOpacity activeOpacity={.6} onPress={() => Alert.alert('Reprint Not Available!')} style={{ width: '30%' }}>
            <LinearGradient colors={['#6599c3', '#3573a2', '#165894']} style={styles.linearGradientOk}>
              <Text style={styles.buttonTextOk}>
                Print
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        } */}
        {ticketDetails.is_deleted ?
          <TouchableOpacity activeOpacity={.6} disabled={!user?.is_admin} onPress={() => handleRestore(ticketDetails.id)} style={{ width: '30%' }}>
            <LinearGradient colors={['#6ddc59', '#39ad4a', '#217735']} style={styles.linearGradientOk}>
              <Text style={styles.buttonTextOk}>
                Restore
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          :
          <TouchableOpacity activeOpacity={.6}
            onPress={() => {
              navigation.navigate('Transactions', {})
              setConfirmTecket(null)
            }} style={{ elevation: 10, shadowRadius: SIZES.radius, borderRadius: SIZES.radius, width: '30%' }}>
            <LinearGradient colors={['#6ddc59', '#39ad4a', '#217735']} style={styles.linearGradientOk}>
              <Text style={styles.buttonTextOk}>
                OK
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        }



      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
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
  linearGradientCancel: {
    width: '100%',
    height: 40,
    paddingLeft: 15,
    paddingRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
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
    paddingHorizontal: 10
    // paddingVertical: 5,
  },
  betText: {
    fontSize: 14,
    fontWeight: '500',
    width: '25%',
    color: COLORS.black,
    borderBottomWidth: 1,
    paddingVertical: 10,
    borderColor: COLORS.gray400,
    textAlign: 'left',
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

export default ReviewScreen;