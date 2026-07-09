"use client";

import { type Abi, type Address, type Hex } from "viem";
import {
  getSenderNonce,
  encodeSmartAccountExecuteCallData,
  encodeSmartAccountExecuteFromData,
  encodeSmartAccountExecuteBatchFromData,
  buildUnsignedUserOp,
  sponsorViaAlchemy,
  computeUserOpHash,
  submitToAlchemyBundler,
  isAccountDeployed,
  estimateUserOpGasViaPimlico,
} from "./userOpBuilder";

export type SignHashFn = (params: {
  hash: Hex;
  smartAccountAddress?: Address;
  chainId?: number;
}) => Promise<Hex>;

async function sendUserOp(params: {
  smartAccountAddress: Address;
  eoaAddress: Address;
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
  skipInitCode?: boolean;
  chainId?: number;
}, signHash: SignHashFn): Promise<Hex> {
  const nonce = await getSenderNonce(params.smartAccountAddress, params.chainId || 56);
  const callData = encodeSmartAccountExecuteCallData({
    target: params.address,
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
    value: params.value,
  });
  const isDeployed = await isAccountDeployed(params.smartAccountAddress, params.chainId || 56);
  const userOp = buildUnsignedUserOp({
    sender: params.smartAccountAddress,
    nonce,
    callData,
    ownerAddress: isDeployed ? undefined : params.eoaAddress,
  });
  let sponsored: Record<string, unknown>;
  if (params.chainId === 43114) {
    sponsored = await estimateUserOpGasViaPimlico(userOp, params.chainId);
  } else {
    sponsored = await sponsorViaAlchemy(userOp, params.eoaAddress, params.chainId || 56);
  }
  const hash = await computeUserOpHash(sponsored, params.chainId || 56);
  const rawSignature = await signHash({
    hash,
    smartAccountAddress: params.smartAccountAddress,
    chainId: params.chainId || 56,
  });
  const result = await submitToAlchemyBundler({ ...sponsored, signature: rawSignature }, params.chainId || 56);
  return result as Hex;
}

export async function sendSponsoredContractWrite<
  const abi extends Abi,
  functionName extends string
>(params: {
  smartAccountAddress: Address;
  eoaAddress: Address;
  address: Address;
  abi: abi;
  functionName: functionName;
  args: readonly unknown[];
  value?: bigint;
  skipInitCode?: boolean;
  chainId?: number;
}, signHash: SignHashFn): Promise<Hex> {
  return sendUserOp({
    smartAccountAddress: params.smartAccountAddress,
    eoaAddress: params.eoaAddress,
    address: params.address,
    abi: params.abi as Abi,
    functionName: params.functionName as string,
    args: params.args,
    value: params.value,
    skipInitCode: params.skipInitCode,
    chainId: params.chainId,
  }, signHash);
}

export async function sendSponsoredSmartAccountTransaction(params: {
  smartAccountAddress: Address;
  eoaAddress: Address;
  transaction: {
    to: Address;
    data?: Hex;
    value?: Hex;
  };
  skipInitCode?: boolean;
  chainId?: number;
}, signHash: SignHashFn): Promise<Hex> {
  const nonce = await getSenderNonce(params.smartAccountAddress, params.chainId || 56);
  const callData = encodeSmartAccountExecuteFromData({
    target: params.transaction.to,
    data: params.transaction.data ?? "0x",
    value: BigInt(params.transaction.value ?? "0x0"),
  });
  const isDeployed = await isAccountDeployed(params.smartAccountAddress, params.chainId || 56);
  const userOp = buildUnsignedUserOp({
    sender: params.smartAccountAddress,
    nonce,
    callData,
    ownerAddress: isDeployed ? undefined : params.eoaAddress,
  });
  let sponsored: Record<string, unknown>;
  if (params.chainId === 43114) {
    sponsored = await estimateUserOpGasViaPimlico(userOp, params.chainId);
  } else {
    sponsored = await sponsorViaAlchemy(userOp, params.eoaAddress, params.chainId || 56);
  }
  const hash = await computeUserOpHash(sponsored, params.chainId || 56);
  const rawSignature = await signHash({
    hash,
    smartAccountAddress: params.smartAccountAddress,
    chainId: params.chainId || 56,
  });
  const result = await submitToAlchemyBundler({ ...sponsored, signature: rawSignature }, params.chainId || 56);
  return result as Hex;
}

export async function sendSponsoredBatchSmartAccountTransaction(params: {
  smartAccountAddress: Address;
  eoaAddress: Address;
  transactions: {
    to: Address;
    data?: Hex;
    value?: Hex;
  }[];
  skipInitCode?: boolean;
  chainId?: number;
}, signHash: SignHashFn): Promise<Hex> {
  const nonce = await getSenderNonce(params.smartAccountAddress, params.chainId || 56);
  const callData = encodeSmartAccountExecuteBatchFromData(
    params.transactions.map((tx) => ({
      target: tx.to,
      data: tx.data ?? "0x",
      value: BigInt(tx.value ?? "0x0"),
    }))
  );
  const isDeployed = await isAccountDeployed(params.smartAccountAddress, params.chainId || 56);
  const userOp = buildUnsignedUserOp({
    sender: params.smartAccountAddress,
    nonce,
    callData,
    ownerAddress: isDeployed ? undefined : params.eoaAddress,
  });
  let sponsored: Record<string, unknown>;
  if (params.chainId === 43114) {
    sponsored = await estimateUserOpGasViaPimlico(userOp, params.chainId);
  } else {
    sponsored = await sponsorViaAlchemy(userOp, params.eoaAddress, params.chainId || 56);
  }
  const hash = await computeUserOpHash(sponsored, params.chainId || 56);
  const rawSignature = await signHash({
    hash,
    smartAccountAddress: params.smartAccountAddress,
    chainId: params.chainId || 56,
  });
  const result = await submitToAlchemyBundler({ ...sponsored, signature: rawSignature }, params.chainId || 56);
  return result as Hex;
}

export async function sendSponsoredContractWriteDetailed(params: {
  smartAccountAddress: Address;
  eoaAddress: Address;
  chainId: number;
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  skipInitCode?: boolean;
}, signHash: SignHashFn): Promise<{ userOpHash: `0x${string}`; transactionHash: `0x${string}` }> {
  const nonce = await getSenderNonce(params.smartAccountAddress);
  const callData = encodeSmartAccountExecuteCallData({
    target: params.address,
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
  });
  const isDeployed = await isAccountDeployed(params.smartAccountAddress, params.chainId || 56);
  const userOp = buildUnsignedUserOp({
    sender: params.smartAccountAddress,
    nonce,
    callData,
    ownerAddress: isDeployed ? undefined : params.eoaAddress,
  });
  let sponsored: Record<string, unknown>;
  if (params.chainId === 43114) {
    sponsored = await estimateUserOpGasViaPimlico(userOp, params.chainId);
  } else {
    sponsored = await sponsorViaAlchemy(userOp, params.eoaAddress, params.chainId);
  }
  const userOpHash = await computeUserOpHash(sponsored, params.chainId || 56);
  const signature = await signHash({
    hash: userOpHash,
    smartAccountAddress: params.smartAccountAddress,
    chainId: params.chainId,
  });
  const bundlerResult = await submitToAlchemyBundler({ ...sponsored, signature }, params.chainId || 56);

  return {
    userOpHash,
    transactionHash: userOpHash,
  };
}
