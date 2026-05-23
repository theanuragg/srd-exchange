import { NextRequest, NextResponse } from "next/server";
import { QRTransactionStatus } from "@prisma/client";

import { verifyAdminAccess } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";
import { serializeQrTransaction } from "@/lib/server/qr-transactions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (authResult instanceof NextResponse) return authResult;

    const { transactionId } = await params;
    const body = await request.json();

    const existing = await prisma.qRTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "QR transaction not found" },
        { status: 404 }
      );
    }

    const updateData: {
      status?: QRTransactionStatus;
      adminNotes?: string;
      adminCompletedAt?: Date;
    } = {};

    if (body.status) {
      if (
        Object.values(QRTransactionStatus).includes(
          body.status as QRTransactionStatus
        )
      ) {
        updateData.status = body.status as QRTransactionStatus;
        if (body.status === "COMPLETED") {
          updateData.adminCompletedAt = new Date();
        }
      }
    }

    if (body.adminNotes !== undefined) {
      updateData.adminNotes = body.adminNotes;
    }

    const transaction = await prisma.qRTransaction.update({
      where: { id: transactionId },
      data: updateData,
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
    });

    return NextResponse.json({
      success: true,
      transaction: serializeQrTransaction(transaction),
    });
  } catch (error) {
    console.error("Error updating admin QR transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update QR transaction" },
      { status: 500 }
    );
  }
}
