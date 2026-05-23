import "server-only";

import { encodeFunctionData, decodeFunctionResult } from "viem";
import { getUserOperationHash } from "viem/account-abstraction";

import { UserOperation, isHexString, Hex } from "@/lib/userOperation";
import { attachSponsoredPaymasterData } from "@/lib/server/alchemyPaymaster";

const MIN_VERIFICATION_GAS = 1_500_000n;
const RAW_ECDSA_SIGNATURE_HEX_LENGTH = 132;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
};

const ENTRY_POINT_V06_GET_USER_OP_HASH_ABI = [
  {
    name: "getUserOpHash",
    type: "function",
    inputs: [
      {
        type: "tuple",
        components: [
          { name: "sender", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "initCode", type: "bytes" },
          { name: "callData", type: "bytes" },
          { name: "callGasLimit", type: "uint256" },
          { name: "verificationGasLimit", type: "uint256" },
          { name: "preVerificationGas", type: "uint256" },
          { name: "maxFeePerGas", type: "uint256" },
          { name: "maxPriorityFeePerGas", type: "uint256" },
          { name: "paymasterAndData", type: "bytes" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
] as const;

async function verifyUserOpHash(
  userOp: UserOperation,
  entryPoint: string
): Promise<void> {
  const chainId = 56;

  const v06Hash = getUserOperationHash({
    chainId,
    entryPointAddress: entryPoint as `0x${string}`,
    entryPointVersion: "0.6",
    userOperation: userOp as never,
  });

  console.log("[hashVerify] viem v0.6 hash:", v06Hash);

  const v07Hash = getUserOperationHash({
    chainId,
    entryPointAddress: entryPoint as `0x${string}`,
    entryPointVersion: "0.7",
    userOperation: userOp as never,
  });

  console.log("[hashVerify] viem v0.7 hash:", v07Hash);
  console.log("[hashVerify] v0.6 === v0.7:", v06Hash === v07Hash);

  try {
    const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL;
    if (!alchemyRpcUrl) {
      console.warn("[hashVerify] ALCHEMY_RPC_URL not set, skipping eth_call");
      return;
    }

    const callData = encodeFunctionData({
      abi: ENTRY_POINT_V06_GET_USER_OP_HASH_ABI,
      functionName: "getUserOpHash",
      args: [
        {
          sender: userOp.sender as `0x${string}`,
          nonce: BigInt(userOp.nonce),
          initCode: (((userOp as Record<string, unknown>).initCode as string) || "0x") as `0x${string}`,
          callData: userOp.callData as `0x${string}`,
          callGasLimit: BigInt(userOp.callGasLimit),
          verificationGasLimit: BigInt(userOp.verificationGasLimit),
          preVerificationGas: BigInt(userOp.preVerificationGas),
          maxFeePerGas: BigInt(userOp.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas),
          paymasterAndData: (((userOp as Record<string, unknown>).paymasterAndData as string) || "0x") as `0x${string}`,
          signature: (userOp.signature || "0x") as `0x${string}`,
        },
      ],
    });

    const response = await fetch(alchemyRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: entryPoint, data: callData }, "latest"],
      }),
      cache: "no-store",
    });

    const json = (await response.json()) as {
      result?: string;
      error?: { code: number; message: string };
    };

    if (json.error) {
      console.warn("[hashVerify] eth_call error:", json.error);
      return;
    }

    if (!json.result || json.result === "0x") {
      console.warn("[hashVerify] eth_call returned empty result");
      return;
    }

    const onChainHash = decodeFunctionResult({
      abi: ENTRY_POINT_V06_GET_USER_OP_HASH_ABI,
      functionName: "getUserOpHash",
      data: json.result as `0x${string}`,
    });

    console.log("[hashVerify] on-chain hash:", onChainHash);
    console.log("[hashVerify] viem v0.6 === on-chain:", v06Hash === onChainHash);
  } catch (error) {
    console.warn("[hashVerify] eth_call failed:", error instanceof Error ? error.message : error);
  }

  await verifySignature(userOp, v06Hash);
}

const ERC_1271_ABI = [
  {
    name: "isValidSignature",
    type: "function",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "magicValue", type: "bytes4" }],
    stateMutability: "view",
  },
] as const;

const ERC_1271_MAGIC_VALUE = "0x1626ba7e";

const NEXUS_MODULE_MANAGER_ABI = [
  {
    name: "getValidatorsPaginated",
    type: "function",
    inputs: [
      { name: "cursor", type: "address" },
      { name: "size", type: "uint256" },
    ],
    outputs: [
      { name: "array", type: "address[]" },
      { name: "next", type: "address" },
    ],
    stateMutability: "view",
  },
] as const;

