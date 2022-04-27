import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

// needed for async when using bable
const regeneratorRuntime = require("regenerator-runtime");
const common = require('../lib/common');
const ether = require('../lib/ether');
const to = require('../lib/to');


// create the thunk
// note arg is the argument passed to the created thunk fcn
// note thunkAPI = { dispatch, getState, extra, rejectWithValue }
// where extra is the "extra argument" given to the thunk middleware on setup, if available
//
export const thunkSetTokenAddr = createAsyncThunk(
    'token/thunkSetTokenAddr',
    async (arg, thunkAPI) => {
        console.log('thunkSetTokenAddr: at least im in the thunk');
	const tokenAddr = arg;
	const state = thunkAPI.getState();
	return new Promise(async (resolve, reject) => {
	    try {
		const [err, wei] = await to.handle(ether.getERC20Balance(state.connectData.address, tokenAddr, 'wei'));
		console.log('thunkSetTokenAddr: balance err = ' + err + ', wei = ' + wei);
		if (err) {
		    thunkAPI.dispatch(setError(true));
		} else {
		    const [err, sym] = await to.handle(ether.getERC20Symbol(tokenAddr));
		    thunkAPI.dispatch(setSymbolAndBalance({ 'tokenAddr': tokenAddr, 'symbol': sym, 'balanceWei': wei }));
		    console.log(wei + ' (' + sym + ')');
		}
		resolve('okey dokey');
	    } catch(err) {
		console.error('thunkSetTokenAddr err = ' + err);
		thunkAPI.dispatch(setError(true));
		thunkAPI.rejectWithValue(err);
	    }
	});
    }
)

export const tokenSlice = createSlice({
    name: 'tokenData',
    initialState: {
	changeMarker: 0,
	beenInitialized: false,
	tokenAddr: null,
	error: false,
	symbol: '',
	balanceWei: 0,
    },
    reducers: {
	setError: (state, action) => {
	    state.error = action.payload;
	    ++state.changeMarker;
	},
	setSymbolAndBalance: (state, action) => {
            console.log('setSymbolAndBalance');
	    state.error = false;
	    state.beenInitialized = true;
	    state.symbol  = action.payload.symbol;
	    state.tokenAddr = action.payload.tokenAddr;
	    state.balanceWei = action.payload.balanceWei;
	    // this is always a state change; since we would not have been
	    // called if there was a previous token address that was erased
	    ++state.changeMarker;
	},
    },
    extraReducers: {
	// Add reducers for additional action types here, and handle loading state as needed
	// thunks will have X.pending, X.fulfilled, X.rejected
    },
})

export const {
    setError,
    setSymbolAndBalance
} = tokenSlice.actions;

export const tokenDataSelector = state => state.tokenData;
export default tokenSlice.reducer;
