// Necessary imports.
import { ethers } from "hardhat";
import router_ABI from "../abis/piteas_router_ABI.json";
import { toBeHex } from "ethers";
require("dotenv").config();

async function main() {
  const tradeAmountPLS = "100"; // Define the amount of PLS you want to swap.
  const walletPrivateKey = process.env.WALLET_PK_2!;
  const RPC_URL = process.env.LIVE_RPC;
  const HTP_ADDRESS = "0x7c7ba94b60270bc2c7d98d3498b5ce85b870a749";
  const WRAP_CONTRACT_ADDRESS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27"; // Address of WPLS token contract.
  const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS!; // Ensure you have this in your .env for the router's contract address

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(walletPrivateKey, provider);

  // Instantiate contracts with the provided ABI and signer.
  const routerContract = new ethers.Contract(
    ROUTER_ADDRESS,
    router_ABI,
    signer
  );

  const amountIn = ethers.parseUnits(tradeAmountPLS, "ether"); // Convert the amount to the correct unit.

  // Prepare the swap details based on the ABI's requirements
  const swapDetails = {
    srcToken: WRAP_CONTRACT_ADDRESS,
    destToken: HTP_ADDRESS,
    destAccount: signer.address, // Assuming you want the swapped tokens to be sent to the same address
    srcAmount: amountIn,
    destMinAmount: 0, // Set to 0 or a minimum acceptable amount of the dest token
  };

  // No extra data needed for this swap, hence passing an empty bytes array
  const data = "0x";

  // Execute the swap
  const txResponse = await routerContract.swap(swapDetails, data, {
    value: amountIn, // Necessary if the source token is ETH or WETH, otherwise adjust accordingly
    gasLimit: toBeHex(250000), // Estimate or adjust the gas limit as necessary
  });

  console.log(`Transaction hash: ${txResponse.hash}`);
  await txResponse.wait();
  console.log("Transaction confirmed!");
}

main().catch((error) => {
  console.error("Error in main execution:", error);
});
