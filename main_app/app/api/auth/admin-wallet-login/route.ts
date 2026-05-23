import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'

const SECRET = process.env.ADMIN_SESSION_SECRET || 'srd-admin-secret-change-me'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours in seconds

function signToken(address: string, timestamp: number): string {
  const hmac = createHmac('sha256', SECRET)
    .update(`${address.toLowerCase()}:${timestamp}`)
    .digest('hex')
  return `${address.toLowerCase()}:${timestamp}:${hmac}`
}

export async function POST(request: NextRequest) {
  try {
    const { address, signature, message } = await request.json()

    if (!address || !signature || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the signature — confirms the caller owns this wallet
    const recovered = ethers.verifyMessage(message, signature)
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Check timestamp in message is recent (within 5 minutes) to prevent replay
    const tsMatch = message.match(/Timestamp: (\d+)/)
    if (!tsMatch) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }
    const msgTimestamp = parseInt(tsMatch[1])
    if (Date.now() - msgTimestamp > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Message expired. Please try again.' }, { status: 401 })
    }

    // Admin whitelist — same source of truth as wallet-auth
    const ADMIN_WALLETS = [
      '0x16071780eAAa5E5Ac7A31ca2485026Eb24071662',
      '0xA4c9991e1bA3F4aeB0D360186Ba6f8f7c66cC2BF',
    ]
    const isWhitelisted = ADMIN_WALLETS.some(w => w.toLowerCase() === address.toLowerCase())

    if (!isWhitelisted) {
      return NextResponse.json({ error: 'Access denied: This wallet does not have admin privileges.' }, { status: 403 })
    }

    // Upsert the admin user — creates the record on first login if it doesn't exist yet
    const user = await prisma.user.upsert({
      where: { walletAddress: address.toLowerCase() },
      update: { lastLoginAt: new Date(), role: 'ADMIN' },
      create: {
        walletAddress: address.toLowerCase(),
        role: 'ADMIN',
        profileCompleted: true,
        lastLoginAt: new Date(),
      },
    })

    // Create session token and set httpOnly cookie
    const token = signToken(address, msgTimestamp)

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, walletAddress: user.walletAddress, role: user.role },
    })

    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
