import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import '../css/style.css';
import { connectDataSelector,
	 thunkInitConnection }      from "../features/connectFeature";

const common = require('../lib/common');
let connectChangeMarkerPrev        = -1;

const ConnectWalletButton = () => {
    const connectData = useSelector(connectDataSelector);
    if (connectChangeMarkerPrev != connectData.changeMarker) {
	console.log('ConnectWalletButton: change detected');
	connectChangeMarkerPrev = connectData.changeMarker;
    }

    const beenRendered = !!document.getElementById('connectDiv');
    console.log('ConnectWalletButton: beenRendered = ' + beenRendered);

    let toolTipText = '';
    let buttonDisable = false;
    let buttonText = 'Connect to Metamask';
    const dispatch = useDispatch();
    if (!!beenRendered) {
	if (!!connectData.network) {
            console.log('ConnectWalletButton: is connected');
	    buttonText = connectData.displayAddress;
	    toolTipText = connectData.address;
	    common.replaceElemClassFromTo("fullAddrTooltip", "gone", "visible");
	    common.setButtonState("connectWalletButton", "Disabled");
	    buttonDisable = true;
	} else {
            console.log('ConnectWalletButton: not connected');
	    buttonText = "Connect to Metamask";
	    toolTipText = '';
	    common.replaceElemClassFromTo("fullAddrTooltip", "visible", "gone");
	    common.setButtonState("connectWalletButton", "Enabled");
	    buttonDisable = false;
	}
    }

    const onSubmit = () => {
	dispatch(thunkInitConnection());
    };

    return (
	    <div id="connectDiv" className="tooltip">
	    <button id="connectWalletButton" className="genericButton button" disabled={buttonDisable} type="button" onClick={onSubmit}>{buttonText}</button>
	      <span id="fullAddrTooltip" className="tooltipText gone">{toolTipText}</span>
	    </div>
	);
}

export default ConnectWalletButton;
