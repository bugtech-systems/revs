// redux/actions/bettingActions.js

import { SET_BETTING_LIMITS, UPDATE_BETTING_RISK_TIER, UPDATE_BETTING_USAGE } from "./types";

export const setBettingLimits = (limits) => ({
  type: SET_BETTING_LIMITS,
  payload: limits,
});

export const updateRiskTier = (tier) => ({
  type: UPDATE_BETTING_RISK_TIER,
  payload: tier,
});

export const updateBettingUsage = (usage) => ({
  type: UPDATE_BETTING_USAGE,
  payload: usage,
});
