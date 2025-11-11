import { StyleSheet, Text, View, Image } from 'react-native'
import React from 'react'
import moment from 'moment-timezone'
import { generateTimestamp, getConfiguration } from '../utils/helpers'
import { COLORS, SIZES } from '../constants/theme';
import { BarcodeCreatorView, BarcodeFormat } from 'react-native-barcode-creator';
// import { Image } from 'react-native-svg';



    const heritageRefNo = moment().toDate();
    const barcodeVal = `${ "410-" + moment(heritageRefNo).format('YYMMDDHHMMSS')}`

const ViewShot = ({ route }) => {
    const {data} = route.params;
    
    let total = data.combinations[0].amount


    console.log(JSON.stringify(data), "DADAD")
    
  return (
    <View
                                        // onLayout={(e) => {
                                        //     const { height } = e.nativeEvent.layout;
                                        //     // setViewHeight(height);
                                        //     //   setReadyToCapture(true); // layout is ready
                                        // }}
                                        style={{ width: '100%',  padding: 10, backgroundColor: COLORS.white }}
                                    >
                                        {/* </View> */}
                                        {/* <View style={{ height: 500, width: '100%', flexDirection: 'column', alignItems: 'center' }}> */}
                                        <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center'}}>
                                                                                <Image
                                                                                source={{ uri: 'https://sharewin.pro/apiv2/assets/heritage_bw_logo.png' }}
      style={{ width: '90%', height: 120 }}
                                                                                    // source={{ uri: 'https://sharewin.pro/apiv2/assets/heritage_bw_logo.png' }}
                                                                                    // resizeMethod='contain'
                                                                                    // style={{ height: 170, width: '100%' }}
                                                                                    
                                                                                />
                                                                            </View>
                                        <Text style={{ ...styles.fontStyles1, fontSize: 29, textAlign: 'center', fontWeight: 'normal', lineHeight: 40 }}>
                                            HERITAGE LOTTERY INC
                                        </Text>
                                        <View style={{ width: '100%', flexDirection: 'row', }}>
                                            <Text style={{ ...styles.fontStyles1, fontSize: 29, lineHeight: 30, fontWeight: 'normal', textAlign: 'left' }}>
                                                Ref No.
                                            </Text>
    
                                            <Text style={{ ...styles.fontStyles1, fontSize: 29, fontWeight: 'normal', lineHeight: 30, textAlign: 'left' }}>
                                                {' 410-' + moment(heritageRefNo).format('YYMMDDHHMMSS')}
                                            </Text>
    
                                        </View>
    
                                        <Text style={{ ...styles.fontStyles1, fontSize: 29, paddingLeft: 30, lineHeight: 30, fontWeight: 'normal', textAlign: 'left' }}>
                                            Draw {moment().format('MMM DD, YYYY ha')}
                                        </Text>
    
    
                                        <Text style={{ ...styles.fontStyles1, paddingLeft: 25, lineHeight: 30, fontSize: 29, fontWeight: 'normal', textAlign: 'left' }}>
                                            Agent {String(data.collector).toUpperCase()}
                                        </Text>
    
                                         <Text style={{ ...styles.fontStyles1, lineHeight: 30, fontSize: 29, paddingLeft: 20, fontWeight: 'normal', textAlign: 'left' }}>
                                            Agent# 10 WS OUTLET CAT0008
                                        </Text>
    
                                        {/* <View style={{ marginTop: 10, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                                            <Text style={{ ...styles.fontStyles1, fontSize: 22, fontWeight: 'bold' }}>
                                                Total: {total}
                                            </Text>
    
                                            <Text style={{ ...styles.fontStyles1, fontSize: 22, fontWeight: 'bold' }}>
                                                Game: 3D - {String(data.game_time).toUpperCase()}
                                            </Text>
    
                                        </View> */}
    
    
                                        <View style={{ marginTop: 20, flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.black, width: '100%' }}>
                                            <View style={{ width: '33%', alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: '600', padding: 2 }}>
                                                    #Game
                                                </Text>
                                            </View>
    
                                            {/* <View style={{ width: '25%', borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: '600', padding: 2 }}>
                                                    S
                                                </Text>
                                            </View> */}
    
                                            <View style={{ width: '33%', alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: '600', padding: 2 }}>
                                                    Nos
                                                </Text>
                                            </View>
    
                                            <View style={{ width: '33%', alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: '600', padding: 2 }}>
                                                    Amount Type
                                                </Text>
                                            </View>
    
                                        </View>
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.black, width: '100%' }}>
                                                <View style={{ width: '33%', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                                                    {/* <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: '600' }}>
                                                        {resItem.combination.slice(0, 1)}-{resItem.combination.slice(1, 2)}-{resItem.combination.slice(2)}
                                                    </Text>
                                                     */}
                                                     <Text style={{ ...styles.fontStyles1, fontSize: 14, fontWeight: '600' }}>
                                                        T3D
                                                    </Text>
                                                     
                                                </View>
    
    
                                                <View style={{ width: '33%', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                                                    <Text style={{ ...styles.fontStyles1, fontSize: 20, fontWeight: '600' }}>
    
                                                        {/* {resItem.combination} */}
                                                        {data.combinations[0].combination}
                                                        {/* {resItem.straight != 0 ? resItem.straight : '-'} */}
                                                    </Text>
                                                </View>
    
                                                <View style={{ width: '33%', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                                                    <Text style={{ ...styles.fontStyles1, fontSize: 20, fontWeight: '600' }}>
                                                        {/* {resItem.ramble != 0 ? resItem.ramble : '-'} */}
                                                        {data.combinations[0].targetAmount + 'T'}
                                                    </Text>
                                                </View>
    
                                                {/* <View style={{ width: '25%', borderRightWidth: .5, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                                                    <Text style={{ ...styles.fontStyles1, fontSize: 18, fontWeight: '600' }}>
                                                        OK
                                                    </Text>
                                                </View> */}
    
    
                                            </View>
                                        
    
                                        {/* <PDF417BarcodeGenerator data={data.ticket_no}/> */}
                                        {/* <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                            <BarcodeCreatorView value={`${data.ticket_no}`} format={BarcodeFormat.PDF417} width={350} height={120} foregroundColor={'#000000'} style={{ marginVertical: 10 }} />
                                            <Text style={{ ...styles.fontStyles1, fontSize: 30 }}>
                                                REF #: {data.ticket_no}
                                            </Text>
                                        </View> */}
                                        <View style={{ flexDirection: 'column', width: '100%', alignItems: 'flex-start', justifyContent: 'flex-start' }}> 
                                            <Text style={{...styles.fontStyles1, fontSize: 24, fontWeight: 'normal', textAlign: 'left' }}>
                                                Total: P{total}
                                            </Text>
                                            <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: 'normal', textAlign: 'left' }}>
                                                Printed: {moment(heritageRefNo).format('MMM DD, YYYY HH:MM:SS')} 
                                            </Text>
                                            <Text style={{ ...styles.fontStyles1, fontSize: 24, paddingLeft: 40, fontWeight: 'normal', textAlign: 'left' }}>
                                                WARAY TICKET, WARAY DAOG
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start'}}>
                                             {/* <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}> */}
      <BarcodeCreatorView
        value={barcodeVal}
        format={BarcodeFormat.QR}
        foregroundColor="#000000"
        background="#FFFFFF"
        style={{ width: 200, height: 200 }}
      />
    {/* </View> */}
                                            <View style={{ alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column'}}>
                                                <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: 'normal', textAlign: 'left' }}>
                                                    Alayon pagtago han
                                                </Text>
                                                                                                <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: 'normal', textAlign: 'left' }}>

                                                    iyo mga tickets para
                                                </Text>
                                                                                                <Text style={{ ...styles.fontStyles1, fontSize: 24, fontWeight: 'normal', textAlign: 'left' }}>

                                                pag claim Han iyo daog
                                                                                                </Text>
                                            </View>
                                        </View>
                                    </View>
  )
}

export default ViewShot

const styles = StyleSheet.create({})