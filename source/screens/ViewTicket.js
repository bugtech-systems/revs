import React, { useCallback, useEffect, useState } from 'react';
import { Image, View, Text, FlatList, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import moment from 'moment-timezone';
import { useDispatch, useSelector } from 'react-redux';
import { BSON } from 'realm';
import { STOP_LOADING } from '../redux/actions/types';
import { COLORS, icons } from '../constants';
import { Users } from '../Models';
import { realmContext } from '../RealmContext';
import { getConfiguration } from '../utils/helpers';



const { useQuery } = realmContext;

const ViewTicket = ({ route, navigation, onPress }) => {
    const dispatch = useDispatch();
    const ticketDetails = JSON.parse(route.params);
    const [gameTime, setGameTime] = useState('');


    let users = useQuery(Users, doc => {
        const ownerId = new BSON.ObjectId(ticketDetails.owner_id);

        return doc.filtered(
            '_id == $0',
            ownerId
        );
    }, [ticketDetails])


    const handlePrint = async () => {
        // setLoading(true)
        setPrintCount(+1)
        let increment = +1
        console.log(increment, "INC")
        return
    }

    function getTimeRange() {
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const currentMins = currentTime.getMinutes();
        console.log(currentMins, 'mins')
        if (currentHour >= 0 && currentHour < 14) {
            return "2pm";
        } else if (currentHour >= 14 && currentHour < 17) {
            return "5pm";
        } else {
            return "9pm";
        }
    }

    const captureImage = async () => {
        return Math.random();
    }

    useEffect(() => {
        const totalAmount = ticketDetails?.combinations?.reduce((acc, combination) => acc + combination.amount, 0);
        let gameTime = getTimeRange();

        setGameTime(gameTime)
        // captureImage()
    }, [])


    let isWin200 = ticketDetails?.draw?.isWinTo ? getConfiguration(users[0], 'withWin200')?.isCheck : false;

    let winPrize = isWin200 ? getConfiguration(users[0], 'withWin200').value : getConfiguration(users[0], 'winStraight').value




    let total = 0;
    let winTotal = 0;


    const renderBet = ({ item }) => {

        total += Number(item.amount).toFixed(0);
        let itemWin = Number(item.winning * winPrize);
        winTotal += itemWin;
        return (
            <View style={styles.betRow}>
                <Text style={{ ...styles.betText, color: item.isWinTo ? COLORS.danger : COLORS.black }}>{String(item.combination).split('').join('-')}</Text>
                <Text style={{ ...styles.betText, color: item.isWinTo ? COLORS.danger : COLORS.black }}>{item.betType}</Text>
                <Text style={{ ...styles.betText, color: item.isWinTo ? COLORS.danger : COLORS.black }}>{Number(item.amount).toFixed(0)}</Text>
                <Text style={{ ...styles.betText, color: item.isWinTo ? COLORS.danger : COLORS.black }}>{Number(itemWin).toFixed(0)}</Text>
            </View>
        );
    }


    let totalGross = ticketDetails.hits.reduce((n, { amount }) => n + amount, 0);
    let totalWins = ticketDetails.winning * winPrize;


    return (
        <View style={styles.container}>
            <View style={styles.detailsContainer}>
                <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
                    <Text style={{ ...styles.detailText }}>Agent:</Text>
                    <Text style={styles.detailValue}>{ticketDetails.collector}</Text>
                </View>
                <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
                    <Text style={{ ...styles.detailText }}>Ticket ID:</Text>
                    <Text style={styles.detailValue}>{ticketDetails.ticketNo}</Text>
                </View>


                <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
                    <Text style={styles.detailText}>Bet Date/Time:</Text>
                    <Text style={styles.detailValue}>{moment(ticketDetails.timestamp).format('MMM DD, YYYY hh A')}</Text>
                </View>
                <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
                    <Text style={styles.detailText}>Draw Date:</Text>
                    <Text style={styles.detailValue}>{moment(ticketDetails.timestamp).format('MMM DD, YYYY')}</Text>
                </View>
                <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
                    <Text style={styles.detailText}>Draw Time:</Text>
                    <Text style={styles.detailValue}>{ticketDetails.gameTime}</Text>
                </View>
                <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
                    <Text style={styles.detailText}>Total Amount:</Text>
                    <Text style={styles.detailValue}>{totalGross}</Text>
                </View>
                <View style={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray400, paddingVertical: 6 }}>
                    <Text style={styles.detailText}>Win Total:</Text>
                    <Text style={styles.detailValue}>{Number(totalWins).toFixed(0)}</Text>
                </View>
            </View>
            <View style={styles.headerRow}>
                <Text style={styles.headerText}>Bet</Text>
                <Text style={styles.headerText}>Type</Text>
                <Text style={styles.headerText}>Amount</Text>
                <Text style={styles.headerText}>Win</Text>
            </View>
            <FlatList
                data={ticketDetails.hits}
                renderItem={renderBet}
                keyExtractor={(item, index) => index.toString()}
            />

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

export default ViewTicket;