import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')
    const eoaAddress = searchParams.get('eoaAddress')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Find user by walletAddress, smartWalletAddress, or eoaAddress
    let user = null

    // 1. Prefer the main user (matched by eoaAddress as walletAddress)
    if (eoaAddress) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { walletAddress: eoaAddress.toLowerCase() },
            { smartWalletAddress: eoaAddress.toLowerCase() }
          ]
        }
      })
    }

    // 2. Fallback: find by the wallet address directly
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { walletAddress: walletAddress.toLowerCase() },
            { smartWalletAddress: walletAddress.toLowerCase() }
          ]
        }
      })
    }

    if (!user) {
      return NextResponse.json({
        success: true,
        orders: []
      })
    }

    // Get user's orders
    const orders = await prisma.order.findMany({
      where: {
        userId: user.id
      },
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
            upiId: true,
            bankDetails: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // DEBUG: Log raw order statuses fetched for this user to help trace status issues
    console.log('[user/orders] Fetched orders for wallet:', walletAddress, 'userId:', user.id);
    console.log('[user/orders] Raw statuses:', orders.map(o => ({ id: o.id, status: o.status, blockchainOrderId: o.blockchainOrderId })));

    const transformedOrders = orders.map(order => ({
      id: `#${order.id.slice(-6)}`,
      fullId: order.id,
      time: formatTime(order.createdAt),
      amount: Number(order.amount),
      type: getOrderTypeLabel(order.orderType),
      orderType: order.orderType,
      price: Number(order.buyRate || order.sellRate || 0),
      currency: order.orderType.includes('CDM') ? 'CDM' : 'UPI',
      status: order.status,
      user: order.user,
      createdAt: order.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      orders: transformedOrders
    })

  } catch (error) {
    console.error('Error fetching user orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

function formatTime(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const orderDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const timeString = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  if (orderDate.getTime() === today.getTime()) {
    return `Today ${timeString}`
  } else if (orderDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
    return `Yesterday ${timeString}`
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
}

function getOrderTypeLabel(orderType: string): string {
  switch (orderType) {
    case 'BUY_UPI':
    case 'BUY_CDM':
      return 'Buy Order'
    case 'SELL':
    case 'SELL_CDM':
      return 'Sell Order'
    default:
      return orderType
  }
}
