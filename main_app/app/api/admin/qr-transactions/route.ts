import { NextRequest, NextResponse } from "next/server";
import { QRTransactionStatus } from "@prisma/client";

import { verifyAdminAccess } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";
import { serializeQrTransaction } from "@/lib/server/qr-transactions";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    let whereClause: { status?: { in: QRTransactionStatus[] } } = {};

    if (statusParam) {
      const statuses = statusParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s): s is QRTransactionStatus =>
          Object.values(QRTransactionStatus).includes(s as QRTransactionStatus)
        );

      if (statuses.length > 0) {
        whereClause.status = { in: statuses };
      }
    }

    const transactions = await prisma.qRTransaction.findMany({
      where: whereClause,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      transactions: transactions.map(serializeQrTransaction),
    });
  } catch (error) {
    console.error("Error fetching admin QR transactions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch QR transactions" },
      { status: 500 }
    );
  }
}
