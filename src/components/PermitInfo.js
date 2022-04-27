import React, { useState }            from "react";
import { useDispatch, useSelector   } from "react-redux";

import { connectDataSelector        } from "../features/connectFeature";
import { tokenDataSelector,
	 thunkSetTokenAddr          } from "../features/tokenFeature";
import { permitDataSelector,
	 thunkSetSpenderAddr,
	 thunkSetPermitAmount,
	 thunkCalcSignature         } from "../features/permitFeature";
import '../css/style.css';

const common = require('../lib/common');
const ether = require('../lib/ether');
let connectChangeMarkerPrev = -1;
let tokenChangeMarkerPrev   = -1;
let permitChangeMarkerPrev  = -1;
let amountDisable = true;
let calcButtonDisable = true;
let doERC2612 = false;
let expiryPrompt = 'Expiry:';

const PermitInfo = () => {

    const dispatch = useDispatch();
    const connectData = useSelector(connectDataSelector);
    const tokenData = useSelector(tokenDataSelector);
    const permitData = useSelector(permitDataSelector);

    const beenRendered = !!document.getElementById('tokenInfoDiv');
    console.log('PermitInfo: beenRendered = ' + beenRendered);
    if ((connectChangeMarkerPrev != connectData.changeMarker) ||
	(tokenChangeMarkerPrev   != tokenData.changeMarker  ) ||
	(permitChangeMarkerPrev  != permitData.changeMarker )) {
	connectChangeMarkerPrev = connectData.changeMarker;
	tokenChangeMarkerPrev   = tokenData.changeMarker;
	permitChangeMarkerPrev  = permitData.changeMarker;
	console.log('PermitInfo: change detected');
    }

    amountDisable = true;
    calcButtonDisable = true;
    if (!!beenRendered) {
	const nonceAreaText = document.getElementById('nonceArea');
	const expiryAreaText = document.getElementById('expiryArea');
	const sAreaText = document.getElementById('sArea');
	const rAreaText = document.getElementById('rArea');
	const vAreaText = document.getElementById('vArea');
	if (!!tokenData.balanceWei) {
	    const spenderAreaText = document.getElementById('spenderArea');
	    const amountAreaText = document.getElementById('amountArea');
	    if (!spenderAreaText.value) {
		amountAreaText.value = 'Enter spender address above';
	    } else if (!permitData.spenderAddr) {
		amountAreaText.value = 'Error in spender address';
	    } else {
		amountDisable = false;
		if (amountAreaText.value.length == 0) {
		    nonceAreaText.value = 'Enter amount (up to 9 decimals) on \"amount\" line';
		} else if (!!permitData.permitAmount) {
		    console.log('PermitInfo: go time');
		    calcButtonDisable = false;
		    nonceAreaText.value = permitData.nonce;
		    expiryAreaText.value = doERC2612 ? permitData.deadline : permitData.expiry;
		    sAreaText.value = permitData.s;
		    rAreaText.value = permitData.r;
		    vAreaText.value = permitData.v;
		}
	    }
	} else {
	    nonceAreaText.value = '';
	    expiryAreaText.value = '';
	    sAreaText.value = '';
	    rAreaText.value = '';
	    vAreaText.value = '';
	}

    }

    const onSpenderChange = async () => {
	const amountAreaText = document.getElementById('amountArea');
	const spenderAreaText = document.getElementById('spenderArea');
	const userSpenderAddr = spenderAreaText.value;
	// prevent newlines, whitespace
	const spenderAddr = userSpenderAddr.replace( /[\r\n\t ]/gi, '');
	spenderAreaText.value = spenderAddr;
	if (!!permitData.spenderAddr) {
	    // once we have spender, then any change invalidates
	    dispatch(thunkSetSpenderAddr(spenderAddr));
	} else if (spenderAddr.length != 42 || !spenderAddr.startsWith('0x')) {
	    // we can hadle edits here, at least until the format is correct
	    amountAreaText.value = (spenderAddr.length > 0) ? 'Spender address is not valid' : 'Enter spender address above';
	} else {
	    amountAreaText.value = '';
	    dispatch(thunkSetSpenderAddr(spenderAddr));
	}
    };

    const onAmountChange = async () => {
	const nonceAreaText = document.getElementById('nonceArea');
	const amountAreaText = document.getElementById('amountArea');
	const userAmount = amountAreaText.value;
	// prevent non number chars
	const permitAmount = userAmount.replace( /[^0-9\.]/gi, '');
	amountAreaText.value = permitAmount;
	// always set permitAmount in global state
	dispatch(thunkSetPermitAmount(permitAmount));
    }

    const onDaiToggle = async () => {
	const daiOrERC2612Switch = document.getElementById('daiOrERC2612Switch');
	const expiryPromptArea = document.getElementById('expiryPromptArea');
	doERC2612 = daiOrERC2612Switch.checked;
	expiryPrompt = doERC2612 ? 'Deadline:' : 'Expiry:';
	expiryPromptArea.value = expiryPrompt;
    }

    const onCalcSubmit = async () => {
	console.log("onCalcSubmit");
	dispatch((thunkCalcSignature(doERC2612)));
    }


    return (
	    <div id="permitInfoDiv">
	      <div id="permitInfoTabularArea">
		<div id="spenderPromptDiv" className="permitInfoPromptDiv">
		  <textarea id="spenderPromptArea" className="permitInfoArea" rows="1" cols="9" readOnly="readonly" disabled value="Spender:"/>
		</div>
		<div id="spenderAreaDiv" className="permitInfoAreaDiv">
		  <textarea id="spenderArea" className="permitInfoArea" rows="1" cols="55" onChange={onSpenderChange}/>
		</div>
		<div id="ammountPromptDiv" className="permitInfoPromptDiv">
		  <textarea id="amountPromptArea" className="permitInfoArea" rows="1" cols="9" readOnly="readonly" disabled value="Amount:"/>
		</div>
		<div id="ammountAreaDiv" className="permitInfoAreaDiv">
		  <textarea id="amountArea" className="permitInfoArea" rows="1" cols="55" disabled={amountDisable} onChange={onAmountChange}/>
		</div>
		<div id="permitToggleDiv">
		  <input type="checkbox" id="daiOrERC2612Switch" className="checkbox" value="dai" onChange={onDaiToggle}/>
		  <label htmlFor="daiOrERC2612Switch" className="toggle">
		    <p id="permitToggleText">DAI&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ERC2612</p>
		  </label>
		</div>
		<div id="permitCalcButtonDiv">
		  <button id="permitCalcButton" className="genericButton button" disabled={calcButtonDisable} type="button" onClick={onCalcSubmit}>Calc</button>
		</div>
		<div id="noncePromptDiv" className="permitInfoPromptDiv">
		  <textarea id="noncePromptArea" className="permitInfoArea" rows="1" cols="9" readOnly="readonly" disabled value="Nonce:"/>
		</div>
		<div id="nonceAreaDiv" className="permitInfoAreaLongDiv">
		  <textarea id="nonceArea" className="permitInfoArea" rows="1" cols="70" readOnly="readonly" disabled/>
		</div>
		<div id="expiryPromptDiv" className="permitInfoPromptDiv">
		  <textarea id="expiryPromptArea" className="permitInfoArea" rows="1" cols="9" readOnly="readonly" disabled value={expiryPrompt}/>
		</div>
		<div id="expiryAreaDiv" className="permitInfoAreaLongDiv">
		  <textarea id="expiryArea" className="permitInfoArea" rows="1" cols="70" readOnly="readonly" disabled/>
		</div>
		<div id="sPromptDiv" className="permitInfoPromptDiv">
		  <textarea id="sPromptArea" className="permitInfoArea" rows="1" cols="9" readOnly="readonly" disabled value="S:"/>
		</div>
		<div id="sAreaDiv" className="permitInfoAreaLongDiv">
		  <textarea id="sArea" className="permitInfoArea" rows="1" cols="70" readOnly="readonly" disabled/>
		</div>
		<div id="rPromptDiv" className="permitInfoPromptDiv">
		  <textarea id="rPromptArea" className="permitInfoArea" rows="1" cols="9" readOnly="readonly" disabled value="R:"/>
		</div>
		<div id="rAreaDiv" className="permitInfoAreaLongDiv">
		  <textarea id="rArea" className="permitInfoArea" rows="1" cols="70" readOnly="readonly" disabled/>
		</div>
		<div id="vPromptDiv" className="permitInfoPromptDiv">
		  <textarea id="rPromptArea" className="permitInfoArea" rows="1" cols="9" readOnly="readonly" disabled value="V:"/>
		</div>
		<div id="vAreaDiv" className="permitInfoAreaLongDiv">
		  <textarea id="vArea" className="permitInfoArea" rows="1" cols="70" readOnly="readonly" disabled/>
		</div>
	      </div>
	    </div>
	    );
}

export default PermitInfo;
