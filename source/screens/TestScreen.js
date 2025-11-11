import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Button,
    Image,
    Text,
    View,
    Alert,
    Platform,
    PermissionsAndroid,
    TouchableOpacity
} from "react-native";

import LinearGradient from 'react-native-linear-gradient';
// -------------------------------------------
// RawBT API
// -------------------------------------------
import RawbtApi,
{
    RawBTPrintJob,
    AttributesString,
    AttributesBarcode,
    AttributesQRcode,
    AttributesImage,
    CommandBarcode,
    FONT_C,
    FONT_A,
    FONT_B,
    FONT_TRUE_TYPE,
    ALIGNMENT_LEFT,
    ALIGNMENT_CENTER,
    ALIGNMENT_RIGHT,
    HRI_ABOVE,
    HRI_BELOW,
    HRI_BOTH,
    BARCODE_UPC_A,
    BARCODE_UPC_E,
    BARCODE_EAN13,
    BARCODE_JAN13,
    BARCODE_EAN8,
    BARCODE_JAN8,
    BARCODE_CODE39,
    BARCODE_ITF,
    BARCODE_CODABAR,
    BARCODE_CODE93,
    BARCODE_CODE128,
    BARCODE_GS1_128,
    BARCODE_GS1_DATABAR_OMNIDIRECTIONAL,
    BARCODE_GS1_DATABAR_TRUNCATED,
    BARCODE_GS1_DATABAR_LIMITED,
    BARCODE_GS1_DATABAR_EXPANDED,
} from 'react-native-rawbt-api';

import ViewShot, { captureRef } from 'react-native-view-shot';
import moment from 'moment-timezone'
import { formatNumber, getConfiguration } from '../utils/helpers'
import { COLORS, SIZES } from '../constants/theme';
import { useDispatch, useSelector } from 'react-redux';
import { SET_LOADING, STOP_LOADING } from '../redux/actions/types';
import { DocumentDirectoryPath, downloadFile, writeFile, readDir, stat, readFile, unlink } from 'react-native-fs';
import { BarcodeCreatorView, BarcodeFormat } from 'react-native-barcode-creator';
import { useOffline } from '../context/OfflineProvider';
import { fetchUserByEmail } from '../redux/actions/user.actions';
import QRCode from 'react-native-qrcode-svg';


// --------------------------------
// RawBT events listener
// --------------------------------


