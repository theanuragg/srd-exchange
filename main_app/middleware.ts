import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SECRET = process.env.ADMIN_SESSION_SECRET || 'srd-admin-secret-change-me'

async function hmacSha256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function validateAdminSession(token: string): Promise<boolean> {
  const parts = token.split(':')
  if (parts.length < 3) return false

  const hmac = parts[parts.length - 1]
  const timestamp = parseInt(parts[parts.length - 2])
  const address = parts.slice(0, parts.length - 2).join(':')

  if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return false

  const expected = await hmacSha256(SECRET, `${address}:${timestamp}`)
  return expected === hmac
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Protect /api/admin/* routes
  if (path.startsWith('/api/admin')) {
    const token = request.cookies.get('admin_session')?.value
    if (!token || !(await validateAdminSession(token))) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }
  }

  // Protect /admin/* pages (except /admin/login)
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    const token = request.cookies.get('admin_session')?.value
    if (!token || !(await validateAdminSession(token))) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}
