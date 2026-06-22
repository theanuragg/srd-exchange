import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import {
  BNB_CHAIN_ID,
  attachSponsoredPaymasterData,
} from "@/lib/server/alchemyPaymaster";
import {
  UserOperation,
  sanitizeUnsignedUserOperation,
  isEntryPointV07UserOperation,
} from "@/lib/userOperation";
import { buildInitCode } from "@/lib/buildInitCode";
import { encodeAbiParameters, encodeFunctionData, type Address } from "viem";

const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL;
const DEBUG_ENV_PATH = ".dbg/aa23-sponsor-failure.env";
const DEBUG_RUN_ID = "post-fix";
const COINBASE_SMART_WALLET_FACTORY = "0xBA5ED110eFDBa3D005bfC882d75358ACBbB85842" as const;
const COINBASE_FACTORY_GET_ADDRESS_ABI = [
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

async function getAlchemyCode(address: string): Promise<string | undefined> {
  if (!ALCHEMY_RPC_URL) throw new Error("Missing ALCHEMY_RPC_URL");
  const response = await fetch(ALCHEMY_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getCode",
      params: [address, "latest"],
    }),
    cache: "no-store",
  });
  const json = await response.json();
  return json.result as string | undefined;
}

async function isAccountDeployedViaAlchemy(address: string): Promise<boolean> {
  const code = await getAlchemyCode(address);
  return code !== undefined && code !== "0x";
}

async function getCoinbaseCounterfactualAddress(ownerAddress: Address): Promise<string | undefined> {
  if (!ALCHEMY_RPC_URL) throw new Error("Missing ALCHEMY_RPC_URL");
  const ownerBytes = encodeAbiParameters([{ type: "address" }], [ownerAddress]);
  const calldata = encodeFunctionData({
    abi: COINBASE_FACTORY_GET_ADDRESS_ABI,
    functionName: "getAddress",
    args: [[ownerBytes], 0n],
  });
  const response = await fetch(ALCHEMY_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: COINBASE_SMART_WALLET_FACTORY, data: calldata }, "latest"],
    }),
    cache: "no-store",
  });
  const json = await response.json();
  const result = json.result as string | undefined;
  if (!result || result === "0x") return undefined;
  return `0x${result.slice(-40)}`;
}

const ENTRY_POINT_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789".toLowerCase();

function getEntryPointVersion(entryPoint: string): "0.6" | "0.7" {
  if (entryPoint.toLowerCase() === ENTRY_POINT_V06) {
    return "0.6";
  }
  return "0.7";
}

interface JsonRpcRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params: unknown[];
}

function isJsonRpcRequest(body: unknown): body is JsonRpcRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "jsonrpc" in body &&
    "method" in body &&
    "params" in body
  );
}

function isParticleFormat(body: unknown): body is { chainId?: number; userOperation?: UserOperation; eoaAddress?: string } {
  return (
    typeof body === "object" &&
    body !== null &&
    "userOperation" in body
  );
}

const BNB_CHAIN_ID_HEX_STRICT = "0x38";
const BNB_CHAIN_ID_STRICT = 56;

function toBigIntLike(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return "0x" + value.toString(16);
  return undefined;
}

async function handleSponsor(userOp: Record<string, unknown>): Promise<UserOperation> {
  const sanitized = sanitizeUnsignedUserOperation(userOp as UserOperation);
  return attachSponsoredPaymasterData(sanitized);
}

function buildJsonRpcError(id: number | string | null, code: number, message: string) {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}

function buildJsonRpcResult(id: number | string | null, result: unknown) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (isJsonRpcRequest(body)) {
      return await handleJsonRpc(body);
    }

    if (isParticleFormat(body)) {
      return await handleParticleFormat(body);
    }

    if (body && typeof body === "object" && "sender" in body) {
      return await handleParticleFormat({ userOperation: body as UserOperation });
    }

    return NextResponse.json(
      { success: false, error: "Unrecognized request format." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to sponsor user operation:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sponsor user operation",
      },
      { status: 500 }
    );
  }
}

