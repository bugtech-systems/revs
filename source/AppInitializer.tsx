import { useEffect } from 'react';
import { useCombinationRiskAnalysis } from './hooks/useCombinationRiskAnalysis';

export const AppInitializer = () => {
  const { analyzePastMonthDraws } = useCombinationRiskAnalysis();

  useEffect(() => {
    // analyzePastMonthDraws();
  }, []);

  return null;
};