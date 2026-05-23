import "server-only";

import { OrderStatus, OrderType, UserRole } from "@prisma/client";

import { prisma, withDatabaseRetry } from "@/lib/prisma";

type CreateOrderRecordInput = {
  walletAddress: string;
  linkedEoaAddress?: string | null;
  orderType: OrderType;
  amount: string | number;
  usdtAmount?: string | number | null;
  buyRate?: string | number | null;
  sellRate?: string | number | null;
  blockchainOrderId?: string | null;
  transactionHash?: string | null;
  status: OrderStatus;
  adminUpiId?: string | null;
};

export async function resolveOrderUser(params: {
  walletAddress: string;
  linkedEoaAddress?: string | null;
}) {
  const walletAddress = params.walletAddress.toLowerCase();
  const linkedEoaAddress = params.linkedEoaAddress?.toLowerCase() ?? null;

  return withDatabaseRetry(async () => {
    let user = null;

    if (linkedEoaAddress) {
      user = await prisma.user.findUnique({
        where: { walletAddress: linkedEoaAddress },
      });

      if (user) {
        if (!user.smartWalletAddress && walletAddress !== linkedEoaAddress) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { smartWalletAddress: walletAddress },
          });
        }

        const ghostUser = await prisma.user.findUnique({
          where: { walletAddress },
        });

        if (ghostUser && ghostUser.id !== user.id) {
          await prisma.order.updateMany({
            where: { userId: ghostUser.id },
            data: { userId: user.id },
          });
        }

        return user;
      }
    }

    user = await prisma.user.findFirst({
      where: {
        OR: [{ walletAddress }, { smartWalletAddress: walletAddress }],
      },
    });

    if (user) {
      return user;
    }

    return prisma.user.create({
      data: {
        walletAddress,
        role: UserRole.USER,
        smartWalletAddress:
          linkedEoaAddress && linkedEoaAddress !== walletAddress ? walletAddress : null,
      },
    });
  });
}

export async function findOrderByBlockchainId(blockchainOrderId: string) {
  return withDatabaseRetry(() =>
    prisma.order.findFirst({
      where: { blockchainOrderId },
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
            smartWalletAddress: true,
            upiId: true,
            bankDetails: true,
          },
        },
      },
    })
  );
}

export async function createOrderRecord(input: CreateOrderRecordInput) {
  const user = await resolveOrderUser({
    walletAddress: input.walletAddress,
    linkedEoaAddress: input.linkedEoaAddress,
  });

  return withDatabaseRetry(() =>
    prisma.order.create({
      data: {
        userId: user.id,
        orderType: input.orderType,
        amount: Number(input.amount),
        usdtAmount:
          input.usdtAmount === null || input.usdtAmount === undefined
            ? null
            : Number(input.usdtAmount),
        buyRate:
          input.buyRate === null || input.buyRate === undefined
            ? null
            : Number(input.buyRate),
        sellRate:
          input.sellRate === null || input.sellRate === undefined
            ? null
            : Number(input.sellRate),
        blockchainOrderId: input.blockchainOrderId ?? null,
        transactionHash: input.transactionHash ?? null,
        status: input.status,
        adminUpiId: input.adminUpiId ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
            smartWalletAddress: true,
            upiId: true,
            bankDetails: true,
          },
        },
      },
    })
  );
}

export function serializeOrder(order: {
  id: string;
  amount: { toString(): string } | number;
  usdtAmount?: { toString(): string } | number | null;
  orderType: string;
  buyRate?: { toString(): string } | number | null;
  sellRate?: { toString(): string } | number | null;
  status: string;
  blockchainOrderId?: string | null;
  transactionHash?: string | null;
  adminUpiId?: string | null;
  createdAt: Date;
  user: {
    id: string;
    walletAddress: string;
    smartWalletAddress?: string | null;
    upiId?: string | null;
    bankDetails?: unknown;
  };
}) {
  return {
    id: `#${order.id.slice(-6)}`,
    fullId: order.id,
    time: order.createdAt.toLocaleTimeString(),
    amount: Number(order.amount),
    usdtAmount: order.usdtAmount ? Number(order.usdtAmount) : null,
    type: getOrderTypeLabel(order.orderType),
    orderType: order.orderType,
    price: Number(order.buyRate || order.sellRate || 0),
    currency: order.orderType.includes("CDM") ? "CDM" : "UPI",
    status: order.status,
    blockchainOrderId: order.blockchainOrderId ?? null,
    transactionHash: order.transactionHash ?? null,
    adminUpiId: order.adminUpiId ?? null,
    user: order.user,
    createdAt: order.createdAt,
  };
}

function getOrderTypeLabel(orderType: string): string {
  switch (orderType) {
    case "BUY_UPI":
    case "BUY_CDM":
      return "Buy Order";
    case "SELL":
    case "SELL_CDM":
      return "Sell Order";
    default:
      return orderType;
  }
}
