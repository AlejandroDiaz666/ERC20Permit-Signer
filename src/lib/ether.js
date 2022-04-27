//
// couple of utility fcn to do things relating to eth via web3 or etherscan.io
//   - check balance
//   - send eth
//
const common = require('./common');
//const ethUtils = require('ethereumjs-util');
//const ethabi = require('ethereumjs-abi');
//const ethtx = require('ethereumjs-tx');
const Web3 = require('web3');
//const Buffer = require('buffer/').Buffer;
const BN = require("bn.js");
//var ENS = require('ethereum-ens');
var Contract = require('web3-eth-contract');
const EthPermit = import('eth-permit');
//import { signDaiPermit } from 'eth-permit';
//import { signERC2612Permit } from 'eth-permit';

const ETHERSCAN_APIKEY = "VRPDB8JW4CHSQV6A6AHBMGFWRA1E9PR6BC";
var cached_block_count = "";
var block_count_refresh_sec = 0;

const ether = module.exports = {

    //
    // these variable are used to configure an appropriate node for retreiving event logs
    //
    etherscanioHost: 'api.etherscan.io',
    etherscanioHost_kovan: 'api-kovan.etherscan.io',
    etherscanioHost_ropsten: 'api-ropsten.etherscan.io',
    etherscanioHost_main: 'api.etherscan.io',
    //url = 'https://' + infuraioHost + infuraioUrlPrefix + infuraioProjectId
    infuraioHost: '',
    infuraioHost_main: 'mainnet.infura.io',
    infuraioHost_kovan: 'kovan.infura.io',
    infuraioHost_ropsten: 'ropsten.infura.io',
    infuraioUrlPrefix: '/v3/',
    infuraioProjectId:     '6a0a345bc632438882457b19427f4c79',
    infuraioProjectSecret: '5fe2228610f141928470e7dd2cb7a68e',
    //url = 'https://' + nodeSmithHost + nodeSmithUrlPrefix + '?apiKey=' + nodeSmithApiKey
    nodeSmithHost: 'ethereum.api.nodesmith.io',
    nodeSmithUrlPrefix: '',
    nodeSmithUrlPrefix_mainnet: '/v1/mainnet/jsonrpc',
    nodeSmithUrlPrefix_ropsten: '/v1/ropsten/jsonrpc',
    nodeSmithUrlPrefix_kovan: '/v1/kivan/jsonrpc',
    nodeSmithApiKey: '30a4346e567f47ae8a52278b4b7f6327',
    //
    provider: null,
    getLogsTimestamp: 0,
    getLogsTimer: null,
    account0: '',
    chainId: 0,
    //
    ensAddrCache: {},
    ensNameCache: {},
    ens: null,
    //
    LOCAL_ETH_ADDR: null,
    LOCAL_ETH_KEY: null,

    //
    // node type for retreiving event logs
    // note that infura and nodesmith have the same JSON-RPC over https interface
    // nodeType = 'infura.io' | 'nodesmith.io' | 'etherscan.io' | 'metamask' | 'custom'
    // node is only used when nodeType is set to custom
    //
    nodeType: 'infura.io',
    node: 'http://192.168.0.2:8545',
    //
    kweiHex: '3E8',
    mweiHex: 'F4240',
    gweiHex: '3B9ACA00',
    szaboHex: 'E8D4A51000',
    finneyHex: '38D7EA4C68000',
    etherHex: 'DE0B6B3A7640000',
    teraEtherHex: 'C9F2C9CD04674EDEA40000000',
    etherBN: null,


    //
    // init(providerSpec)
    // providerSpec = local | infura-ropsten | infura-main | metamask
    // then(provider);
    //
    initProvider: async function(provider) {
	console.log('initProvider: enter');
	return new Promise(async (resolve, reject) => {
	    if (provider == 'local')
		provider = new Web3.providers.HttpProvider('http://localhost:8545');
	    else if (provider == 'infura-ropsten')
		provider = new Web3.providers.WebsocketProvider('wss://ropsten.infura.io/ws/v3/' + ether.infuraioProjectId);
	    else if (provider == 'infura-kovan')
		provider = new Web3.providers.WebsocketProvider('wss://kovan.infura.io/ws/v3/'   + ether.infuraioProjectId);
	    else if (provider == 'infura-main')
		provider = new Web3.providers.WebsocketProvider('wss://mainnet.infura.io/ws/v3/' + ether.infuraioProjectId);
	    else if (provider != 'metamask') {
		reject('unknown provider: ' + provider);
		return;
	    } else {
		handleEthereum = () => {
		    console.log('initProvider.handleEthereum: enter');
		    const ethereum = window.ethereum;
		    // popup to request account access from metamask
		    ethereum.request({ method: 'eth_requestAccounts' })
			.then(accounts => {
			    if (ethereum && ethereum.isMetaMask) {
				console.log('ether.initProvider: ethereum successfully detected!');
				console.log('ether.initProvider: accounts = ' + accounts);
				//Contract.setProvider(ethereum);
				ether.account0 = accounts[0];
				ether.provider = ethereum;
				resolve(ethereum);
			    } else {
				console.log('Please install MetaMask!');
				reject('Please install MetaMask!');
			    }
			})
			.catch(err => {
			    console.log('Please install MetaMask!');
			    reject('Please install MetaMask!');
			});
		};
		if (window.ethereum) {
		    console.log('ether.initProvider: provider loaded on first try');
		    handleEthereum();
		} else {
		    window.addEventListener('ethereum#initialized', handleEthereum, { once: true });
		    // if the event is not dispatched in 3 sec, then user probably doesn't have MetaMask
		    setTimeout(handleEthereum, 3000);
		}
		return;
	    }
	    // see if non-metamask provider can access accounts
	    ether.provider = provider;
	    provider.request({ method: 'eth_requestAccounts' })
		.then(accounts => {
		    console.log('ether.initProvider: accounts = ' + accounts);
		    //Contract.setProvider(ethereum);
		    ether.account0 = accounts[0];
		    resolve(provider);
		})
		.catch(err => {
		    console.log('error accessing accounts');
		    reject('Error using provider');
		});
	});
    },

    // call initProvider first
    // init()
    // cb(networkName)
    // this can be called periodically to see if the network has changed
    init: async function(cb, localAddrOverride, localKeyOverride) {
	ether.provider.on('accountsChanged', (accounts) => { window.location.reload(); });
	ether.provider.on('chainChanged',    (chainId)  => { window.location.reload(); });
	ether.provider.on('disconnect',      (errObj)   => { window.location.reload(); });
	let network = 'Unknown Network';
	const netId = await common.provider.request({ method: 'eth_chainId' });
	console.log('netId = ' + netId)
	switch (Number(netId)) {
	case 1:
	    network = 'Mainnet';
	    console.log('This is mainnet')
	    ether.etherscanioHost = ether.etherscanioHost_main;
	    ether.etherscanioTxStatusHost = ether.etherscanioTxStatusHost_main;
	    ether.infuraioHost = ether.infuraioHost_main;
	    break
	case 2:
	    network = 'Morden test network';
	    console.log('This is the deprecated Morden test network.')
	    break
	case 3:
	    network = 'Ropsten test network';
	    console.log('This is the ropsten test network.')
	    ether.etherscanioHost = ether.etherscanioHost_ropsten;
	    ether.etherscanioTxStatusHost = ether.etherscanioTxStatusHost_ropsten;
	    ether.infuraioHost = ether.infuraioHost_ropsten;
	    break
	case 4:
	    network = 'Rinkeby test network';
	    console.log('This is the Rinkeby test network.')
	    break
	case 42:
	    network = 'Kovan test network';
	    console.log('This is the Kovan test network.')
	    ether.etherscanioHost = ether.etherscanioHost_kovan;
	    ether.etherscanioTxStatusHost = ether.etherscanioTxStatusHost_kovan;
	    ether.infuraioHost = ether.infuraioHost_kovan;
	    break
	default:
	    console.log('This is an unknown network.')
	}
	//ether.etherBN = new BN(ether.etherHex, 16);
	ether.ethPermit = await EthPermit;
	cb(network);
    },


    //
    // get current block count
    //
    get_block_count: function(callback) {
	common.log('ether.get_block_count');
	var count = -1;
	var now_sec = Math.floor(Date.now() / 1000);
	if (now_sec - block_count_refresh_sec < 5) {
	    callback(cached_block_count);
	    return;
	}
	var url = 'https://api.etherscan.io/api?module=proxy&action=eth_blockNumber';
	common.fetch(url, function(str, err) {
	    if (!str || !!err) {
		common.log("get_block_count err: " + err);
		callback(cached_block_count);
	    } else {
		common.log("get_block_count: " + JSON.stringify(str));
		//typical response is:
		// {"jsonrpc":"2.0","result":"0x2f796a","id":83}
		var blockResp = JSON.parse(str);
		var blockHexStr = blockResp.result;
		if (!!blockHexStr) {
		    count = parseInt(blockHexStr, 16);
		    cached_block_count = count;
		}
		callback(count);
	    }
	});
    },


    //
    // convertWeiToDecimal(weiStr, decimals)
    // weiStr: amount in wei; can be string or BN
    //
    // convert an amount in wei to decimal. assumes 18 decimals
    // for example: 3210000000000000000 => 3.21
    //
    convertWeiToDecimal: function(weiStr, decimals) {
	let ethStr = common.web3.utils.fromWei(weiStr, 'ether').toString();
	if (!!decimals && ethStr.indexOf('.') >= 0)
	    ethStr = ethStr.substring(0, ethStr.indexOf('.') + decimals + 1);
	return(ethStr);
    },
    convertDecimalToWeiBN: function(decimalStr) {
	return(common.numberToBN(common.web3.utils.toWei(decimalStr, 'ether')));
    },
    convertDecimalToWei: function(decimalStr) {
	return(convertDecimalToWeiBN(decimalStr).toString());
    },


    //convert an amount in wei to a comfortable representation
    //for example: 1000000000000 => '1 gwei'
    convertWeiBNToComfort: function(weiBN, decimals) {
	let units =
	    (weiBN.lt(new BN(ether.gweiHex, 16)))   ? 'Wei'    :
	    (weiBN.lt(new BN(ether.szaboHex, 16)))  ? 'Gwei'   :
	    (weiBN.lt(new BN(ether.finneyHex, 16))) ? 'Szabo'  :
	    (weiBN.lt(new BN(ether.etherHex, 16)))  ? 'Finney' : 'ether';
	//common.log('convertWeiBNToComfort: weiBN = ' + weiBN.toString(10) + ', units = ' + units);
	let comfort = common.web3.utils.fromWei(weiBN, units).toString();
	if (!!decimals && comfort.indexOf('.') >= 0)
	    comfort = comfort.substring(0, comfort.indexOf('.') + decimals + 1);
	return(comfort + ' ' + (units == 'ether' ? 'Eth' : units));
    },


    //numberAndUnits eg. 5 => { index: 0, multiplyer: 1, number: 5, units: 'Wei' }
    //number will have 3 decimal places at most
    convertWeiBNToNumberAndUnits: function(weiBN) {
	const numberAndUnits = {};
	let multiplyer;
	//common.log('convertWeiToNumberAndUnits: weiBN = ' + weiBN.toString(10));
	if (weiBN.lt(new BN(ether.kweiHex, 16))) {
	    numberAndUnits.index = 0;
	    numberAndUnits.multiplyer = '1';
	    numberAndUnits.units = 'Wei';
	} else if (weiBN.lt(new BN(ether.mweiHex, 16))) {
	    numberAndUnits.index = 1;
	    numberAndUnits.multiplyer = '1000';
	    numberAndUnits.units = 'Kwei';
	} else if (weiBN.lt(new BN(ether.gweiHex, 16))) {
	    numberAndUnits.index = 2;
	    numberAndUnits.multiplyer = '1000000';
	    numberAndUnits.units = 'Mwei';
	} else if (weiBN.lt(new BN(ether.szaboHex, 16))) {
	    numberAndUnits.index = 3;
	    numberAndUnits.multiplyer = '1000000000';
	    numberAndUnits.units = 'Gwei';
	} else if (weiBN.lt(new BN(ether.finneyHex, 16))) {
	    numberAndUnits.index = 4;
	    numberAndUnits.multiplyer = '1000000000000';
	    numberAndUnits.units = 'Szabo';
	} else if (weiBN.lt(new BN(ether.etherHex, 16))) {
	    numberAndUnits.index = 5;
	    numberAndUnits.multiplyer = '1000000000000000';
	    numberAndUnits.units = 'Finney';
	} else {
	    numberAndUnits.index = 6;
	    numberAndUnits.multiplyer = '1000000000000000000';
	    numberAndUnits.units = 'Eth';
	}
	//common.log('convertWeiToNumberAndUnits: units = ' + numberAndUnits.units);
	//common.log('convertWeiToNumberAndUnits: multiplyer = ' + numberAndUnits.multiplyer);
	const multiplyerBN = new BN(numberAndUnits.multiplyer, 10);
	const whole = weiBN.div(multiplyerBN).toNumber();
	common.log('convertWeiToNumberAndUnits: whole = ' + whole);
	//3 digit fraction
	const frac = parseInt(weiBN.mod(multiplyerBN).toNumber().toString(10).slice(0,3)) / 1000;
	//common.log('convertWeiToNumberAndUnits: frac = ' + frac);
	//common.log('convertWeiToNumberAndUnits: number = ' + (whole + frac));
	numberAndUnits.number = whole + frac;
	return(numberAndUnits);
    },


    //
    // derive the eth address belonging to the pass eth private key
    //
    private_key_to_addr: function(key) {
	key = '0x' + key;
	var err = null;
	var acct_addr = '';
	try {
	    acct_addr = ethUtils.privateToAddress(key).toString('hex')
	    acct_addr = '0x' + acct_addr;
	    //common.log('ether::private_key_to_addr - got ' + acct_addr, true);
	    return(acct_addr);
	} catch (err) {
	    common.log('ether::private_key_to_addr - error = ' + err);
	    throw(err);
	}
    },


    //
    // return(valid)
    //
    isValidAddress: function(addr) {
	return(common.web3.utils.isAddress(addr));
    },


    //
    // units: 'szabo' | 'finney' | 'ether'
    // then(balance)
    //
    getBalance: function(addr, units) {
	return(common.web3.eth.getBalance(addr)
	       .then(balance => {
		   //common.log('ether::getBalance bal = ' + balance.toString() + ', type = ' + typeof(balance));
		   return(common.web3.utils.fromWei(balance, units).toString());
	       })
	       .catch(error => {
		   common.log('ether::get_balance - error = ' + error);
		   throw error;
	       })
	      );
    },


    //
    // getERC20Balance
    // we assume 18 decimals
    // then(balance)
    //
    getERC20Balance: function(addr, tokenAddr, units) {
	return new Promise(async (resolve, reject) => {
	    try {
		const ABIArray = JSON.parse(ether.ERC20_ABI);
		const tokenContractInstance = new common.web3.eth.Contract(ABIArray, tokenAddr);
		return tokenContractInstance.methods.balanceOf(addr).call()
		    .then(balance => {
			resolve(common.web3.utils.fromWei(balance, units).toString());
		    })
		    .catch(error => {
			common.log('ether::getERC20Balance - error = ' + error);
			throw error;
		    });
	    } catch (err) {
		reject(err);
	    }
	});
    },

    //
    // getERC20Symbol
    // then(sym)
    //
    getERC20Symbol: function(tokenAddr) {
	return new Promise(async (resolve, reject) => {
	    try {
		const ABIArray = JSON.parse(ERC20PERMIT_ABI);
		const tokenContractInstance = new common.web3.eth.Contract(ABIArray, tokenAddr);
		return tokenContractInstance.methods.symbol().call()
		    .then(sym => {
			resolve(sym);
		    })
		    .catch(error => {
			console.log('ether::getERC20Symbol - error = ' + error);
			throw error;
		    });
	    } catch (err) {
		reject(err);
	    }
	});
    },


    //
    // signDaiPermit, signERC2612Permit
    // then(result) => { nonce, expiry, v, r, s }
    //
    signDaiPermit: function(tokenAddress, senderAddress, spender) {
	return(ether.ethPermit.signDaiPermit(ether.provider, tokenAddress, senderAddress, spender));
    },
    signERC2612Permit: function(tokenAddress, senderAddress, spender, value) {
	return(ether.ethPermit.signERC2612Permit(ether.provider, tokenAddress, senderAddress, spender, value));
    },


    //
    // use this to send a transaction using metamask, or using a pricvate key, if one is set
    // returns(txid)
    // units: 'wei' | 'szabo' | 'finney' | 'ether'
    //
    send: async function(toAddr, size, units, data, gasLimit) {
	if (!!ether.LOCAL_ETH_KEY) {
	    return(sendUsingPrivateKey(toAddr, size, units, data, gasLimit, gasPrice));
	} else {
	    const tx = {};
	    tx.from = ether.LOCAL_ETH_ADDR;
	    console.log('ether.send: C size = ' + size + ', units = ' + units);
	    tx.value = common.web3.utils.toWei(size, units);
	    console.log('ether.send: D');
	    tx.to = toAddr,
	    tx.data = data;
	    if (gasLimit > 0)
		tx.gas = gasLimit;
	    console.log('ether.send: calling sendTransaction; tx.value = ' + tx.value);
	    try {
		const receipt = await common.web3.eth.sendTransaction(tx);
		const txid = receipt.transactionHash;
		console.log('send: txid = ' + txid);
		return(txid);
	    } catch(err) {
		console.log('send: err = ' + err);
		throw(err);
	    }
	}
    },


    //
    // sendUsingPrivateKey
    // then(txid)
    // private key in hex, w/o leading 0x
    // units: 'wei' | 'szabo' | 'finney' | 'ether'
    // gasPrice is in gwei!!!
    //
    // this sends from the current metamask account, but you must supply the private key
    // gasLimit and gasPrice are optional
    //
    /*
    sendUsingPrivateKey: async function(toAddr, size, units, data, gasLimit, gasPrice) {
	return new Promise(async (resolve, reject) => {
	    common.log('sendUsingPrivateKey: fromAcct = ' + ether.LOCAL_ETH_ADDR, true);
	    common.log('sendUsingPrivateKey: toAcct = ' + toAddr, true);
	    common.log('sendUsingPrivateKey: size = ' + size + ', units = ' + units, true);
	    const privateKeyBuf = new Buffer(ether.LOCAL_ETH_KEY, 'hex');
	    if (!gasPrice) {
		gasPrices = await ether.getCurrentGasPrices();
		gasPrice = gasPrices.high;
	    } else if (gasPrice > 100) {
		reject('sendUsingPrivateKey: gas price is too high!');
	    }
            const nonce = await common.web3.eth.getTransactionCount(ether.LOCAL_ETH_ADDR);
	    const tx = new ethtx(null);
	    tx.to = toAddr,
	    tx.from = ether.LOCAL_ETH_ADDR;
	    tx.data = data;
	    tx.nonce = nonce;
	    tx.gasPrice = common.web3.utils.toHex(common.web3.utils.toWei(gasPrice.toString(), 'gwei'));
	    tx.value = common.web3.utils.toHex(common.web3.utils.toWei(size.toString(), units));
	    const signAndSend = (key, tx) => {
		tx.sign(key);
		const serializedTx = tx.serialize();
		const serializedTxHex = '0x' + serializedTx.toString('hex');
		common.web3.eth.sendSignedTransaction(serializedTxHex)
		    .once('transactionHash', txid => {
			//common.log('sendUsingPrivateKey: txid = ' + txid);
			resolve(txid);
		    })
		    .catch(err => {
			common.log('sendUsingPrivateKey: err = ' + err);
			reject(err);
		    });}
		;
	    if (!!gasLimit) {
		tx.gas = common.web3.utils.toHex(gasLimit.toString());
		signAndSend(privateKeyBuf, tx);
	    } else {
		common.web3.eth.estimateGas({ to: toAddr, from: ether.LOCAL_ETH_ADDR, data: data, value: size.toString(10) })
		    .then(estimate => {
			common.log('sendUsingPrivateKey: gasLimit set to computed estimate, ' + estimate, true);
			tx.gas = common.web3.utils.toHex(estimate.toString());
			signAndSend(privateKeyBuf, tx);
		    })
		    .catch(err => {
			common.log('sendUsingPrivateKey: err in estimateGas = ' + err);
			reject(err);
		    });
	    }
	});
    },
    */

    //
    // transferERC20
    // then(txid)
    //
    // private key in hex, w/o leading 0x
    // units: 'wei' | 'szabo' | 'finney' | 'ether'
    // size is a whole number (no decimal)
    // gasPrice is in gwei!!!
    //
    // this sends from the current metamask account, but you must supply the private key
    // gasLimit and gasPrice are optional
    //
    transferERC20: async function(toAddr, tokenAddr, size, units, gasLimit, gasPrice) {
	const ABIArray = JSON.parse(ether.ERC20_ABI);
	const tokenContractInstance = new common.web3.eth.Contract(ABIArray, tokenAddr);
	const weiAmount = common.web3.utils.toHex(common.web3.utils.toWei(size.toString(), units));
	const data = tokenContractInstance.methods.transfer(toAddr, weiAmount).encodeABI();
	await common.areYouSure('transfer ' + weiAmount + ' of an ERC20 token to ' + toAddr);
	return(ether.send(tokenAddr, 0, 'wei', data, gasLimit, gasPrice));
    },

    //cb(err, addr)
    ensLookup: function(name) {
	return new Promise((resolve, reject) => {
	    const cachedAddr = ether.ensAddrCache[name];
	    if (!!cachedAddr) {
		if (cachedAddr.length > 1)
		    resolve(cachedAddr);
		else
		    reject('ensLookup: cache lookup gives no addr');
		return;
	    }
	    if (!ether.ens)
		ether.ens = new ENS(common.web3.currentProvider);
	    if (name.startsWith('0x') || name.indexOf('.') < 0) {
		reject('Error: invalid ENS name');
		return;
	    }
	    ether.ens.resolver(name).addr().then((addr) => {
		ether.ensAddrCache[name] = addr;
		//forward resolution is canonical, so we can set reverse ens for address
		ether.ensNameCache[addr] = name;
		resolve(addr);
	    }, (err) => {
		ether.ensAddrCache[name] = 'X';
		reject(err);
	    });
	});
    },


    //cb(err, addr)
    ensReverseLookup: function(addrIn) {
	return new Promise((resolve, reject) => {
	    const cachedName = ether.ensNameCache[addrIn];
	    if (!!cachedName) {
		if (cachedName.length > 1)
		    resolve(cachedName);
		else
		    reject('ensReverseLookup: cache lookup gives no name');
		return;
	    }
	    console.log('ensReverseLookup');
	    if (!ether.ens)
		ether.ens = new ENS(common.web3.currentProvider);
	    if (!addrIn.startsWith('0x') || addrIn.endsWith('.eth')) {
		const err = 'ensReveseLookup: invalid address, ' + addrIn;
		console.log(err);
		reject(err);
		return;
	    }
	    ether.ens.reverse(addrIn).name().then((name) => {
		console.log('ensReveseLookup: ' + addrIn + ' got name: ' + name);
		// check to ensure name is really owned by this address by forward resolution
		ether.ensLookup(name)
		    .then(addr => {
			if (!!addr && addr.toLowerCase() == addrIn.toLowerCase()) {
			    resolve(name);
			    return;
			}
			console.log('ensReveseLookup: failed forward verification:' + addrIn + ' => ' + name);
			console.log('ensReveseLookup: but ' + name + ' => ' + addr);
			reject('ENS failed forward verification');
		    })
		    .catch(err => {
			reject(err);
		    });
	    }, (err) => {
		console.log('ensReveseLookup: ' + addrIn + ', err no name found');
		ether.ensNameCache[addrIn] = 'X';
		reject('ensReveseLookup: no name found');
	    });
	});
    },

    /*
    // getLogs(options)
    // options: { fromBlock, toBlock, address, topics[] }
    // then(result)
    //
    // get events logs matching a) one signature (in topic0), a combination of 3 id's (in topics 1,2,3).
    // topics need to be in the same order as in the event signature -- to skip one pass a null.
    // fyi, in the old days this used to be called getLogs3
    //
    getLogs: function(options) {
	return new Promise(async (resolve, reject) => {
	    const t = (err, result) => {
		if (err)
		    reject(err);
		else
		    resolve(result);
	    }
	    //common.log('getLogs: ether.nodeType = ' + ether.nodeType);
	    if (ether.nodeType == 'metamask')
		metamaskGetLogs(options, t);
	    else if (ether.nodeType == 'custom')
		customGetLogs(options, t);
	    else if (ether.nodeType == 'etherscan.io')
		etherscanGetLogs(options, t);
	    else
		infuraGetLogs(options, t);
	});
    },


    //extract hex data from the data part of an event log
    //offsetOfOffset is an offset into the hex, 0x-prefixed data string. at that offset is the bytes offset of the desired
    //item. the item is prefixed with a 32 byte length.
    extractHexData: function(data, offsetOfOffset) {
	const itemOffset = parseInt(data.slice(offsetOfOffset, offsetOfOffset+64), 16);
	const itemLen    = parseInt(data.slice(2+(2*itemOffset), 2+(2*itemOffset)+64), 16);
	const itemHex = '0x' + data.slice(2+(2*itemOffset)+64, 2+(2*itemOffset)+64+(itemLen*2));
	return(itemHex);
    },


    receiptToEvent: function(receipt, eventSignature) {
	for (let i = 0; i < receipt.logs.length; ++i) {
	    if (receipt.logs[i].topics[0] == eventSignature)
		return(receipt.logs[i]);
	}
	return null;
    },


    //
    // extract the date from an event log
    // then(Date)
    //
    // note: logs don't always seem to have a timestamp; if there's no timestamp then we derive an approximate
    // time from the blockNumber.
    //
    extractDateFromLog: function(log) {
	return new Promise(async (resolve, reject) => {
	    if (!!log.timeStamp) {
		const timeStamp = parseInt(log.timeStamp);
		resolve(new Date(timeStamp * 1000));
	    } else {
		const blockNumber = parseInt(log.blockNumber);
		common.log('extractDateFromLog: blockNumber = ' + blockNumber, true);
		try {
		    let curBlockNumber = await common.web3.eth.getBlockNumber();
		    while (blockNumber > curBlockNumber) {
			await common.wait(3);
			curBlockNumber = await common.web3.eth.getBlockNumber();
			common.log('extractDateFromLog: curBlockNumber = ' + curBlockNumber, true);
		    }
		} catch(err) {
		    common.log('extractDateFromLog: getBlockNumber err = ' + err);
		    reject(err);
		    return;
		}
		common.web3.eth.getBlock(blockNumber)
		    .then(block => {
			common.log('extractDateFromLog: block = ' + JSON.stringify(block), true);
			const timeStamp = block.timestamp;
			common.log('extractDateFromLog: blockNumber timestamp = ' + timeStamp, true);
			resolve(new Date(timeStamp * 1000));
		    }).catch(err => {
			common.log('extractDateFromLog: err = ' + err);
			reject(err);
		    });
	    }
	});
    },
    */

    //
    // contract ABI, addresses, and other boring stuff
    //
    ERC20_ABI: '[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]',

};


