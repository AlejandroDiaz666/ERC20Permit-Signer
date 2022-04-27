const React = require("react");
const ReactDOM = require("react-dom");
import { Provider } from 'react-redux';
import store from './store';
import ERC20PermitSigner from './ERC20PermitSigner';
import "./css/style.css";

const App = () => {
  return <ERC20PermitSigner />;
};

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);
