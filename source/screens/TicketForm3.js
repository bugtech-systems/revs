import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { StyleSheet, Text, Keyboard, View, ScrollView, TouchableOpacity, FlatList, TextInput, Image, Button, TouchableWithoutFeedback, Alert, Modal } from 'react-native'
import moment from 'moment-timezone';
import { useSelector, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons'; // or any other icon library
import { permuteDigits, getConfiguration } from '../utils/helpers';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, icons } from '../constants';
import Config from 'react-native-config';
import { api } from '../utils/offlineSync';




export default function TicketForm3({ navigation, route }) {
  const ticketDetails = JSON.parse(route.params);

  const dispatch = useDispatch()
  const { collector, user } = useSelector(({ user }) => user);
  // const realm = useRealm()
  const [error, setError] = useState(null);
  const [amountVal, setAmountVal] = useState('')
  const [time, setSelectedTime] = useState('2pm')
  const [arrayBetting, setBetting] = useState([]);
  const [selectedTab, setSelectedTab] = useState('keypads');
  const [loading, setLoading] = useState(false);
  const [selectedActive, setSelectedActive] = useState('combi')
  const [amountTarget, setAmountTarget] = useState('')
  const [amountRamble, setAmountRamble] = useState('')
  const [combinationString, setCombination] = useState('');
  const [is2pmDisabled, setIs2pmDisabled] = useState(false);
  const [is5pmDisabled, setIs5pmDisabled] = useState(false);
  const [is9pmDisabled, setIs9pmDisabled] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [betType, setBetType] = useState('')
  const [betTypeOption, setBetTypeOption] = useState('')
  const [inputValue, setInputValue] = useState('');
  const [image, setImage] = useState(null);
  const [pressCount, setPressCount] = useState(0);
  const [lastPress, setLastPress] = useState(null);
  const [showDate, setShowDate] = useState(false);
  const [date, setDate] = useState(new Date())
  const [values, setValues] = useState({
    digit: '',
    straight: '',
    ramble: ''
  })

  const [draws, setDraws] = useState([]);
  const [comb, setComb] = useState([]);
  const [combs, setCombs] = useState([]);
  const [item, setItem] = useState();

  let isWinTo = false;
  const current = new Date();
  const hoursNow = current.getHours();
  const minNow = current.getMinutes();


  // let users = useQuery(Users, doc => {
  //   let curUser = collector ? collector : user?.email
  //   return doc.filtered(
  //     'email == $0',
  //     curUser
  //   );
  // }, [collector, user])

  // const draws = useQuery(Draws, draw => {
  //   const startOfDay = moment(date).startOf('day').toDate();
  //   const endOfDay = moment(date).endOf('day').toDate();


  //   return draw.filtered(
  //     'drawDate >= $0 && drawDate < $1',
  //     startOfDay, endOfDay
  //   ).sorted('gameTime');
  // }, [user, date])



  // let comb = useQuery(Combinations, digit => {
  //   return digit.filtered(
  //     'digit == $0',
  //     combinationString,
  //   );
  // }, [combinationString, collector])

  // let combs = useQuery(Combinations, combination => {
  //   return combination.filtered('straightTotal == 0 && rambleTotal == 0');
  // })
  // let comb = useQuery(Combinations).filtered('digit == $0', combinationString)
  // , digit => { return digit.filtered('digit == $0', values.digit )}, [values.digit])
  // const items = useQuery(Betting, betting => {
  //   const startOfDay = moment(current).startOf('day').toDate();
  //   const endOfDay = moment(current).endOf('day').toDate();

  //   return betting.filtered(
  //     'isComplete == false && inputType == "sold" && gameTime == $0 && timestamp >= $1 && timestamp < $2', time, startOfDay, endOfDay).sorted('timestamp');
  // }, [time]);

  useEffect(() => {
    const load = async () => {
      const { start_of_day, end_of_day  } = getDayRange(date)
      let filters = {
        timestamp: { op: "between", from: start_of_day, to: end_of_day },
      }
      

      let localDraws = await api.listDraws({
        filters: { 
          draw_date: { 
          op: "between",
          from: start_of_day,
          to: end_of_day,
          }
        }
      });

      let localComb = await api.listMasterCombinations({
        filters: {
          digit: combinationString,
        }
      })

      setDraws(localDraws);
      setComb(localComb)
  }

  load();
  
  },[user, combinationString, collector, date])




  const initializeGameTime = () => {
    let getGameTime = getTimeRange();
    setBetType('')
    const now = new Date();
    const hours = now.getHours();

    if ((getGameTime == '2pm' || user?.isAdmin)) {
      setSelectedTime('2pm')
      setIs2pmDisabled(false);
      setIs5pmDisabled(false);
      setIs9pmDisabled(false);
    } else if (getGameTime == '5pm') {
      setSelectedTime('5pm')
      setIs2pmDisabled(true);
      setIs5pmDisabled(false);
      setIs9pmDisabled(false);
    } else if (getGameTime == '9pm') {
      setSelectedTime('9pm')
      setIs2pmDisabled(true);
      setIs5pmDisabled(true);
      setIs9pmDisabled(false);
    } else {
      setIs2pmDisabled(true);
      setIs5pmDisabled(true);
      setIs9pmDisabled(true);
      setSelectedTime('')
    }
  }

  function getTimeRange() {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMins = currentTime.getMinutes();
    let card2pm = ((currentHour >= 13 && currentMins >= 55) || draws.filter(a => a.gameTime == '2pm')[0]);
    let card5pm = ((currentHour >= 16 && currentMins >= 55) || draws.filter(a => a.gameTime == '5pm')[0]);
    let card9pm = ((currentHour >= 20 && currentMins >= 55) || draws.filter(a => a.gameTime == '9pm')[0]);



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



  console.log(draws, comb, "INITIAL VAL")


  let keyPad = [
    {
      name: "7",
      value: 7
    },
    {
      name: "8",
      value: 8
    },
    {
      name: "9",
      value: 9
    },
    {
      name: "4",
      value: 4
    },
    {
      name: "5",
      value: 5
    },
    {
      name: "6",
      value: 6
    },
    {
      name: "1",
      value: 1
    },
    {
      name: "2",
      value: 2
    },
    {
      name: "3",
      value: 3
    },
    {
      name: "C",
      value: "C"
    },
    {
      name: "0",
      value: 0
    },
    {
      name: "delete",
      value: "delete"
    },
  ]



  const handleRamble = async (item) => {
    // setBetting([]) // clear test state
    if (inputValue.length === 3 && amountVal != 0 && time != '') {
      setBetting(prevState => [...prevState, item]);
      setCombination('')
      setInputValue('')
      setAmountVal('')
      return
    } else {
      Alert.alert(`${inputValue.length == 0 && inputValue.length < 3 && amountVal.length == 0 ? 'Plesae provide 3 digit combination' : amountVal == 0 ? 'Plesae provide amount' : time == '' ? 'Please select time' : 'Something went wrong'}`)
    }
  }

  const handleBet = (item) => {
    let { combination, amount, ramble, target } = item;
    // setBetting([]) // clear test state
    // search for a realm object with a primary key that is an objectId
    // itemComb[0].straightTotal += 
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMins = currentTime.getMinutes();




    console.log(selectedActive, amountRamble, amountTarget, 'sss')
    /* 	if((!combination && !amountRamble && !amountTarget)){
        setSelectedTab('viewBets')
        console.log('view betss')
        return;
      } 
       */

    if ((!combination || combination.length < 3)) {
      setSelectedActive('combi')
      return;
    }


    let totalS = comb[0]?.straightTotal + Number(amountTarget);
    let totalR = comb[0]?.rambleTotal + Number(amountRamble);


    if (((combs.length > 1 && combs.length < 300) && (!comb[0]?.straightTotal && !comb[0]?.rambleTotal))) {
      Alert.alert(`Sold Out Combination!`)
      return;
    }



    if (selectedActive == 'target' && !amountRamble) {
      setSelectedActive('ramble')
      return;
    }


    console.log(amountTarget, amountRamble, 'amounts')
    if (selectedActive == 'ramble' && (!amountTarget && !amountRamble)) {
      setSelectedActive('ramble')
      Alert.alert(`${!target && !ramble ? 'Please provide amount' : amountVal == 0 ? 'Plesae provide amount' : time == '' ? 'Please select time' : 'Something went wrong'}`)
      return;
    }


    let withWin200 = getConfiguration(user, 'withWin200').isCheck;


    if (amount != 0 || !combination) {
      setBetting(prevState => [...prevState, { ...item, isWinTo: withWin200 ? comb[0]?.isWinTo : false }]);
      setCombination('')
      setAmountRamble('')
      setAmountTarget('')
      setSelectedActive('combi')
      // realm.write(() => {
      //   comb[0].straightTotal = Number(totalS);
      //   comb[0].rambleTotal = Number(totalR);
      // });
      return
    } else {
      Alert.alert(`${!target && !ramble ? 'Please provide amount' : amountVal == 0 ? 'Plesae provide amount' : time == '' ? 'Please select time' : 'Something went wrong'}`)
    }
  }

  function generateRandomId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  function generateTicketNumber() {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
  }

  // setLoading(false)
  const handleSubmit = useCallback(async (data) => {
    let gross = 0;
    let totalRamble = 0;
    let totalStraight = 0;
    let totalAmount = 0;
    try {
      // const item = realm.objectForPrimaryKey(Betting, BSON.ObjectId(ticketDetails._id)); // search for a realm object with a primary key that is an objectId


      setLoading(true)


      if (data?.length > 0) {
        let combinations = [];

        let arrayOfBet = data?.map(bet => {

          totalAmount += Number(bet.amount)
          gross += Number(bet.amount)
          totalRamble += Number(bet.ramble)
          totalStraight += Number(bet.target)
          let permutes = permuteDigits(bet.combination);

          let sWinning = (Number(bet.target) / 10);
          let rWinning = (Number(bet.ramble / 10)) / permutes.length;
          let combObj = {
            combination: bet.combination,
            betType: bet.ramble && !bet.target ? 'R' : !bet.ramble && bet.target ? 'T' : bet.target && bet.ramble ? 'R - T' : null,
            winning: sWinning + rWinning,
            amount: Number(bet.amount),
            isWinTo: bet.is_win_to,
            targetAmount: Number(bet.target),
            rambleAmount: Number(bet.ramble),
          }


          combinations.push(combObj)
        })



        let commissions = [];
        let uplines = user?.uplines ? user?.uplines : [];
        let newUplines = [];
        // let comUplines = [...uplines, user];

        let netRate = 100 - user?.uplines[0]?.comRate ? user?.uplines[0]?.comRate : 0;




        let newUps = [];


        uplines.forEach(line => {
          newUps.push(line)
          newUplines.push(String(line._id))
        });

        newUps.push(user)
        newUplines.push(String(user.id));

        for (let i = 0; i < newUps.length; i++) {
          let agentComAmnt = Math.floor((newUps[i].comRate / 100) * gross);

          if (newUps[i + 1]) {
            let subAgentComAmnt = Math.floor(agentComAmnt * (newUps[i + 1].comPortion / 100))
            let comAmnt = agentComAmnt - subAgentComAmnt;
            commissions.push({
              userLevel: String(newUps[i].userLevel),
              referral: String(newUps[i]._id),
              rate: Number((comAmnt / gross) * 100).toFixed(2),
              amount: Number(comAmnt).toFixed(2)
            })
          } else {
            commissions.push({
              userLevel: String(newUps[i].userLevel),
              referral: String(newUps[i]._id),
              rate: Number((agentComAmnt / gross) * 100).toFixed(2),
              amount: Number(agentComAmnt).toFixed(2)
            })
          }
        }

        let newComms = commissions.map(com => {
          com.amount = Number(com.amount)
          com.rate = Number(com.rate)
          com.referral = com.referral
          return com
        })

        let netComs = newComms.reduce((n, { amount }) => n + amount, 0);
        let netTotal = gross - netComs;


        let drawResult = draws.find(a => a.gameTime == time);

        // await realm.write(async () => {
        //   item.ramble = Number(totalRamble);
        //   item.straight = Number(totalStraight);
        //   item.isComplete = false;
        //   item.gross = Number(gross);
        //   item.net = Number(netTotal);
        //   item.gameTime = time;
        //   item.winning = 0;
        //   item.combinations = combinations;
        //   item.commissions = newComms;
        //   item.uplines = newUplines;

        //   setLoading(false)
        //   // dispatch({type: SET_LOADING})
        //   setSelectedTab('keypads')
        //   setBetting([]);
        //   setDate(new Date());
        //   navigation.navigate('ViewTicket', JSON.stringify(item))
        // })
      } else {
        Alert.alert('No tickets to submit')
      }
    } catch (err) {
      console.log(err)
      return
    }
    setLoading(false)

  }, [user, ticketDetails, arrayBetting])

  function removeItemByRamble(data) {

    if (arrayBetting.length <= 1) {
      Alert.alert('Unable to remove only item')
      return;
    }


    let dataList = arrayBetting.filter(item => item?.id !== data.id);
    setBetting(dataList);


    const itemComb = realm.objects(Combinations).filtered(
      'digit == $0',
      data.combination);


    let totalS = itemComb[0].straightTotal - Number(data.amountTarget);
    let totalR = itemComb[0].rambleTotal - Number(data.amountRamble);



    realm.write(() => {
      itemComb[0].straightTotal = Number(totalS) < 0 ? 0 : Number(totalS);
      itemComb[0].rambleTotal = Number(totalR) < 0 ? 0 : Number(totalR);
    });

    // console.log(dataList);
  }


  const handlePress = (value) => {
    // if (combinationString.length > 2 && selectedActive === 'combi') {
    // 	setSelectedActive('target')		
    // }

    if (curDraw) {
      setAmountVal('')
      setAmountTarget('')
      setAmountRamble('')
      setCombination('')
      return;
    }

    if (value === 'C') {
      if (selectedActive == 'target') {
        setAmountVal('')
        setAmountTarget('')
      }
      if (selectedActive == 'ramble') {
        setAmountRamble('')
      }
      if (selectedActive == 'combi') {
        setCombination('')
      }
    } else if (value === 'delete') {
      // if ( selectedActive == 'combination') {
      if (selectedActive) {

        handleBackspace();
      }
    } else {
      if (selectedActive == 'target' && amountTarget.length <= 2) {
        // let amount = inputValue.slice(3)
        if (!amountTarget && value.toString() == 0) {
          return
        }
        setAmountTarget((prevNum) => prevNum + value.toString())
        // console.log('AMOUNT', value)
        // console.log(amount, "WEW")
      }
      else if (selectedActive == 'ramble' && amountRamble.length <= 2) {
        if (!amountRamble && value.toString() == 0) {
          return
        }
        setAmountRamble((prevNum) => prevNum + value.toString())
      }
      else if (selectedActive == 'combi' && combinationString.length <= 2) {
        if (combinationString.length === 2) {
          setSelectedActive('target')
        }
        setCombination((prevNum) => prevNum + value.toString())
      }
      /* else {
        setInputValue((prev) => prev + value.toString());
      } */
    }
  };

  const handleBackspace = () => {
    if (selectedActive == 'target') {
      setAmountTarget((prev) => prev.slice(0, -1));
    }
    if (selectedActive == 'ramble') {
      setAmountRamble((prev) => prev.slice(0, -1));

    }
    if (selectedActive == 'combi') {
      setCombination((prev) => prev.slice(0, -1));
    }

  };

  const handleBackspaceAmount = () => {
    ((prev) => prev.slice(0, -1));
  };




  const renderButton = ({ name, value }) => {

    return (
      <TouchableOpacity key={name} style={styles.button} onPress={() => !is9pmDisabled && handlePress(value)}>
        {name === 'delete' ? (
          <Image 
            source={icons.backspace}
            style={{ height: 20, width: 20, resizeMode: 'contain'}}
          /> 
        ) : (
          <Text style={styles.buttonText}>{name}</Text>
        )}
      </TouchableOpacity>
    );
  };


  const uploadImage = async (fileImage) => {
    try {
      setError(null)
      const imagePick = await pickImage();
      const image = imagePick.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: image.uri,
        type: image.type,
        name: image.fileName,
      });

      const response = await axios.post(Config.FILE_SERVER_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${Config.FILE_SERVER_TOKEN}`
        },
      });

      setSelectedImage({ ...response.data, uri: Config.FILE_DOWNLOAD_URL + response.data._id });

    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  // const selectFile = async () => {
  // setBetTypeOption('file')
  //   try {
  //     const result = await launchImageLibrary({
  //       mediaType: 'photo',
  //       maxWidth: 300,
  //       maxHeight: 300,
  //       quality: 1,
  //     });

  //     if (result.didCancel) {
  //       Alert.alert('Canceled');
  // 	setBetTypeOption('')
  // 	setBetType('')

  //     } else if (result.errorCode) {
  //       Alert.alert('Error: ' + result.errorMessage);
  // 	setBetTypeOption('')
  // 	setBetType('')

  //     } else {
  //       uploadImage(result.assets[0]);
  //     }
  //   } catch (err) {
  //     Alert.alert('Unknown Error: ' + JSON.stringify(err));
  //     throw err;
  //   }
  // };

  // const openCamera = async () => {
  // setBetTypeOption('camera')
  // setBetType('imageUpload')
  //   try {
  //     const result = await launchCamera({
  //       mediaType: 'photo',
  //       maxWidth: 300,
  //       maxHeight: 300,
  //       quality: 1,
  //     });

  //     if (result.didCancel) {
  //       Alert.alert('Canceled');
  // 	setBetTypeOption('')
  //     } else if (result.errorCode) {
  //       Alert.alert('Error: ' + result.errorMessage);
  // 	setBetTypeOption('')
  //     } else {
  //       uploadImage(result.assets[0]);
  //     }
  //   } catch (err) {
  //     Alert.alert('Unknown Error: ' + JSON.stringify(err));
  //     throw err;
  //   }
  // };

  // const chooseImageSource = () => {
  //   Alert.alert(
  //     'Upload Image',
  //     'Choose an option',
  //     [
  //       { text: 'Camera', onPress: openCamera },
  //       { text: 'Gallery', onPress: selectFile },
  //       { text: 'Cancel', style: 'cancel' },
  //     ],
  //     { cancelable: true }
  //   );
  // };

  const handlePress2 = () => {
    setSelectedActive('combi');
    setSelectedTab('keypads');
    /*    const currentTime = new Date().getTime();
       const timeDifference = currentTime - lastPress;
   
       if (lastPress && timeDifference < 2000) {
         setPressCount(pressCount + 1);
         if (pressCount + 1 === 2) {
           // Alert.alert('double');
           // handleImageUpload()
       setBetType('imageUpload')
           setPressCount(0);
         }
       } else {
         setPressCount(1);
       }
   
       setLastPress(currentTime);
     // chooseImageSource()
   
       // Reset the press count after 2 seconds
       setTimeout(() => {
         setPressCount(0);
       }, 1020); */
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDate(Platform.OS === 'ios');
    setDate(currentDate);
  };


  //   useEffect(() => {
  // 	initializeGameTime()
  //   }, [draws])

  useEffect(() => {
    if (ticketDetails && ticketDetails.id) {
      console.log(ticketDetails, 'TICKET')
      let { combinations, gameTime } = ticketDetails;

      if (combinations && combinations.length) {
        let newArr = combinations.map(item => {
          let newObj = { id: generateRandomId(), amount: item.amount, combination: item.combination, gameTime: ticketDetails.gameTime, target: item.targetAmount, ramble: item.rambleAmount, amountRamble: item.rambleAmount, amountTarget: item.targetAmount }
          return newObj
        })
        setBetting(newArr)
        setSelectedTime(gameTime)

      }
    } else {
      console.log(ticketDetails, 'TICKET2')
      setBetting([])
    }
    return () => {
      // setBetting([])
    }

  }, [])









  let total = arrayBetting.reduce((n, { amount }) => n + amount, 0)
  let closeDraw = (is2pmDisabled && is5pmDisabled && is9pmDisabled) ? true : false;

  let curDraw = (draws.find(a => !a.combination) || ((hoursNow == 13 && minNow >= 55) || (hoursNow == 16 && minNow >= 55) || (hoursNow == 20 && minNow >= 55)));

  return (
    <SafeAreaProvider style={{ flexGrow: 1 }}>
      <View style={{ backgroundColor: '#0e58ab', flex: 1 }}>
        {showDate && (
          <DateTimePicker
            testID="dateTimePicker"
            value={date}
            // mode="time"
            display="default"
            onChange={onChangeDate}
          />
        )}

        <View style={{ flex: 1, padding: 5, width: '100%', alignItems: 'flex-start', flexDirection: 'column', marginBottom: 30 }}>
          <View
            style={{
              height: 50,
              width: '100%',
              borderWidth: 1,
              backgroundColor: COLORS.white,
              borderColor: COLORS.white,
              borderRadius: 4,
              padding: 5,
              flexDirection: 'row',
            }}>
            <TouchableOpacity
              onPress={() => user?.isAdmin ? setShowDate(true) : console.log('Not Admin')}
            >
              <Image
                source={icons.clock}
                style={{ height: 35, width: 35, alignSelf: 'center' }}
              />
            </TouchableOpacity>
            <View style={{ flexGrow: 1, justifyContent: 'center', padding: 10, paddingTop: 5, flexDirection: 'column' }}>
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.black }}>
                Time
              </Text>
              <Text style={{ fontSize: 10, color: COLORS.black }}>
                Draw Time
              </Text>
            </View>
            <View style={{ flexDirection: 'row', width: '70%', justifyContent: 'space-around' }}>
              <TouchableOpacity disabled={is2pmDisabled} onPress={() => setSelectedTime('2pm')} style={{ width: '30%', borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: time == '2pm' ? '#f4b067' : is2pmDisabled == true ? '#ff807f' : COLORS.gray400, borderColor: time == '2pm' ? '#f4b067' : is2pmDisabled == true ? '#ff807f' : COLORS.gray400, opacity: arrayBetting.length && time !== '2pm' && !is2pmDisabled ? 0.2 : 1 }}>
                <Text style={{ color: is2pmDisabled ? COLORS.white : COLORS.black, fontWeight: '600', fontSize: 16, }}>
                  2PM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={is5pmDisabled} onPress={() => setSelectedTime('5pm')} style={{ width: '30%', borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: time == '5pm' ? '#f4b067' : is5pmDisabled == true ? '#ff807f' : COLORS.gray400, borderColor: time == '5pm' ? '#f4b067' : is5pmDisabled == true ? '#ff807f' : COLORS.gray400, opacity: arrayBetting.length && time !== '5pm' && !is5pmDisabled ? 0.2 : 1 }}>
                <Text style={{ color: is5pmDisabled ? COLORS.white : COLORS.black, fontWeight: '600', fontSize: 16 }}>
                  5PM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={is9pmDisabled} onPress={() => setSelectedTime('9pm')} style={{ width: '30%', borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: time == '9pm' ? '#f4b067' : is9pmDisabled == true ? '#ff807f' : COLORS.gray400, borderColor: time == '9pm' ? '#f4b067' : is9pmDisabled == true ? '#ff807f' : COLORS.gray400, opacity: arrayBetting.length && time !== '9pm' && !is9pmDisabled ? 0.2 : 1 }}>
                <Text style={{ color: is9pmDisabled ? COLORS.white : COLORS.black, fontWeight: '600', fontSize: 16 }}>
                  9PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View
            style={{
              height: 50,
              width: '100%',
              borderWidth: 1,
              marginTop: 7,
              padding: 5,
              backgroundColor: COLORS.white,
              borderColor: COLORS.white,
              borderRadius: 4,
              flexDirection: 'row'
            }}
          >
            <Image
              source={icons.dice}
              style={{ height: 35, width: 35, alignSelf: 'center', margin: '1%' }}
            />
            <View style={{ paddingTop: 5, flexDirection: 'column', width: '30%' }}>
              <Text onPress={() => setBetType('')} style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.black }}>
                Combination
              </Text>
              <Text style={{ fontSize: 10, color: COLORS.black }}>
                Enter Combination
              </Text>
            </View>

            {betType == '' ? (



              <TouchableOpacity
                onPress={handlePress2}
                style={{
                  width: '55%',
                  borderWidth: 1,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  // backgroundColor: inputValue.length == 3 || inputValue.length > 3 ? COLORS.gray400 : '#f4b067', 
                  backgroundColor: !is9pmDisabled && selectedActive == 'combi' && !curDraw ? '#f4b067' : COLORS.gray400,
                  borderColor: !is9pmDisabled && selectedActive == 'combi' ? '#f4b067' : COLORS.gray400,
                  borderRadius: 4,
                }}>
                <Text style={{
                  color: COLORS.black,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  height: 40,
                  // bottom: 4,
                  fontSize: 30,
                }}>
                  {combinationString}
                </Text>

              </TouchableOpacity>
            )
              :
              (
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    // onPress={() => openCamera()}
                    style={{
                      width: '36%',
                      borderWidth: 1,
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      // backgroundColor: inputValue.length == 3 || inputValue.length > 3 ? COLORS.gray400 : '#f4b067', 
                      backgroundColor: betTypeOption == 'camera' ? '#f4b067' : COLORS.gray400,
                      borderColor: betTypeOption == 'camera' ? '#f4b067' : COLORS.gray400,
                      borderRadius: 4,
                    }}>
                    <Text>
                      Camera
                    </Text>

                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => selectFile()}
                    style={{
                      width: '36%',
                      borderWidth: 1,
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      // backgroundColor: inputValue.length == 3 || inputValue.length > 3 ? COLORS.gray400 : '#f4b067', 
                      backgroundColor: betTypeOption == 'file' ? '#f4b067' : COLORS.gray400,
                      borderColor: betTypeOption == 'file' ? '#f4b067' : COLORS.gray400,
                      borderRadius: 4,
                    }}>
                    <Text>
                      File Upload
                    </Text>

                  </TouchableOpacity>
                </View>
              )
            }

          </View>
          <View
            style={{
              height: 60,
              marginTop: 5,
              width: '100%',
              padding: 5,
              alignItems: 'center',
              backgroundColor: COLORS.white,
              borderColor: COLORS.white,
              alignItems: 'flex-start',
              borderRadius: 4,
              flexDirection: 'row'
            }}
          >
            <Image
              source={icons.peso}
              style={{ height: 35, width: 35, alignSelf: 'center', margin: '1%' }}
            />
            <View style={{ paddingTop: 5, flexDirection: 'column', width: '20%' }}>
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.black }}>
                Amount
              </Text>
              <Text style={{ fontSize: 10, color: COLORS.black }}>
                Enter Amount
              </Text>
            </View>
            <View style={{ width: '65%', height: 40, alignItems: 'center', justifyContent: 'space-between', margin: '1%', flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ marginRight: 5, flexGrow: 1, height: 50, flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>

                {betType !== ''
                  ?
                  (<TextInput
                    style={{ width: 120, borderWidth: .5, margin: '2%', backgroundColor: COLORS.gray300, borderColor: COLORS.gray300 }}
                  />)
                  :
                  (
                    <TouchableOpacity
                      style={{
                        borderWidth: 1,
                        borderColor: '#f4b067',
                        backgroundColor: !is9pmDisabled && selectedActive == 'target' && !curDraw ? '#f4b067' : COLORS.gray400,
                        borderColor: !is9pmDisabled && selectedActive == 'target' ? '#f4b067' : COLORS.gray400,
                        borderRadius: 4,
                        width: '100%',

                      }}
                      onPress={() => { setSelectedActive('target'); setSelectedTab('keypads'); }}>

                      <Text style={{
                        color: COLORS.black,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        fontSize: 28,
                        // width:  '100%',
                      }}>
                        {amountTarget}
                      </Text>
                    </TouchableOpacity>
                  )
                }

                <Text style={{ color: COLORS.black, fontWeight: 'bold', fontSize: 12, paddingTop: 3 }}>
                  {betType == '' ? 'Straight' : 'Note'}
                </Text>
              </View>
              <View style={{ marginLeft: 5, flexGrow: 1, height: 50, flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around' }}>
                {betType != '' ? (
                  <TextInput
                    style={{ width: 120, borderWidth: .5, margin: '2%', backgroundColor: COLORS.gray300, borderColor: COLORS.gray300 }}

                  />
                )
                  :
                  (
                    <TouchableOpacity
                      style={{
                        borderWidth: 1,
                        borderColor: '#f4b067',
                        backgroundColor: !is9pmDisabled && selectedActive == 'ramble' && !curDraw ? '#f4b067' : COLORS.gray400,
                        borderColor: !is9pmDisabled && selectedActive == 'ramble' ? '#f4b067' : COLORS.gray400,
                        borderRadius: 4,
                        width: '100%',

                      }}
                      onPress={() => { setSelectedActive('ramble'); setSelectedTab('keypads') }}>
                      <Text
                        style={{
                          color: COLORS.black,
                          fontWeight: 'bold',
                          textAlign: 'center',
                          fontSize: 28,
                        }}>
                        {amountRamble}
                      </Text>
                    </TouchableOpacity>
                  )
                }

                <Text style={{ color: COLORS.black, fontWeight: 'bold', fontSize: 12, paddingTop: 3 }}>
                  {betType == '' ? 'Rambol' : 'Amount'}
                </Text>
              </View>
            </View>

          </View>
        </View>
        <View style={{ flex: betType == '' && (selectedTab == 'keypads' || selectedTab == 'viewBets') ? 3.5 : betType == 'imageUpload' && selectedTab == 'viewBets' ? 3.5 : 0, marginTop: 10, width: '100%', borderColor: COLORS.white, borderWidth: 1, backgroundColor: COLORS.white, borderTopRightRadius: 20, borderTopLeftRadius: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 50 }}>
            <TouchableOpacity onPress={() => !is9pmDisabled && !curDraw && setSelectedTab('keypads')} style={{ width: '50%', alignItems: 'center', justifyContent: 'center', }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: selectedTab == 'keypads' ? '#0e58ab' : COLORS.black, width: '100%', textAlign: 'center', padding: 14 }}>
                KEYPADS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => !is9pmDisabled && !curDraw && setSelectedTab('viewBets')} style={{ width: '50%', alignItems: 'center', justifyContent: 'center', }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: selectedTab == 'viewBets' ? '#0e58ab' : COLORS.black, width: '100%', textAlign: 'center', padding: 14 }}>
                VIEW BETS {arrayBetting?.length > 0 ? `(${arrayBetting?.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
          {
            selectedTab == 'keypads' ?
              <View style={styles.container}>
                <View style={styles.keypadContainer}>
                  {keyPad.map(renderButton)}
                  <View style={{ width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'space-around', backgroundColor: COLORS.white, marginTop: 10 }}>
                    {!curDraw ?

                      <TouchableOpacity
                        disabled={combinationString.length < 3 && !arrayBetting.length ? true : false}
                        onPress={() => handleBet({ id: generateRandomId(), amount: Number(amountRamble ? amountRamble : 0) + Number(amountTarget ? amountTarget : 0), combination: combinationString, gameTime: time, target: amountTarget, ramble: amountRamble, amountRamble, amountTarget })}
                        style={{ padding: 10, elevation: 6, borderRadius: 50, borderWidth: 1, backgroundColor: '#4ba643', borderColor: '#4ba643', width: '90%', padding: 10, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 22, color: COLORS.white }}>ADD BET</Text>
                      </TouchableOpacity>
                      :
                      closeDraw ?
                        <TouchableOpacity
                          onPress={() => Alert.alert('Betting Already Close!')}
                          style={{ padding: 10, elevation: 6, borderRadius: 50, borderWidth: 1, backgroundColor: COLORS.darkgray, borderColor: '#4ba643', width: '90%', padding: 10, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontWeight: 'bold', fontSize: 22, color: COLORS.white }}>BETTING CLOSE</Text>
                        </TouchableOpacity>
                        :
                        <TouchableOpacity
                          onPress={() => Alert.alert('Already CUT-OFF PERIOD!')}
                          style={{ padding: 10, elevation: 6, borderRadius: 50, borderWidth: 1, backgroundColor: COLORS.darkgray, borderColor: '#4ba643', width: '90%', padding: 10, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontWeight: 'bold', fontSize: 22, color: COLORS.white }}>CUT-OFF</Text>
                        </TouchableOpacity>
                    }
                  </View>
                </View>
              </View>
              :
              <View style={styles.container}>
                <View style={{ width: '100%', height: '100%', flexDirection: 'column', backgroundColor: COLORS.white2, borderTopWidth: 1, borderColor: COLORS.white3 }}>
                  <View style={{ paddingLeft: 20, width: '100%', flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: COLORS.white }}>
                    <Text style={{ paddingLeft: 10, width: '25%', color: COLORS.black, fontWeight: 'bold', fontSize: 16 }}>
                      BET
                    </Text>
                    <Text style={{ width: '25%', color: COLORS.black, fontWeight: 'bold', fontSize: 16 }}>
                      STRAIGHT
                    </Text>
                    <Text style={{ width: '25%', color: COLORS.black, fontWeight: 'bold', fontSize: 16 }}>
                      RAMBLE
                    </Text>
                    <Text style={{ width: '25%', color: COLORS.black, fontWeight: 'bold', fontSize: 16 }}>
                    </Text>
                  </View>
                  {arrayBetting.length > 0 ?
                    (
                      <FlatList
                        data={arrayBetting}
                        keyExtractor={(item, index) => index}
                        renderItem={({ item, index }) => (
                          <>
                            <View style={{ paddingLeft: 20, flexDirection: 'row', width: '100%', backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                              <Text style={{ ...styles.itemText, width: '25%', color: item.is_win_to ? COLORS.danger : COLORS.black, fontSize: 18, fontWeight: '500' }}>{String(item?.combination).split('').join('-')}</Text>
                              <Text style={{ ...styles.itemText, width: '25%', color: item.is_win_to ? COLORS.danger : COLORS.black, fontSize: 18, fontWeight: '500' }}>₱{item?.target}</Text>
                              <Text style={{ ...styles.itemText, width: '25%', color: item.is_win_to ? COLORS.danger : COLORS.black, fontSize: 18, fontWeight: '500' }}>₱{item?.ramble}</Text>
                              <View style={{ width: '20%' }}>
                                <TouchableOpacity onPress={() => removeItemByRamble(item)} style={{ width: 30, borderWidth: 1, height: 30, alignItems: 'center', justifyContent: 'center', borderColor: COLORS.white }}>
                                  <Image
                                    source={icons.iconDelete}
                                    style={{ height: 30, width: 30 }}
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>
                            <View style={{ width: '100%', borderBottomWidth: 1, borderColor: COLORS.white3 }} />
                          </>
                        )}
                      />
                    )
                    :
                    (
                      null
                    )
                  }
                </View>
              </View>

          }
          {
            selectedTab == 'viewBets'
              ?
              (

                <View style={{ height: 100, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: 2, borderColor: COLORS.white3 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 24, color: COLORS.black }}>
                    Total: {`${total}`}
                  </Text>
                  <TouchableOpacity onPress={() => handleSubmit(arrayBetting)} disabled={arrayBetting.length == 0 || curDraw} style={{ padding: 10, backgroundColor: arrayBetting.length == 0 ? COLORS.gray600 : '#2761a2', width: '40%', height: 55, borderRadius: 24, justifyContent: 'center', alignItems: 'center', }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 22, color: COLORS.white }}>
                      UPDATE
                    </Text>
                  </TouchableOpacity>

                </View>
              )
              :
              (
                null
              )
          }

        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  inputValue: {
    fontSize: 24,
    marginBottom: 20,
    color: '#000',
  },
  keypadContainer: {
    width: '100%',
    // backgroundColor: COLORS.white,
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    width: '31%',
    height: '19%',
    margin: 3,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 24,
    color: '#000',
  },
});