//cb(err, result)
// options:
// {
//   fromBlock, toBlock, address, topics[]
// }
//
/*
function customGetLogs(options, cb) {
    const web3 = new Web3(new Web3.providers.HttpProvider(ether.node));
    // make sure we don't try to access beyon where the node is synced
    web3.eth.getSyncing(function(err, syncing) {
	common.log("err: " + err + ", syncing: " + JSON.stringify(syncing));
	if (!err && !!syncing)
	    options.toBlock = syncing.currentBlock;
	common.log('customGetLogs: options = ' + JSON.stringify(options));
	const filter = web3.eth.filter(options);
	filter.get(function(err, result) {
	    filter.stopWatching();
	    cb(err, result);
	});
    });
    return;
}

//cb(err, result)
// options:
// {
//   fromBlock, toBlock, address, topics[]
// }
//
function metamaskGetLogs(options, cb) {
    const paramsStr = JSON.stringify(options);
    common.log('metamaskGetLogs: options = ' + paramsStr);
    const filter = common.web3.eth.filter(options);
    filter.get(function(err, result) {
	if (ether.nodeType == 'metamask')
	    filter.stopWatching();
	cb(err, result);
    });
    return;
}


// also for nodeSmith
// cb(err, result)
//  options:
//  {
//    fromBlock, toBlock, address, topics[]
//  }
//
function infuraGetLogs(options, cb) {
    //common.log('infuraGetLogs: ether.nodeType = ' + ether.nodeType);
    //url = 'https://' + infuraioHost + infuraioUrlPrefix + infuraioProjectId
    //url = 'https://' + nodeSmithHost + nodeSmithUrlPrefix + '?apiKey=' + nodeSmithApiKey
    let url = (ether.nodeType == 'infura.io')
	? 'https://' + ether.infuraioHost + ether.infuraioUrlPrefix + ether.infuraioProjectId
	: 'https://' + ether.nodeSmithHost + ether.nodeSmithUrlPrefix + '?apiKey=' + ether.nodeSmithApiKey;
    common.log('infuraGetLogs: url = ' + url, true);
    if (!!options.fromBlock) {
	const fromBlock = parseInt(options.fromBlock);
	if (!isNaN(fromBlock))
	    options.fromBlock = '0x' + fromBlock.toString(16);
    } else {
	options.fromBlock = 'earliest';
    }
    const paramsStr = JSON.stringify(options);
    //common.log('infuraGetLogs: paramsStr = ' + paramsStr, true);
    const body = '{"jsonrpc":"2.0","method":"eth_getLogs","params":[' + paramsStr + '],"id":1}';
    options = { method: 'post', body: body, headers: { 'Content-Type': 'application/json' } };
    //common.log('infuraGetLogs: body = ' + body, true);
    common.fetch(url, options)
	.then(resp => {
	    //common.log('infuraGetLogs: resp = ' + JSON.stringify(resp), true);
	    cb(null, resp.result);
	})
	.catch(err => {
	    const errMsg = "error retreiving events: " + err;
	    common.log('infuraGetLogs: ' + errMsg);
	    cb(errMsg, '');
	});
}
*/

