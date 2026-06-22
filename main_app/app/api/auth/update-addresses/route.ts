import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const { walletAddress, smartWalletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    if (!smartWalletAddress) {
      return NextResponse.json({ error: 'No addresses to update' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: { smartWalletAddress: smartWalletAddress.toLowerCase() },
      select: { id: true, walletAddress: true, smartWalletAddress: true },
    })

    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    console.error('update-addresses error:', error)
    return NextResponse.json({ error: 'Failed to update addresses' }, { status: 500 })
  }
}
