import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { serializeQrTransaction } from "@/lib/server/qr-transactions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;

    const transaction = await prisma.qRTransaction.findUnique({
      where: { id: transactionId },
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

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "QR transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction: serializeQrTransaction(transaction),
    });
  } catch (error) {
    console.error("Error fetching QR transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch QR transaction" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;
    const body = await request.json();

    const updateData: { scannedUpiId?: string; qrCodeData?: string } = {};
    if (typeof body.scannedUpiId === "string" && body.scannedUpiId.trim()) {
      updateData.scannedUpiId = body.scannedUpiId.trim();
    }
    if (typeof body.qrCodeData === "string") {
      updateData.qrCodeData = body.qrCodeData;
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
    console.error("Error updating QR transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update QR transaction" },
      { status: 500 }
    );
  }
}
