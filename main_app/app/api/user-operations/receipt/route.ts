import { NextRequest, NextResponse } from "next/server";

import { BNB_CHAIN_ID } from "@/lib/server/alchemyPaymaster";

export const dynamic = "force-dynamic";

async function getBundlerReceipt(userOpHash: string): Promise<{
  transactionHash: string | null;
  success: boolean | null;
}> {
  const bundlerRpcUrl = process.env.BUNDLER_RPC_URL;
  if (!bundlerRpcUrl) {
    throw new Error("BUNDLER_RPC_URL not set");
  }

  const response = await fetch(bundlerRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getUserOperationReceipt",
      params: [userOpHash],
    }),
    cache: "no-store",
  });

  const json = (await response.json()) as {
    result?: {
      receipt?: { transactionHash?: string };
      success?: boolean;
      transactionHash?: string;
    };
    error?: { code: number; message: string };
  };

  if (json.error) {
    throw new Error(
      `Bundler RPC error ${json.error.code}: ${json.error.message}`
    );
  }

  const receipt = json.result;
  if (!receipt) return { transactionHash: null, success: null };

  return {
    transactionHash:
      receipt.receipt?.transactionHash ?? receipt.transactionHash ?? null,
    success: receipt.success ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userOpHash = searchParams.get("userOpHash");

    if (!userOpHash || !userOpHash.startsWith("0x")) {
      return NextResponse.json(
        { success: false, error: "A valid userOpHash starting with 0x is required." },
        { status: 400 }
      );
    }

    const receipt = await getBundlerReceipt(userOpHash);

    return NextResponse.json({
      success: true,
      userOpHash,
      transactionHash: receipt.transactionHash,
      confirmed: receipt.success,
    });
  } catch (error) {
    console.error("Failed to get user operation receipt:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get receipt",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      chainId?: number;
      userOpHash?: string;
    };

    if (body.chainId !== undefined && body.chainId !== BNB_CHAIN_ID) {
      return NextResponse.json(
        { success: false, error: `Receipt lookup is only enabled on BNB Chain (${BNB_CHAIN_ID}).` },
        { status: 400 }
      );
    }

    if (!body.userOpHash || !body.userOpHash.startsWith("0x")) {
      return NextResponse.json(
        { success: false, error: "A valid userOpHash starting with 0x is required." },
        { status: 400 }
      );
    }

    const receipt = await getBundlerReceipt(body.userOpHash);

    return NextResponse.json({
      success: true,
      userOpHash: body.userOpHash,
      transactionHash: receipt.transactionHash,
      confirmed: receipt.success,
    });
  } catch (error) {
    console.error("Failed to get user operation receipt:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get receipt",
      },
      { status: 500 }
    );
  }
}
