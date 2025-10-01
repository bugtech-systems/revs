// hooks/useCombinationRiskAnalysis.ts
import moment from 'moment-timezone';
import { realmContext } from '../RealmContext';
import { Combinations, Draws } from '../Models';

const { useRealm } = realmContext;

export const useCombinationRiskAnalysis = () => {
  const realm = useRealm();

  const analyzePastMonthDraws = () => {
    const now = moment.tz('Asia/Manila');

    // Start from the 1st day of previous month
    const fromDate = now.clone().subtract(1, 'month').startOf('month').toDate();

    // Up to now (not just end of last month)
    const toDate = now.toDate();

    // Filter draws that have a combination and fall within range
    const pastDraws = realm
      .objects(Draws)
      .filtered('drawDate >= $0 AND drawDate <= $1 AND combination != null', fromDate, toDate);

    const winMap = new Map();

    pastDraws.forEach((draw) => {
      const combo = draw.combination;
      if (combo) {
        winMap.set(combo, (winMap.get(combo) || 0) + 1);
      }
    });

    const combinations = realm.objects(Combinations);

    realm.write(() => {
      combinations.forEach((combo) => {
        const wins = winMap.get(combo.digit) || 0;
        combo.winFrequency = wins;

        if (wins >= 3) {
          // combo.riskLevel = 'hot';
          // combo.straightLimit = 0;
          // combo.rambleLimit = 0;
          
        } else if (wins === 1 || wins === 2) {
          combo.riskLevel = 'cold';
          combo.straightLimit = 20;
          combo.rambleLimit = 20;
        } else {
          combo.riskLevel = 'neutral';
        }
      });
    });
  };

  return {
    analyzePastMonthDraws
  };
};
