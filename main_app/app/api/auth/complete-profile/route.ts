import { NextRequest, NextResponse } from "next/server";
import { prisma, withDatabaseRetry } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, smartWalletAddress, upiId, bankDetails } = await request.json();

    console.log("Complete profile request:", { walletAddress, upiId, hasBankDetails: !!bankDetails });

    // Validate required fields - Only UPI ID is required for profile completion
    if (!walletAddress || !upiId || !upiId.trim()) {
      return NextResponse.json(
        { error: "Wallet address and UPI ID are required" },
        { status: 400 }
      );
    }

    // Check if user exists (by walletAddress OR smartWalletAddress)
    const existingUser = await withDatabaseRetry(() => prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: walletAddress.toLowerCase() },
          { smartWalletAddress: walletAddress.toLowerCase() }
        ]
      },
      include: { bankDetails: true }
    }));

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found. Please register first." },
        { status: 404 }
      );
    }

    // Update existing user - Profile is completed with just UPI ID
    const user = await withDatabaseRetry(() => prisma.user.update({
      where: { id: existingUser.id },
      data: {
        upiId: upiId.trim(),
        profileCompleted: true, // Always mark as completed when UPI ID is saved
        smartWalletAddress: smartWalletAddress ? smartWalletAddress.toLowerCase() : undefined,
        lastLoginAt: new Date(),
      },
      include: { bankDetails: true }
    }));

    console.log("User updated with profile completed:", user.profileCompleted);

    // Handle bank details only if provided and complete
    if (bankDetails &&
      bankDetails.accountNumber &&
      bankDetails.ifscCode &&
      bankDetails.branchName &&
      bankDetails.accountHolderName) {

      console.log("Saving bank details...");

      // Check if bank details already exist for this user
      const existingBankDetails = await withDatabaseRetry(() => prisma.bankDetails.findUnique({
        where: { userId: user.id }
      }));

      if (existingBankDetails) {
        // Update existing bank details
        await withDatabaseRetry(() => prisma.bankDetails.update({
          where: { userId: user.id },
          data: {
            accountNumber: bankDetails.accountNumber,
            ifscCode: bankDetails.ifscCode,
            branchName: bankDetails.branchName,
            accountHolderName: bankDetails.accountHolderName,
          }
        }));
      } else {
        // Create new bank details
        await withDatabaseRetry(() => prisma.bankDetails.create({
          data: {
            userId: user.id,
            accountNumber: bankDetails.accountNumber,
            ifscCode: bankDetails.ifscCode,
            branchName: bankDetails.branchName,
            accountHolderName: bankDetails.accountHolderName,
          }
        }));
      }
    }

    // Fetch updated user with bank details to ensure we have latest data
    const updatedUser = await withDatabaseRetry(() => prisma.user.findUnique({
      where: { id: user.id },
      include: { bankDetails: true }
    }));

    console.log("Final user state:", {
      id: updatedUser?.id,
      profileCompleted: updatedUser?.profileCompleted,
      hasUpiId: !!updatedUser?.upiId,
      hasBankDetails: !!updatedUser?.bankDetails
    });

    return NextResponse.json({
      success: true,
      message: "Profile completed successfully",
      user: {
        id: updatedUser?.id,
        walletAddress: updatedUser?.walletAddress,
        role: updatedUser?.role,
        upiId: updatedUser?.upiId,
        profileCompleted: updatedUser?.profileCompleted, // Use actual DB value
        hasBankDetails: !!updatedUser?.bankDetails,
      }
    });

  } catch (error) {
    console.error("Complete profile error:", error);
    return NextResponse.json(
      { error: "Failed to complete profile" },
      { status: 500 }
    );
  }
}