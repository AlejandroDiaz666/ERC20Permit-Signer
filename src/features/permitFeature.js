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

export const thunkSetSpenderAddr = createAsyncThunk(
    'permit/thunkSetSpenderAddr',
    async (arg, thunkAPI) => {
        console.log('thunkSetSpenderAddr: at least im in the thunk');
	const spenderAddr = arg;
	const state = thunkAPI.getState();
	return new Promise(async (resolve, reject) => {
	    if (ether.isValidAddress(spenderAddr)) {
		thunkAPI.dispatch(setSpenderAddr(spenderAddr));
	    } else {
		thunkAPI.dispatch(setSpenderAddr(null));
	    }
	    resolve('okey dokey');
	});
    }
)

export const thunkSetPermitAmount = createAsyncThunk(
    'permit/thunkSetPermitAmount',
    async (arg, thunkAPI) => {
        console.log('thunkSetPermitAmount: at least im in the thunk');
	const permitAmount = arg;
	const state = thunkAPI.getState();
	return new Promise(async (resolve, reject) => {
	    try {
		const weiBN = common.decimalToWeiBN(permitAmount);
		thunkAPI.dispatch(setPermitAmount({ 'permitAmount': permitAmount, 'permitAmountWei': weiBN.toString(10) }));
		resolve('okey dokey');
	    } catch(err) {
		console.error('thunkSetPermitAmount err = ' + err);
		thunkAPI.dispatch(setPermitAmount({ 'permitAmount': null, 'permitAmountWei': null }));
		thunkAPI.rejectWithValue(err);
	    }
	});
    }
)

export const thunkCalcSignature = createAsyncThunk(
    'permit/thunkCalcSignature',
    async (arg, thunkAPI) => {
        console.log('thunkCalcSignature: at least im in the thunk');
	const doERC2612 = arg;
	const state = thunkAPI.getState();
	return new Promise(async (resolve, reject) => {
	    try {
		//const amountWeiBN = common.decimalToWeiBN(permitAmount);
		console.log('thunkCalcSignature: i am here doERC2612 = ' + doERC2612);
		if (doERC2612) {
		    const [err, result] = await to.handle(ether.signERC2612Permit(state.tokenData.tokenAddr, state.connectData.address, state.permitData.spenderAddr,
										  state.permitData.permitAmountWei));
		    console.log('thunkCalcSignature: doERC2612 = ' + doERC2612 + ', err = ' + err);
		    console.log('thunkCalcSignature: nonce = ' + result.nonce + ', expiry = ' + result.expiry + ', v = ' + result.v + ', r = ' + result.r + ', s = ' + result.s);
		    thunkAPI.dispatch(setSignature({
			'nonce': result.nonce, 'expiry': null, 'deadline': result.deadline,
			'v': result.v, 'r': result.r, 's': result.s }));
		    console.log('thunkCalcSignature: okey dokey');
		    resolve('okey dokey');
		} else {
		    const [err, result] = await to.handle(ether.signDaiPermit(state.tokenData.tokenAddr, state.connectData.address, state.permitData.spenderAddr));
		    console.log('thunkCalcSignature: doERC2612 = ' + doERC2612 + ', err = ' + err);
		    console.log('thunkCalcSignature: nonce = ' + result.nonce + ', expiry = ' + result.expiry + ', v = ' + result.v + ', r = ' + result.r + ', s = ' + result.s);
		    thunkAPI.dispatch(setSignature({
			'nonce': result.nonce, 'expiry': result.expiry, 'deadline': null,
			'v': result.v, 'r': result.r, 's': result.s }));
		    console.log('thunkCalcSignature: okey dokey');
		    resolve('okey dokey');
		}
	    } catch(err) {
		console.error('thunkSetPermitAmount err = ' + err);
		thunkAPI.dispatch(setSignature({
		    'nonce': null, 'expiry': null,
		    'v': null, 'r': null, 's': null }));
		thunkAPI.rejectWithValue(err);
	    }
	});
    }
)


export const permitSlice = createSlice({
    name: 'permitData',
    initialState: {
	changeMarker: 0,
	spenderAddr: null,
	permitAmount: null,
	permitAmountWei: null,
	nonce: null,
	expiry: null,
	deadline: null,
	v: null,
	r: null,
	s: null,
    },
    reducers: {
	setSpenderAddr: (state, action) => {
	    state.spenderAddr = action.payload;
	    ++state.changeMarker;
	},
	setPermitAmount: (state, action) => {
            console.log('setPermitAmount');
	    state.permitAmount = action.payload.permitAmount;
	    state.permitAmountWei = action.payload.permitAmountWei;
	    ++state.changeMarker;
	},
	setSignature: (state, action) => {
            console.log('setSignature: action.payload.nonce = ' + action.payload.nonce);
	    state.nonce = action.payload.nonce;
	    state.expiry = action.payload.expiry;
	    state.deadline = action.payload.deadline;
	    state.v = action.payload.v;
	    state.r = action.payload.r;
	    state.s = action.payload.s;
	    ++state.changeMarker;
	},
    },
    extraReducers: {
	// Add reducers for additional action types here, and handle loading state as needed
	// thunks will have X.pending, X.fulfilled, X.rejected
    },
})

export const {
    setSpenderAddr,
    setPermitAmount,
    setSignature
} = permitSlice.actions;

export const permitDataSelector = state => state.permitData;
export default permitSlice.reducer;
