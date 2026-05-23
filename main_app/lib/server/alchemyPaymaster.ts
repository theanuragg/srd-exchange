import "server-only";

import { UserOperation, isEntryPointV07UserOperation, isHexString } from "@/lib/userOperation";

const BNB_CHAIN_ID = 56;
const BNB_CHAIN_ID_HEX = "0x38";
const DEFAULT_DUMMY_SIGNATURE =
  "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";

type JsonRpcSuccess<T> = {
  jsonrpc: "2.0";
  id: number | string | null;
  result: T;
};

type JsonRpcError = {
  jsonrpc: "2.0";
  id: number | string | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type GasManagerResponse = Record<string, unknown>;

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
};

const parseGasManagerResponse = (
  userOp: UserOperation,
  result: GasManagerResponse
): UserOperation => {
  const scopedResult = isEntryPointV07UserOperation(userOp)
    ? ((result.entrypointV07Response as Record<string, unknown> | undefined) ?? result)
    : ((result.entrypointV06Response as Record<string, unknown> | undefined) ?? result);

  const mergedUserOp = {
    ...userOp,
    callGasLimit:
      (scopedResult.callGasLimit as UserOperation["callGasLimit"] | undefined) ??
      userOp.callGasLimit,
    verificationGasLimit:
      (scopedResult.verificationGasLimit as UserOperation["verificationGasLimit"] | undefined) ??
      userOp.verificationGasLimit,
    preVerificationGas:
      (scopedResult.preVerificationGas as UserOperation["preVerificationGas"] | undefined) ??
      userOp.preVerificationGas,
    maxFeePerGas:
      (scopedResult.maxFeePerGas as UserOperation["maxFeePerGas"] | undefined) ??
      userOp.maxFeePerGas,
    maxPriorityFeePerGas:
      (scopedResult.maxPriorityFeePerGas as UserOperation["maxPriorityFeePerGas"] | undefined) ??
      userOp.maxPriorityFeePerGas,
  } as UserOperation;

  if (isEntryPointV07UserOperation(userOp)) {
    const paymaster = scopedResult.paymaster;
    const paymasterData = scopedResult.paymasterData;

    if (!isHexString(paymaster) || !isHexString(paymasterData)) {
      throw new Error(
        `Malformed Alchemy Gas Manager response for EntryPoint v0.7: ${JSON.stringify(result)}`
      );
    }

    return {
      ...mergedUserOp,
      paymaster,
      paymasterData,
      paymasterVerificationGasLimit: isHexString(scopedResult.paymasterVerificationGasLimit)
        ? scopedResult.paymasterVerificationGasLimit
        : "0x0",
      paymasterPostOpGasLimit: isHexString(scopedResult.paymasterPostOpGasLimit)
        ? scopedResult.paymasterPostOpGasLimit
        : "0x0",
    };
  }

  const paymasterAndData = scopedResult.paymasterAndData;

  if (!isHexString(paymasterAndData)) {
    throw new Error(
      `Malformed Alchemy Gas Manager response for EntryPoint v0.6: ${JSON.stringify(result)}`
    );
  }

  return {
    ...mergedUserOp,
    paymasterAndData,
  };
};

// Calls Alchemy Gas Manager to fill the paymaster fields for a BNB user operation.
export async function attachSponsoredPaymasterData(
  userOp: UserOperation
): Promise<UserOperation> {
  const rpcUrl = getRequiredEnv("ALCHEMY_RPC_URL");
  const policyId = getRequiredEnv("ALCHEMY_POLICY_ID");
  const entryPoint = getRequiredEnv("ENTRY_POINT");

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "alchemy_requestGasAndPaymasterAndData",
    params: [
      {
        policyId,
        chainId: BNB_CHAIN_ID_HEX,
        entryPoint,
        dummySignature: isHexString(userOp.signature)
          ? userOp.signature
          : DEFAULT_DUMMY_SIGNATURE,
        userOperation: userOp,
      },
    ],
  };

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Alchemy Gas Manager HTTP ${response.status}: ${response.statusText} - ${responseText}`
    );
  }

  let json: JsonRpcSuccess<GasManagerResponse> | JsonRpcError;

  try {
    json = JSON.parse(responseText);
  } catch (error) {
    throw new Error(
      `Alchemy Gas Manager returned non-JSON response: ${responseText}. Parse error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if ("error" in json) {
    throw new Error(
      `Alchemy Gas Manager RPC error ${json.error.code}: ${json.error.message}${
        json.error.data ? ` - ${JSON.stringify(json.error.data)}` : ""
      }`
    );
  }

  return parseGasManagerResponse(userOp, json.result);
}

export { BNB_CHAIN_ID, BNB_CHAIN_ID_HEX };