export default function TestScreen({ data, isPrint, onPrint }) {
    const { collector, user, selectedUser } = useSelector(({ user }) => user);
    const viewShotRef = useRef();
    const [total, setTotal] = useState(0)
    const [referenceNumber, setReferenceNumber] = useState(0)
    const [printCount, setPrintCount] = useState(0)
    const [rowValue, setRowValue] = useState([]);
    const dispatch = useDispatch();
    const [viewHeight, setViewHeight] = useState(0);
	const [processedTicket, setProcessedTicket] = useState(null);
	const [receiptTemplate, setReceiptTemplate] = useState('');


    let winStraight = getConfiguration(selectedUser, 'winStraight');
    let withWin200 = getConfiguration(selectedUser, 'withWin200');


	// console.log(data, "THE DATA HERE!")

	
    const showError = (error) => {
        Alert.alert('Print error', error, [
            {
                text: 'Cancel',
                style: 'cancel',
            },
        ]);
    }

    const generator = async () => {
        const totalAmount = data?.combinations?.reduce((acc, combination) => acc + combination.amount, 0);
        const referenceNum = await generateTicketNumber()

        setTotal(totalAmount)
        setReferenceNumber(referenceNum)
    }

    function generateTicketNumber() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    function groupAndPopulate(data) {
        const groupedCombinations = {};

        data.combinations.forEach(item => {
            const { combination, amount, rambleAmount, targetAmount, betType, } = item;

            if (!groupedCombinations[combination]) {
                groupedCombinations[combination] = { combination, straight: 0, ramble: 0 };
            }

            groupedCombinations[combination].straight += targetAmount;
            groupedCombinations[combination].ramble += rambleAmount;


            /* 	  if (betType == "T") {
                    groupedCombinations[combination].straight += amount;
                  } else if (betType == "R") {
                    groupedCombinations[combination].ramble += amount;
                  } else if (betType == 'T - R' || betType == 'R - T') {
                    groupedCombinations[combination].ramble += amount;
                    groupedCombinations[combination].straight += amount;
                  } */
        });

        return Object.values(groupedCombinations);
    }

    // const handlePrint = async () => {
    //     setPrintCount(prev => prev += 1)
    //     dispatch({ type: SET_LOADING })
    //     let printHeader = getConfiguration(selectedUser, 'printHeader')
    //     let item = realm.objectForPrimaryKey(Betting, BSON.ObjectId(data._id));
    //     const filePath = `${DocumentDirectoryPath}/bwlogo1.png`;
    //     let loadImage = Image.resolveAssetSource({ uri: `https://sharewin.pro/apiv2/assets/bwlogo1.png` }).uri;
    //     // setTimeout(() => {
    //     viewShotRef.current.capture().then(async (uri) => {
    //         let job = new RawBTPrintJob();
    //         let base64StringImage = await RawbtApi.getImageBase64String(loadImage);
    //         let base64String = await RawbtApi.getImageBase64String(uri);
    //         if (printHeader.isCheck && String(selectedUser?.receipt_template).toLowerCase() != 'samar') {
    //             job.image(base64StringImage, new AttributesImage(ALIGNMENT_CENTER, 16));
    //         }
    //         job.image(base64String);
    //         job.cut();

    //         RawbtApi.printJob(job.GSON())
    //             .then(() => {
    //                 realm.write(() => {
    //                     item.isPrint = true;
    //                 });
    //                 onPrint();
    //             })
    //             .catch((err) => {
    //                 showError(err.message)
    //             }
    //             );
    //         dispatch({ type: STOP_LOADING })

    //     })
    //         .catch(err => {
    //             dispatch({ type: STOP_LOADING })
    //             showError(err.message)
    //         })
    // }
	const fetchUser = async () => {
		let user = await dispatch(fetchUserByEmail(selectedUser?.email))

		// console.log(selectedUser.receipt_template, "USERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSERUSER")
		// console.log(user.receipt_template, "USER USER USER USER")
		setReceiptTemplate(user?.receipt_template)
	}

    const handlePrint = async () => {
        setPrintCount(prev => prev + 1);
        dispatch({ type: SET_LOADING });

        const tryCapture = async () => {


			// console.log(selectedUser.email, "THE SELECTED INE NGAW")
			
            try {
                let printHeader = getConfiguration(selectedUser, 'printHeader');
                const filePath = `${DocumentDirectoryPath}/bwlogo1.png`;
                const taclobanLogo= Image.resolveAssetSource({ uri: `https://sharewin.pro/apiv2/assets/bwlogo1.png` }).uri;
                const easternSamarLogo = Image.resolveAssetSource({ uri: `https://sharewin.pro/apiv2/assets/heritage_bw_logo.png` }).uri;
                const uri = await viewShotRef.current.capture();
                const base64StringImage = await RawbtApi.getImageBase64String(String(receiptTemplate).toLowerCase() == 'eastern samar' ? easternSamarLogo : taclobanLogo);
                const base64String = await RawbtApi.getImageBase64String(uri);

				const scale = String(receiptTemplate).toLowerCase() == 'eastern samar' ? 13 : 16;

                let job = new RawBTPrintJob();
                if (printHeader.isCheck && String(receiptTemplate).toLowerCase() != 'samar') {
                    job.image(base64StringImage, new AttributesImage(ALIGNMENT_CENTER, scale));
                }
                job.image(base64String);
                job.cut();

                await RawbtApi.printJob(job.GSON());



                onPrint();
            } catch (err) {
                showError(err.message);
            } finally {
                dispatch({ type: STOP_LOADING });
            }
        };

        // Wait until layout is ready
        if (viewHeight === 0) {
            const interval = setInterval(() => {
                if (viewHeight !== 0) {
                    clearInterval(interval);
                    tryCapture();
                }
            }, 100); // poll every 100ms
        } else {
            tryCapture();
        }
    };

    const samarPrint = async ({ data, gameTime, collectorDetails }) => {
        let bets = [];
        try {
            // if (isPrint) {
            // 	Alert.alert('Already Printed a Ticket.');
            // 	return
            // }
            setPrintCount(prev => prev += 1)
            dispatch({ type: SET_LOADING })
            // const item = realm.objectForPrimaryKey(Betting, BSON.ObjectId(data._id));
            let winStraight = getConfiguration(user, 'winStraight');
            let withWin200 = getConfiguration(user, 'withWin200');

            let job = new RawBTPrintJob();

            // Destructure the bets with type Ramble and Target
            const mapData = datamounta?.combinations.map((item) => {
                if (item?.rambleAmount && item?.targetAmount) {
                    let newObj1 = {
                        combination: item?.combination,
                        betType: item?.targetAmount ? "T" : "",
                        amount: item?.targetAmount
                    }

                    let newObj2 = {
                        combination: item?.combination,
                        betType: item?.rambleAmount ? "R" : "",
                        amount: item?.rambleAmount
                    }

                    bets.push(newObj1, newObj2);
                } else {

                    bets.push({
                        combination: item?.combination,
                        betType: item?.betType,
                        amount: item?.amount

                    })
                }

                // console.log(item, "ITEM")
                return
            })

            const attrBold = new AttributesString().setBold(true);
            const attrCenter = new AttributesString(ALIGNMENT_CENTER);
            const attrBig = new AttributesString(ALIGNMENT_CENTER, false, false, true);
            const attrSmall = new AttributesString(ALIGNMENT_CENTER, false, false, false);
            const attrSmallLeft = new AttributesString(ALIGNMENT_LEFT, false, false, false);

            let total = 0;
            let agentCode = "";
            agentCode = `${String(collectorDetails?.firstName).charAt(0).toUpperCase() + String(collectorDetails?.lastName).charAt(0).toUpperCase() + '-' + String(collectorDetails?.mobile).slice(-4)}`

            /* image */
            const filePath = `${DocumentDirectoryPath}/bwlogo1.png`;
            // let loadImage = Image.resolveAssetSource({uri: `file://${filePath}`}).uri;


            // let base64String = await RawbtApi.getImageBase64String(loadImage);
            // job.image(base64String, new AttributesImage(ALIGNMENT_CENTER, 8));
            /* header */

            // job.ln();
            // job.println("SALES INVOICE", new AttributesString(ALIGNMENT_CENTER, true));
            // job.ln();

            /* items */
            // items.forEach((item) => );
            job.println("FELECITY GAMES & AMUSEMENT CORP.", attrSmall);
            job.println("Eastern Samar, Ph", attrSmall);
            job.drawLine('-');

            job.leftRightText(`${"Transaction ID:"}`, `${data?.ticket_no}`)
            job.leftRightText(`${"Draw Date:"}`, `${moment(moment().toDate()).format('MM/DD/YYYY')}`)
            job.println(`Agent Code: ${agentCode}`, attrSmallLeft);
            job.println(`Agent Name: ${data?.collector}`, attrSmallLeft);
            job.println(`Printed: ${moment(moment().toDate()).format('MM/DD/YYYY h:mm:ss A')}`, attrSmallLeft);
            job.drawLine('-');

            job.println(`${"CODE" + "	" + "COMB." + "	" + "BET" + "	" + "WIN"}`, attrSmallLeft);
            bets.forEach((item) => job.println(`${`${String(gameTime).toUpperCase()}` + `${item?.betType == "R" ? "S3r" : "S3"}` + "	" + item?.combination + "	" + item?.amount + "	" + item?.amount * (item?.betType == "R" ? withWin200?.value : winStraight?.value)}`))
            job.drawLine('-');
            data?.combinations.map((combi) => {
                total += combi.amount

                return
            })
            job.println(`Total Amount: ${total}`, attrSmallLeft);
            job.drawLine('-');
            job.println("Thank you for supporting STL. Wi", attrCenter);
            job.println("nning tickets must be claim with", attrCenter);
            job.println("in within one (1) year after the", attrCenter);
            job.println("betting date, otherwise winning", attrCenter);
            job.println("prize shall be forfeited", attrCenter);
            job.println("stlwsmr.v1.02.05.24", attrCenter);

            job.ln(2);


            job.cut();

            RawbtApi.printJob(job.GSON())
                .then(() => {
                    console.log('NAG PRINT NAG SUCCESS!!!')
                    /*                realm.write(() => {
                                       item.isPrint = true;
                                       item.printCopy = (item.printCopy ?? 0) + 1;
                                   }); */

                    onPrint();
                })
                .catch((err) => {
                    showError(err.message)
                }
                );



            dispatch({ type: STOP_LOADING })
        } catch (err) {
            // images error
            showError(err.message);
        }
    }

    const result = groupAndPopulate(data);
    let totalAmount = 0;


	  function separateCombinations(ticket) {
    const separatedCombinations = ticket.combinations.flatMap((item) => {
      const hasRamble = item.betType.includes("R");
      const hasTarget = item.betType.includes("T");

      const results = [];

      if (hasRamble) {
        results.push({
          amount: item.rambleAmount ?? 0,
          betType: "R",
          combination: item.combination,
          is_win_to: item.is_win_to,
          rambleAmount: item.rambleAmount ?? 0,
          targetAmount: 0,
        });
      }

      if (hasTarget) {
        results.push({
          amount: item.targetAmount ?? 0,
          betType: "T",
          combination: item.combination,
          is_win_to: item.is_win_to,
          rambleAmount: 0,
          targetAmount: item.targetAmount ?? 0,
        });
      }

      return results;
    });

    return {
      ...ticket,
      combinations: separatedCombinations,
    };
  }


	
    useEffect(() => {
        setRowValue(result)
        generator()
    }, [])

    useEffect(() => {
        RawbtApi.init();
    }, [])

	  // 🔹 Process and set ticket on mount
  useEffect(() => {
    // setTicket(data);
	// console.log('CONSOLAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
	fetchUser()
    const separated = separateCombinations(data);
    setProcessedTicket(separated);
  }, []);

    // console.log(data.combinations.length, 'THE VIEW HEIGHT')

	// console.log(data, "THE DATA")

	// console.log(processedTicket, "THE processedTicket HERE!")


	const betTotal = processedTicket?.combinations.reduce((n, { amount }) => n + amount, 0);
	
const heritageRefNo = moment().toDate();
    const barcodeVal = `${"410-" + moment(heritageRefNo).format('YYMMDDHHMMSS')}`
    
    return (
        <>
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1, width: '100%' }}>
                    {

                        String(receiptTemplate).toLowerCase() == 'samar' ?
                            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.8 }} style={{ width: 300, flex: 1, position: 'absolute', alignItems: 'center', top: -8999, left: -9999 }}>
                                <View
                                    style={{
                                        flex: 1,
                                        width: '100%',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                    }}
                                >
                                    <View
                                        style={{
                                            flexDirection: 'column',
                                            paddingVertical: 10,
                                            marginVertical: 10,
                                            width: '100%',
                                            alignItems: 'center',
                                            borderBottomWidth: 2,
                                            borderStyle: 'dashed'
                                        }}
                                    >
                                        <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>FELECITY GAMES & AMUSEMENT CORP.</Text>
                                        <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>Eastern Samar, Ph</Text>
                                    </View>

                                    <View
                                        style={{
                                            width: '100%',
                                            flexDirection: 'column',
                                            marginVertical: 10,
                                            borderBottomWidth: 2,
                                            borderStyle: 'dashed',
                                            paddingBottom: 10,
                                        }}
                                    >
                                        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>Transaction ID:</Text>
                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>1231232</Text>
                                        </View>


                                        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>Draw Date:</Text>
                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>{moment().format('MM/DD/YYYY')}</Text>
                                        </View>
                                        <View style={{ width: '100%' }}>
                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, textAlign: 'left', fontWeight: 'normal' }}>Agent Code: RV-0036</Text>
                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, textAlign: 'left', fontWeight: 'normal' }}>Agent Name: Revs</Text>
                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, textAlign: 'left', fontWeight: 'normal' }}>Printed: {moment().format('MM/DD/YYYY hh:mm:ss A')}</Text>
                                        </View>
                                    </View>

                                    <View style={{ maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <View style={{ width: '25%' }}>
                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, textAlign: 'left', fontWeight: 'normal' }}>CODE</Text>
                                        </View>

                                        <View style={{ width: '25%', justifyContent: 'center' }}>
                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, textAlign: 'center', fontWeight: 'normal' }}>COMB.</Text>
                                        </View>

                                        <View style={{ width: '25%', justifyContent: 'right' }}>
                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, textAlign: 'center', fontWeight: 'normal' }}>BET</Text>
                                        </View>

                                        <View style={{ width: '25%' }}>
                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, textAlign: 'left', fontWeight: 'normal' }}>WIN</Text>
                                        </View>
                                    </View>

                                    <View
                                        style={{
                                            paddingBottom: 20,
                                            borderBottomWidth: 2,
                                            borderStyle: 'dashed'
                                        }}
                                    >

                                        {
                                            data?.combinations.map((val, index) => {

                                                totalAmount += val.amount;

                                                return (
                                                    <View
                                                        key={index}
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%',
                                                        }}
                                                    >


                                                        {
                                                            val.betType == 'R - T' ?
                                                                <View style={{ flexDirection: 'column', width: '100%' }}>
                                                                    <View style={{ flexDirection: 'row', width: '100%' }}>
                                                                        <View style={{ width: '25%' }}>
                                                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal', textAlign: 'left' }}>
                                                                                {String(data.game_time).toUpperCase() + String('S3')}
                                                                                {/* {String(testData?.gameTime).toUpperCase() + " " + String(data.betType).toLowerCase() == 'r' ? 'S3r' : 'S3'} */}
                                                                            </Text>
                                                                        </View>
                                                                        <View style={{ width: '25%' }}>
                                                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal', textAlign: 'right' }}>
                                                                                {val?.combination}
                                                                            </Text>
                                                                        </View>

                                                                        <View style={{ width: '20%' }}>
                                                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal', textAlign: 'right' }}>
                                                                                {val?.targetAmount}
                                                                            </Text>
                                                                        </View>
                                                                        <View style={{ width: '30%' }}>
                                                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal', textAlign: 'center' }}>
                                                                                {val?.amount * winStraight?.value}
                                                                            </Text>
                                                                        </View>
                                                                    </View>

                                                                    <View style={{ flexDirection: 'row', width: '100%' }}>
                                                                        <View style={{ width: '25%' }}>
                                                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal', textAlign: 'left' }}>
                                                                                {String(data.game_time).toUpperCase() + String('S3r')}
                                                                                {/* {String(testData?.gameTime).toUpperCase() + " " + String(data.betType).toLowerCase() == 'r' ? 'S3r' : 'S3'} */}
                                                                            </Text>
                                                                        </View>
                                                                        <View style={{ width: '25%' }}>
                                                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal', textAlign: 'right' }}>
                                                                                {val?.combination}
                                                                            </Text>
                                                                        </View>

                                                                        <View style={{ width: '20%' }}>
                                                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal', textAlign: 'right' }}>
                                                                                {val?.rambleAmount}
                                                                            </Text>
                                                                        </View>
                                                                        <View style={{ width: '30%' }}>
                                                                            <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal', textAlign: 'center' }}>
                                                                                {val?.amount * withWin200?.value}
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                </View>


                                                                :

                                                                <>
                                                                    <View style={{ width: '25%' }}>
                                                                        <Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 18, fontWeight: 'normal' }}>
                                                                            {String(data.game_time).toUpperCase() + String(val.betType == 'R' ? 'S3r' : 'S3')}
                                                                            {/* {String(testData?.gameTime).toUpperCase() + " " + String(data.betType).toLowerCase() == 'r' ? 'S3r' : 'S3'} */}
                                                                        </Text>
                                                                    </View>
                                                                    <View style={{ width: '25%' }}>
                                                                        <Text style={{ ...styles.fontStyles2, fontSize: 18, textAlign: 'right', fontWeight: 'normal' }}>
                                                                            {val?.combination}
                                                                        </Text>
                                                                    </View>
                                                                    <View style={{ width: '20%' }}>
                                                                        <Text style={{ ...styles.fontStyles2, fontSize: 18, textAlign: 'right', fontWeight: 'normal' }}>
                                                                            {val?.amount}
                                                                        </Text>
                                                                    </View>
                                                                    <View style={{ width: '30%' }}>
                                                                        <Text style={{ ...styles.fontStyles2, textAlign: 'center', fontSize: 18, fontWeight: 'normal' }}>
                                                                            {val?.amount * (val?.betType == 'R' ? withWin200?.value : winStraight?.value)}
                                                                        </Text>
                                                                    </View>
                                                                </>
                                                        }
                                                    </View>

                                                )
                                            })

                                        }
                                    </View>
                                    <View style={{ width: '100%', paddingVertical: 10, marginBottom: 10, borderBottomWidth: 2, borderStyle: 'dashed' }}>
                                        <Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 18, fontWeight: 'normal' }}>
                                            Total Amount: {totalAmount}
                                        </Text>
                                    </View>
                                    <View style={{ width: '100%', alignItems: 'center' }}>
                                        <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>
                                            Thank you for supporting STL. Wi
                                        </Text>
                                        <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>
                                            nning tickets must be claim with
                                        </Text>
                                        <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>
                                            in within one (1) year after the
                                        </Text>
                                        <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>
                                            betting date, otherwise winning
                                        </Text>
                                        <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>
                                            prize shall be forfeited
                                        </Text>
                                        <Text style={{ ...styles.fontStyles2, fontSize: 18, fontWeight: 'normal' }}>
                                            stlwsmr.v1.02.05.24
                                        </Text>
                                    </View>
                                </View>

                            </ViewShot>
                            :
