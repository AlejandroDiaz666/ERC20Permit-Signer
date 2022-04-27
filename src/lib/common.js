/*
 * common functions -- no local dependancies here!
 */
const BN = require("bn.js");
//const Buffer = require('buffer/').Buffer;
//const fetch = require('node-fetch');
const Web3 = require('web3');
const web3Utils = require('web3-utils');
//const fs = require('fs');
//const prompt = require('prompt-sync')({sigint: true});
//const nodemailer = require('nodemailer');

const common = module.exports = {

    web3:                null,
    provider:            null,
    networkName:         '',
    waitingForTxid:      false,
    SHOW_DEBUG:          false,
    INTERACTIVE_MODE:    false,
    logFile:             null,
    lastEmailSec:        0,
    days:               [ "Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat" ],
    months:             [ "Jan", "Feb", "Mar","Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],


    setupWeb3Node: function(provider) {
	console.log('setupWeb3Node');
	common.provider = provider;
	common.web3 = new Web3(provider);
	if (!common.web3.eth) {
	    console.log('error: web3.eth is null');
	    process.exit();
	}
    },


    //
    // writes msg with date/time prefix
    // all messages are written to the logFile. if SHOW_DEBUG is true, then all messges are
    // also displayed to the console. but if SHOW_DEBUG is not true, then the message is only
    // displayed to the console if isDebug is not set
    //
    log: function(msg, isDebug) {
	const dt = new Date();
	const YYYY = dt.getFullYear();
	// getMonth returns month from 0
	const MM = ("0" + (dt.getMonth() + 1)).slice(-2);
	// ensure date comes as 01, 09 etc
	const DD = ("0" + dt.getDate()).slice(-2);
	const hh = ("0" + dt.getHours()).slice(-2);
	const mm = ("0" + dt.getMinutes()).slice(-2);
	const ss = ("0" + dt.getSeconds()).slice(-2);
	const date_string = YYYY + MM + DD + ":" + hh + ":" + mm + ":" + ss;
	let indent = '';
	while (msg.length > 80) {
	    const commaIdx = msg.indexOf(',', 65);
	    if (commaIdx <= 0)
		break;
	    const msg0 = msg.substring(0, commaIdx + 1)
	    if (!isDebug || common.SHOW_DEBUG)
		console.log(date_string + ': ' + indent + msg0);
	    msg = msg.substring(commaIdx + 1);
	    indent = '   ';
	}
	if (!isDebug || common.SHOW_DEBUG)
	    console.log(date_string + ': ' + indent + msg);
    },


/*
    sendEmail: function(from, to, subject, text) {
	if (!transporter) {
	    transporter = nodemailer.createTransport({
		host: 'smtp-auth.no-ip.com',
		port: 3325,
		secure: false,
		auth: {
		    user: 'libertycoinatm.com@noip-smtp',
		    pass: 'smtp6eh2ad'
		}
	    });
	}
	return new Promise((resolve, reject) => {
	    transporter.sendMail({
		from: from, to: to, subject: subject, text: text
	    }, function (err, info) {
		if (err) {
		    common.log('sendEmail: ' + err);
		    reject(err);
		} else {
		    common.log('common::sendEmail - ' + JSON.stringify(info), true);
		    const nowSec = parseInt((new Date).getTime() / 1000);
		    common.lastEmailSec = nowSec;
		    resolve(info);
		}
	    });
	});
    },
*/

    //
    // round a float value to fixed point, but keep it a float
    //
    fixedFloat: function (value, decimals) {
	if (!value || isNaN(value))
	    value = "0";
	return(parseFloat(parseFloat(value).toFixed(decimals)));
    },

    //number can be a number or a string, with or without '0x'
    numberToBN: function(number) {
	return(web3Utils.toBN(number));
    },

    //
    // convert a number, which may contain a decimal point, to a BN, but first multiply by the passed orderValue
    // orderValue should be a power of 10 (eg, 1, 10, 100, 1000, etc). the returned BN will of course not have
    // an explcit decimal point; but it will be understood to have been multiplied by the orderValue. for example,
    // if the orderValue is 1000, and the returned BN is 654321, then the actual number should be interpreted
    // as 654.321
    //
    // note: if the number has more than
    //
    decimalAndUnitsToBN: function(number, multiplier) {
	// first ensure that the number of decimals is lte the rank of units
	const decimals = multiplier.toString(10).length - 1;
	let multiplierBN = common.numberToBN(multiplier);
	let value = number.toString();
	const dotIdx = value.indexOf('.');
	if (dotIdx >= 0) {
	    let endPart = '';
	    // extract whole part and fractional part
	    begPart = value.substring(0, dotIdx);
	    // we will concatinate whole part and fractional part, and then add zeros by multiplying by multiplier - except
	    // we need to knock off the same number of zeros as the length of the fractional part. the divisorBN will be
	    // used to knock off the zeros.
	    endPart = value.substring(dotIdx + 1, dotIdx + 1 + decimals + 1);
	    const divisorBN = (new BN(10)).pow(new BN(endPart.length));
	    if (divisorBN.gt(multiplierBN)) {
		console.log('logic error in decimalAndUnitsToBN!');
		return(null);
	    }
	    value = begPart + endPart;
	    multiplierBN = multiplierBN.div(divisorBN);
	}
	const valueBN = common.numberToBN(value);
	return(valueBN.mul(multiplierBN));
    },

    //
    // convert the passed number, which represents full units (implied 18 decimals) to wei.
    // the number can be an int or or float, or a string with or without a decimal.
    //
    // note that due to floating point limitations, we only maintain accutracy up to 9 decimal
    // places. you can pass numbers that have more than 9 decimals, but the trailing decimals
    // will be treated as zeros.
    //
    decimalToWeiBN: function(number) {
	return(common.web3.utils.toWei(common.decimalAndUnitsToBN(number, 10**9), 'gwei'));
    },

    stripNonNumber: function(number) {
	//first ensure passed parm is a string
	let numberStr = number.toString();
	if (numberStr.startsWith('0x')) {
	    numberStr = numberStr.substring(2);
	    numberStr = '0x' + numberStr.replace(/[^0-9a-fA-F]/g, '');
	} else {
	    numberStr = numberStr.replace(/[^0-9]/g, '');
	}
	return(numberStr);
    },


    //number can be a number or a string, with or without '0x'
    //Hex256 string will be '0x' followed by 64 hex digits
    numberToHex256: function(number) {
	if (typeof(number) === 'number')
	    return('0x' + common.leftPadTo(number.toString(16), 64, '0'));
	const bn = common.numberToBN(number);
	return(common.BNToHex256(bn));
    },


    //Hex256 string will be '0x' followed by 64 hex digits
    BNToHex256: function(xBN) {
	return('0x' + common.leftPadTo(xBN.toString(16), 64, '0'));
    },

/*
    hexToAscii: function(hexStr) {
	//console.error('hexToAscii');
	//first ensure passed parm is a string
	let hex = hexStr.toString();
	if (hex.startsWith('0x'))
	    hex = hex.substring(2);
	let str = '';
	for (let i = 0; i < hex.length; i += 2)
	    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	return str;
    },


    hexToBytes: function(hexStr) {
	//console.error('hexToBytes: ' + hexStr);
	//first ensure passed parm is a string
	let hex = hexStr.toString();
	if (hex.startsWith('0x'))
	    hex = hex.substring(2);
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0, j = 0; i < hex.length; i += 2)
	    bytes[j++] = parseInt(hex.substr(i, 2), 16);
	return bytes;
    },

    bytesToHex: function(byteArray) {
	const hex = Array.from(byteArray, function(byte) {
	    return('0' + (byte & 0xFF).toString(16)).slice(-2);
	}).join('')
	//console.error('bytesToHex: ' + hex);
	return(hex);
    },


    strToUtf8Bytes: function(str) {
	//javascript encodes strings as UCS2... convert to a buffer of UTF8
	const utf8Buf = Buffer.from(str, 'utf8');
	return(utf8Buf);
    },

    Utf8BytesToStr: function(utf8Bytes) {
	//javascript encodes strings as UCS2, so convert from UTF8
	const utf8Buf = Buffer.from(utf8Bytes);
	return(utf8Buf.toString('utf8'));
    },

    strToUtf8Hex: function(str) {
	//javascript encodes strings as UCS2, so for convert to a buffer of UTF8
	const utf8Buf = Buffer.from(str, 'utf8');
	return(common.bytesToHex(utf8Buf));
    },

    Utf8HexToStr: function(utf8Hex) {
	//javascript encodes strings as UCS2. use Buffer.toString to convert from utf8
	const utf8Buf = Buffer.from(common.hexToBytes(utf8Hex));
	return(utf8Buf.toString('utf8'));
    },


    hexToBase64: function(hexStr) {
	//first ensure passed parm is a string
	let hex = hexStr.toString();
	if (hex.startsWith('0x'))
	    hex = hex.substring(2);
	const base64String = Buffer.from(hex, 'hex').toString('base64');
	return(base64String);
    },


    // html image data used for img tag (<img src='image-data'>) is eg.
    //  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAACx1BMV...'
    // that is, ~20 bytes of text, followed by a comma, followed by base64 data. while we could store the whole thing as utf8,
    // that would be wasteful. so we we create our own custom format. the first byte is the length of the text (utf data), up
    // to and including the comma. followed by the utf8 encoded text, followed by the image data as a byte-stream.
    imageToBytes: function(image) {
	//console.error('imageToBytes: image = ' + image);
	const utf8Len = image.indexOf(',') + 1;
	const utf8Str = image.substring(0, utf8Len);
	//console.error('imageToBytes: utf8Str = ' + utf8Str);
	const utf8Bytes = new Uint8Array(Buffer.from(utf8Str, 'utf8'));
	const base64Str = image.substring(utf8Len);
	const imageBuf = Buffer.from(base64Str, 'base64')
	//every 4 base64 chars is 24 bits
	const bytes = new Uint8Array(1 + utf8Len + (base64Str.length / 4) * 3);
	bytes.set([ utf8Len ]);
	bytes.set(utf8Bytes, 1);
	bytes.set(imageBuf, 1 + utf8Bytes.length);
	//console.error('imageToBytes: bytes = ' + bytes);
	//console.error('imageToBytes: bytes.length = ' + bytes.length);
	return(bytes);
    },

    bytesToImage: function(bytes) {
	const utf8Bytes = bytes.slice(1, bytes[0] + 1);
	const utf8Str = Buffer.from(utf8Bytes).toString('utf8');
	//console.error('bytesToImage: utf8Str = ' + utf8Str);
	const imageBytes = bytes.slice(bytes[0] + 1);
	const base64Str = Buffer.from(imageBytes).toString('base64');
	const image = utf8Str + base64Str;
	//console.error('bytesToImage: image = ' + image);
	return(image);
    },

    hexToImage: function(utf8Hex) {
	const utf8Buf = Buffer.from(common.hexToBytes(utf8Hex));
	return(common.bytesToImage(utf8Buf));
    },

*/

    leftPadTo: function(str, desiredLen, ch) {
	if (str.length >= desiredLen)
	    return str;
	const padChar = (typeof ch !== 'undefined') ? ch : ' ';
	if (padChar == '&nbsp;' || padChar == '&#160;') {
	    let padded = '';
	    const need = desiredLen - str.length;
	    for (let i = 0; i < need; ++i)
		padded += padChar;
	    padded += str;
	    return padded;
	} else {
	    const pad = new Array(1 + desiredLen).join(padChar);
	    const padded = (pad + str.toString()).slice(-desiredLen);
	    return padded;
	}
    },

    rightPadTo: function(str, desiredLen, ch) {
	if (str.length >= desiredLen)
	    return str;
	const padChar = (typeof ch !== 'undefined') ? ch : ' ';
	const pad = new Array(1 + desiredLen).join(padChar);
	const padded = (str.toString() + pad).slice(0, desiredLen);
	//console.error('padded = X' + padded + 'X');
	return padded;
    },

    /*
    setIndexedFlag: function(prefix, index, flag) {
	//javascript bit operations are 32 bit
	const wordIdx = Math.floor(index / 32);
	const bitIdx = index % 32;
	const wordIdxStr = '0x' + wordIdx.toString(16)
	let wordStr = localStorage[prefix + '-' + wordIdxStr];
	let word = (!!wordStr) ? parseInt(wordStr) : 0;
	if (!!flag)
	    word |= (1 << bitIdx);
	else
	    word &= ~(1 << bitIdx);
	wordStr = '0x' + word.toString(16);
	localStorage[prefix + '-' + wordIdxStr] = '0x' + word.toString(16);
	//console.error('setIndexedFlag: localStorage[' + prefix + '-' + wordIdxStr + '] = ' + wordStr);
    },

    chkIndexedFlag: function(prefix, index) {
	const wordIdx = Math.floor(index / 32);
	const bitIdx = index % 32;
	const wordIdxStr = '0x' + wordIdx.toString(16)
	const wordStr = localStorage[prefix + '-' + wordIdxStr];
	console.error('chkIndexedFlag: localStorage[' + prefix + '-' + wordIdxStr + '] = ' + wordStr);
	const word = (!!wordStr) ? parseInt(wordStr) : 0;
	const flag = (word & (1 << bitIdx)) ? true : false;
	return(flag);
    },


    //find the index of the first flag that is z or nz, starting with begIndex, goin forward or backwards
    //to endIndex. returns -1 if no flag found.
    findIndexedFlag: function(prefix, begIndex, endIndex, nz) {
	const allOnes = 0xffffffff;
	const increment = (endIndex > begIndex) ? 1 : -1;
	let wordIdx = Math.floor(begIndex / 32);
	let bitIdx = begIndex % 32;
	do {
	    const wordIdxStr = '0x' + wordIdx.toString(16)
	    const wordStr = localStorage[prefix + '-' + wordIdxStr];
	    const word = (!!wordStr) ? parseInt(wordStr) : 0;
	    console.error('findFlag: localStorage[' + prefix + '-' + wordIdxStr + '] = 0x' + word.toString(16));
	    if ((!!nz && word != 0) || (!nz && (word & allOnes) != allOnes)) {
		do {
		    if ((!!nz && (word & (1 << bitIdx)) != 0) ||
			( !nz && (word & (1 << bitIdx)) == 0) ) {
			const foundIdx = wordIdx * 32 + bitIdx;
			console.error('findFlag: foundIdx = ' + foundIdx);
			return((increment > 0 && foundIdx <= endIndex) ||
			       (increment < 0 && foundIdx >= endIndex) ? foundIdx : -1);
		    }
		    bitIdx += increment;
		} while ((increment > 0 && bitIdx < 32) || (increment < 0 && bitIdx >= 0));
		//first time through it's possible to fall out, if the nz bit was
		//lt the start bitIdx
	    }
	    bitIdx = (increment > 0) ? 0 : 47;
	    wordIdx += increment;
	} while ((increment > 0 &&  wordIdx      * 32 < endIndex) ||
		 (increment < 0 && (wordIdx + 1) * 32 > endIndex));
	return(-1);
    },


    //
    // query string: ?foo=lorem&bar=&baz
    // var foo = getUrlParameterByName('foo'); // "lorem"
    // var bar = getUrlParameterByName('bar'); // "" (present with empty value)
    // var baz = getUrlParameterByName('baz'); // "" (present with no value)
    // var qux = getUrlParameterByName('qux'); // null (absent)
    //
    getUrlParameterByName: function(url, name) {
	url = url.toLowerCase();
        name = name.replace(/[\[\]]/g, "\\$&");
	name = name.toLowerCase();
        const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
        const results = regex.exec(url);
        if (!results)
            return null;
        if (!results[2])
            return '';
        const value = decodeURIComponent(results[2].replace(/\+/g, " "));
        return value;
    },
*/

    //
    // fetch the passed url
    // then(str)
    //
    /*
    fetch: function(url, extraOptions) {
	return new Promise((resolve, reject) => {
	    let timeout = false;
	    let complete = false;
	    const fetch_timer = setTimeout(function() {
		timeout = true;
		if (complete == true) {
		    return;
		} else {
		    console.error("common.fetch: timeout retrieving " + url);
		    reject('common::fetch - timout');
		}
	    }, 15000);
	    //console.log('common::fetch: fetching ' + url);
	    const options = { mode: 'cors'};
	    Object.assign(options, extraOptions);
	    fetch(url, options)
		.then((res) => {
		    return res.json();
		})
		.then((json) => {
		    common.log("common.fetch: resp = " + JSON.stringify(json), true);
		    clearTimeout(fetch_timer);
		    complete = true;
		    if (timeout == true) {
			reject('common::fetch - fetch returned after timeout! url = ' + url);
		    }
		    resolve(json);
		})
		.catch(error => {
		    clearTimeout(fetch_timer);
		    complete = true;
		    console.error("common::fetch - exeption = " + error);
		    reject('common::fetch - ' + error);
		});
	});
    },
*/
/*
    //
    // open a file for writing
    // returns: fileHandle
    //
    openFileForWrite: function(filename, mode) {
	// mode: 'w' to write 'a' to append
	return fs.createWriteStream(filename, {flags:'a'});
    },

    writeFile: function(fileHandle, text, noNewLine) {
	const newLine = noNewLine ? '' : '\n';
	fileHandle.write(text + newLine);
    },

    closeFile: function(fileHandle) {
	return new Promise((resolve, reject) => {
	    fileHandle.end();
	    common.wait(2).then(() => resolve());
	});
    },
*/

    //
    // wait
    // simple wait fcn
    //
    wait: function(seconds) {
	return new Promise((resolve, reject) => {
	    const timer = setTimeout(function() {
		resolve();
	    }, seconds * 1000);
	});
    },


    //
    // waitForTXID
    // then(receipt)
    //
    // note: the promise only resolves after the transaction is mined
    // if statusCb is set, then it is called once per second while we are waiting
    //
    spinner: [ '-\r', '\\\r', '|\r', '/\r' ],
    waitForTXID: function(txid, statusCb) {
	return new Promise((resolve, reject) => {
	    if (!txid)
		throw 'Error: no transaction hash was generated';
	    let statusCtr = 0;
	    common.waitingForTxid = true;
	    const timer = setInterval(function() {
		if ((statusCtr & 0xf) == 0) {
		    common.web3.eth.getTransactionReceipt(txid, function(err, receipt) {
			console.error('common.waitForTXID: err = ' + err + ', receipt = ' + receipt + ', waitingForTxid = ' + common.waitingForTxid);
			if (!!err || !!receipt) {
			    console.log('waitForTXID: err = ' + err + ' (' + typeof(err) + '), receipt = ' + receipt + ' (' + typeof(receipt) + ')');
			    console.log('waitForTXID: receipt = ' + JSON.stringify(receipt));
			    common.waitingForTxid = false;
			    clearInterval(timer);
			    if (!err && !!receipt && receipt.status == 0) {
				throw 'Transaction Failed with REVERT opcode';
			    } else if (!!err) {
				console.log('Error in transaction - ' + err.toString());
				throw err;
			    }
			    if (common.SHOW_DEBUG)
				console.error('transaction is in block ' + receipt.blockNumber);
			    //
			    // console.log(receipt):
			    // { "status"            : true,
			    //   "transactionHash"   : "0x9fc76417374aa880d4449a1f7f31ec597f00b1f6f3dd2d66f4c9c6c445836d8b",
			    //   "transactionIndex"  : 0,
			    //   "blockHash"         : "0xef95f2f1ed3ca60b048b4bf67cde2195961e0bba6f70bcbea9a2c4e133e34b46",
			    //   "blockNumber"       : 3,
			    //   "contractAddress"   : "0x11f4d0A3c12e86B4b5F39B213F7E19D048276DAe",
			    //   "cumulativeGasUsed" : 314159,
			    //   "gasUsed"           : 30234,
			    //   "logs"              : [{
			    //                            logs as returned by getPastLogs, etc. }, ...]
			    // for example (logs):
			    //    [ { "logIndex"         :   0,
			    //        "transactionIndex" :   0,
			    //        "transactionHash"  :   "0xfdd95800cb6818405cad62abbc43591270dade17826727ccc02248c5c3a32941",
			    //        "blockHash"        :   "0x3f3923e84999be2e9710a65ee64fb093202d9177d7f586ad0015d4a07bdb0d63",
			    //        "blockNumber"      :   10628799,
			    //        "address"          :   "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
			    //        "data"             :   "0x0000000000000000000000000000000000000000000000056bc75e2d63100000",
			    //        "topics"           : [ "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
			    //                               "0x0000000000000000000000003d1c77352f91f6da96880b99784859143adc9dd2",
			    //                               "0x000000000000000000000000794e6e91555438afc3ccf1c5076a74f42133d08d"
			    //                             ]
			    //
			    resolve(receipt);
			}
		    });
		}
		if (!!statusCb)
		    statusCb(common.spinner[++statusCtr % common.spinner.length]);
	    }, 1000);
	});
    },

    /*
    // ------------------------------------------------------------------------------------------------------------------
    // common display-related functions
    // ------------------------------------------------------------------------------------------------------------------

    //
    // asks the user if they wanto to continue
    // if INTERACTIVE_MODE is false then this is a nop.
    // otherwise, pass in a short description of what is about to happen, and await the return of the promise
    //
    // if isEvent is set, then we really aren't asking for confirmation -- we'll just notify that an event
    // occurred. if we're not in INTERACTIVE_MODE, then we treat everything as an event.
    //
    areYouSure: function(msg, isEvent, subject) {
	return new Promise((resolve, reject) => {
	    try {
		console.log('about to: ' + msg);
		console.log('type \'yes\' or y to continue; anything else will abort!');
		const result = prompt('continue? ');
		const answer = result.toLowerCase();
		if (answer != 'y' && answer != 'yes')
		    reject('process aborted by user');
		resolve('continue');
	    } catch(err) {
		reject('error sending help-me email');
	    }
	});
    },


    //
    // as a convenience, in case an error has already occurred (for example if the user rejects the transaction), you can
    // call this fcn with the error message and no txid.
    //
    clearDivChildren: function(div) {
	while (div.hasChildNodes())
            div.removeChild(div.lastChild);
	return(div);
    },


    // a div with id = statusDiv must exist. in addition classes "statusDivHide" and "statusDivShow" must exist.
    clearStatusDiv: function() {
	const statusDiv = common.replaceElemClassFromTo('statusDiv', 'statusDivShow', 'statusDivHide', true);
	common.clearDivChildren(statusDiv);
    },


    //display (or clear) "waiting for metamask" dialog
    // a div with id = metaMaskDiv must exist. in addition classes "metaMaskDivHide" and "metaMaskDivShow" must exist.
    showWaitingForMetaMask: function(show, pulse) {
	const metaMaskModal = document.getElementById('metaMaskDiv');
	if (!!show) {
	    common.replaceElemClassFromTo('metaMaskDiv', 'metaMaskDivHide', 'metaMaskDivShow', true);
	    if (!!pulse)
		common.replaceElemClassFromTo('metaMaskDiv', 'metaMaskNoPulse', 'metaMaskPulse', null);
	    else
		common.replaceElemClassFromTo('metaMaskDiv', 'metaMaskPulse', 'metaMaskNoPulse', null);
	} else {
	    common.replaceElemClassFromTo('metaMaskDiv', 'metaMaskDivShow', 'metaMaskDivHide', null);
	    common.replaceElemClassFromTo('metaMaskDiv', 'metaMaskPulse', 'metaMaskNoPulse', null);
	}
    },


    // start or stop the wait/loading icon
    // an elem with id waitIcon must exist
    setLoadingIcon: function(start) {
	const waitIcon = document.getElementById('waitIcon');
	waitIcon.style.display = (!!start) ? 'block' : 'none';
    },

    makeTextarea: function(id, className, disabled) {
	const textarea = document.createElement("textarea")
	if (!!id)
	    textarea.id = id;
	if (!!className)
	    textarea.className = className;
	textarea.rows = 1;
	textarea.readonly = 'readonly';
	if (!!disabled)
	    textarea.disabled = 'disabled';
	textarea.value = '';
	return(textarea);
    },

    makeButton: function(id, value, className, fcn) {
	const button = document.createElement("button")
	if (!!id)
	    button.id = id;
	if (!!value)
	    button.textContent = value;
	if (!!className)
	    button.className = className;
	if (!!fcn)
	    button.addEventListener('click', fcn);
	else
	    button.disabled = true;
    },
*/


    // state = 'Disabled' | 'Enabled' | 'Selected'
    // note: this doesn't actually disable the button. for that set disabled=true/false
    // preferably, set the disabled state withing a render fcn to avoid warning:
    // "Cannot flush updates when React is already rendering"
    setButtonState: function(buttonId, state) {
	var button = document.getElementById(buttonId);
	if (!button) {
	    console.error('setButtonState: could not find elem: ' + buttonId);
	} else {
	    var newClassName = 'button' + state;
	    if (button.className.indexOf('buttonDisabled') >= 0)
		button.className = (button.className).replace('buttonDisabled', newClassName);
	    else if (button.className.indexOf('buttonEnabled') >= 0)
		button.className = (button.className).replace('buttonEnabled', newClassName);
	    else if (button.className.indexOf('buttonSelected') >= 0)
		button.className = (button.className).replace('buttonSelected', newClassName);
	    else
		button.className = (button.className).replace('button', newClassName);
	}
    },

    replaceElemClassFromTo: function(elemId, from, to, disabled) {
	const elem = document.getElementById(elemId);
	if (!elem) {
	    console.error('replaceElemClassFromTo: could not find elem: ' + elemId);
	} else {
	    elem.className = (elem.className).replace(from, to);
	    elem.disabled = disabled;
	}
	return(elem);
    },

    setElemClassToOneOf: function(elemId, a, b, desired) {
	const elem = document.getElementById(elemId);
	if (!elem)
	    console.error('setElemClassToOneOf: could not find elem: ' + elemId);
	if (elem.className.indexOf(a) >= 0)
	    elem.className = (elem.className).replace(a, desired);
	else if (elem.className.indexOf(b) >= 0)
	    elem.className = (elem.className).replace(b, desired);
	return(elem);
    },


    //
    // abbreviateAddrForEns
    // nominalAddrLength: length of numeric portion of addr, not including 0x
    // nominalEnsLength: max lenth of ens name
    //
    abbreviateAddrForEns: function(addr, ensName, nominalAddrLength, nominalEnsLength) {
	let addrNumericStr = addr;
	const ensNameLength = (!!ensName) ? ensName.length : 0;
	// if no ens name, then no parens
	if (!ensName) {
	    nominalAddrLength = Math.min(40, nominalAddrLength + nominalEnsLength + 3);
	    nominalEnsLength = 0;
	}
	console.log('abbreviateAddrForEns: ' + addrNumericStr.length + ' + ' + ensNameLength + ' ? ' + (nominalAddrLength + nominalEnsLength));
	if (addrNumericStr.length + ensNameLength >= nominalAddrLength + nominalEnsLength) {
	    console.log('abbreviateAddrForEns: ensName = ' + ensName);
	    // normal length of addr is '0x' + 40 chars. field can fit '(0x' + 40 + ') ' + nominalEnsLength ens
	    // or replace addr chars with XXXX...XXXX
	    const noAddrChars = Math.max( nominalAddrLength - (((ensNameLength - nominalEnsLength) + 3 + 1) & 0xfffe), 6);
	    const cut = 40 - noAddrChars;
	    console.log('abbreviateAddrForEns: ensName.length = ' + ensNameLength + ', cut = ' + cut);
	    const remain2 = (40 - cut) / 2;
	    console.log('abbreviateAddrForEns: remain2 = ' + remain2);
	    addrNumericStr = addr.substring(0, 2 + remain2) + '...' + addr.substring(2 + 40 - remain2);
	}
	return((!!ensName) ? ensName + ' (' + addrNumericStr + ')' : addrNumericStr);
    },

};


// private vars
// transporter for nodemailer
var transporter = null;
