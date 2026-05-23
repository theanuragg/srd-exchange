import "server-only";

import { QRTransactionStatus } from "@prisma/client";

import { prisma, withDatabaseRetry } from "@/lib/prisma";
import { resolveOrderUser } from "@/lib/server/orders";

type CreateQrTransactionInput = {
  walletAddress: string;
  linkedEoaAddress?: string | null;
  amountINR: string | number;
  amountUSDT: string | number;
  fee?: string | number;
  sellRate?: string | number | null;
  userOpHash: string;
  transactionHash?: string | null;
  scannedUpiId?: string | null;
};

export async function findQrTransactionByUserOpHash(userOpHash: string) {
  return withDatabaseRetry(() =>
    prisma.qRTransaction.findUnique({
      where: { userOpHash },
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

export async function createQrTransactionRecord(input: CreateQrTransactionInput) {
  const user = await resolveOrderUser({
    walletAddress: input.walletAddress,
    linkedEoaAddress: input.linkedEoaAddress,
  });

  return withDatabaseRetry(() =>
    prisma.qRTransaction.create({
      data: {
        userId: user.id,
        amountINR: Number(input.amountINR),
        amountUSDT: Number(input.amountUSDT),
        fee: input.fee === undefined ? 0.05 : Number(input.fee),
        sellRate:
          input.sellRate === null || input.sellRate === undefined
            ? null
            : Number(input.sellRate),
        userOpHash: input.userOpHash,
        transactionHash: input.transactionHash ?? null,
        scannedUpiId: input.scannedUpiId ?? null,
        status: QRTransactionStatus.PENDING,
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

export function serializeQrTransaction(transaction: {
  id: string;
  amountINR: { toString(): string } | number;
  amountUSDT: { toString(): string } | number;
  fee?: { toString(): string } | number;
  sellRate?: { toString(): string } | number | null;
  userOpHash?: string | null;
  transactionHash?: string | null;
  scannedUpiId?: string | null;
  status: string;
  adminNotes?: string | null;
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
    id: `#${transaction.id.slice(-6)}`,
    fullId: transaction.id,
    time: transaction.createdAt.toLocaleTimeString(),
    amount: Number(transaction.amountINR),
    usdtAmount: Number(transaction.amountUSDT),
    fee: transaction.fee ? Number(transaction.fee) : 0.05,
    type: "QR Scan & Pay",
    orderType: "QR_SCAN",
    price: transaction.sellRate ? Number(transaction.sellRate) : 0,
    currency: "UPI",
    status: transaction.status,
    scannedUpiId: transaction.scannedUpiId ?? null,
    userOpHash: transaction.userOpHash ?? null,
    transactionHash: transaction.transactionHash ?? null,
    adminNotes: transaction.adminNotes ?? null,
    isQrTransaction: true,
    user: transaction.user,
    createdAt: transaction.createdAt,
  };
}
