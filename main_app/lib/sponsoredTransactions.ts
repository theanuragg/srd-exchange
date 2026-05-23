"use client";

import { getUserOperationHash } from "viem/account-abstraction";
import {
  type Abi,
  type Address,
  type Hex,
  encodeFunctionData,
} from "viem";

import { type UserOperation, sanitizeUnsignedUserOperation } from "@/lib/userOperation";

const BNB_CHAIN_ID = 56;
const RAW_ECDSA_SIGNATURE_HEX_LENGTH = 132;

type SmartAccountLike = {
  buildUserOperation: (params: {
    tx:
      | {
          to: Address;
          data?: Hex;
          value?: Hex;
        }
      | Array<{
          to: Address;
          data?: Hex;
          value?: Hex;
        }>;
  }) => Promise<{
    userOp: Record<string, unknown>;
    userOpHash: string;
  }>;
  signUserOpHash: (userOpHash: Hex) => Promise<string>;
  signUserOperation: (params: any) => Promise<any>;
  sendUserOperation: (params: any) => Promise<string>;
  isDeployed: () => Promise<boolean>;
  deployWalletContract: () => Promise<string>;
  getAccount: () => Promise<{
    isDeployed: boolean;
    entryPointAddress: string;
    factoryAddress: string;
    smartAccountAddress: string;
    implementationAddress: string;
  }>;
};

const sponsorUserOperation = async (
  userOperation: UserOperation,
  chainId: number
): Promise<{
  userOperation: UserOperation;
  entryPoint: Address;
  entryPointVersion: "0.6" | "0.7";
}> => {
  const response = await fetch("/api/user-operations/sponsor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chainId,
      userOperation,
    }),
  });

  const data = await response.json();

  if (
    !response.ok ||
    !data.success ||
    !data.userOperation ||
    typeof data.entryPoint !== "string" ||
    (data.entryPointVersion !== "0.6" && data.entryPointVersion !== "0.7")
  ) {
    throw new Error(data.error || "Failed to sponsor user operation");
  }

  return {
    userOperation: data.userOperation as UserOperation,
    entryPoint: data.entryPoint as Address,
    entryPointVersion: data.entryPointVersion as "0.6" | "0.7",
  };
};

const sendSignedUserOperation = async (
  userOperation: UserOperation,
  chainId: number
): Promise<Hex> => {
  const response = await fetch("/api/user-operations/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chainId,
      userOperation,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success || typeof data.userOpHash !== "string") {
    throw new Error(data.error || "Failed to send user operation");
  }

  return data.userOpHash as Hex;
};

async function ensureWalletDeployed(smartAccount: SmartAccountLike): Promise<void> {
  try {
    const isDeployed = await smartAccount.isDeployed();
    if (!isDeployed) {
      console.warn("Smart account not deployed on BSC — deploying via Particle bundler first");
      await smartAccount.deployWalletContract();
    }
  } catch {
    console.warn("Failed to check/deploy wallet (may already be deployed or in progress)");
  }
}

export async function buildSponsoredSmartAccountTransaction(params: {
  smartAccount: SmartAccountLike;
  chainId: number;
  transaction: {
    to: Address;
    data?: Hex;
    value?: Hex;
  };
}): Promise<{
  userOperation: UserOperation;
  userOpHash: Hex;
}> {
  const { smartAccount, chainId, transaction } = params;

  if (chainId !== BNB_CHAIN_ID) {
    throw new Error(`Sponsored user operations are only enabled on BNB Chain (${BNB_CHAIN_ID}).`);
  }

  await ensureWalletDeployed(smartAccount);
  const accountInfo = await smartAccount.getAccount();

  const userOpBundle = await smartAccount.buildUserOperation({
    tx: transaction,
  });

  const unsignedUserOperation = sanitizeUnsignedUserOperation(
    userOpBundle.userOp as UserOperation
  );

  const sponsorship = await sponsorUserOperation(
    unsignedUserOperation,
    chainId
  );

  const sponsoredUserOp = { ...sponsorship.userOperation };
  const rawInitCode = (sponsoredUserOp as Record<string, unknown>).initCode as string | undefined;
  if (rawInitCode && rawInitCode.length > 2) {
    console.warn("[sponsoredTx] clearing initCode (account already deployed)", { initCode: rawInitCode });
    (sponsoredUserOp as { initCode: Hex }).initCode = "0x";
  }

  const entryPointVersion = "0.6";

  const userOpHash = getUserOperationHash({
    chainId,
    entryPointAddress: sponsorship.entryPoint,
    entryPointVersion,
    userOperation: sponsoredUserOp as never,
  });

  console.log("[sponsoredTx] debug", {
    userOpHash,
    implementationAddress: accountInfo.implementationAddress,
    signatureLen: (sponsoredUserOp.signature as string | undefined)?.length,
    initCode: (sponsoredUserOp as Record<string, unknown>).initCode,
    particleUserOpHash: userOpBundle.userOpHash,
    hashesMatch: userOpBundle.userOpHash === userOpHash,
    forcedEntryPointVersion: entryPointVersion,
    sponsorEntryPointVersion: sponsorship.entryPointVersion,
  });

  return {
    userOperation: sponsoredUserOp as UserOperation,
    userOpHash,
  };
}

