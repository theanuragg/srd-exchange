import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseRetry } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const user = await withDatabaseRetry(() => prisma.user.findUnique({
      where: {
        walletAddress: walletAddress.toLowerCase()
      },
      include: {
        bankDetails: true
      }
    }))

    if (!user) {
      console.log("User not found for address:", walletAddress);
      return NextResponse.json({
        isValid: false,
        error: 'User not found'
      })
    }

    // Profile completion logic: User must have UPI ID
    const hasUpiId = user.upiId && user.upiId.trim() !== '';

    // Use the database profileCompleted field AND verify UPI ID exists
    const isProfileComplete = user.profileCompleted && hasUpiId;

    console.log("User verification:", {
      walletAddress: user.walletAddress,
      hasUpiId,
      profileCompletedInDB: user.profileCompleted,
      isProfileComplete
    });

    return NextResponse.json({
      isValid: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
        upiId: user.upiId,
        profileCompleted: isProfileComplete,
        hasBankDetails: !!user.bankDetails,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}