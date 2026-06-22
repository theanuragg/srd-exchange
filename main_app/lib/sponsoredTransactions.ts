"use client";

import { type Abi, type Address, type Hex } from "viem";
import {
  getSenderNonce,
  encodeSmartAccountExecuteCallData,
  encodeSmartAccountExecuteFromData,
  buildUnsignedUserOp,
  sponsorViaAlchemy,
  computeUserOpHash,
  submitToAlchemyBundler,
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
}, signHash: SignHashFn): Promise<Hex> {
  const nonce = await getSenderNonce(params.smartAccountAddress);
  const callData = encodeSmartAccountExecuteCallData({
    target: params.address,
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
    value: params.value,
  });
  const userOp = buildUnsignedUserOp({
    sender: params.smartAccountAddress,
    nonce,
    callData,
    ownerAddress: params.skipInitCode ? undefined : params.eoaAddress,
  });
  const sponsored = await sponsorViaAlchemy(userOp, params.eoaAddress);
  const hash = await computeUserOpHash(sponsored);
  const rawSignature = await signHash({
    hash,
    smartAccountAddress: params.smartAccountAddress,
    chainId: 56,
  });
  const result = await submitToAlchemyBundler({ ...sponsored, signature: rawSignature });
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
}, signHash: SignHashFn): Promise<Hex> {
  const nonce = await getSenderNonce(params.smartAccountAddress);
  const callData = encodeSmartAccountExecuteFromData({
    target: params.transaction.to,
    data: params.transaction.data ?? "0x",
    value: BigInt(params.transaction.value ?? "0x0"),
  });
  const userOp = buildUnsignedUserOp({
    sender: params.smartAccountAddress,
    nonce,
    callData,
    ownerAddress: params.skipInitCode ? undefined : params.eoaAddress,
  });
  const sponsored = await sponsorViaAlchemy(userOp, params.eoaAddress);
  const hash = await computeUserOpHash(sponsored);
  const rawSignature = await signHash({
    hash,
    smartAccountAddress: params.smartAccountAddress,
    chainId: 56,
  });
  const result = await submitToAlchemyBundler({ ...sponsored, signature: rawSignature });
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
  const userOp = buildUnsignedUserOp({
    sender: params.smartAccountAddress,
    nonce,
    callData,
    ownerAddress: params.skipInitCode ? undefined : params.eoaAddress,
  });
  const sponsored = await sponsorViaAlchemy(userOp, params.eoaAddress);
  const userOpHash = await computeUserOpHash(sponsored);
  const signature = await signHash({
    hash: userOpHash,
    smartAccountAddress: params.smartAccountAddress,
    chainId: params.chainId,
  });
  const bundlerResult = await submitToAlchemyBundler({ ...sponsored, signature });

  return {
    userOpHash,
    transactionHash: userOpHash,
  };
}