export async function sendSponsoredSmartAccountTransaction(params: {
  smartAccount: SmartAccountLike;
  chainId: number;
  transaction: {
    to: Address;
    data?: Hex;
    value?: Hex;
  };
}): Promise<Hex> {
  const { userOperation, userOpHash } = await buildSponsoredSmartAccountTransaction(params);
  const bundleResult = await params.smartAccount.sendUserOperation({
    userOp: userOperation,
    userOpHash,
  }) as Hex;

  const realTxHash = await pollTransactionHash(userOpHash);
  return realTxHash ?? bundleResult;
}

export async function sendSponsoredContractWrite<
  const abi extends Abi,
  functionName extends string
>(params: {
  smartAccount: SmartAccountLike;
  chainId: number;
  address: Address;
  abi: abi;
  functionName: functionName;
  args: readonly unknown[];
  value?: bigint;
}): Promise<Hex> {
  const result = await sendSponsoredContractWriteDetailed(params);
  return result.transactionHash;
}

async function pollTransactionHash(
  userOpHash: Hex,
  maxAttempts = 10,
  intervalMs = 1500
): Promise<Hex | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`/api/user-operations/receipt?userOpHash=${userOpHash}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && data.transactionHash && data.transactionHash.startsWith("0x")) {
        return data.transactionHash as Hex;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

export async function sendSponsoredContractWriteDetailed<
  const abi extends Abi,
  functionName extends string
>(params: {
  smartAccount: SmartAccountLike;
  chainId: number;
  address: Address;
  abi: abi;
  functionName: functionName;
  args: readonly unknown[];
  value?: bigint;
}): Promise<{
  userOpHash: Hex;
  transactionHash: Hex;
}> {
  const data = encodeFunctionData({
    abi: params.abi as Abi,
    functionName: params.functionName as never,
    args: params.args as never[],
  } as any);

  const { userOperation, userOpHash } = await buildSponsoredSmartAccountTransaction({
    smartAccount: params.smartAccount,
    chainId: params.chainId,
    transaction: {
      to: params.address,
      data,
      value: params.value ? (`0x${params.value.toString(16)}` as Hex) : undefined,
    },
  });

  const bundleResult = (await params.smartAccount.sendUserOperation({
    userOp: userOperation,
    userOpHash,
  })) as Hex;

  console.log("[sendSponsoredContractWriteDetailed] submitted userOp", {
    userOpHash,
    bundleResult,
  });

  const realTxHash = await pollTransactionHash(userOpHash);

  return {
    userOpHash,
    transactionHash: realTxHash ?? bundleResult,
  };
}

export async function buildSponsoredContractWriteUserOperation<
  const abi extends Abi,
  functionName extends string
>(params: {
  smartAccount: SmartAccountLike;
  chainId: number;
  address: Address;
  abi: abi;
  functionName: functionName;
  args: readonly unknown[];
  value?: bigint;
}): Promise<UserOperation> {
  const data = encodeFunctionData({
    abi: params.abi as Abi,
    functionName: params.functionName as never,
    args: params.args as never[],
  } as any);

  const { userOperation } = await buildSponsoredSmartAccountTransaction({
    smartAccount: params.smartAccount,
    chainId: params.chainId,
    transaction: {
      to: params.address,
      data,
      value: params.value ? (`0x${params.value.toString(16)}` as Hex) : undefined,
    },
  });

  return userOperation;
}
