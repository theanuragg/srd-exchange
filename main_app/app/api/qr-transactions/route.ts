import { NextRequest, NextResponse } from "next/server";

import { BNB_CHAIN_ID } from "@/lib/server/alchemyPaymaster";
import { validateQrPayInrAmount } from "@/lib/qr-pay-limits";
import {
  createQrTransactionRecord,
  findQrTransactionByUserOpHash,
  serializeQrTransaction,
} from "@/lib/server/qr-transactions";

type CreateQrTransactionRequest = {
  chainId?: number;
  walletAddress?: string;
  linkedEoaAddress?: string;
  amount?: string;
  usdtAmount?: string;
  sellRate?: number;
  userOpHash?: string;
  transactionHash?: string;
};

async function resolveTransactionHash(userOpHash: string): Promise<string | null> {
  try {
    const bundlerRpcUrl = process.env.BUNDLER_RPC_URL;
    if (!bundlerRpcUrl) return null;

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
      result?: { receipt?: { transactionHash?: string } };
    };
    return json?.result?.receipt?.transactionHash ?? null;
  } catch (error) {
    console.warn("[qr-transactions] Failed to resolve tx hash:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateQrTransactionRequest;

    if (body.chainId !== BNB_CHAIN_ID) {
      return NextResponse.json(
        { success: false, error: `Only BNB Chain (${BNB_CHAIN_ID}) is supported.` },
        { status: 400 }
      );
    }

    if (!body.walletAddress || !body.userOpHash) {
      return NextResponse.json(
        { success: false, error: "walletAddress and userOpHash are required." },
        { status: 400 }
      );
    }

    if (!body.userOpHash.startsWith("0x")) {
      return NextResponse.json(
        { success: false, error: "Invalid user operation hash." },
        { status: 400 }
      );
    }

    if (!body.amount || Number.isNaN(Number(body.amount))) {
      return NextResponse.json(
        { success: false, error: "A valid INR amount is required." },
        { status: 400 }
      );
    }

    const inrLimitCheck = validateQrPayInrAmount(Number(body.amount));
    if (!inrLimitCheck.valid) {
      return NextResponse.json(
        { success: false, error: inrLimitCheck.error },
        { status: 400 }
      );
    }

    if (!body.usdtAmount || Number.isNaN(Number(body.usdtAmount))) {
      return NextResponse.json(
        { success: false, error: "A valid USDT amount is required." },
        { status: 400 }
      );
    }

    let resolvedTxHash = body.transactionHash;
    if (!resolvedTxHash || resolvedTxHash === body.userOpHash) {
      const realHash = await resolveTransactionHash(body.userOpHash);
      resolvedTxHash = realHash ?? body.userOpHash;
    }

    const existing = await findQrTransactionByUserOpHash(body.userOpHash);
    if (existing) {
      return NextResponse.json({
        success: true,
        transaction: serializeQrTransaction(existing),
        existing: true,
      });
    }

    const transaction = await createQrTransactionRecord({
      walletAddress: body.walletAddress,
      linkedEoaAddress: body.linkedEoaAddress,
      amountINR: body.amount,
      amountUSDT: body.usdtAmount,
      sellRate: body.sellRate ?? null,
      userOpHash: body.userOpHash,
      transactionHash: resolvedTxHash,
    });

    return NextResponse.json({
      success: true,
      transaction: serializeQrTransaction(transaction),
    });
  } catch (error) {
    console.error("Failed to create QR transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create QR transaction",
      },
      { status: 500 }
    );
  }
}
