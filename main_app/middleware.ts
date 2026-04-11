import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only apply to admin routes
  if (request.nextUrl.pathname.startsWith('/admin') || 
      request.nextUrl.pathname.startsWith('/api/admin')) {
    
    // For API routes, check wallet address header
    if (request.nextUrl.pathname.startsWith('/api/admin')) {
      const walletAddress = request.headers.get('x-wallet-address')
      if (!walletAddress) {
        return NextResponse.json(
          { error: 'Wallet address required' },
          { status: 401 }
        )
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}