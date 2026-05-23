import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'

const SECRET = process.env.ADMIN_SESSION_SECRET || 'srd-admin-secret-change-me'

function validateSessionToken(token: string): string | null {
  const parts = token.split(':')
  if (parts.length < 3) return null

  const hmac = parts[parts.length - 1]
  const timestamp = parseInt(parts[parts.length - 2])
  const address = parts.slice(0, parts.length - 2).join(':')

  // Verify HMAC
  const expected = createHmac('sha256', SECRET)
    .update(`${address}:${timestamp}`)
    .digest('hex')

  if (expected !== hmac) return null

  // Check session age (24h)
  if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return null

  return address
}

export async function verifyAdminAccess(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const address = validateSessionToken(token)

    if (!address) {
      return NextResponse.json(
        { error: 'Invalid or expired admin session' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    return { user, isValid: true }
  } catch (error) {
    console.error('Admin verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}
