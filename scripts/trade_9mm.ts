// Necessary imports.
import router_ABI from "../abis/v3_9mm_smartRouter.json";
import { ethers } from "ethers";
require("dotenv").config();

async function main() {
  // constants
  const walletPrivateKey = process.env.WALLET_PK_2!;
  const RPC_URL = process.env.LIVE_RPC;
  const IN_TOKEN_ADDRESS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27"; // Address of WPLS token contract.
  const OUT_TOKEN_ADDRESS = "0x7c7ba94b60270bc2c7d98d3498b5ce85b870a749"; // Address of the HTP token
  const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS!; // Ensure you have this in your .env for the router's contract address

  const poolSlippageTolerance = 500n; // if needed, change according to the selected IN_TOKEN_ADDRESS and OUT_TOKEN_ADDRESS addresses. 
  
  const tradeAmountPLS = 80; // Define the amount of PLS you want to swap.

  // convert tradeAmountPLS to BigNumber
  const amountInConverted = ethers.utils.parseUnits(
    tradeAmountPLS.toString(),
    "ether"
  );

  // define services
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(walletPrivateKey, provider);
  const abiCoder = new ethers.utils.AbiCoder();

  // Instantiate contracts with the provided ABI and signer.
  const routerContract = new ethers.Contract(
    ROUTER_ADDRESS,
    router_ABI,
    signer
  );

  // ensure that everything has been set up correctly:
  console.log('\n Chain connection check')
  console.log('- signer connected: ', signer._isSigner)
  console.log('- signer address: ', signer.address)
  console.log('- provider connected: ', signer.provider._isProvider)
  console.log('- routerContract set up: ', routerContract.address)
  console.log('\n Swap params for `multicall` method')

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
      [ethers.utils.parseUnits((tradeAmountPLS * 0.88).toString(), "ether")]
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
  const txRes = await routerContract.multicall(deadline, swapDetailsinBytes, {
    gasLimit: 5000000,
    value: amountInConverted,
  });

  console.log(`- Transaction hash: ${txRes.hash}`);
  await txRes.wait();
  console.log("\nTransaction confirmed!");
}

main().catch((error) => {
  console.error("Error in main execution:", error);
});
