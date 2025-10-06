import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import moment from 'moment-timezone';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
// import { executeSql } from '../../utils/db';
import { COLORS } from '../../constants';
import { useOffline } from '../../context/OfflineProvider';

export default function Results2({ navigation }) {
  const { api, dataVersion } = useOffline()
  const today = moment().tz('Asia/Manila').toDate();

  const [draws, setDraws] = useState([]);
  const [winningDigits, setWinningDigits] = useState(new Set());

  // Fetch draws from SQLite
  useEffect(() => {
    const fetchDraws = async () => {
      try {
        const results = await api.listDraws({
            limit: 300,
            orderBy: 'draw_date DESC'
            
        })
      
        // Get all draws ordered by draw_date DESC
        // const results2 = await executeSql('SELECT * FROM draws ORDER BY draw_date DESC', []);
        // const drawsArray = results.rows._array;

        // Convert draw_date string/timestamp to Date object
        const parsedDraws = results.map(draw => ({
          ...draw,
          draw_date: new Date(draw.draw_date),
          combination: draw.combination, // assuming combination column exists
          is_win_to: draw.is_win_to // boolean stored as 0/1
        }));

        setDraws(parsedDraws);
      } catch (err) {
        console.error('Error fetching draws:', err);
      }
    };

    const fetchWinningDigits = async () => {
      try {
      
        const results = await api.listMasterCombinations({
            filters: { is_win_to: true}
        })
      
        // // Get all winning combinations
        // const results = await executeSql('SELECT * FROM combinations WHERE isWinTo = 1', []);
        // const combos = results.rows._array;
  console.log(results, 'RESULTS')
        // Store digits as Set for fast lookup
        setWinningDigits(new Set(results.map(c => String(c.digit))));
      } catch (err) {
        console.error('Error fetching winning combinations:', err);
      }
    };

    fetchDraws();
    fetchWinningDigits();
  }, [dataVersion]);


// console.log(draws, 'DRWS', winningDigits)
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
				<TouchableOpacity
					onPress={() => navigation.navigate('ViewTip', { resultDate: item.date })}
					style={{
						flexDirection: 'row',
						alignItems: 'flex-start',
						justifyContent: 'space-around',
						paddingVertical: 14,
						backgroundColor: backgroundColor,
						width: '100%'
					}}
				>
          <Text style={{ ...styles.rowHeader, paddingHorizontal: 10, width: '40%', color: index ? COLORS.black : '#1a90ff' }}>
            {moment(item.date).isSame(new Date()) ? 'Today' : moment(item.date).format('MM/DD/YYYY')}
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
      </TouchableOpacity>

      </Animated.View>
    );
  }

  // Group draws by date
  const groups = draws.reduce((groups, draw) => {
    const date = moment(draw.draw_date).format('YYYY-MM-DD');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].unshift({ digit: draw.combination, is_win_to: draw.is_win_to });
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