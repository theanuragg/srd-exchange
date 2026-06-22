import { type Address, type Hex, encodeAbiParameters, encodeFunctionData } from "viem";

export const COINBASE_SMART_WALLET_FACTORY = "0xBA5ED110eFDBa3D005bfC882d75358ACBbB85842";

export const COINBASE_SMART_WALLET_FACTORY_ABI = [
  {
    name: "createAccount",
    type: "function",
    inputs: [
      { name: "owners", type: "bytes[]" },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [{ name: "account", type: "address" }],
    stateMutability: "payable",
  },
] as const;

export function buildInitCode(ownerAddress: Address): Hex {
  const ownerBytes = encodeAbiParameters([{ type: "address" }], [ownerAddress]);
  const factoryCalldata = encodeFunctionData({
    abi: COINBASE_SMART_WALLET_FACTORY_ABI,
    functionName: "createAccount",
    args: [[ownerBytes], 0n],
  });
  return (COINBASE_SMART_WALLET_FACTORY + factoryCalldata.slice(2)) as Hex;
}
