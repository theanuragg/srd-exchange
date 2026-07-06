"use client";

import { type Address, type Hex, type Abi, encodeFunctionData, encodeAbiParameters } from "viem";
import { retryWithRPCFailover } from "./rpcManager";
import { buildInitCode, COINBASE_SMART_WALLET_FACTORY, COINBASE_SMART_WALLET_FACTORY_ABI } from "./buildInitCode";

export const ENTRY_POINT_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const COINBASE_SMART_ACCOUNT_ABI = [
  {
    name: "execute",
    type: "function",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    name: "executeBatch",
    type: "function",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

const ENTRY_POINT_ABI = [
  {
    type: "function" as const,
    name: "getNonce",
    inputs: [
      { name: "sender", type: "address", internalType: "address" },
      { name: "key", type: "uint192", internalType: "uint192" },
    ],
    outputs: [{ name: "nonce", type: "uint256", internalType: "uint256" }],
    stateMutability: "view" as const,
  },
  {
    type: "function" as const,
    name: "getUserOpHash",
    inputs: [
      {
        name: "userOp",
        type: "tuple",
        internalType: "UserOperation",
        components: [
          { name: "sender", type: "address", internalType: "address" },
          { name: "nonce", type: "uint256", internalType: "uint256" },
          { name: "initCode", type: "bytes", internalType: "bytes" },
          { name: "callData", type: "bytes", internalType: "bytes" },
          { name: "callGasLimit", type: "uint256", internalType: "uint256" },
          { name: "verificationGasLimit", type: "uint256", internalType: "uint256" },
          { name: "preVerificationGas", type: "uint256", internalType: "uint256" },
          { name: "maxFeePerGas", type: "uint256", internalType: "uint256" },
          { name: "maxPriorityFeePerGas", type: "uint256", internalType: "uint256" },
          { name: "paymasterAndData", type: "bytes", internalType: "bytes" },
          { name: "signature", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "hash", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view" as const,
  },
] as const;

export async function getSenderNonce(sender: Address, chainId: number = 56): Promise<bigint> {
  const result = await retryWithRPCFailover(async (client) => {
    return client.readContract({
      address: ENTRY_POINT_V06,
      abi: ENTRY_POINT_ABI,
      functionName: "getNonce",
      args: [sender, 0n],
    });
  }, 3, chainId);
  if (result === null) throw new Error("Failed to fetch nonce from entry point after retries");
  return result;
}

export function encodeCallData(abi: Abi, functionName: string, args: readonly unknown[]): Hex {
  return encodeFunctionData({
    abi,
    functionName: functionName as never,
    args: args as never[],
  });
}

export function encodeSmartAccountExecuteCallData(params: {
  target: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
}): Hex {
  const innerData = encodeCallData(params.abi, params.functionName, params.args);
  return encodeFunctionData({
    abi: COINBASE_SMART_ACCOUNT_ABI,
    functionName: "execute",
    args: [params.target, params.value ?? 0n, innerData],
  });
}

export function encodeSmartAccountExecuteFromData(params: {
  target: Address;
  data: Hex;
  value?: bigint;
}): Hex {
  return encodeFunctionData({
    abi: COINBASE_SMART_ACCOUNT_ABI,
    functionName: "execute",
    args: [params.target, params.value ?? 0n, params.data],
  });
}

export function encodeSmartAccountExecuteBatchFromData(
  calls: { target: Address; value?: bigint; data: Hex }[]
): Hex {
  return encodeFunctionData({
    abi: COINBASE_SMART_ACCOUNT_ABI,
    functionName: "executeBatch",
    args: [
      calls.map((c) => ({
        target: c.target,
        value: c.value ?? 0n,
        data: c.data,
      })),
    ],
  });
}

const GET_ADDRESS_ABI = [
  {
    inputs: [
      { name: "owners", type: "bytes[]" },
      { name: "nonce", type: "uint256" },
    ],
    name: "getAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function getCounterfactualAddress(ownerAddress: Address, chainId: number = 56): Promise<Address> {
  const ownerBytes = encodeAbiParameters([{ type: "address" }], [ownerAddress]);
  const result = await retryWithRPCFailover(async (client) => {
    return client.readContract({
      address: COINBASE_SMART_WALLET_FACTORY,
      abi: GET_ADDRESS_ABI,
      functionName: "getAddress",
      args: [[ownerBytes], 0n],
    });
  }, 3, chainId);
  if (result === null) throw new Error("Failed to compute counterfactual address");
  return result;
}

export async function isAccountDeployed(address: Address, chainId: number = 56): Promise<boolean> {
  const result = await retryWithRPCFailover(async (client) => {
    return client.getCode({ address });
  }, 3, chainId);
  return result !== null && result !== "0x";
}

export function buildUnsignedUserOp(params: {
  sender: Address;
  nonce: bigint;
  callData: Hex;
  ownerAddress?: Address;
}): Record<string, unknown> {
  return {
    sender: params.sender,
    nonce: ("0x" + params.nonce.toString(16)) as Hex,
    initCode: params.ownerAddress ? buildInitCode(params.ownerAddress) : ("0x" as Hex),
    callData: params.callData,
    callGasLimit: "0x0" as Hex,
    verificationGasLimit: "0x0" as Hex,
    preVerificationGas: "0x0" as Hex,
    maxFeePerGas: "0x0" as Hex,
    maxPriorityFeePerGas: "0x0" as Hex,
    paymasterAndData: "0x" as Hex,
  };
}

export async function sponsorViaAlchemy(
  userOp: Record<string, unknown>,
  eoaAddress?: Address,
  chainId: number = 56
): Promise<Record<string, unknown>> {
  const response = await fetch("/api/user-operations/sponsor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userOperation: userOp, eoaAddress, chainId }),
  });
  const responseText = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Sponsor route returned ${response.status}: non-JSON response — ${responseText.slice(0, 500)}`
    );
  }
  if (!response.ok || !data.success) {
    throw new Error(
      (data.error as string) || `Sponsor route returned ${response.status}: ${responseText.slice(0, 500)}`
    );
  }
  return data.userOperation as Record<string, unknown>;
}

export async function computeUserOpHash(userOp: Record<string, unknown>, chainId: number = 56): Promise<Hex> {
  const op = {
    sender: userOp.sender as Address,
    nonce: BigInt(userOp.nonce as string),
    initCode: (userOp.initCode as Hex) ?? "0x",
    callData: userOp.callData as Hex,
    callGasLimit: BigInt(userOp.callGasLimit as string),
    verificationGasLimit: BigInt(userOp.verificationGasLimit as string),
    preVerificationGas: BigInt(userOp.preVerificationGas as string),
    maxFeePerGas: BigInt(userOp.maxFeePerGas as string),
    maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas as string),
    paymasterAndData: (userOp.paymasterAndData as Hex) ?? "0x",
    signature: "0x" as Hex,
  };

  const result = await retryWithRPCFailover(async (client) => {
    return client.readContract({
      address: ENTRY_POINT_V06,
      abi: ENTRY_POINT_ABI,
      functionName: "getUserOpHash",
      args: [op],
    });
  }, 3, chainId);
  if (result === null) throw new Error("Failed to compute userOp hash from entry point");
  return result;
}

function getAlchemyRpcUrl(chainId: number): string {
  switch (chainId) {
    case 1: return "https://eth-mainnet.g.alchemy.com/v2";
    case 137: return "https://polygon-mainnet.g.alchemy.com/v2";
    case 42161: return "https://arb-mainnet.g.alchemy.com/v2";
    case 8453: return "https://base-mainnet.g.alchemy.com/v2";
    case 10: return "https://opt-mainnet.g.alchemy.com/v2";
    case 11155111: return "https://eth-sepolia.g.alchemy.com/v2";
    case 56:
    default: return "https://bnb-mainnet.g.alchemy.com/v2";
  }
}

export async function submitToAlchemyBundler(userOp: Record<string, unknown>, chainId: number = 56): Promise<Hex> {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_ALCHEMY_API_KEY");
  const rpcUrl = getAlchemyRpcUrl(chainId);

  const response = await fetch(`${rpcUrl}/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_sendUserOperation",
      params: [userOp, ENTRY_POINT_V06],
    }),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(`Alchemy bundler error: ${data.error.message}`);
  }
  return data.result as Hex;
}

export async function waitForUserOperationReceipt(userOpHash: Hex, chainId: number = 56, retries = 30): Promise<any> {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_ALCHEMY_API_KEY");
  const rpcUrl = getAlchemyRpcUrl(chainId);

  for (let i = 0; i < retries; i++) {
    const response = await fetch(`${rpcUrl}/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getUserOperationReceipt",
        params: [userOpHash],
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.result) {
        return data.result;
      }
    }
    // Wait 2 seconds before polling again
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Timeout waiting for UserOperation receipt");
}

export function buildDeployTxData(ownerAddress: Address) {
  const ownerBytes = encodeAbiParameters([{ type: "address" }], [ownerAddress]);
  const factoryCalldata = encodeFunctionData({
    abi: COINBASE_SMART_WALLET_FACTORY_ABI,
    functionName: "createAccount",
    args: [[ownerBytes], 0n],
  });
  return {
    to: COINBASE_SMART_WALLET_FACTORY as Address,
    data: factoryCalldata,
  };
}

export async function broadcastRawTx(rawTx: Hex, chainId: number = 56): Promise<Hex> {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_ALCHEMY_API_KEY");
  const rpcUrl = getAlchemyRpcUrl(chainId);
  const response = await fetch(`${rpcUrl}/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_sendRawTransaction",
      params: [rawTx],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(`RPC error: ${data.error.message}`);
  return data.result as Hex;
}
