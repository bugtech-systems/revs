import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import moment from 'moment-timezone';
import { useSelector } from 'react-redux';
import { COLORS } from '../constants';
import { getBettingByTicketNo } from '../utils/offlineSync';
import { formatNumberWithComma, getConfiguration } from '../utils/helpers';


const ViewTicket = ({ route }) => {
  const { user } = useSelector(({ user }) => user);
  const ticketDetails = JSON.parse(route.params); // data passed from WinningScreen
  const [betting, setBetting] = useState(null);
  const [hits, setHits] = useState([]);

  // Fetch betting details from SQLite using offlineSync
  useEffect(() => {
    const fetchBettingDetails = async () => {
      try {
        const data = await getBettingByTicketNo(ticketDetails.ticket_no);
        if (data && data.length > 0) {
          setBetting(data[0]);
          setHits(JSON.parse(data[0].hits)); // assuming hits stored as JSON string
        }
      } catch (error) {
        console.error('Error fetching betting details:', error);
      }
    };
    fetchBettingDetails();
  }, [ticketDetails]);

  // Compute winnings, totals, etc.
  const winPrize = betting?.is_win_to
    ? getConfiguration(user, 'withWin200').value
    : getConfiguration(user, 'winStraight').value;

  let totalGross = 0;
  let totalWins = 0;

  hits.forEach(hit => {
    totalGross += Number(hit.amount);
    totalWins += Number(hit.winning) * Number(winPrize);
  });

  const renderBet = ({ item }) => {
    const itemWin = Number(item.winning) * Number(winPrize);
    return (
      <View style={styles.betRow}>
        <Text style={[styles.betText, item.is_win_to && { color: COLORS.danger }]}>
          {String(item.combination).split('').join('-')}
        </Text>
        <Text style={[styles.betText, item.is_win_to && { color: COLORS.danger }]}>
          {item.betType}
        </Text>
        <Text style={[styles.betText, item.is_win_to && { color: COLORS.danger }]}>
          {formatNumberWithComma(item.amount)}
        </Text>
        <Text style={[styles.betText, item.is_win_to && { color: COLORS.danger }]}>
          {formatNumberWithComma(itemWin)}
        </Text>
      </View>
    );
  };

  if (!betting) {
    return (
      <View style={styles.container}>
        <Text>Loading ticket details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.detailsContainer}>
        <DetailRow label="Agent:" value={betting.collector} />
        <DetailRow label="Ticket ID:" value={betting.ticket_no} />
        <DetailRow
          label="Bet Date/Time:"
          value={moment(betting.timestamp).format('MMM DD, YYYY hh A')}
        />
        <DetailRow
          label="Draw Date:"
          value={moment(betting.timestamp).format('MMM DD, YYYY')}
        />
        <DetailRow label="Draw Time:" value={betting.game_time} />
        <DetailRow label="Total Amount:" value={formatNumberWithComma(totalGross)} />
        <DetailRow label="Win Total:" value={formatNumberWithComma(totalWins)} />
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Bet</Text>
        <Text style={styles.headerText}>Type</Text>
        <Text style={styles.headerText}>Amount</Text>
        <Text style={styles.headerText}>Win</Text>
      </View>

      <FlatList
        data={hits}
        renderItem={renderBet}
        keyExtractor={(item, index) => index.toString()}
      />
    </View>
  );
};

const DetailRow = ({ label, value }) => (
  <View
    style={{
      width: '100%',
      justifyContent: 'space-between',
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: COLORS.gray400,
      paddingVertical: 6,
    }}
  >
    <Text style={styles.detailText}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  detailsContainer: { marginBottom: 10 },
  detailText: { fontSize: 16, fontWeight: 'bold', color: COLORS.black },
  detailValue: { fontSize: 14, fontWeight: '500', color: COLORS.black900 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray400,
    paddingBottom: 5,
    marginBottom: 5,
    marginTop: 6,
    paddingHorizontal: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    width: '25%',
    textAlign: 'left',
    color: COLORS.black,
  },
  betRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 10,
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
});

export default ViewTicket;
