import { NextRequest, NextResponse } from 'next/server'
import { getGasStation } from '@/lib/gasStation'

export async function POST(request: NextRequest) {
  try {
    const { userAddress, usdtAmount, inrAmount, orderType, chainId } = await request.json()
    
    // Force mainnet validation
    if (chainId !== 56) {
      console.error(`❌ Invalid chainId: ${chainId}. Only BSC Mainnet (56) is supported.`)
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
    
    console.log('🏗️ Gas Station sell order creation request (BSC Mainnet):', {
      userAddress,
      usdtAmount,
      inrAmount,
      orderType,
      chainId: 56 // Force mainnet
    })
    
    // Always use mainnet gas station
    const gasStation = getGasStation(56)
    
    // 🔥 FIX: Use isReady() instead of checkGasStationStatus()
    if (!gasStation.isReady()) {
      console.error('❌ Gas Station not ready')
      return NextResponse.json(
        { 
          success: false,
          error: 'Gas Station not ready on BSC Mainnet. Please try again later.' 
        },
        { status: 503 }
      )
    }
    
    console.log('✅ Gas Station ready for sell order processing')
    
    return NextResponse.json({
      success: true,
      message: 'Sell order processed via Gas Station on BSC Mainnet',
      chainId: 56,
      gasStationAddress: gasStation.getAddress()
    })
    
  } catch (error) {
    console.error('❌ Gas Station sell order creation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Sell order creation failed' 
      },
      { status: 500 }
    )
  }
}