async function handleJsonRpc(req: JsonRpcRequest) {
  const { id, method, params } = req;

  switch (method) {
    case "pm_getPaymasterStubData": {
      const userOp = (params?.[0] || {}) as Record<string, unknown>;
      let chainIdHex: string | undefined;

      if (typeof params?.[2] === "string") {
        chainIdHex = params[2] as string;
      } else if (typeof params?.[2] === "object" && params[2] !== null) {
        const meta = params[2] as Record<string, unknown>;
        chainIdHex = meta.chainId as string | undefined;
      }
      if (typeof params?.[3] === "object" && params[3] !== null) {
        const meta = params[3] as Record<string, unknown>;
        chainIdHex = chainIdHex || (meta.chainId as string);
      }

      if (chainIdHex && chainIdHex.toLowerCase() !== BNB_CHAIN_ID_HEX_STRICT) {
        return NextResponse.json(
          buildJsonRpcError(id, -32000, `Gas sponsorship is only enabled on BNB Chain (${BNB_CHAIN_ID_STRICT}).`),
          { status: 400 }
        );
      }

      const stubUserOp: Record<string, unknown> = {
        ...userOp,
        callGasLimit: userOp.callGasLimit || "0x0",
        verificationGasLimit: userOp.verificationGasLimit || "0x0",
        preVerificationGas: userOp.preVerificationGas || "0x0",
        maxFeePerGas: userOp.maxFeePerGas || "0x0",
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas || "0x0",
      };

      if (isEntryPointV07UserOperation(stubUserOp as UserOperation)) {
        stubUserOp.paymaster = "0x";
        stubUserOp.paymasterData = "0x";
        stubUserOp.paymasterVerificationGasLimit = "0x0";
        stubUserOp.paymasterPostOpGasLimit = "0x0";
      } else {
        stubUserOp.paymasterAndData = "0x";
      }

      try {
        const sponsored = await attachSponsoredPaymasterData(stubUserOp as UserOperation);
        const result: Record<string, unknown> = {
          callGasLimit: sponsored.callGasLimit,
          verificationGasLimit: sponsored.verificationGasLimit,
          preVerificationGas: sponsored.preVerificationGas,
          maxFeePerGas: sponsored.maxFeePerGas,
          maxPriorityFeePerGas: sponsored.maxPriorityFeePerGas,
        };

        if (isEntryPointV07UserOperation(sponsored)) {
          result.paymaster = sponsored.paymaster;
          result.paymasterData = sponsored.paymasterData;
          result.paymasterVerificationGasLimit = sponsored.paymasterVerificationGasLimit;
          result.paymasterPostOpGasLimit = sponsored.paymasterPostOpGasLimit;
        } else {
          result.paymasterAndData = sponsored.paymasterAndData;
        }

        return NextResponse.json(buildJsonRpcResult(id, result));
      } catch {
        const zeroResult: Record<string, unknown> = {
          callGasLimit: "0x0",
          verificationGasLimit: "0x0",
          preVerificationGas: "0x0",
          maxFeePerGas: "0x0",
          maxPriorityFeePerGas: "0x0",
        };
        if (isEntryPointV07UserOperation(stubUserOp as UserOperation)) {
          zeroResult.paymaster = "0x";
          zeroResult.paymasterData = "0x";
          zeroResult.paymasterVerificationGasLimit = "0x0";
          zeroResult.paymasterPostOpGasLimit = "0x0";
        } else {
          zeroResult.paymasterAndData = "0x";
        }
        return NextResponse.json(buildJsonRpcResult(id, zeroResult));
      }
    }

    case "pm_getPaymasterData":
    case "pm_sponsorUserOperation": {
      const userOp = (params?.[0] || {}) as Record<string, unknown>;
      const entryPoint = (params?.[1] as string) || ENTRY_POINT_V06;

      let chainIdHex: string | undefined;
      if (typeof params?.[2] === "string") {
        chainIdHex = params[2] as string;
      } else if (typeof params?.[2] === "object" && params[2] !== null) {
        const meta = params[2] as Record<string, unknown>;
        chainIdHex = meta.chainId as string | undefined;
      }

      if (chainIdHex && chainIdHex.toLowerCase() !== BNB_CHAIN_ID_HEX_STRICT) {
        return NextResponse.json(
          buildJsonRpcError(id, -32000, `Gas sponsorship is only enabled on BNB Chain (${BNB_CHAIN_ID_STRICT}).`),
          { status: 400 }
        );
      }

      const sponsored = await attachSponsoredPaymasterData(userOp as UserOperation);

      const result: Record<string, unknown> = {};
      if (isEntryPointV07UserOperation(sponsored)) {
        result.paymaster = sponsored.paymaster;
        result.paymasterData = sponsored.paymasterData;
        result.paymasterVerificationGasLimit = sponsored.paymasterVerificationGasLimit;
        result.paymasterPostOpGasLimit = sponsored.paymasterPostOpGasLimit;
      } else {
        result.paymasterAndData = sponsored.paymasterAndData;
      }
      result.callGasLimit = sponsored.callGasLimit;
      result.verificationGasLimit = sponsored.verificationGasLimit;
      result.preVerificationGas = sponsored.preVerificationGas;
      result.maxFeePerGas = sponsored.maxFeePerGas;
      result.maxPriorityFeePerGas = sponsored.maxPriorityFeePerGas;

      return NextResponse.json(buildJsonRpcResult(id, result));
    }

    default:
      return NextResponse.json(
        buildJsonRpcError(id, -32601, `Method not found: ${method}`),
        { status: 400 }
      );
  }
}

