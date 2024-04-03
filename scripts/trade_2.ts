// Necessary imports.
import router_ABI from "../abis/piteas_router_ABI.json";
import axios from "axios";
import { BigNumber, ethers } from "ethers";

require("dotenv").config();

const getQuote = async (
  tokenInAddress: string,
  tokenOutAddress: string,
  amount: BigNumber,
  allowedSlippage: number
) => {
  try {
    const quoteUrl = `https://sdk.piteas.io/quote?tokenInAddress=${tokenInAddress}&tokenOutAddress=${tokenOutAddress}&amount=${amount}&allowedSlippage=${allowedSlippage}`;
    const response = await axios.get(quoteUrl);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to get quote");
  }
};

async function main() {
  const walletPrivateKey = process.env.WALLET_PK_2!;
  const RPC_URL = process.env.LIVE_RPC;
  const IN_ADDRESS = "PLS"; // Address of PLS token contract.
  // const IN_ADDRESS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27"; // Address of WPLS token contract.
  const OUT_ADDRESS = "0x7c7ba94b60270bc2c7d98d3498b5ce85b870a749"; // Address of HTP token contract.
  const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS!; // Ensure you have this in your .env for the router's contract address

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(walletPrivateKey, provider);

  // collect required data for tx
  const nonce = await provider.getTransactionCount(signer.address, "pending");
  const gasPrice = await provider.getGasPrice();
  const gasLimit = 3000000;
  const tradeAmountPLS = 100;
  const amountIn = ethers.utils.parseUnits(tradeAmountPLS.toString(), "ether"); // Convert the amount to the correct unit.
  const quote = await getQuote(IN_ADDRESS, OUT_ADDRESS, amountIn, 0.5);
  const chainId = (await provider.getNetwork()).chainId;

  // prepate tx structure
  const tx = {
    nonce: nonce,
    gasPrice: gasPrice,
    gasLimit: gasLimit,
    to: ROUTER_ADDRESS, // Piteas Router Address
    data: quote.methodParameters.calldata,
    value: amountIn,
    chainId,
  };

  console.log("tx: ", tx);

  // sign and send the tx
  const signedTx = await signer.signTransaction(tx);
  const txResponse = await provider.sendTransaction(signedTx);
  console.log("Transaction sent:", txResponse.hash);
  const receipt = await txResponse.wait();

  console.log("Transaction mined:", receipt);
}

main().catch((error) => {
  console.error("Error in main execution:", error);
});
