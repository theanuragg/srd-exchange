import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { verifyAdminAccess } from '@/lib/admin-middleware'

// GET - Fetch orders for admin (with filtering)
export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAdminAccess(request)
        if (authResult instanceof NextResponse) return authResult

        // Get query parameters
        const { searchParams } = new URL(request.url)
        const statusParam = searchParams.get('status')

        console.log('Admin fetching orders with status:', statusParam)

        // Build where clause based on status filter
        let whereClause: any = {}

        if (statusParam) {
            const statuses = statusParam.split(',').map(s => s.trim().toUpperCase())

            // Map status strings to valid OrderStatus enum values
            const validStatuses: OrderStatus[] = []
            for (const status of statuses) {
                if (Object.values(OrderStatus).includes(status as OrderStatus)) {
                    validStatuses.push(status as OrderStatus)
                }
            }

            if (validStatuses.length > 0) {
                whereClause.status = { in: validStatuses }
            }
        }

        // Fetch orders with user details
        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        walletAddress: true,
                        smartWalletAddress: true,
                        upiId: true,
                        bankDetails: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        console.log(`Found ${orders.length} orders for admin`)

        // Transform orders for frontend
        const transformedOrders = orders.map(order => ({
            id: `#${order.id.slice(-6)}`,
            fullId: order.id,
            time: formatTime(order.createdAt),
            amount: Number(order.amount),
            usdtAmount: order.usdtAmount ? Number(order.usdtAmount) : null,
            type: getOrderTypeLabel(order.orderType),
            orderType: order.orderType,
            price: Number(order.buyRate || order.sellRate || 0),
            currency: order.orderType.includes('CDM') ? 'CDM' : 'UPI',
            status: order.status,
            paymentProof: order.paymentProof,
            adminUpiId: order.adminUpiId,
            adminBankDetails: order.adminBankDetails,
            blockchainOrderId: order.blockchainOrderId,
            userConfirmedReceived: order.userConfirmedReceived,
            userConfirmedAt: order.userConfirmedAt?.toISOString(),
            user: order.user,
            createdAt: order.createdAt.toISOString()
        }))

        return NextResponse.json({
            success: true,
            orders: transformedOrders
        })
    } catch (error) {
        console.error('Error fetching admin orders:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch orders' },
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
        case 'SELL_UPI':
        case 'SELL_CDM':
            return 'Sell Order'
        default:
            return orderType
    }
}