async function callAlchemyRpc<T>(method: string, params: unknown[]): Promise<T> {
  const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL;
  if (!alchemyRpcUrl) {
    throw new Error("ALCHEMY_RPC_URL not set");
  }

  const response = await fetch(alchemyRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });

  const json = (await response.json()) as {
    result?: T;
    error?: { code: number; message: string; data?: unknown };
  };

  if (json.error) {
    throw new Error(
      `Alchemy RPC error ${json.error.code}: ${json.error.message}${
        json.error.data ? ` - ${JSON.stringify(json.error.data)}` : ""
      }`
    );
  }

  if (json.result === undefined) {
    throw new Error(`Alchemy RPC returned empty result for ${method}`);
  }

  return json.result;
}

async function getInstalledNexusValidator(account: Hex): Promise<Hex | null> {
  const callData = encodeFunctionData({
    abi: NEXUS_MODULE_MANAGER_ABI,
    functionName: "getValidatorsPaginated",
    args: [ZERO_ADDRESS, 10n],
  });

  const result = await callAlchemyRpc<`0x${string}`>("eth_call", [
    { to: account, data: callData },
    "latest",
  ]);

  const [validators] = decodeFunctionResult({
    abi: NEXUS_MODULE_MANAGER_ABI,
    functionName: "getValidatorsPaginated",
    data: result,
  });

  return (validators[0] as Hex | undefined) ?? null;
}

async function normalizeNexusSignature(userOp: UserOperation): Promise<UserOperation> {
  if (!userOp.signature || userOp.signature.length !== RAW_ECDSA_SIGNATURE_HEX_LENGTH) {
    return userOp;
  }

  const validator = await getInstalledNexusValidator(userOp.sender);
  if (!validator) {
    console.warn("[sigNormalize] no installed validator found; leaving raw signature");
    return userOp;
  }

  const packedSignature =
    `0x${validator.slice(2)}${userOp.signature.slice(2)}` as Hex;

  console.log("[sigNormalize] packed raw Nexus signature", {
    sender: userOp.sender,
    validator,
    oldSignatureLen: userOp.signature.length,
    newSignatureLen: packedSignature.length,
  });

  return {
    ...userOp,
    signature: packedSignature,
  };
}

async function verifySignature(
  userOp: UserOperation,
  userOpHash: string
): Promise<void> {
  try {
    const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL;
    if (!alchemyRpcUrl || !userOp.signature || userOp.signature === "0x") {
      console.warn("[sigVerify] skipping — no RPC or signature");
      return;
    }

    const callData = encodeFunctionData({
      abi: ERC_1271_ABI,
      functionName: "isValidSignature",
      args: [userOpHash as `0x${string}`, userOp.signature],
    });

    const response = await fetch(alchemyRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: userOp.sender, data: callData }, "latest"],
      }),
      cache: "no-store",
    });

    const json = (await response.json()) as {
      result?: string;
      error?: { code: number; message: string };
    };

    if (json.error) {
      console.warn("[sigVerify] eth_call error:", json.error);
      return;
    }

    const magicValue = decodeFunctionResult({
      abi: ERC_1271_ABI,
      functionName: "isValidSignature",
      data: json.result as `0x${string}`,
    });

    const valid = magicValue.toLowerCase() === ERC_1271_MAGIC_VALUE.toLowerCase();
    console.log("[sigVerify] isValidSignature result:", magicValue, "valid:", valid);
  } catch (error) {
    console.warn(
      "[sigVerify] eth_call failed:",
      error instanceof Error ? error.message : error
    );
  }
}

