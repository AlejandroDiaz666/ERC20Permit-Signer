import React, { useState }          from "react";
import { useDispatch, useSelector } from "react-redux";

import { connectDataSelector      } from "../features/connectFeature";
import { tokenDataSelector,
	 thunkSetTokenAddr        } from "../features/tokenFeature";
import '../css/style.css';

const common = require('../lib/common');
const ether = require('../lib/ether');
let connectChangeMarkerPrev = -1;
let tokenChangeMarkerPrev   = -1;

const TokenInfo = () => {

    const dispatch = useDispatch();
    const connectData = useSelector(connectDataSelector);
    const tokenData = useSelector(tokenDataSelector);

    const beenRendered = !!document.getElementById('tokenInfoDiv');
    console.log('TokenInfo: beenRendered = ' + beenRendered);
    if ((connectChangeMarkerPrev != connectData.changeMarker) ||
	(tokenChangeMarkerPrev   != tokenData.changeMarker  )) {
	connectChangeMarkerPrev = connectData.changeMarker;
	tokenChangeMarkerPrev   = tokenData.changeMarker;
	console.log('TokenInfo: change detected');
    }

    if (!!beenRendered) {
	const networkAreaText = document.getElementById('networkArea');
	const accountAreaText = document.getElementById('accountArea');
	const balanceAreaText = document.getElementById('balanceArea');
	if (!!connectData.network) {
            console.log('TokenInfo: is connected');
	    networkAreaText.value = connectData.network;
            if (connectData.network.startsWith('Mainnet'))
                networkAreaText.className = (networkAreaText.className).replace('attention', '');
            else if (networkAreaText.className.indexOf(' attention' < 0))
                networkAreaText.className += ' attention';
	    accountAreaText.value = connectData.address;
	    const tokenAreaText = document.getElementById('tokenArea');
            console.log('TokenInfo: tokenData.error = ' + tokenData.error);
	    if (!tokenAreaText.value) {
		balanceAreaText.value = 'Enter token address above';
	    } else if (!!tokenData.error) {
		balanceAreaText.value = 'Not a valid token or error in address';
	    } else {
		const balanceETH = ether.convertWeiToDecimal(tokenData.balanceWei, 3);
		if (!!tokenData.symbol)
		    balanceAreaText.value = balanceETH.toString(10) + ' ' + tokenData.symbol;
		else
		    balanceAreaText.value = balanceETH.toString(10);
	    }
	} else {
	    networkText.value = '';
	    accountAreaText.value = '';
	    balanceAreaText.value = '';
	}

    }


    const onTokenChange = async () => {
	const balanceAreaText = document.getElementById('balanceArea');
	const tokenAreaText = document.getElementById('tokenArea');
	const userValue = tokenAreaText.value;
	// prevent newlines, whitespace
	const tokenAddr = userValue.replace( /[\r\n\t ]/gi, '');
	tokenAreaText.value = tokenAddr;
	if (tokenAddr.length != 42 || !tokenAddr.startsWith('0x')) {
	    balanceAreaText.value = (tokenAddr.length > 0) ? 'Not a valid address' : 'Enter token address above';
	} else {
	    dispatch(thunkSetTokenAddr(tokenAddr));
	}
    };


    return (
	    <div id="tokenInfoDiv">
	      <div id="tokenInfoTabularArea">
		<div id="networkPromptDiv" className="tokenInfoPromptDiv">
		  <textarea id="networkPromptArea" className="tokenInfoArea" rows="1" cols="9" readOnly="readonly" disabled value="Network:"/>
		</div>
		<div id="networkAreaDiv" className="tokenInfoAreaDiv">
		  <textarea id="networkArea" className="tokenInfoArea" rows="1" cols="55" readOnly="readonly" disabled/>
		</div>
		<div id="accountPromptDiv" className="tokenInfoPromptDiv">
		  <textarea id="accountPromptArea" className="tokenInfoArea" rows="1" cols="9" readOnly="readonly" disabled value="Account:"/>
		</div>
		<div id="accountAreaDiv" className="tokenInfoAreaDiv">
		  <textarea id="accountArea" className="tokenInfoArea" rows="1" cols="55" readOnly="readonly" disabled/>
		</div>
		<div id="tokenPromptDiv" className="tokenInfoPromptDiv">
		  <textarea id="tokenPromptArea" className="tokenInfoArea" rows="1" cols="9" readOnly="readonly" disabled value="Token:"/>
		</div>
		<div id="tokenAreaDiv" className="tokenInfoAreaDiv">
		  <textarea id="tokenArea" className="tokenInfoArea" rows="1" cols="55" onChange={onTokenChange}/>
		</div>
		<div id="balancePromptDiv" className="tokenInfoPromptDiv">
		  <textarea id="balancePromptArea" className="tokenInfoArea" rows="1" cols="9" readOnly="readonly" disabled value="Balance:"/>
		</div>
		<div id="balanceAreaDiv" className="tokenInfoAreaDiv">
		  <textarea id="balanceArea" className="tokenInfoArea" rows="1" cols="55" readOnly="readonly" disabled/>
		</div>
	      </div>
	    </div>
	    );
}

export default TokenInfo;
