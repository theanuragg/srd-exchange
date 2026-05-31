import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { verifyAdminAccess } from '@/lib/admin-middleware'

// PATCH - Update order (admin only)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const authResult = await verifyAdminAccess(request)
        if (authResult instanceof NextResponse) return authResult

        // Await params in Next.js 15
        const { orderId } = await params
        const body = await request.json()

        console.log('Admin updating order:', orderId, body)

        // Validate order exists
        const existingOrder = await prisma.order.findUnique({
            where: { id: orderId }
        })

        if (!existingOrder) {
            return NextResponse.json(
                { success: false, error: 'Order not found' },
                { status: 404 }
            )
        }

        // Build update data
        const updateData: any = {}

        if (body.status) {
            // Validate status is a valid OrderStatus
            if (Object.values(OrderStatus).includes(body.status as OrderStatus)) {
                updateData.status = body.status as OrderStatus
            }
        }

        if (body.adminUpiId !== undefined) {
            updateData.adminUpiId = body.adminUpiId
        }

        if (body.adminBankDetails !== undefined) {
            updateData.adminBankDetails = body.adminBankDetails
        }

        if (body.adminNotes !== undefined) {
            updateData.adminNotes = body.adminNotes
        }

        if (body.paymentProof !== undefined) {
            updateData.paymentProof = body.paymentProof
        }

        if (body.customAmount !== undefined) {
            updateData.customAmount = body.customAmount
            // Store custom amount in adminNotes or a dedicated field
            const customAmountNote = `Custom amount: ₹${body.customAmount}`
            updateData.adminNotes = updateData.adminNotes
                ? `${updateData.adminNotes}. ${customAmountNote}`
                : customAmountNote
        }

        // Update order
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: updateData,
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
            }
        })

        console.log('Order updated successfully:', updatedOrder.id)

        // Transform for frontend
        const transformedOrder = {
            id: `#${updatedOrder.id.slice(-6)}`,
            fullId: updatedOrder.id,
            time: new Date(updatedOrder.createdAt).toLocaleTimeString(),
            amount: Number(updatedOrder.amount),
            usdtAmount: updatedOrder.usdtAmount ? Number(updatedOrder.usdtAmount) : null,
            type: updatedOrder.orderType.replace('_', ' '),
            orderType: updatedOrder.orderType,
            price: Number(updatedOrder.buyRate || updatedOrder.sellRate || 0),
            currency: updatedOrder.orderType.includes('CDM') ? 'CDM' : 'UPI',
            status: updatedOrder.status,
            paymentProof: updatedOrder.paymentProof,
            adminUpiId: updatedOrder.adminUpiId,
            adminBankDetails: updatedOrder.adminBankDetails,
            blockchainOrderId: updatedOrder.blockchainOrderId,
            user: updatedOrder.user,
            createdAt: updatedOrder.createdAt.toISOString()
        }

        return NextResponse.json({
            success: true,
            order: transformedOrder
        })
    } catch (error) {
        console.error('Error updating order:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update order' },
            { status: 500 }
        )
    }
}
