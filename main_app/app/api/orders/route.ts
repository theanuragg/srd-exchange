import { NextRequest, NextResponse } from 'next/server'
import { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// GET - Fetch user's orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Find user by wallet address OR smart wallet address
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: walletAddress.toLowerCase() },
          { smartWalletAddress: walletAddress.toLowerCase() }
        ]
      },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                walletAddress: true,
                upiId: true,
                bankDetails: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const transformedOrders = user.orders.map(order => ({
      id: `#${order.id.slice(-6)}`,
      fullId: order.id,
      time: formatTime(order.createdAt),
      amount: Number(order.amount), // Rupees
      usdtAmount: order.usdtAmount ? Number(order.usdtAmount) : null, // USDT
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
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    console.log('📥 Orders API - POST request received');

    const body = await request.json()
    console.log('📋 Request body:', body);

    const {
      walletAddress,
      orderType,
      amount,
      usdtAmount,
      buyRate,
      sellRate,
      paymentMethod,
      blockchainOrderId,
      status,
      linkedEoaAddress // NEW: Accept linked EOA address to associate with existing user profile
    } = body

    // Enhanced validation
    if (!walletAddress) {
      console.error('❌ Missing walletAddress');
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    if (!orderType) {
      console.error('❌ Missing orderType');
      return NextResponse.json(
        { error: 'Order type is required' },
        { status: 400 }
      )
    }

    if (!amount || isNaN(parseFloat(amount))) {
      console.error('❌ Invalid amount:', amount);
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    // Map status to valid OrderStatus values
    let validStatus: OrderStatus = OrderStatus.PENDING; // Default status
    if (status === 'BLOCKCHAIN_PENDING') {
      validStatus = OrderStatus.PENDING;
    } else if (status === 'PENDING_ADMIN_PAYMENT') {
      validStatus = OrderStatus.PENDING_ADMIN_PAYMENT;
    } else if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      validStatus = status as OrderStatus;
    }

    // SPAM PREVENTION: Validate SELL orders
    let sellTxHash = null;
    if (orderType === 'SELL' || orderType === 'SELL_CDM') {
      // 1. Require gasStationTxHash
      // Note: The frontend sends it as 'gasStationTxHash', but we might map it to 'blockchainOrderId' or just check it.
      // Based on the log below, it seems available in body but not destructured yet?
      // Let's grab it from body if not in destructured vars
      const txHash = body.gasStationTxHash || blockchainOrderId;

      if (!txHash) {
        console.error('❌ VALIDATION FAILED: Sell order missing transaction hash');
        return NextResponse.json(
          { error: 'Transaction hash is required for Sell orders. Please copy your transaction hash and contact support.' },
          { status: 400 }
        );
      }

      // 2. Validate hash format (basic check)
      if (!txHash.startsWith('0x') || txHash.length < 64) {
        console.error('❌ VALIDATION FAILED: Invalid hash format:', txHash);
        return NextResponse.json(
          { error: 'Invalid transaction hash format.' },
          { status: 400 }
        );
      }

      sellTxHash = txHash;

      // 3. check for duplicates (Idempotency)
      // Check if an order with this hash already exists
      const existingOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { blockchainOrderId: txHash },
            // If we stored it elsewhere, check there too. But likely it goes to blockchainOrderId column?
            // The schema isn't visible but `blockchainOrderId` seems the place.
          ]
        }
      });

      if (existingOrder) {
        console.warn('⚠️ IDEMPOTENCY: Order with this hash already exists:', txHash);
        // Return the existing order as success to handle network retries gracefully
        return NextResponse.json({
          success: true,
          order: {
            id: `#${existingOrder.id.slice(-6)}`,
            fullId: existingOrder.id,
            status: existingOrder.status,
            existing: true // Flag for frontend if needed
          },
          message: "Order already exists"
        });
      }
    }

    // If it's a sell order, ensure we save the hash
    const finalBlockchainId = sellTxHash || blockchainOrderId || null;

    console.log('✅ Validation passed, creating order:', {
      walletAddress,
      linkedEoaAddress,
      orderType,
      amount: `₹${amount}`,
      usdtAmount: usdtAmount ? `${usdtAmount} USDT` : 'N/A',
      rate: buyRate || sellRate,
      blockchainOrderId: finalBlockchainId,
      originalStatus: status,
      validStatus: validStatus
    });

    // New logic: Consolidate User Identity
    let user = null;

    if (linkedEoaAddress) {
      // 1. Try to find the Main User by EOA address
      user = await prisma.user.findUnique({
        where: { walletAddress: linkedEoaAddress.toLowerCase() }
      });

      if (user) {
        console.log('✅ Found Main User via EOA:', user.id);

        // 2. Update smartWalletAddress if not set
        if (!user.smartWalletAddress && walletAddress.toLowerCase() !== linkedEoaAddress.toLowerCase()) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { smartWalletAddress: walletAddress.toLowerCase() }
          });
          console.log('🔗 Linked Smart Wallet to Main User');
        }

        // 3. Heal History: Check for "Ghost User" (created via SW address) and merge orders
        const ghostUser = await prisma.user.findUnique({
          where: { walletAddress: walletAddress.toLowerCase() }
        });

        if (ghostUser && ghostUser.id !== user.id) {
          console.log('👻 Found Ghost User with orders:', ghostUser.id);
          // Move orders to Main User
          await prisma.order.updateMany({
            where: { userId: ghostUser.id },
            data: { userId: user.id }
          });
          console.log('📦 Moved orders from Ghost User to Main User');
        }
      }
    }

    // Fallback: If no linked user found, find/create by walletAddress (standard flow)
    if (!user) {
      user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() }
      });

      if (!user) {
        // Check if this walletAddress is a smartWalletAddress for someone else?
        // (Edge case, but let's stick to simple creation for now)
        console.log('👤 Creating new user for wallet:', walletAddress);
        user = await prisma.user.create({
          data: {
            walletAddress: walletAddress.toLowerCase(),
            role: 'USER'
          }
        });
      }
    }

    console.log('👤 User found/created:', user.id);

    // Create order with proper amounts and valid status
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        orderType,
        amount: parseFloat(amount),
        usdtAmount: usdtAmount ? parseFloat(usdtAmount) : null,
        buyRate: buyRate ? parseFloat(buyRate) : null,
        sellRate: sellRate ? parseFloat(sellRate) : null,
        blockchainOrderId: finalBlockchainId,
        status: validStatus // Use the mapped valid status
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
      }
    })

    console.log('📝 Order created in database:', order.id);

    // Transform for frontend
    const transformedOrder = {
      id: `#${order.id.slice(-6)}`,
      fullId: order.id,
      time: new Date(order.createdAt).toLocaleTimeString(),
      amount: Number(order.amount),
      usdtAmount: Number(order.usdtAmount || 0),
      type: orderType.replace('_', ' '),
      orderType: order.orderType,
      price: Number(order.buyRate || sellRate || 0),
      currency: order.orderType.includes('CDM') ? 'CDM' : 'UPI',
      status: order.status,
      blockchainOrderId: order.blockchainOrderId,
      user: order.user,
      createdAt: order.createdAt
    }

    console.log('✅ Order created successfully:', transformedOrder.id);

    return NextResponse.json({
      success: true,
      order: transformedOrder
    })
  } catch (error) {
    console.error('❌ Error in orders API:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    return NextResponse.json(
      {
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT - Update order (user can update payment proof, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, paymentProof, transactionId } = body

    if (!orderId) {
      return NextResponse.json({
        success: false,
        error: 'Order ID is required'
      }, { status: 400 })
    }

    // TODO: Verify user owns this order
    // TODO: Update order in database with payment proof

    const updatedOrder = {
      id: orderId,
      paymentProof: paymentProof,
      transactionId: transactionId,
      status: 'under_review',
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Payment proof uploaded successfully'
    })
  } catch (error) {
    console.error('Order update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update order'
    }, { status: 500 })
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
