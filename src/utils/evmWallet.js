import { ethers } from "ethers";

const BSC_PARAMS = {
  chainId: "0x38",
  chainName: "Binance Smart Chain",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpcUrls: ["https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com"],
};

export async function detectEvmWallet() {
  if (typeof window === "undefined") return null;
  return window.ethereum || null;
}

export async function switchToBSC(ethereum) {
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_PARAMS.chainId }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [BSC_PARAMS],
      });
    } else {
      throw err;
    }
  }
}

export async function connectEvmWallet() {
  const ethereum = await detectEvmWallet();
  if (!ethereum) {
    throw new Error("NO_EVM_WALLET");
  }

  await switchToBSC(ethereum);

  const provider = new ethers.BrowserProvider(ethereum);

  const accounts = await provider.send("eth_requestAccounts", []);
  if (!accounts || accounts.length === 0) {
    throw new Error("NO_ACCOUNT");
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    address,
    signer,
    provider,
    chainId: network.chainId.toString(),
  };
}