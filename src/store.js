import { configureStore } from "@reduxjs/toolkit";
import pageDataReducer    from "./features/pageFeature";
import connectDataReducer from "./features/connectFeature";
import tokenDataReducer   from "./features/tokenFeature";
import permitDataReducer  from "./features/permitFeature";

export default configureStore({
  reducer: {
      pageData:    pageDataReducer,
      connectData: connectDataReducer,
      tokenData:   tokenDataReducer,
      permitData:   permitDataReducer
  },
});
