import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { pageDataSelector,
	 setMode }                  from "./features/pageFeature";

import './css/style.css';
import ConnectWalletButton          from './components/ConnectWalletButton'
import TokenInfo                    from './components/TokenInfo'
import PermitInfo                   from './components/PermitInfo'


function ERC20PermitSigner() {
    const pageData = useSelector(pageDataSelector);
    const dispatch = useDispatch();

    const beenRendered = !!document.getElementById('rootGrid');
    if (beenRendered) {
	if (!!pageData.isSpinning)
	    common.replaceElemClassFromTo("waitIcon", "gone", "visible");
	else
	    common.replaceElemClassFromTo("waitIcon", "visible", "gone");
    }

    const onSubmit = () => {
	dispatch(setMode('somethingelse'))
    };

    return (
            <div id="rootGrid">
              <div id="waitIcon" className="gone"/>
	      <div id="titleDiv">
		ERC20Permit (EIP-2612) Signer
	      </div>
	      <ConnectWalletButton />
	      <TokenInfo />
	      <PermitInfo />
	     </div>
    );
}

export default ERC20PermitSigner;
