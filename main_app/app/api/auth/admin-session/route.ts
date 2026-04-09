import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const SECRET = process.env.ADMIN_SESSION_SECRET || 'srd-admin-secret-change-me'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value

  if (!token) {
    return NextResponse.json({ valid: false })
  }

  const parts = token.split(':')
  // address can contain colons? No — it's a hex address. But split into 3 parts: address, timestamp, hmac
  if (parts.length < 3) {
    return NextResponse.json({ valid: false })
  }

  const hmac = parts[parts.length - 1]
  const timestamp = parseInt(parts[parts.length - 2])
  const address = parts.slice(0, parts.length - 2).join(':')

  // Verify HMAC
  const expected = createHmac('sha256', SECRET)
    .update(`${address}:${timestamp}`)
    .digest('hex')

  if (expected !== hmac) {
    return NextResponse.json({ valid: false })
  }

  // Check session age (24h)
  if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({ valid: true, address })
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_session', '', { maxAge: 0, path: '/' })
  return response
}
