import { ethers } from "hardhat";
import routerABI from "./router_ABI.json";
require("dotenv").config();

async function main() {
  // Wallet and network configuration
  const privateKey = process.env.WALLET_PK_MASTER!; // Set this in your environment variables
  const rpcEndpoint = process.env.LIVE_RPC; // Set this in your environment variables

  // Token and router details
  const HTPContractAddress = "0x7c7ba94b60270bc2c7d98d3498b5ce85b870a749"; // HTP token contract address
  const WPLSContractAddress = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27"; // Wrapped PLS contract address
  const routerContractAddress = process.env.ROUTER_ADDRESS!; // Set the router's address in your environment variables

  // Establish a connection to the blockchain
  const blockchainProvider = new ethers.JsonRpcProvider(rpcEndpoint);
  const transactionSigner = new ethers.Wallet(privateKey, blockchainProvider);

  // Define the router contract interface
  const swapRouter = new ethers.Contract(
    routerContractAddress,
    routerABI,
    transactionSigner
  );

  // Determine the amount to swap
  const amountToSwap = ethers.parseUnits("1", "ether"); // Swap 1 PLS

  // Prepare for transaction execution
  const currentBlock: any = await blockchainProvider.getBlock("latest");
  const transactionDeadline = currentBlock.timestamp + 1000; // Deadline is 1000 seconds from now

  // Carry out the swap operation
  const swapTransaction = await swapRouter.swapExactETHForTokens(
    ethers.parseUnits("0.01", "ether"), // The minimum amount of HTP to receive, set to a sensible minimum to prevent front-running
    [WPLSContractAddress, HTPContractAddress], // Swap path (PLS to HTP)
    transactionSigner.address, // Your address, receiving the HTP
    transactionDeadline, // Deadline for the swap
    { value: amountToSwap } // The amount of PLS to swap
  );

  // Transaction output
  console.log("Transaction initiated with hash:", swapTransaction.hash);
  await swapTransaction.wait(); // Await transaction confirmation
  console.log("Swap completed successfully.");
}

// Proper error handling
main().catch((error) => {
  console.error("An error occurred during the swap:", error);
  process.exitCode = 1;
});
