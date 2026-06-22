import "server-only";

import { readFileSync } from "node:fs";
import { encodeAbiParameters } from "viem";
import { UserOperation, isEntryPointV07UserOperation, isHexString } from "@/lib/userOperation";

const BNB_CHAIN_ID = 56;
const BNB_CHAIN_ID_HEX = "0x38";
const DEFAULT_DUMMY_SIGNATURE =
  "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
const COINBASE_SIGNATURE_WRAPPER_ABI = [
  {
    type: "tuple",
    components: [
      { name: "ownerIndex", type: "uint256" },
      { name: "signatureData", type: "bytes" },
    ],
  },
] as const;
const DEBUG_ENV_PATH = ".dbg/aa23-sponsor-failure.env";
const DEBUG_RUN_ID = "post-fix";

function getDebugConfig(): { url: string; sessionId: string } {
  let url = "http://127.0.0.1:7777/event";
  let sessionId = "aa23-sponsor-failure";
  try {
    const env = readFileSync(DEBUG_ENV_PATH, "utf8");
    url = env.match(/DEBUG_SERVER_URL=(.+)/)?.[1]?.trim() || url;
    sessionId = env.match(/DEBUG_SESSION_ID=(.+)/)?.[1]?.trim() || sessionId;
  } catch {}
  return { url, sessionId };
}

async function reportDebugEvent(
  hypothesisId: "A" | "B" | "C" | "D" | "E",
  location: string,
  msg: string,
  data: Record<string, unknown>,
  traceId?: string
): Promise<void> {
  const { url, sessionId } = getDebugConfig();
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      runId: DEBUG_RUN_ID,
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      traceId,
      ts: Date.now(),
    }),
  }).catch(() => {});
}

function getSimulationSignature(signature: UserOperation["signature"] | undefined) {
  if (isHexString(signature) && signature !== "0x") {
    return signature;
  }

  return encodeAbiParameters(COINBASE_SIGNATURE_WRAPPER_ABI, [
    {
      ownerIndex: 0n,
      signatureData: DEFAULT_DUMMY_SIGNATURE,
    },
  ]);
}

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
        dummySignature: getSimulationSignature(userOp.signature),
        userOperation: userOp,
      },
    ],
  };
  const traceId = `${String(userOp.sender)}:${String(userOp.nonce)}`;
  // #region debug-point E:paymaster-request
  await reportDebugEvent(
    "E",
    "lib/server/alchemyPaymaster.ts:request",
    "Sending paymaster request to Alchemy",
    {
      sender: userOp.sender,
      nonce: userOp.nonce,
      initCodeLen: ((userOp as Record<string, unknown>).initCode as string | undefined)?.length ?? 0,
      callDataLen: userOp.callData?.length ?? 0,
      signatureLen: userOp.signature?.length ?? 0,
      usingDefaultDummySignature: !isHexString(userOp.signature) || userOp.signature === "0x",
      dummySignatureLen: (payload.params[0].dummySignature as string).length,
      entryPoint,
    },
    traceId
  );
  // #endregion

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
    // #region debug-point E:paymaster-http-error
    await reportDebugEvent(
      "E",
      "lib/server/alchemyPaymaster.ts:http-error",
      "Alchemy Gas Manager returned HTTP error",
      {
        sender: userOp.sender,
        nonce: userOp.nonce,
        status: response.status,
        statusText: response.statusText,
        responseText,
      },
      traceId
    );
    // #endregion
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
    // #region debug-point E:paymaster-rpc-error
    await reportDebugEvent(
      "E",
      "lib/server/alchemyPaymaster.ts:rpc-error",
      "Alchemy Gas Manager returned RPC error",
      {
        sender: userOp.sender,
        nonce: userOp.nonce,
        code: json.error.code,
        message: json.error.message,
        data: json.error.data,
      },
      traceId
    );
    // #endregion
    throw new Error(
      `Alchemy Gas Manager RPC error ${json.error.code}: ${json.error.message}${
        json.error.data ? ` - ${JSON.stringify(json.error.data)}` : ""
      }`
    );
  }

  return parseGasManagerResponse(userOp, json.result);
}

export { BNB_CHAIN_ID, BNB_CHAIN_ID_HEX };
