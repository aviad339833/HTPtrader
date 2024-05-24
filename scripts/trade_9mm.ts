// Necessary imports.
import router_ABI from "../abis/v3_9mm_smartRouter.json";
import { ethers } from "ethers";
require("dotenv").config();

// Global counters
let totalPLSSpent = 0;
let tradeCount = 0;
let nextTradeDelay = getRandomDelay();

// Function to get a random trade amount based on specified probabilities.
function getRandomTradeAmount() {
  const rand = Math.random();
  if (rand < 0.4) {
    return Math.floor(Math.random() * 101) + 100; // 100-200
  } else if (rand < 0.7) {
    return Math.floor(Math.random() * 301) + 200; // 200-500
  } else if (rand < 0.9) {
    return Math.floor(Math.random() * 301) + 500; // 500-800
  } else {
    return Math.floor(Math.random() * 201) + 800; // 800-1000
  }
}

// Function to get a random private key from the list.
function getRandomPrivateKey() {
  const keys = [
    process.env.WALLET_PK_1,
    process.env.WALLET_PK_2,
    process.env.WALLET_PK_3,
    process.env.WALLET_PK_4,
    process.env.WALLET_PK_5,
    process.env.WALLET_PK_6,
    process.env.WALLET_PK_7,
    process.env.WALLET_PK_8,
    process.env.WALLET_PK_9,
    process.env.WALLET_PK_10,
  ];
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
}

// Function to get a random delay between 5 to 15 minutes
function getRandomDelay() {
  return (Math.floor(Math.random() * 11) + 5) * 60 * 1000; // in milliseconds
}

// Function to update and display the countdown timer
function startCountdown() {
  let timeRemaining = nextTradeDelay / 1000;

  const intervalId = setInterval(() => {
    console.clear();
    console.log(
      `Next trade in: ${Math.floor(timeRemaining / 60)} minutes ${
        timeRemaining % 60
      } seconds`
    );
    console.log(
      `Total PLS spent: ${totalPLSSpent} | Total trades: ${tradeCount}`
    );
    timeRemaining--;

    if (timeRemaining < 0) {
      clearInterval(intervalId);
      executeTrade().catch((error) => {
        console.error("Error in execution:", error);
      });
    }
  }, 1000);
}

// Function to execute a trade
async function executeTrade() {
  // constants
  const RPC_URL = process.env.LIVE_RPC;
  const IN_TOKEN_ADDRESS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27"; // Address of WPLS token contract.
  const OUT_TOKEN_ADDRESS = "0x7c7ba94b60270bc2c7d98d3498b5ce85b870a749"; // Address of the HTP token
  const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS!; // Ensure you have this in your .env for the router's contract address

  const poolSlippageTolerance = 500n; // if needed, change according to the selected IN_TOKEN_ADDRESS and OUT_TOKEN_ADDRESS addresses.

  // Random trade amount in PLS
  const tradeAmountPLS = getRandomTradeAmount();

  // Random private key
  const walletPrivateKey = getRandomPrivateKey();

  // convert tradeAmountPLS to BigNumber
  const amountInConverted = ethers.parseUnits(
    tradeAmountPLS.toString(),
    "ether"
  );

  // define services
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(walletPrivateKey, provider);
  const abiCoder = new ethers.AbiCoder();

  // Instantiate contracts with the provided ABI and signer.
  const routerContract = new ethers.Contract(
    ROUTER_ADDRESS,
    router_ABI,
    signer
  );

  // ensure that everything has been set up correctly:
  console.log("\n Chain connection check");
  console.log("- signer connected: ", signer._isSigner);
  console.log("- signer address: ", signer.address);
  console.log("- provider connected: ", signer.provider._isProvider);
  console.log("- routerContract set up: ", routerContract.address);
  console.log("\n Swap params for `multicall` method");

  // prepare data for tokens swap
  const deadline = (Date.now() / 1000 + 60 * 20).toFixed(0); // swap tx deadline in 20 mins after calling the function (same as on 9mm swap tool)
  console.log("- `deadline`: ", deadline);

  const tokenInEncoded = abiCoder
    .encode(["address"], [IN_TOKEN_ADDRESS])
    .substring(2);

  const tokenOutEncoded = abiCoder
    .encode(["address"], [OUT_TOKEN_ADDRESS])
    .substring(2);

  const poolSlippageToleranceEncoded = abiCoder
    .encode(["uint256"], [poolSlippageTolerance])
    .substring(2);

  const receiverAddressEncoded = abiCoder
    .encode(["address"], [signer.address])
    .substring(2);

  const amountIn = abiCoder
    .encode(["uint256"], [amountInConverted])
    .substring(2);

  const minOutAmount = abiCoder
    .encode(
      ["uint256"],
      [ethers.parseUnits((tradeAmountPLS * 0.88).toString(), "ether")]
    )
    .substring(2); // for now this value is defined based on the tradeAmountPLS off chain, but in the future it should be checked whether 9mm has a specific method in the contract to fetch this info

  // prepare the swap details info in bytes[] structure
  const swapDetailsinBytes = [
    "0x04e45aaf" +
      tokenInEncoded +
      tokenOutEncoded +
      poolSlippageToleranceEncoded +
      receiverAddressEncoded +
      amountIn +
      minOutAmount +
      "0000000000000000000000000000000000000000000000000000000000000000",
  ];

  console.log("- `data(bytes[])`: ", swapDetailsinBytes);

  console.log("\n Execute the swap");
  // Execute the swap
  try {
    const txRes = await routerContract.multicall(deadline, swapDetailsinBytes, {
      gasLimit: 5000000,
      value: amountInConverted,
    });

    console.log(`- Transaction hash: ${txRes.hash}`);
    await txRes.wait();
    console.log("\nTransaction confirmed!");
    console.log(`Wallet: ${signer.address} | Amount: ${tradeAmountPLS} PLS`);

    // Log the wallet and trade amount
    console.log(
      `Executed trade from wallet: ${signer.address}, amount: ${tradeAmountPLS} PLS`
    );

    // Update counters
    totalPLSSpent += tradeAmountPLS;
    tradeCount += 1;

    // Log total PLS spent and trade count
    console.log(
      `Total PLS spent: ${totalPLSSpent} | Total trades: ${tradeCount}`
    );
  } catch (error) {
    console.error("Error executing trade:", error);
  }

  // Schedule the next trade
  nextTradeDelay = getRandomDelay();
  console.log(`Next trade in: ${nextTradeDelay / 60000} minutes`);
  startCountdown();
}

// Start the bot by executing the first trade and then starting the countdown
executeTrade().catch((error) => {
  console.error("Error in initial execution:", error);
});