// ERC20 + metadata + ERC20Permit
ERC20PERMIT_ABI = '[{"inputs":[], "stateMutability":"nonpayable", "type":"constructor"}, {"anonymous":false, "inputs":[{"indexed":true, "internalType":"address", "name":"owner", "type":"address"}, {"indexed":true, "internalType":"address", "name":"spender", "type":"address"}, {"indexed":false, "internalType":"uint256", "name":"value", "type":"uint256"}], "name":"Approval", "type":"event"}, {"anonymous":false, "inputs":[{"indexed":true, "internalType":"address", "name":"from", "type":"address"}, {"indexed":true, "internalType":"address", "name":"to", "type":"address"}, {"indexed":false, "internalType":"uint256", "name":"value", "type":"uint256"}], "name":"Transfer", "type":"event"}, {"inputs":[], "name":"DOMAIN_SEPARATOR", "outputs":[{"internalType":"bytes32", "name":"", "type":"bytes32"}], "stateMutability":"view", "type":"function"}, {"inputs":[{"internalType":"address", "name":"owner", "type":"address"}, {"internalType":"address", "name":"spender", "type":"address"}], "name":"allowance", "outputs":[{"internalType":"uint256", "name":"", "type":"uint256"}], "stateMutability":"view", "type":"function"}, {"inputs":[{"internalType":"address", "name":"spender", "type":"address"}, {"internalType":"uint256", "name":"amount", "type":"uint256"}], "name":"approve", "outputs":[{"internalType":"bool", "name":"", "type":"bool"}], "stateMutability":"nonpayable", "type":"function"}, {"inputs":[{"internalType":"address", "name":"account", "type":"address"}], "name":"balanceOf", "outputs":[{"internalType":"uint256", "name":"", "type":"uint256"}], "stateMutability":"view", "type":"function"}, {"inputs":[], "name":"decimals", "outputs":[{"internalType":"uint8", "name":"", "type":"uint8"}], "stateMutability":"view", "type":"function"}, {"inputs":[{"internalType":"address", "name":"spender", "type":"address"}, {"internalType":"uint256", "name":"subtractedValue", "type":"uint256"}], "name":"decreaseAllowance", "outputs":[{"internalType":"bool", "name":"", "type":"bool"}], "stateMutability":"nonpayable", "type":"function"}, {"inputs":[{"internalType":"address", "name":"spender", "type":"address"}, {"internalType":"uint256", "name":"addedValue", "type":"uint256"}], "name":"increaseAllowance", "outputs":[{"internalType":"bool", "name":"", "type":"bool"}], "stateMutability":"nonpayable", "type":"function"}, {"inputs":[], "name":"name", "outputs":[{"internalType":"string", "name":"", "type":"string"}], "stateMutability":"view", "type":"function"}, {"inputs":[{"internalType":"address", "name":"owner", "type":"address"}], "name":"nonces", "outputs":[{"internalType":"uint256", "name":"", "type":"uint256"}], "stateMutability":"view", "type":"function"}, {"inputs":[{"internalType":"address", "name":"owner", "type":"address"}, {"internalType":"address", "name":"spender", "type":"address"}, {"internalType":"uint256", "name":"value", "type":"uint256"}, {"internalType":"uint256", "name":"deadline", "type":"uint256"}, {"internalType":"uint8", "name":"v", "type":"uint8"}, {"internalType":"bytes32", "name":"r", "type":"bytes32"}, {"internalType":"bytes32", "name":"s", "type":"bytes32"}], "name":"permit", "outputs":[], "stateMutability":"nonpayable", "type":"function"}, {"inputs":[], "name":"symbol", "outputs":[{"internalType":"string", "name":"", "type":"string"}], "stateMutability":"view", "type":"function"}, {"inputs":[], "name":"totalSupply", "outputs":[{"internalType":"uint256", "name":"", "type":"uint256"}], "stateMutability":"view", "type":"function"}, {"inputs":[{"internalType":"address", "name":"recipient", "type":"address"}, {"internalType":"uint256", "name":"amount", "type":"uint256"}], "name":"transfer", "outputs":[{"internalType":"bool", "name":"", "type":"bool"}], "stateMutability":"nonpayable", "type":"function"}, {"inputs":[{"internalType":"address", "name":"sender", "type":"address"}, {"internalType":"address", "name":"recipient", "type":"address"}, {"internalType":"uint256", "name":"amount", "type":"uint256"}], "name":"transferFrom", "outputs":[{"internalType":"bool", "name":"", "type":"bool"}], "stateMutability":"nonpayable", "type":"function"}]';


DAI_ABI  = '[{"inputs":[{"internalType":"uint256","name":"chainId_","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"src","type":"address"},{"indexed":true,"internalType":"address","name":"guy","type":"address"},{"indexed":false,"internalType":"uint256","name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":true,"inputs":[{"indexed":true,"internalType":"bytes4","name":"sig","type":"bytes4"},{"indexed":true,"internalType":"address","name":"usr","type":"address"},{"indexed":true,"internalType":"bytes32","name":"arg1","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"arg2","type":"bytes32"},{"indexed":false,"internalType":"bytes","name":"data","type":"bytes"}],"name":"LogNote","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"src","type":"address"},{"indexed":true,"internalType":"address","name":"dst","type":"address"},{"indexed":false,"internalType":"uint256","name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":true,"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"usr","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"usr","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"burn","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"guy","type":"address"}],"name":"deny","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"usr","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"mint","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"src","type":"address"},{"internalType":"address","name":"dst","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"move","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"holder","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"bool","name":"allowed","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"usr","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"pull","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"usr","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"push","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"guy","type":"address"}],"name":"rely","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"dst","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"src","type":"address"},{"internalType":"address","name":"dst","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"wards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"}]';
