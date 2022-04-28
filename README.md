# ERC20Permit-Signer

## Introduction

This is a utility for testing solidity contracts that implement EIP2612 (https://eips.ethereum.org/EIPS/eip-2612).

EIP2612 is a standard to allow the ERC20 approve function to be called via a 3rd party (not the token holder), when the token holder signs an appropriate message. ERC20 token contracts need to be extended in order to support this capablility. For an example, see https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/draft-ERC20Permit.sol

In fact the DAI token contract, which is one of the first ERC20 to impliment something like this, does not adhere precisely to the standard (as it was deployed before the standard was completed). This testing utility is able to test the permit feature for contracts that use the DAI semantics or the draft EIP2612 semantics. In either case the permit consists of a nonce, deadline (EIP2612) or expiry (DAI), and signature values: r, s, and v.

## Warnings

I've found the utility to be useful for unit-testing smart contracts that I've written and deployed. But bear in mind, when you generate a signed approval/permit, you are creating an authorization for someone else to spend your tokens. Don't use this utility for real tokens on the Ethereum mainnet -- or at least do so very carefully. I'd recommend using the utility for testing your own contracts, on testnets, and never sending the signed approval to someone or some contract that you don't know or haven't researched.

## Limitations

The user interface is ugly and spartan. It's only for testing.

## Installation and running

To use the utility:

* clone the repository
* `npm install`
* `npm run dev`

After entering the relevant parameters (token address, spender, amount), select the permit style (DAI or ERC2612) and click calc. Then you can use the generated signature to unit-test your contract.
