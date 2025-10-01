import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text } from 'react-native';
import moment from 'moment';
import { realmContext } from '../RealmContext';
import { Betting } from '../Models';
import { COLORS } from '../constants/theme';
import { index } from 'realm';

const { useQuery } = realmContext;

const BettingBanner = ({ curGameTime }) => {
  const allBettings = useQuery(Betting).sorted('timestamp', true); // newest first
  const [queue, setQueue] = useState([]);
  const [currentBet, setCurrentBet] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Queue up new bettings in real-time
  useEffect(() => {
    const listener = (collection, changes) => {
      const inserted = changes.insertions.map((index) => collection[index]);
      console.log(changes, "CHANGES")
      if (inserted.length > 0) {
        setQueue((prev) => [...prev, ...inserted]);
      }
    };

    allBettings.addListener(listener);

    return () => {
      allBettings.removeListener(listener);
    };
  }, [allBettings]);

  // Handle animation of next bet
  useEffect(() => {
    if (!currentBet && queue.length > 0) {
      const next = queue[0];
      setCurrentBet(next);

      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.delay(3000), // Show for 3 seconds
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        })
      ]).start(() => {
        setQueue((prev) => prev.slice(1)); // remove shown bet
        setCurrentBet(null); // trigger next
      });
    }
  }, [queue, currentBet]);

  const displayText = currentBet
    ? `New bet placed by ${currentBet?.collector || 'unknown'} (₱${currentBet?.gross})`
    : !curGameTime
      ? 'Draw status: OFFLINE'
      : `Draw time: ${String(curGameTime).toUpperCase()}`;

    //   console.log(allBettings, "DISPLAY")
      

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        elevation: 2,
        backgroundColor: COLORS.warningTransparent,
        shadowColor: COLORS.warningTransparent,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
        padding: 10,
      }}
    >
      <Text style={{ color: COLORS.black, fontSize: 14, fontWeight: '600' }}>
        {displayText}
      </Text>
      <Text style={{ color: COLORS.black, fontSize: 14, fontWeight: '600' }}>
        {moment().format('MMMM DD, YYYY')}
      </Text>
    </Animated.View>
  );
};

export default BettingBanner;