async function sendBundlerRequest<T>(method: string, params: unknown[]): Promise<T> {
  const bundlerRpcUrl = getRequiredEnv("BUNDLER_RPC_URL");

  const response = await fetch(bundlerRpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Bundler HTTP ${response.status}: ${response.statusText} - ${responseText}`
    );
  }

  const json = JSON.parse(responseText) as {
    result?: T;
    error?: { code: number; message: string; data?: unknown };
  };

  if (json.error) {
    throw new Error(
      `Bundler RPC error ${json.error.code}: ${json.error.message}${
        json.error.data ? ` - ${JSON.stringify(json.error.data)}` : ""
      }`
    );
  }

  if (json.result === undefined) {
    throw new Error(`Bundler returned an empty result for ${method}: ${responseText}`);
  }

  return json.result;
}

type UserOperationReceipt = {
  receipt?: {
    transactionHash?: `0x${string}`;
    blockNumber?: `0x${string}`;
    blockHash?: `0x${string}`;
    status?: `0x${string}`;
  };
  success?: boolean;
  userOpHash?: `0x${string}`;
  sender?: `0x${string}`;
  nonce?: `0x${string}`;
  actualGasCost?: `0x${string}`;
  actualGasUsed?: `0x${string}`;
} | null;

export async function sendUserOpToBundler(userOp: UserOperation): Promise<`0x${string}`> {
  const entryPoint = getRequiredEnv("ENTRY_POINT");

  const result = await sendBundlerRequest<string>("eth_sendUserOperation", [
    userOp,
    entryPoint,
  ]);

  if (!isHexString(result)) {
    throw new Error(`Bundler returned malformed userOp hash: ${JSON.stringify(result)}`);
  }

  return result;
}

export async function getUserOpReceipt(
  userOpHash: `0x${string}`
): Promise<UserOperationReceipt> {
  return sendBundlerRequest<UserOperationReceipt>("eth_getUserOperationReceipt", [
    userOpHash,
  ]);
}

async function waitForUserOpReceipt(
  userOpHash: `0x${string}`,
  timeoutMs = 15_000,
  pollIntervalMs = 1_500
): Promise<UserOperationReceipt> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const receipt = await getUserOpReceipt(userOpHash);
    if (receipt?.receipt?.transactionHash) {
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return null;
}

function hasPaymasterData(userOp: UserOperation): boolean {
  const v06Data = (userOp as Record<string, unknown>).paymasterAndData as string | undefined;
  if (v06Data && v06Data !== "0x" && v06Data.length > 2) return true;
  const v07Paymaster = (userOp as Record<string, unknown>).paymaster as string | undefined;
  if (v07Paymaster && v07Paymaster !== "0x" && v07Paymaster.length > 2) return true;
  return false;
}

// Sends a user operation to the bundler after applying gas buffers, initCode fixes,
// and server-side hash verification. Skips re-sponsoring if paymaster data is already present.
export async function sendSponsoredUserOp(
  rawUserOp: UserOperation
): Promise<`0x${string}`> {
  const result = await submitSponsoredUserOp(rawUserOp);
  return result.userOpHash;
}

export async function submitSponsoredUserOp(
  rawUserOp: UserOperation
): Promise<{
  userOpHash: `0x${string}`;
  transactionHash: `0x${string}` | null;
  receipt: UserOperationReceipt;
}> {
  try {
    console.log("[sendSponsoredUserOp] received userOp", {
      sender: rawUserOp.sender,
      nonce: rawUserOp.nonce,
      initCode: (rawUserOp as Record<string, unknown>).initCode,
      signatureLen: (rawUserOp as Record<string, unknown>).signature?.toString().length,
      verificationGasLimit: rawUserOp.verificationGasLimit,
      hasPaymasterData: hasPaymasterData(rawUserOp),
    });

    const userOpWithPaymaster = hasPaymasterData(rawUserOp)
      ? rawUserOp
      : await attachSponsoredPaymasterData(rawUserOp);
    const normalizedUserOp = await normalizeNexusSignature(userOpWithPaymaster);

    const currentVerificationGas = BigInt(normalizedUserOp.verificationGasLimit);
    if (currentVerificationGas < MIN_VERIFICATION_GAS) {
      (normalizedUserOp as { verificationGasLimit: Hex }).verificationGasLimit =
        `0x${MIN_VERIFICATION_GAS.toString(16)}` as Hex;
    }

    const initCode = (normalizedUserOp as Record<string, unknown>).initCode as string | undefined;
    if (initCode && initCode.length > 2) {
      console.warn("[sendSponsoredUserOp] initCode is non-empty — forcing to 0x (account already deployed)", {
        initCode,
        sender: normalizedUserOp.sender,
      });
      (normalizedUserOp as { initCode: Hex }).initCode = "0x";
    }

    const entryPoint = getRequiredEnv("ENTRY_POINT");

    await verifyUserOpHash(normalizedUserOp, entryPoint);

    const userOpHash = await sendUserOpToBundler(normalizedUserOp);
    const receipt = await waitForUserOpReceipt(userOpHash).catch((error) => {
      console.warn(
        "[sendSponsoredUserOp] userOp receipt polling failed:",
        error instanceof Error ? error.message : error
      );
      return null;
    });

    return {
      userOpHash,
      transactionHash: receipt?.receipt?.transactionHash ?? null,
      receipt,
    };
  } catch (error) {
    console.error("Failed to send sponsored user operation", {
      error,
      sender: rawUserOp.sender,
      nonce: rawUserOp.nonce,
      initCode: (rawUserOp as Record<string, unknown>).initCode,
      signature:
        ((rawUserOp as Record<string, unknown>).signature as string)?.slice(0, 20) + "...",
      signatureLen: ((rawUserOp as Record<string, unknown>).signature as string)?.length,
      verificationGasLimit: rawUserOp.verificationGasLimit,
      callGasLimit: (rawUserOp as Record<string, unknown>).callGasLimit,
    });
    throw error;
  }
}
