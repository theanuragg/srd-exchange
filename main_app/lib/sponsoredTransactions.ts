"use client";

import { type Abi, type Address, type Hex } from "viem";
import { getUserOperationHash } from "viem/account-abstraction";
import {
  getSenderNonce,
  encodeSmartAccountExecuteCallData,
  encodeSmartAccountExecuteFromData,
  buildUnsignedUserOp,
  sponsorViaAlchemy,
  computeUserOpHash,
  submitToAlchemyBundler,
  getCounterfactualAddress,
  ENTRY_POINT_V06,
} from "./userOpBuilder";
import {
  isRawEcdsaSignature,
} from "./coinbaseSmartWalletSignature";

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
    ownerAddress: params.eoaAddress,
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
  const viemHash = getUserOperationHash({
    chainId: params.chainId,
    entryPointAddress: ENTRY_POINT_V06,
    entryPointVersion: "0.6",
    userOperation: {
      ...sponsored,
      nonce: BigInt(sponsored.nonce as string),
      callGasLimit: BigInt(sponsored.callGasLimit as string),
      verificationGasLimit: BigInt(sponsored.verificationGasLimit as string),
      preVerificationGas: BigInt(sponsored.preVerificationGas as string),
      maxFeePerGas: BigInt(sponsored.maxFeePerGas as string),
      maxPriorityFeePerGas: BigInt(sponsored.maxPriorityFeePerGas as string),
      signature: "0x",
    } as never,
  });
  const expectedSender = await getCounterfactualAddress(params.eoaAddress);
  // #region agent log
  fetch('/api/debug-ingest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'247484',runId:'post-fix',hypothesisId:'B,D,E',location:'sponsoredTransactions.ts:pre-sign',message:'Sponsored userOp before signing',data:{skipInitCode:params.skipInitCode,sender:params.smartAccountAddress,eoaAddress:params.eoaAddress,expectedSender,senderMatchesExpected:expectedSender.toLowerCase()===params.smartAccountAddress.toLowerCase(),initCodeLen:((sponsored.initCode as string)||'').length,verificationGasLimit:sponsored.verificationGasLimit,callGasLimit:sponsored.callGasLimit,preVerificationGas:sponsored.preVerificationGas,userOpHash,viemHash,hashesMatch:userOpHash===viemHash},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const signature = await signHash({
    hash: userOpHash,
    smartAccountAddress: params.smartAccountAddress,
    chainId: params.chainId,
  });
  const isRawEcdsa = isRawEcdsaSignature(signature);
  // #region agent log
  fetch('/api/debug-ingest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'247484',runId:'post-fix-3',hypothesisId:'A',location:'sponsoredTransactions.ts:post-sign',message:'Signature after signEvmHash and wrap',data:{signatureLen:signature.length,isRawEcdsa,signaturePrefix:signature.slice(0,20),usedEip712:false},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const bundlerResult = await submitToAlchemyBundler({ ...sponsored, signature });
  // #region agent log
  fetch('/api/debug-ingest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'247484',runId:'post-fix',hypothesisId:'A',location:'sponsoredTransactions.ts:bundler-success',message:'Bundler accepted userOp',data:{bundlerResult,userOpHash},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  console.log("✅ Bundler accepted sponsored userOp:", { bundlerResult, userOpHash });

  return {
    userOpHash,
    transactionHash: userOpHash,
  };
}
