# Simple trading script

## Installation

1. Run `npm i`

## Run against a local fork

To test the script against a local fork of PulseChain:

1. Open a new terminal and write: `npm run fork`
1. Make sure the script uses the right RPC: `const RPC_URL = 'http://127.0.0.1:8545';`
1. Make sure the script uses a local wallet provided by Hardhat: `const hardhatWalletKey = '0xac0974b..`.`
1. Make sure the following trading variables are correcT:
1. Trading direction
1. Target ratio for DAI to PLS trade
1. Target ratio for PLS to DAI trade
1. In an unused terminal, run the trade polling: `npm run trade`

## Run against a real network

Only do this once you're comfortable with the script in a local fork. And only run with small amounts of assets in your wallet for some time.

1. Change RPC url
1. Put your private key in some safe place and import it into this script, with whatever means. Don't write the key inside the script
1. Run the trade polling
   asfdasdfa
