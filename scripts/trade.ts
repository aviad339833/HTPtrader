import { ethers } from "hardhat";
import pair_ABI from "./pair_ABI.json";
import router_ABI from "./router_ABI.json";
import wpls_ABI from "./wpls_ABI.json";
import { setNonce } from "@nomicfoundation/hardhat-toolbox/network-helpers";

async function main() {
  // The three most important variables
  const targetRatioDecimalsPLStoDai = 0.0000338;
  const targetRatioDecimalsDaiToPLS = 2874;
  const tradePLStoDAI = true; // true if trading PLS to DAI, false if DAI to PLS

  // two next important variables
  const hardhatWalletKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const RPC_URL = 'http://127.0.0.1:8545';
  //const RPC_URL = 'https://rpc.pulsechain.com';

  const amplifier = 10000000000n; // to get rid of rounding issues

  let targetRatio : BigInt;
  if (tradePLStoDAI) {
    targetRatio =  BigInt(Math.round(Number(amplifier) * targetRatioDecimalsPLStoDai));
  }
  else {
    targetRatio =  BigInt(Math.round(Number(amplifier) * targetRatioDecimalsDaiToPLS));
  }

  // In PulseChain mainnet
  const DAI_ADDRESS = '0xefD766cCb38EaF1dfd701853BFCe31359239F305';
  const WPLS_ADDRESS = '0xa1077a294dde1b09bb078844df40758a5d0f9a27';
  const PAIR_ADDRESS = '0xe56043671df55de5cdf8459710433c10324de0ae';
  const ROUTER_ADDRESS = '0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02';

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(hardhatWalletKey, provider);

   const pair_contract = new ethers.Contract(
    PAIR_ADDRESS,
    pair_ABI,
    signer
  ); 
  let router_contract = new ethers.Contract(
    ROUTER_ADDRESS,
    router_ABI,
    signer
  ); 
/*   const wpls_contract = new ethers.Contract(
    WPLS_ADDRESS,
    wpls_ABI,
    signer
  );  */
  const dai_contract = new ethers.Contract(
    DAI_ADDRESS,
    wpls_ABI,
    signer
  ); 

  const getRatio = async () => {
      try {          
          const reserves = await pair_contract.getReserves();
          let ratio : BigInt;
          if (tradePLStoDAI) {
            ratio = (amplifier * reserves[1]) / reserves[0];
          }
          else {
            ratio = (amplifier * reserves[0]) / reserves[1];
          }

          return ratio;

      } catch (err) {
          console.error('Error fetching ratio:', err);
      }
  } 


  const tradeIfRatio = async () => {
    const ratio = await getRatio();
    console.log(`Ratio: ${ratio}, targetRatio: ${targetRatio}`);
    if (ratio && 
      ((tradePLStoDAI && ratio > targetRatio) || // the ratio should be above the target ratio
      (!tradePLStoDAI && ratio < targetRatio)))  // the ratio should be below the target ratio
      {
      console.log(`hurray, let's trade, direction: `, tradePLStoDAI);

      // Get the blockchain's timestamp
      const block = await provider.getBlock('latest');
      const timestamp = block!.timestamp;
      const deadline = timestamp + (1000); // add a bit of extra time before deadline. in seconds

      //const oldWPLSBalance = await wpls_contract.balanceOf(signer.address);
      const oldDaiBalance = await dai_contract.balanceOf(signer.address);
      const oldNativeBalance = await provider.getBalance(signer.address);

      const executeTrade = async () => {
        if (tradePLStoDAI) {
          const inputPLS = oldNativeBalance / 100n * 97n; // leave 3% for gas costs

          await router_contract.swapExactETHForTokens(
            1, // amountOutMin (uint256) (slippage)
            [WPLS_ADDRESS, DAI_ADDRESS], // path (address[])
            signer.address, // to (address)
            deadline, // deadline (uint256)
            { value: inputPLS }
          )
        }
        else {
          if (oldDaiBalance == 0) {
            throw "No DAI to trade";
          }

          // Add approval to withdraw our DAI
          await dai_contract.approve(ROUTER_ADDRESS, oldDaiBalance);

          // Unsure why we have to manually adjust the nonce
          const nonce = await signer.getNonce();

          await router_contract.swapExactTokensForETH(
            oldDaiBalance, // amountIn (uint256)
            1, // amountOutMin (uint256) (slippage)
            [DAI_ADDRESS, WPLS_ADDRESS], // path (address[])
            signer.address, // to (address)
            deadline, // deadline (uint256)
            { nonce: nonce }
          )
        }        
      }

      await executeTrade();

      //const newWPLSBalance = await wpls_contract.balanceOf(signer.address);
      const newDaiBalance = await dai_contract.balanceOf(signer.address);
      const newNativeBalance = await provider.getBalance(signer.address);

      //console.log(`WPLS balances. Old: ${oldWPLSBalance}. New: ${newWPLSBalance}. Diff: ${newWPLSBalance - oldWPLSBalance}` );
      console.log(`DAI balances. Old: ${oldDaiBalance}. New: ${newDaiBalance}. Diff: ${newDaiBalance - oldDaiBalance}` );
      console.log(`Native balances. Old: ${oldNativeBalance}. New: ${newNativeBalance}. Diff: ${newNativeBalance - oldNativeBalance}` );

      throw "Purchase done";
    }
    else {
      console.log(`shitty price, let's not trade`);
      return false;
    }
  }

  // Code borrowed from https://dev.to/jakubkoci/polling-with-async-await-25p4
  async function poll(ms : number) {
    let result = await tradeIfRatio();
    while (true) {
      await wait(ms);
      result = await tradeIfRatio();
    }
  }  
  function wait(ms : number) {
    return new Promise(resolve => {
      console.log(`waiting ${ms} ms...`);
      setTimeout(resolve, ms);
    });
  }

  // Polling, every 5 seconds
  await poll(5000);  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