async function handleParticleFormat(body: { chainId?: number; userOperation?: UserOperation; eoaAddress?: string }) {
  if (body.chainId !== undefined && body.chainId !== BNB_CHAIN_ID) {
    return NextResponse.json(
      {
        success: false,
        error: `Gas sponsorship is only enabled on BNB Chain (${BNB_CHAIN_ID}).`,
      },
      { status: 400 }
    );
  }

  if (!body.userOperation) {
    return NextResponse.json(
      { success: false, error: "Missing userOperation payload." },
      { status: 400 }
    );
  }

  try {
    const initCodeStr = body.userOperation.initCode as string | undefined;
    const callDataStr = body.userOperation.callData as string | undefined;
    const traceId = `${String(body.userOperation.sender ?? "unknown")}:${String(body.userOperation.nonce ?? "unknown")}`;
    console.log("📦 handleParticleFormat received:", {
      sender: body.userOperation.sender,
      initCodeLen: initCodeStr?.length,
      initCodePrefix: initCodeStr?.slice(0, 42),
      nonce: body.userOperation.nonce,
      callDataLen: callDataStr?.length,
      eoaAddress: body.eoaAddress,
    });

    const eoaAddress = body.eoaAddress as `0x${string}` | undefined;
    const sender = body.userOperation.sender as string | undefined;
    // #region debug-point A:sponsor-entry
    await reportDebugEvent(
      "A",
      "app/api/user-operations/sponsor/route.ts:entry",
      "Sponsor request received",
      {
        sender,
        nonce: body.userOperation.nonce,
        initCodeLen: initCodeStr?.length ?? 0,
        callDataLen: callDataStr?.length ?? 0,
        eoaAddress,
      },
      traceId
    );
    // #endregion

    if (eoaAddress && sender) {
      const initCodeEmpty = !initCodeStr || initCodeStr === "0x" || initCodeStr.length <= 2;
      try {
        const [deployed, code, expectedSender] = await Promise.all([
          isAccountDeployedViaAlchemy(sender),
          getAlchemyCode(sender),
          getCoinbaseCounterfactualAddress(eoaAddress as Address),
        ]);
        // #region debug-point B:deployment-and-sender
        await reportDebugEvent(
          "B",
          "app/api/user-operations/sponsor/route.ts:deployment-check",
          "Evaluated deployment state and Coinbase sender prediction",
          {
            sender,
            expectedSender,
            senderMatchesExpected:
              typeof expectedSender === "string" && expectedSender.toLowerCase() === sender.toLowerCase(),
            deployed,
            code,
            initCodeEmpty,
            originalInitCodePrefix: initCodeStr?.slice(0, 42),
          },
          traceId
        );
        // #endregion
        if (deployed && !initCodeEmpty) {
          console.log("🔧 Account deployed (Alchemy view), removing initCode");
          body.userOperation.initCode = "0x" as any;
        } else if (!deployed && initCodeEmpty) {
          console.log("🔧 Account not deployed (Alchemy view), adding initCode");
          body.userOperation.initCode = buildInitCode(eoaAddress);
        } else if (!deployed && !initCodeEmpty) {
          console.log("🔧 Account not deployed (Alchemy view), keeping client initCode");
        } else {
          console.log("🔧 Account deployed (Alchemy view), no initCode needed");
        }
        // #region debug-point D:initcode-mutation
        await reportDebugEvent(
          "D",
          "app/api/user-operations/sponsor/route.ts:initcode-choice",
          "Selected initCode state before sponsorship",
          {
            sender,
            deployed,
            finalInitCodePrefix: (body.userOperation.initCode as string | undefined)?.slice(0, 42),
            finalInitCodeLen: ((body.userOperation.initCode as string | undefined)?.length ?? 0),
          },
          traceId
        );
        // #endregion
      } catch (err) {
        console.warn("⚠️ Alchemy deploy check failed, proceeding with client-provided initCode:", err);
      }
    }

    const sanitized = sanitizeUnsignedUserOperation(body.userOperation as UserOperation);
    console.log("🧹 sanitized initCode:", (sanitized.initCode as string | undefined)?.slice(0, 80));

    let sponsoredUserOperation: UserOperation;
    try {
      sponsoredUserOperation = await attachSponsoredPaymasterData(sanitized);
    } catch (sponsorError) {
      const errMsg = sponsorError instanceof Error ? sponsorError.message : "";
      const isAA23 = errMsg.includes("AA23") || errMsg.includes("sender already created");
      const isAA20 = errMsg.includes("AA20") || errMsg.includes("account not deployed");
      const hasInitCode = initCodeStr && initCodeStr !== "0x" && initCodeStr.length > 2;
      // #region debug-point C:sponsor-failure
      await reportDebugEvent(
        "C",
        "app/api/user-operations/sponsor/route.ts:sponsor-error",
        "Alchemy sponsorship failed",
        {
          sender,
          nonce: body.userOperation.nonce,
          hasInitCode,
          currentInitCodePrefix: (body.userOperation.initCode as string | undefined)?.slice(0, 42),
          currentInitCodeLen: ((body.userOperation.initCode as string | undefined)?.length ?? 0),
          error: errMsg,
          isAA20,
          isAA23,
        },
        traceId
      );
      // #endregion

      if (isAA23 && hasInitCode && eoaAddress) {
        console.log("🔧 AA23 detected, retrying with empty initCode");
        body.userOperation.initCode = "0x" as any;
        const retrySanitized = sanitizeUnsignedUserOperation(body.userOperation as UserOperation);
        try {
          sponsoredUserOperation = await attachSponsoredPaymasterData(retrySanitized);
          console.log("✅ AA23 retry succeeded with empty initCode");
        } catch (retryError) {
          const retryMsg = retryError instanceof Error ? retryError.message : "";
          const isAA20OnRetry = retryMsg.includes("AA20") || retryMsg.includes("account not deployed");
          if (isAA20OnRetry) {
            console.log("🔧 AA20 on retry (Gas Manager inconsistent), retrying with original initCode");
            body.userOperation.initCode = initCodeStr as any;
            const retrySanitized2 = sanitizeUnsignedUserOperation(body.userOperation as UserOperation);
            sponsoredUserOperation = await attachSponsoredPaymasterData(retrySanitized2);
            console.log("✅ Third attempt succeeded with original initCode");
          } else {
            throw retryError;
          }
        }
      } else {
        throw sponsorError;
      }
    }

    console.log("✅ Sponsor success, paymasterAndData:", (sponsoredUserOperation as any).paymasterAndData?.slice(0, 40));
    const entryPoint = process.env.ENTRY_POINT;

    if (!entryPoint) {
      throw new Error("Missing required server environment variable: ENTRY_POINT");
    }

    return NextResponse.json({
      success: true,
      userOperation: sponsoredUserOperation,
      entryPoint,
      entryPointVersion: getEntryPointVersion(entryPoint),
    });
  } catch (error) {
    console.error("❌ Sponsor failed in handleParticleFormat:", error);
    throw error;
  }
}
