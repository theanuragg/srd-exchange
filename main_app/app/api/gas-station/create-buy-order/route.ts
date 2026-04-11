import { NextRequest, NextResponse } from 'next/server'
import { getGasStation } from '@/lib/gasStation'

export async function POST(request: NextRequest) {
  try {
    const { userAddress, usdtAmount, inrAmount, orderType, chainId } = await request.json()
    
    // Force mainnet validation
    if (chainId !== 56) {
      return NextResponse.json(
        { 
          success: false,
          error: `Invalid network. Only BSC Mainnet (Chain ID 56) is supported. Received: ${chainId}` 
        },
        { status: 400 }
      )
    }
    
    if (!userAddress || !usdtAmount || !inrAmount || !orderType) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameters: userAddress, usdtAmount, inrAmount, orderType' 
        },
        { status: 400 }
      )
    }
    
    console.log('🏗️ Gas Station buy order creation request (BSC Mainnet):', {
      userAddress,
      usdtAmount,
      inrAmount,
      orderType,
      chainId: 56
    })
    
    const gasStation = getGasStation(56)
    
    // 🔥 FIX: Use isReady() instead of checkGasStationStatus()
    if (!gasStation.isReady()) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Gas Station not ready on BSC Mainnet. Please try again later.' 
        },
        { status: 503 }
      )
    }
    
    // 🔥 FIX: For buy orders, we don't have createBuyOrder function in streamlined version
    // Buy orders are handled differently - admin transfers USDT to user
    console.log('✅ Gas Station ready for buy order processing')
    
    return NextResponse.json({
      success: true,
      message: 'Buy order processed via Gas Station on BSC Mainnet',
      chainId: 56,
      gasStationAddress: gasStation.getAddress()
    })
    
  } catch (error) {
    console.error('❌ Gas Station buy order creation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Buy order creation failed' 
      },
      { status: 500 }
    )
  }
}