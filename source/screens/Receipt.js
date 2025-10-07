import { Image, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { COLORS } from '../constants'
import moment from 'moment-timezone'
import { getConfiguration } from '../utils/helpers'
// import { Users } from '../Models'
import { useSelector } from 'react-redux'

// import { realmContext } from '../RealmContext'
import { BarcodeCreatorView, BarcodeFormat } from 'react-native-barcode-creator'

// const { useRealm, useQuery } = realmContext;


const testData = 
    { "_id": "67c01061d32b68bbfa46786f", "collector": "Revs", "combinations": [{ "_id": "67c01061d32b68bbfa467870", "amount": 30, "betType": "R - T", "combination": "854", "isWinTo": false, "rambleAmount": 20, "targetAmount": 10, "winning": null }, { "_id": "67c01061d32b68bbfa467871", "amount": 5, "betType": "R", "combination": "854", "isWinTo": false, "rambleAmount": 5, "targetAmount": 0, "winning": null }], "commissions": [{ "amount": 14, "rate": 40, "referral": "6635633231db62dd9871fb18", "userLevel": "0" }], "contact": "639359490036", "draw": null, "fileUrl": null, "gameTime": "5pm", "gross": 35, "hits": [], "inputType": "normal", "isComplete": false, "isDeleted": false, "isPrint": true, "isValidated": null, "isWinTo": false, "net": 21, "note": null, "owner_id": "6635633231db62dd9871fb18", "printCopy": null, "ramble": 25, "straight": 10, "ticketNo": "3611446", "timestamp": "2025-02-27T07:12:17.310Z", "uplines": ["6635633231db62dd9871fb18"], "user": null, "winning": 0 }


const Receipt = () => {
    const { user } = useSelector(({user}) => user);
    const [users, setUsers] = useState([]);
    
        // const users = useQuery(Users, doc => {
        //     return doc.filtered(
        //       'email == $0',
        //       user?.email
        //     );
        //   }, [user])

    

    let totalAmount = 0;
    


    
    
//   return (
//     <View 
//         style={{ 
//             flex: 1,  
//             width: '100%', 
//             flexDirection: 'column', 
//             alignItems: 'center', 
//             justifyContent: 'flex-start',
//         }}
//     >
//         <View 
//             style={{ 
//                 flexDirection: 'column', 
//                 paddingVertical: 10, 
//                 marginVertical: 10, 
//                 width: '100%', 
//                 alignItems: 'center', 
//                 borderBottomWidth: 2, 
//                 borderStyle: 'dashed'
//             }}
//         >
//           <Text style={styles.fontStyles}>FELECITY GAMES & AMUSEMENT CORP.</Text>
//           <Text style={styles.fontStyles}>Eastern Samar, Ph</Text>
//         </View>

//         <View 
//             style={{ 
//                 width: '100%', 
//                 flexDirection: 'column', 
//                 marginVertical: 10, 
//                 borderBottomWidth: 2, 
//                 borderStyle: 'dashed',
//                 paddingBottom: 20, 
//             }}
//         >
//             <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between'}}>
//                 <Text style={styles.fontStyles}>Transaction ID:</Text>
//                 <Text style={styles.fontStyles}>1231232</Text>
//             </View>

//             <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between'}}>
//                 <Text style={styles.fontStyles}>Draw Date:</Text>
//                 <Text style={styles.fontStyles}>{moment().format('MM/DD/YYYY')}</Text>
//             </View>
//             <Text style={styles.fontStyles}>Agent Code: RV-0036</Text>
//             <Text style={styles.fontStyles}>Agent Name: Revs</Text>
//             <Text style={styles.fontStyles}>Printed: {moment().format('MM/DD/YYYY hh:mm:ss A')}</Text>
//         </View>

//         <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
//             <View style={{ width: '25%'}}>
//                 <Text style={{...styles.fontStyles, textAlign: 'left'}}>CODE</Text>
//             </View>

//             <View style={{ width: '25%', alignItems: 'center', justifyContent: 'center'}}>
//                 <Text style={styles.fontStyles}>COMB</Text>
//             </View>

//             <View style={{ width: '25%', alignItems: 'center', justifyContent: 'center'}}>
//                 <Text style={styles.fontStyles}>BET</Text>
//             </View>

//             <View style={{ width: '25%' }}>
//                 <Text style={{...styles.fontStyles, textAlign: 'right'}}>WIN</Text>
//             </View>
//         </View>

//             <View
//                 style={{
//                     paddingBottom: 20,
//                     borderBottomWidth: 2,
//                     borderStyle: 'dashed'
//                 }}
//             >

//         {
//             testData?.combinations.map((data, index) => {

//                 totalAmount += data.amount;

//                 return (
//                     <View
//                         key={index}
//                         style={{ 
//                             flexDirection: 'row', 
//                             alignItems: 'center', 
//                             justifyContent: 'center', 
//                             width: '100%',
//                         }}
//                     >
//                         <View style={{ width: '25%' }}>
//                             <Text style={{...styles.fontStyles, textAlign: 'left'}}>
//                                 {String(testData.gameTime).toUpperCase() +  String(data.betType == 'R' ? 'S3r' : 'S3')}
//                                 {/* {String(testData?.gameTime).toUpperCase() + " " + String(data.betType).toLowerCase() == 'r' ? 'S3r' : 'S3'} */}
//                             </Text>
//                         </View>
//                         <View style={{ width: '25%', alignItems: 'center', justifyContent: 'center'}}>
//                             <Text style={styles.fontStyles}>
//                                 {data?.combination}
//                             </Text>
//                         </View>
//                         <View style={{ width: '25%', alignItems: 'center', justifyContent: 'center'}}>
//                             <Text style={styles.fontStyles}>
//                                 {data?.amount}
//                             </Text>
//                         </View>
//                         <View style={{ width: '25%'}}>
//                             <Text style={{...styles.fontStyles, textAlign: 'right'}}>
//                                 {data?.amount * (data?.betType == 'R' ? withWin200?.value : winStraight?.value)} 
//                             </Text>
//                         </View>
//                     </View>
//                 )
//             })
            
//         }
//             </View>
//             <View style={{ width: '100%', paddingVertical: 20, marginBottom: 20, borderBottomWidth: 2, borderStyle: 'dashed'}}>
//                 <Text style={{...styles.fontStyles, textAlign: 'left'}}>
//                     Total Amount: {totalAmount}
//                 </Text>
//             </View>
//             <View style={{ width: '100%', alignItems: 'center'}}>
//                 <Text style={{...styles.fontStyles}}>
//                 Thank you for supporting STL. Wi
//                 </Text>
//                 <Text style={{...styles.fontStyles}}>
//                 nning tickets must be claim with
//                 </Text>
//                 <Text style={{...styles.fontStyles}}>
//                 in within one (1) year after the
//                 </Text>
//                 <Text style={{...styles.fontStyles}}>
//                 betting date, otherwise winning
//                 </Text>
//                 <Text style={{...styles.fontStyles}}>
//                 prize shall be forfeited
//                 </Text>
//                 <Text style={{...styles.fontStyles}}>
//                 stlwsmr.v1.02.05.24
//                 </Text>
//             </View>

        
        
//     </View>
//   )

    return (
        <View style={{ flex: 1,  width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start'}}>
                                        <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center'}}>
                                            <Image
                                                source={{ uri: 'https://sharewin.pro/apiv2/assets/bwlogo1.png' }}
                                                resizeMethod='contain'
                                                style={{ height: 150, width: '100%' }}
                                                
                                            />
                                        </View>
                                        <Text style={{ ...styles.fontStyles, fontSize: 50}}>
                                            OFFICIAL RECEIPT
                                        </Text>
        
        
                                        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 4}}>
                                            <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '600' }}>
                                                TICKET #:
                                            </Text>
        
                                            <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '500' }}>
                                                {testData.ticketNo}
                                            </Text>
                                            
                                        </View>
                                        
                                        <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '500'}}>
                                            {moment().format('MMM DD, YYYY hh:mmA')}
                                        </Text>
        
                                        
                                        <Text style={{ ...styles.fontStyles, marginTop: 10, fontSize: 48, fontWeight: '500' }}>
                                            Agent : {String(testData.collector).toUpperCase()}
                                        </Text>
        
                                        <View style={{ marginTop: 10, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                                            <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '500' }}>
                                                Total: {testData.total}
                                            </Text>
        
                                            <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '500' }}>
                                                Game: 3D - {String(testData.gameTime).toUpperCase()}
                                            </Text>
                                            
                                        </View>
        
                                        
                                        <View style={{ marginTop: 20, flexDirection: 'row', borderWidth: 1, borderColor: COLORS.black, width: '100%' }}>
                                            <View style={{ width: '25%', borderWidth: .5, alignItems: 'center', justifyContent: 'center'}}>
                                                <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '400'}}>
                                                    COMBI
                                                </Text>
                                            </View>
                                            
                                            <View style={{ width: '25%', borderWidth: .5, alignItems: 'center', justifyContent: 'center'}}>
                                                <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '400'}}>
                                                    S
                                                </Text>
                                            </View>
                                            
                                            <View style={{ width: '25%', borderWidth: .5, alignItems: 'center', justifyContent: 'center'}}>
                                                <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '400'}}>
                                                    R
                                                </Text>
                                            </View>
                                            
                                            <View style={{ width: '25%', borderWidth: .5, alignItems: 'center', justifyContent: 'center'}}>
                                                <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '400'}}>
                                                    STAT
                                                </Text>
                                            </View>
                                            
                                        </View>
        
                                        {testData.combinations?.map(resItem => (
                                            <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: COLORS.black, width: '100%' }}>
                                                <View style={{ width: '25%', borderWidth: .5, alignItems: 'center', justifyContent: 'center'}}>
                                                    <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '400'}}>
                                                        {resItem.combination.slice(0, 1)}-{resItem.combination.slice(1, 2)}-{resItem.combination.slice(2)}
                                                    </Text>
                                                </View>
        
        
                                                <View style={{ width: '25%', borderWidth: .5, alignItems: 'center', justifyContent: 'center'}}>
                                                    <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '400'}}>
                                                    
                                                    
                                                        {resItem.straight != 0 ? resItem.straight : '-'}
                                                    </Text>
                                                </View>
        
                                                <View style={{ width: '25%', borderWidth: .5, alignItems: 'center', justifyContent: 'center'}}>
                                                    <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '400'}}>
                                                        {resItem.ramble != 0 ? resItem.ramble : '-'}
                                                    </Text>
                                                </View>
                                                
                                                <View style={{ width: '25%', borderWidth: .5, alignItems: 'center', justifyContent: 'center'}}>
                                                    <Text style={{ ...styles.fontStyles, fontSize: 48, fontWeight: '400'}}>
                                                        OK
                                                    </Text>
                                                </View>
                                                
        
                                            </View>
                                        ))}
                                    
                                        <BarcodeCreatorView value={`${testData.ticketNo}`} format={BarcodeFormat.PDF417} width={610} height={170} foregroundColor={'#000000'} style={{ marginVertical: 10 }} />
                                          {/* <PDF417BarcodeGenerator testData={testData.ticketNo}/> */}
                                          <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center',}}>
                                              <Text style={{ ...styles.fontStyles, fontSize: 50  }}>
                                                  REF #: {testData.ticketNo}0
                                              </Text>
                                          </View>
                                    </View>
    )

}

export default Receipt

const styles = StyleSheet.create({
    fontStyles: {
        fontFamily: 'RobotoMono',
        fontSize: 29,
        color: COLORS.black
    }
})