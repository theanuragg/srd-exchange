import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, OrderType } from "@prisma/client";

import { BNB_CHAIN_ID } from "@/lib/server/alchemyPaymaster";
import {
  createOrderRecord,
  findOrderByBlockchainId,
  serializeOrder,
} from "@/lib/server/orders";

type SellSponsoredRequest = {
  chainId?: number;
  walletAddress?: string;
  linkedEoaAddress?: string;
  orderType?: string;
  paymentMethod?: string;
  amount?: string;
  usdtAmount?: string;
  sellRate?: number;
  userOpHash?: string;
  transactionHash?: string;
  adminUpiId?: string;
};

// Gets the actual on-chain transaction hash from a userOpHash via bundler receipt
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
    const json = await response.json() as { result?: { receipt?: { transactionHash?: string } } };
    return json?.result?.receipt?.transactionHash ?? null;
  } catch (error) {
    console.warn("[sell-sponsored] Failed to resolve tx hash from userOpHash:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SellSponsoredRequest;

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

    // If transactionHash is the userOpHash or missing, resolve the real on-chain tx hash
    let resolvedTxHash = body.transactionHash;
    if (!resolvedTxHash || resolvedTxHash === body.userOpHash) {
      const realHash = await resolveTransactionHash(body.userOpHash);
      if (realHash) resolvedTxHash = realHash;
      else resolvedTxHash = body.userOpHash; // fallback: store userOpHash
    }

    console.log("[sell-sponsored] Resolved transaction hash:", {
      provided: body.transactionHash ?? "(none)",
      userOpHash: body.userOpHash,
      resolved: resolvedTxHash,
    });

    if (!body.amount || Number.isNaN(Number(body.amount))) {
      return NextResponse.json(
        { success: false, error: "A valid INR amount is required." },
        { status: 400 }
      );
    }

    if (!body.usdtAmount || Number.isNaN(Number(body.usdtAmount))) {
      return NextResponse.json(
        { success: false, error: "A valid USDT amount is required." },
        { status: 400 }
      );
    }

    const normalizedOrderType =
      body.orderType === "SELL_CDM" ? OrderType.SELL_CDM : OrderType.SELL;

    const existingOrder = await findOrderByBlockchainId(body.userOpHash);
    if (existingOrder) {
      return NextResponse.json({
        success: true,
        order: serializeOrder(existingOrder),
        userOpHash: body.userOpHash,
        transactionHash: existingOrder.transactionHash ?? resolvedTxHash,
        existing: true,
      });
    }

    const order = await createOrderRecord({
      walletAddress: body.walletAddress,
      linkedEoaAddress: body.linkedEoaAddress,
      orderType: normalizedOrderType,
      amount: body.amount,
      usdtAmount: body.usdtAmount,
      sellRate: body.sellRate ?? null,
      blockchainOrderId: body.userOpHash,
      transactionHash: resolvedTxHash,
      status: OrderStatus.PENDING,
      adminUpiId: body.adminUpiId,
    });

    // DEBUG: Log created order status and identifiers to help trace unexpected CANCELLED state
    console.log('[sell-sponsored] Created order:', {
      id: order.id,
      status: order.status,
      blockchainOrderId: order.blockchainOrderId,
      transactionHash: order.transactionHash,
      orderType: order.orderType,
    });

    return NextResponse.json({
      success: true,
      order: serializeOrder(order),
      userOpHash: body.userOpHash,
      transactionHash: resolvedTxHash,
    });
  } catch (error) {
    console.error("Failed to create sponsored sell order:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create sponsored sell order",
      },
      { status: 500 }
    );
  }
}
