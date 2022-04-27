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
export const thunkInitConnection = createAsyncThunk(
    'connect/thunkInitConnection',
    async (arg, thunkAPI) => {
        console.log('thunkInitConnection: at least im in the thunk');

	return new Promise(async (resolve, reject) => {
	    const [err, provider] = await to.handle(ether.initProvider('metamask'));
	    if (!!err || !provider) {
		console.error('thunkInitConnection err = ' + err);
		thunkAPI.rejectWithValue(err);
	    } else {
		common.setupWeb3Node(provider);
		ether.init(async function(networkName) {
		    console.log('thunkInitConnection networkName = ' + networkName + ', address = ' + ether.account0);
    		    const [err, name] = await to.handle(ether.ensReverseLookup(ether.account0));
		    if (!!err)
			console.log('error in ens reverse lookup: ' + err);
		    const addrStr = common.abbreviateAddrForEns(ether.account0, name, 10, 8);
		    thunkAPI.dispatch(setNetwork({ "networkName"    : networkName,
						   "address"        : ether.account0,
						   "displayAddress" : addrStr }));
		    resolve('okey dokey');
		});
	    }
	});
    }
)

export const connectSlice = createSlice({
    name: 'connectData',
    initialState: {
	changeMarker: 0,
	beenInitialized: false,
	network: '',
	address: '',
	displayAddress: '',
	error: '',
    },
    reducers: {
	setNetwork: (state, action) => {
	    const changed = (state.network        != action.payload.networkName ||
			     state.address        != action.payload.address     ||
			     state.displayAddress != action.payload.displayAddress);
	    state.beenInitialized = true;
	    state.network        = action.payload.networkName;
	    state.address        = action.payload.address;
	    state.displayAddress = action.payload.displayAddress;
	    if (changed)
		++state.changeMarker;
	},
    },
    extraReducers: {
	// Add reducers for additional action types here, and handle loading state as needed
	// thunks will have X.pending, X.fulfilled, X.rejected
    },
})

export const {
    setNetwork,
} = connectSlice.actions;

export const connectDataSelector = state => state.connectData;
export default connectSlice.reducer;
