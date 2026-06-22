import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, eoaAddress, smartWalletAddress, role = 'USER' } = await request.json()

    const primaryAddress = (eoaAddress || walletAddress)
    const smartAddress = smartWalletAddress || (eoaAddress ? walletAddress : null)

    if (!primaryAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Check if user already exists (by either address)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: primaryAddress.toLowerCase() },
          ...(smartAddress ? [{ smartWalletAddress: smartAddress.toLowerCase() }] : [])
        ]
      },
      include: { bankDetails: true }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // Create new user with profileCompleted set to false
    const user = await prisma.user.create({
      data: {
        walletAddress: primaryAddress.toLowerCase(),
        smartWalletAddress: smartAddress ? smartAddress.toLowerCase() : null,
        role: role === 'ADMIN' ? 'ADMIN' : 'USER',
        profileCompleted: false,
        lastLoginAt: new Date(),
      },
      include: { bankDetails: true }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
        upiId: user.upiId,
        profileCompleted: false, // New users always need to complete profile
        hasBankDetails: false,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}