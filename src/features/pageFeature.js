import { createSlice } from '@reduxjs/toolkit'

export const pageSlice = createSlice({
    name: 'pageData',
    initialState: {
        pageMode: 'select',
	isSpinning: false,
    },
    reducers: {
        setMode: (state, action) => {
            // Redux Toolkit allows us to write "mutating" logic in reducers. It
            // doesn't actually mutate the state because it uses the immer library,
            // which detects changes to a "draft state" and produces a brand new
            // immutable state based off those changes
            state.pageMode = action.payload;
        },
    }
})

export const {
    setMode
} = pageSlice.actions;
export const pageDataSelector = state => state.pageData;
export default pageSlice.reducer;