String(receiptTemplate).toLowerCase() == 'tacloban' ?
                            <ViewShot
                                ref={viewShotRef}
                                options={{ format: 'webm', quality: 0.8, width: 600, height: viewHeight + (30 * data.combinations.length) }}
                                style={{
                                    position: 'absolute',
                                    top: -9999,
                                    left: -9999,
                                    alignItems: 'center',
                                }}
                            >
                                {/* <WebView
								// ref={webViewRef}
								originWhitelist={['*']}
								clearCache={true}
								source={{ html: htmlContent }}
								style={{ minHeight: 350 + (50 * data.combinations.length), width: 600}}
							/> */}
                                {/* <Barcode value={'123123'} format="PDF417" width={250} height={100} /> */}

                                <View
                                    onLayout={(e) => {
                                        const { height } = e.nativeEvent.layout;
                                        setViewHeight(height);
                                        //   setReadyToCapture(true); // layout is ready
                                    }}
                                    style={{ width: '100%', alignItems: 'center', height: data?.combinations.length > 2 ? 750 : 550 }}
                                >
                                    {/* </View> */}
                                    {/* <View style={{ height: 500, width: '100%', flexDirection: 'column', alignItems: 'center' }}> */}
                                    {/* <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center'}}>
																			<Image
																				source={{ uri: 'https://sharewin.pro/apiv2/assets/bwlogo1.png' }}
																				resizeMethod='contain'
																				style={{ height: 170, width: '100%' }}
																				
																			/>
																		</View> */}
                                    <Text style={{ ...styles.fontStyles1, fontSize: 32 }}>
                                        OFFICIAL RECEIPT
                                    </Text>
                                    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 6 }}>
                                        <Text style={{ ...styles.fontStyles1, fontSize: 27, fontWeight: 'bold' }}>
                                            TICKET #:
                                        </Text>

                                        <Text style={{ ...styles.fontStyles1, fontSize: 27, fontWeight: 'bold' }}>
                                            {data.ticket_no}
                                        </Text>

                                    </View>

                                    <Text style={{ ...styles.fontStyles1, fontSize: 22, fontWeight: 'bold' }}>
                                        {moment().format('MMM DD, YYYY hh:mmA')}
                                    </Text>


                                    <Text style={{ ...styles.fontStyles1, marginTop: 10, fontSize: 22, fontWeight: 'bold' }}>
                                        Agent:{String(data.collector).toUpperCase()}
                                    </Text>

                                    <View style={{ marginTop: 10, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                                        <Text style={{ ...styles.fontStyles1, fontSize: 22, fontWeight: 'bold' }}>
                                            Total: {total}
                                        </Text>

                                        <Text style={{ ...styles.fontStyles1, fontSize: 22, fontWeight: 'bold' }}>
                                            Game: 3D - {String(data.game_time).toUpperCase()}
                                        </Text>

                                    </View>


                                    <View style={{ marginTop: 20, flexDirection: 'row', borderWidth: 1, borderColor: COLORS.black, width: '100%' }}>
                                        <View style={{ width: '25%', borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: '600', padding: 2 }}>
                                                COMBI
                                            </Text>
                                        </View>

                                        <View style={{ width: '25%', borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: '600', padding: 2 }}>
                                                S
                                            </Text>
                                        </View>

                                        <View style={{ width: '25%', borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: '600', padding: 2 }}>
                                                R
                                            </Text>
                                        </View>

                                        <View style={{ width: '25%', borderRightWidth: .5, alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: '600', padding: 2 }}>
                                                STAT
                                            </Text>
                                        </View>

                                    </View>

                                    {result?.map((resItem, index) => (
                                        <View key={index} style={{ flexDirection: 'row', borderWidth: 1, borderColor: COLORS.black, width: '100%' }}>
                                            <View style={{ width: '25%', borderRightWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                                                <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: '600' }}>
                                                    {resItem.combination.slice(0, 1)}-{resItem.combination.slice(1, 2)}-{resItem.combination.slice(2)}
                                                </Text>
                                            </View>


                                            <View style={{ width: '25%', borderRightWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                                                <Text style={{ ...styles.fontStyles1, fontSize: 18, fontWeight: '600' }}>


                                                    {resItem.straight != 0 ? resItem.straight : '-'}
                                                </Text>
                                            </View>

                                            <View style={{ width: '25%', borderRightWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                                                <Text style={{ ...styles.fontStyles1, fontSize: 18, fontWeight: '600' }}>
                                                    {resItem.ramble != 0 ? resItem.ramble : '-'}
                                                </Text>
                                            </View>

                                            <View style={{ width: '25%', borderRightWidth: .5, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                                                <Text style={{ ...styles.fontStyles1, fontSize: 18, fontWeight: '600' }}>
                                                    OK
                                                </Text>
                                            </View>


                                        </View>
                                    ))}

                                    {/* <PDF417BarcodeGenerator data={data.ticket_no}/> */}
                                    <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                        <BarcodeCreatorView value={`${data.ticket_no}`} format={BarcodeFormat.PDF417} width={350} height={120} foregroundColor={'#000000'} style={{ marginVertical: 10 }} />
                                        <Text style={{ ...styles.fontStyles1, fontSize: 30 }}>
                                            REF #: {data.ticket_no}
                                        </Text>
                                    </View>
                                </View>
                            </ViewShot>
                            :
                            <ViewShot
                                ref={viewShotRef}
                                options={{ format: 'webm', quality: 0.8, width: 600, height: viewHeight + (30 * processedTicket?.combinations.length) }}
                                style={{
                                    position: 'absolute',
                                    top: -9999,
                                    left: -9999,
                                    alignItems: 'center',
                                }}
                            >
                                <View
                                    onLayout={(e) => {
                                        const { height } = e.nativeEvent.layout;
                                        setViewHeight(height);
                                        //   setReadyToCapture(true); // layout is ready
                                    }}
                                    style={{ width: '100%', alignItems: 'center', 
                                        height: processedTicket?.combinations.length > 2 ? 750 : 550,
										width: 350
                                     }}
                                >
                                    {/* <Text style={{ ...styles.fontStyles1, fontSize: 16, textAlign: 'center', fontWeight: 'normal', }}>
                                        HERITAGE LOTTERY INC
                                    </Text> */}
									<View style={{ alignSelf: 'center', width: '100%'}}>
                                    <Text style={{ ...styles.fontStyles2, textAlign: 'center', fontSize: 24, fontWeight: '200'}}>
                                        HERITAGE LOTTERY INC
                                    </Text>
									</View>

									
									<View style={{ width: '100%', flexDirection: 'column', }}>
										<View style={{ width: '100%', flexDirection: 'row' }}>
											<View style={{ width: '25%', justifyContent: 'flex-end',}}>
												<Text style={{ ...styles.fontStyles2, textAlign: 'right', fontSize: 24, fontWeight: '200' }}>
													Ref No.
												</Text>
											</View>
											<View style={{ width: '75%', justifyContent: 'flex-start',}}>
												<Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 24, fontWeight: '200', paddingLeft: 4 }}>
													{'410-' + moment(heritageRefNo).format('YYMMDDHHMMSS')}
												</Text>
											</View>
											{/* <View style={{ width: '30%', justifyContent: 'flex-end'}}>
												<Text style={{ ...styles.fontStyles2, fontSize: 11, fontWeight: '200' }}>
													Draw
												</Text>
											</View>
											<View style={{ width: '70%', justifyContent: 'flex-start',}}>
												<Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 11, fontWeight: '200' }}>
													{moment().format('MMM DD, YYYY ha')}
												</Text>
											</View>
											<View style={{ width: '30%', justifyContent: 'flex-end'}}>
												<Text style={{ ...styles.fontStyles2, fontSize: 11, fontWeight: '200' }}>
													Agent
												</Text>
											</View>
											<View style={{ width: '70%', justifyContent: 'flex-start',}}>
												<Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 11, fontWeight: '200' }}>
													{String(data.collector).toUpperCase()}
												</Text>
											</View>
											<View style={{ width: '30%', justifyContent: 'flex-end'}}>
												<Text style={{ ...styles.fontStyles2, fontSize: 11, fontWeight: '200' }}>
													Agent#
												</Text>
											</View>
											<View style={{ width: '70%', justifyContent: 'flex-start',}}>
												<Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 11, fontWeight: '200' }}>
													10 WS OUTLETCAT0008
												</Text>
											</View> */}
										</View>
										<View style={{ width: '100%', flexDirection: 'row' }}>
											<View style={{ width: '25%', justifyContent: 'flex-end',}}>
												<Text style={{ ...styles.fontStyles2, textAlign: 'right', fontSize: 24, fontWeight: '200' }}>
													Draw
												</Text>
											</View>
											<View style={{ width: '75%', justifyContent: 'flex-start',}}>
												<Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 24, fontWeight: '200', paddingLeft: 4 }}>
													{moment().format('MMM DD, YYYY ha')}
												</Text>
											</View>
										</View>
										<View style={{ width: '100%', flexDirection: 'row' }}>
											<View style={{ width: '25%', justifyContent: 'flex-end',}}>
												<Text style={{ ...styles.fontStyles2, textAlign: 'right', fontSize: 24, fontWeight: '200' }}>
													Agent
												</Text>
											</View>
											<View style={{ width: '75%', justifyContent: 'flex-start',}}>
												<Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 24, fontWeight: '200', paddingLeft: 4 }}>
													{String(selectedUser?.first_name).toUpperCase()}
												</Text>
											</View>
										</View>
										<View style={{ width: '100%', flexDirection: 'row' }}>
											<View style={{ width: '25%', justifyContent: 'flex-end',}}>
												<Text style={{ ...styles.fontStyles2, textAlign: 'right', fontSize: 24, fontWeight: '200' }}>
													Agent#
												</Text>
											</View>
											<View style={{ width: '75%', justifyContent: 'flex-start',}}>
												<Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 24, fontWeight: '200', paddingLeft: 4 }}>
													{String(selectedUser?.last_name).toUpperCase()}
												</Text>
											</View>
										</View>

									</View>






                                    
                                    {/* <View style={{ width: '100%', flexDirection: 'row', }}>
                                    <Text style={{ ...styles.fontStyles2, fontSize: 12, fontWeight: '300' }}>
                                            Ref No.
                                        </Text>

                                    <Text style={{ ...styles.fontStyles2, fontSize: 12, fontWeight: '300' }}>
                                            {' 410-' + moment(heritageRefNo).format('YYMMDDHHMMSS')}
                                        </Text>

                                    </View> */}

                                    {/* <Text style={{ ...styles.fontStyles2, fontSize: 12, fontWeight: '300' }}>
                                        Draw {moment().format('MMM DD, YYYY ha')}
                                    </Text>


                                    <Text style={{ ...styles.fontStyles2, fontSize: 12, fontWeight: '300' }}>
                                        Agent {String(data.collector).toUpperCase()}
                                    </Text>

                                    <Text style={{ ...styles.fontStyles2, fontSize: 12, fontWeight: '300' }}>
                                        Agent# 10 WS OUTLET CAT0008
                                    </Text> */}

								<View style={{ marginTop: 10, flexDirection: 'column', borderBottomWidth: .2,  borderTopWidth: .2, borderColor: COLORS.black, width: '100%', paddingHorizontal: 8  }}>


                                <View style={{  flexDirection: 'row',}}>
                                    <View style={{ width: '25%',  justifyContent: 'center', }}>
                                    <Text style={{ ...styles.fontStyles2, fontSize: 24, fontWeight: '200', textAlign: 'left' }}>
                                            #Game
                                        </Text>
                                    </View>

                                    {/* <View style={{ width: '25%', borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: '600', padding: 2 }}>
                                            S
                                        </Text>
                                    </View> */}

                                    <View style={{ width: '25%',  justifyContent: 'center', }}>
                                    <Text style={{ ...styles.fontStyles2, fontSize: 24, fontWeight: '200' }}>
                                            Nos
                                        </Text>
                                    </View>

                                    <View style={{ width: '27%', justifyContent: 'center', }}>
                                    <Text style={{ ...styles.fontStyles2, textAlign: 'right', fontSize: 24, fontWeight: '200' }}>
                                            Amount
                                        </Text>
                                    </View>
									<View style={{ width: '22%', justifyContent: 'center', }}>
                                    <Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 24, fontWeight: '200' }}>
                                            Type
                                        </Text>
                                    </View>

                                </View>

								{
									processedTicket?.combinations.map((item, index) => {
										let game_number = index + 1;


										return (
											<View key={index} style={{ flexDirection: 'column', width: '100%' }}>
												<View style={{ flexDirection: 'row'}}>
													<View style={{ width: '25%',  justifyContent: 'center', }}>
														<Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 21, fontWeight: '200' }}>
															{game_number + '3D'}
														</Text>
													</View>
													<View style={{ width: '25%',  justifyContent: 'center', }}>
														<Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 25, fontWeight: '200' }}>
															{item?.combination}
														</Text>
													</View>
													<View style={{ width: '27%', justifyContent: 'center', }}>
														<Text style={{ ...styles.fontStyles2, textAlign: 'right', fontSize: 25, fontWeight: '200' }}>
															{item?.amount}
														</Text>
													</View>
													<View style={{ width: '22%', justifyContent: 'center', }}>
														<Text style={{ ...styles.fontStyles2, textAlign: 'left', fontSize: 25, fontWeight: '200' }}>
															{item?.betType}
														</Text>
													</View>
												</View>
											</View>
										)
									})
								}
								</View>
								<View style={{ width: '100%', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column'}}>
									<Text style={{ ...styles.fontStyles2, textAlign: 'center', fontSize: 24, fontWeight: '200' }}>
										Total: P {formatNumber(betTotal)}
									</Text>
									<Text style={{ ...styles.fontStyles2, textAlign: 'center', fontSize: 24, fontWeight: '200' }}>
										Printed: {moment(heritageRefNo).format('MMM DD, YYYY HH:MM:SS')}
									</Text>
									<Text style={{ ...styles.fontStyles2, textAlign: 'center', paddingLeft: 20, fontSize: 24, fontWeight: '200' }}>
										WARAY TICKET, WARAY DAOG
									</Text>
									<View style={{ width: '100%', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start'}}>
										<View 
										// style={{ width: '40%', alignItems: 'center', justifyContent: 'center', padding: 20}}
										style={{
    width: 120,
    height: 170,
	paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
	marginRight: 6
  }}
										>
										 {/* <BarcodeCreatorView
												value={barcodeVal}
												format={BarcodeFormat.QR}
												foregroundColor="#000000"
												background="#FFFFFF"
												// style={{ width: 150, height: 200}}
												style={{
      width: 250,
      height: 250,
      resizeMode: 'contain', // ensures scaling without distortion
    }}
											  /> */}
											        <QRCode
        value={barcodeVal}
        size={120}          // ✅ sets both width & height equally
        backgroundColor="white"
        color="black"
        logoBackgroundColor="transparent"
      />
										</View>
										<View style={{ width: '60%', flexDirection: 'column', marginTop: 10, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
											<Text style={{ ...styles.fontStyles2, fontSize: 24, fontWeight: '200' }}>
												Alayon pag tago han
												</Text>
											<Text style={{ ...styles.fontStyles2, fontSize: 24, fontWeight: '200' }}>
												iyo mga tickets para
											</Text>
											<Text style={{ ...styles.fontStyles2, fontSize: 24, fontWeight: '200' }}>
												pag claim Han iyo daog.
											</Text>
										</View>

									</View>
								</View>
                                </View>


										
								
                            </ViewShot>
                    }
                    <View style={{ position: 'absolute', bottom: 0, flexDirection: 'row' }}>
                        <TouchableOpacity
                            //  onPress={() =>
                            // //  {
                            // // 	// console.log(data?.isPrint, "data?.isPrintdata?.isPrintdata?.isPrintdata?.isPrint")
                            // // 	String(selectedUser?.receipt_template).toLowerCase() == 'samar' ?
                            // // 	samarPrint({
                            // // 		data: data,
                            // // 		gameTime: data?.gameTime,
                            // // 		collectorDetails: {
                            // // 			firstName: selectedUser?.firstName,
                            // // 			lastName: selectedUser?.lastName,
                            // // 			mobile: selectedUser?.mobile
                            // // 		}
                            // // 	}) : handlePrint()
                            // // }}
                            onPress={handlePrint}
                            style={{ elevation: 10, shadowRadius: SIZES.radius, borderRadius: SIZES.radius, width: '100%' }}>
                            <LinearGradient colors={['#6599c3', '#3573a2', '#165894']} style={styles.linearGradient}>
                                <Text style={styles.buttonText}>
                                    {data?.print_copy > 1 ? 'REPRINT' : 'PRINT'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: "#fff",
    },
    mainpart: {
        padding: 16,
    },
    linearGradient: {
        // flex: 1,
        height: 40,
        paddingLeft: 15,
        paddingRight: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 26,
        width: '100%'
    },
    buttonText: {
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
    imgMain: {
        flex: 1,
        width: 300,
        height: 300,
        left: "50%",
        marginLeft: -150,
        resizeMode: "contain",
    },
    p: {
        fontSize: 14,
        marginBottom: 8,
        marginTop: 8,
    },
    large: {
        marginTop: 32,
        marginBottom: 8,
        fontSize: 22,
    },
    fontStyles1: {
        fontFamily: 'RobotoMono',
        fontWeight: 'bold',
        color: COLORS.black,
        textAlign: 'center',
    },
    fontStyles2: {
        fontWeight: 'bold',
        color: COLORS.black,
        // textAlign: 'center',
    },
});