import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView } from 'react-native';
import moment from 'moment-timezone';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { executeSql } from '../../utils/db';
import { COLORS } from '../../constants';

export default function Results2({ navigation }) {
  const today = moment().tz('Asia/Manila').toDate();
  const startDate = moment(today).startOf('day').toDate();

  const [draws, setDraws] = useState([]);
  const [winningDigits, setWinningDigits] = useState(new Set());

  // Fetch draws from SQLite
  useEffect(() => {
    const fetchDraws = async () => {
      try {
        // Get all draws ordered by drawDate DESC
        const results = await executeSql('SELECT * FROM draws ORDER BY drawDate DESC', []);
        const drawsArray = results.rows._array;

        // Convert drawDate string/timestamp to Date object
        const parsedDraws = drawsArray.map(draw => ({
          ...draw,
          drawDate: new Date(draw.drawDate),
          combination: draw.combination, // assuming combination column exists
          isWinTo: draw.isWinTo === 1 // boolean stored as 0/1
        }));

        setDraws(parsedDraws);
      } catch (err) {
        console.error('Error fetching draws:', err);
      }
    };

    const fetchWinningDigits = async () => {
      try {
        // Get all winning combinations
        const results = await executeSql('SELECT * FROM combinations WHERE isWinTo = 1', []);
        const combos = results.rows._array;

        // Store digits as Set for fast lookup
        setWinningDigits(new Set(combos.map(c => String(c.digit))));
      } catch (err) {
        console.error('Error fetching winning combinations:', err);
      }
    };

    fetchDraws();
    fetchWinningDigits();
  }, []);

  function renderHeaderDatePicker() {
    return (
      <View style={{ flexDirection: 'row', borderTopWidth: 1, justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: COLORS.gray600, backgroundColor: COLORS.gray400 }}>
        <Text style={{ ...styles.rowHeader, width: '40%' }}>DATE</Text>
        <Text style={{ ...styles.rowHeader, width: '20%', color: '#3897e7' }}>2PM</Text>
        <Text style={{ ...styles.rowHeader, width: '20%', color: '#ff9d3e' }}>5PM</Text>
        <Text style={{ ...styles.rowHeader, width: '20%', color: COLORS.black600 }}>9PM</Text>
      </View>
    );
  }

  function renderList({ item, index }) {
    const backgroundColor = index % 2 === 0 ? COLORS.gray200 : COLORS.gray300;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100).duration(500)}
        exiting={FadeOutDown.delay(index * 100).duration(500)}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-around',
            paddingVertical: 14,
            backgroundColor: backgroundColor,
            width: '100%',
          }}
        >
          <Text style={{ ...styles.rowHeader, paddingHorizontal: 10, width: '40%', color: index ? COLORS.black : '#1a90ff' }}>
            {moment(item.date).isSame(startDate) ? 'Today' : moment(item.date).format('MM/DD/YYYY')}
          </Text>

          {[0, 1, 2].map((game, i) => {
            let draw = item.draws[game];
            const isWinningDigit = draw?.digit && winningDigits.has(String(draw.digit));
            return (
              <Text
                key={Math.random()}
                style={{ ...styles.rowHeader, width: '20%', color: isWinningDigit ? COLORS.danger : index ? COLORS.black : '#1a90ff' }}
              >
                {draw?.digit ? String(draw.digit).split('').join('-') : '_-_-_'}
              </Text>
            );
          })}
        </View>
      </Animated.View>
    );
  }

  // Group draws by date
  const groups = draws.reduce((groups, draw) => {
    const date = moment(draw.drawDate).format('YYYY-MM-DD');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].unshift({ digit: draw.combination, isWinTo: draw.isWinTo });
    return groups;
  }, {});

  const groupArrays = Object.keys(groups).map((date, index) => ({
    date,
    index,
    draws: groups[date],
  }));

  return (
    <SafeAreaView style={styles.wrapper}>
      {renderHeaderDatePicker()}
      <FlatList
        showsVerticalScrollIndicator={false}
        data={groupArrays}
        scrollEnabled
        keyExtractor={(item) => item.index.toString()}
        renderItem={renderList}
        ListEmptyComponent={
          <View style={{ padding: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
              No records found.
            </Text>
          </View>
        }
        ListFooterComponent={
          groupArrays.length > 0 && (
            <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ textAlign: 'center', fontSize: 14, color: COLORS.gray600, fontWeight: '500' }}>
                End of results.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 10,
    backgroundColor: COLORS.gray300,
  },
  rowHeader: {
    color: COLORS.black,
    fontWeight: 'bold',
    fontSize: 18,
  },
});