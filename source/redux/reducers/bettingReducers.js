// redux/reducers/bettingReducers.js

import { SET_BETTING_LIMITS, UPDATE_BETTING_RISK_TIER, UPDATE_BETTING_USAGE } from "../actions/types";


const initialState = {
    limits: {
        dailyLimit: 0,
        perTimeSlotLimit: 0,
    },
    riskTier: 'Low', // 'Low', 'Medium', 'High'
    usage: {
        dailyTotal: 0,
        timeSlotTotal: 0,
        betCountToday: 0,
    },
};

export default function bettingReducers(state = initialState, action) {
    switch (action.type) {
        case SET_BETTING_LIMITS:
            return {
                ...state,
                limits: action.payload,
            };
        case UPDATE_BETTING_RISK_TIER:
            return {
                ...state,
                riskTier: action.payload,
            };
        case UPDATE_BETTING_USAGE:
            return {
                ...state,
                usage: {
                    ...state.usage,
                    ...action.payload,
                },
            };
        default:
            return state;
    }
}
