import React, { useCallback, useEffect, useState } from 'react';
import { Image, View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import moment from 'moment-timezone';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { CLOSE_CONFIRMATION_MODAL, CLOSE_WARNING_MODAL, OPEN_CONFIRMATION_MODAL, OPEN_WARNING_MODAL } from '../redux/actions/types';
import ConfirmationModal from '../components/ConfirmationModal';
import WarningModal from '../components/WarningModal';
import { COLORS, icons, SIZES } from '../constants';
import TestScreen from './TestScreen';
// import { useOffline } from '../context/OfflineProvider';
import { api } from '../utils/offlineSync';


const VoidScreen = ({ route, navigation, onPress }) => {
  const ticketDetails = JSON.parse(route.params);
  const {navigate_screen} = JSON.parse(route.params);
console.log(navigate_screen, 'ROUTE')
  // const { fetchUser, api, dataVersion } = useOffline();
  const dispatch = useDispatch();
  const [disableCancelButton, setDisableCancelButton] = useState(false);
  const [total, setTotal] = useState(0);
  const [gameTime, setGameTime] = useState('')
  const [isPrint, setIsPrint] = useState(false);
  const { loading, confirmationModal, warningModal } = useSelector(({ ui }) => ui);
  const [confirmTicket, setConfirmTecket] = useState(null);
  const { collector, user } = useSelector(({ user }) => user);


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

  const handleCancelTicket =
    async (data) => {
      if (data?.owner_id !== String(user.id)) {
        Alert.alert("You can't delete someone else's task!");
      } else {
        let ticketCreated = moment(data?.created_at).tz('Asia/Manila'); // Set ticketCreated to Philippines timezone
        const ticketExpiry = ticketCreated.add(3, 'minutes');
        // Calculate time difference in minutes
        // const diffMinutes = currentTime.isAfter(ticketCreated, 'minutes');

        let currentTime = moment().tz('Asia/Manila'); // Get current time in Philippines timezone

        // console.log(diffMinutes, 'diffMinutes')

        if (currentTime.isAfter(ticketExpiry)) {
          // Alert.alert('Every ticket can only be deleted before 3 minutes after Creation, if you want to proceed please contact Administrator.')
          dispatch({ type: OPEN_WARNING_MODAL })
          setDisableCancelButton(true)
          return;
        } else {
          setConfirmTecket(data);
          dispatch({ type: OPEN_CONFIRMATION_MODAL, payload: 'void' });
        }
      }
    };

  const handleConfirmButton = useCallback(async (ticket) => {
    try {
      console.log('DELETING TICKET', ticket.id)
      console.log('TRIGGER')
      const update = await api.updateBetting(ticket.id, { is_deleted: true }).then(res => console.log(res)).catch(err => {
        console.log(err, "THE ERR")
      })


      console.log(update, "UPDATE VARIABLE")
      setConfirmTecket(null);
      navigation.navigate('Play', {})
    } catch (error) {
      console.log(error, `Something went wrong.`)
      return
    }
    dispatch({ type: CLOSE_CONFIRMATION_MODAL });
  })

  const handleConfirmWarning = () => {
    setConfirmTecket(null);
    dispatch({ type: CLOSE_WARNING_MODAL })
  }

  const renderBet = ({ item, index }) => (
    <View style={styles.betRow} key={index}>
      <Text style={{ ...styles.betText, color: item.isWinTo ? COLORS.danger : COLORS.black }}>{String(item.combination).split('').join('-')}</Text>
      <Text style={{ ...styles.betText, color: item.isWinTo ? COLORS.danger : COLORS.black }}>₱{item?.targetAmount?.toFixed(0)}</Text>
      <Text style={{ ...styles.betText, color: item.isWinTo ? COLORS.danger : COLORS.black }}>₱{item?.rambleAmount?.toFixed(0)}</Text>
    </View>
  );

  useEffect(() => {
    const initTicket = async () => {
      const totalAmount = ticketDetails?.combinations?.reduce((acc, combination) => acc + combination.amount, 0);

      let gameTime = getTimeRange();
      setGameTime(gameTime)
      setTotal(totalAmount)
    }

    // captureImage()
    initTicket()
  }, [ticketDetails])

   const totalGross = ticketDetails?.combinations?.reduce((acc, combination) => acc + combination.amount, 0);

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
        message={`Every ticket can only be deleted before 3 minutes after Creation, if you want to proceed please contact Administrator.`}
        handleConfirm={() => {
          handleConfirmWarning()
        }}
      />

      <ConfirmationModal
        visible={confirmationModal == 'void'}
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
          <Text style={styles.detailValue}>{moment(ticketDetails.timestamp).tz("Asia/Manila").format('MMM DD, YYYY')} - {moment(ticketDetails.created_at).tz("Asia/Manila").format('hh:mm A')}</Text>
        </View>
        <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
          <Text style={styles.detailText}>Draw Date:</Text>
          <Text style={styles.detailValue}>{moment(ticketDetails.timestamp).format('MMM DD, YYYY')}</Text>
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

      {/* <PDF417BarcodeGenerator data={'1232132'}/> */}

      <FlatList
        data={ticketDetails.combinations}
        renderItem={renderBet}
        keyExtractor={(item, index) => index.toString()}
      /> 


      <View style={styles.buttonRow}>
        <TouchableOpacity
          disabled={disableCancelButton}
          activeOpacity={.6}
          onPress={() => {
            handleCancelTicket(ticketDetails)
            // Alert.alert('Cancel Not Available')
          }
          }
          style={{ elevation: 10, shadowRadius: SIZES.radius, borderRadius: SIZES.radius, width: '30%', opacity: disableCancelButton ? .5 : 1 }}
        >
          <LinearGradient colors={['#d85a58', '#bb473a', '#892c2f']} style={styles.linearGradientCancel}>
            <Text style={styles.buttonTextCancel}>
              CANCEL
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={.6} onPress={() => {
          // handleCancelTicket(ticketDetails._id)
        }} style={{ elevation: 10, shadowRadius: SIZES.radius, backgroundColor: COLORS.transparent, borderRadius: SIZES.radius, width: '30%' }}>
          <TestScreen data={ticketDetails} isPrint={(ticketDetails.isPrint || isPrint)} onPrint={() => setIsPrint(true)} /> 
        
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={.6}
          onPress={() => {
            navigation.navigate(navigate_screen ?? 'Play', {})
            setConfirmTecket(null)
          }}
          style={{ elevation: 10, shadowRadius: SIZES.radius, borderRadius: SIZES.radius, width: '30%' }}
        >
          <LinearGradient colors={['#6ddc59', '#39ad4a', '#217735']} style={styles.linearGradientOk}>
            <Text style={styles.buttonTextOk}>
              OK
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.button, styles.okButton]}>
                    <Text style={styles.buttonText}>OK</Text>
                </TouchableOpacity> */}
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

export default VoidScreen;