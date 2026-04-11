import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, walletData, action } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const normalizedAddress = walletAddress.toLowerCase()
    console.log(`Wallet auth request - Action: ${action}, Address: ${normalizedAddress}`)

    if (action === 'login') {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { walletAddress: normalizedAddress },
        include: { bankDetails: true }
      })

      console.log(`Login attempt - User found:`, user ? { id: user.id, role: user.role, profileCompleted: user.profileCompleted } : 'No user found')

      if (!user) {
        return NextResponse.json({
          exists: false,
          requiresRegistration: true
        })
      }

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date()
        }
      })

      return NextResponse.json({
        exists: true,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          role: user.role,
          profileCompleted: user.profileCompleted || false,
          upiId: user.upiId,
          hasBankDetails: !!user.bankDetails,
          createdAt: user.createdAt,
          lastLoginAt: new Date()
        }
      })
    }

    if (action === 'register') {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { walletAddress: normalizedAddress }
      })

      // Determine role based on wallet address (pass original address with case)
      const role = determineUserRole(walletAddress)
      console.log(`Registration - Determined role for ${walletAddress}: ${role}`)

      if (existingUser) {
        console.log(`Registration attempt - User already exists:`, { id: existingUser.id, role: existingUser.role })

        // If user exists but role needs to be updated (e.g., user becoming admin)
        if (existingUser.role !== role) {
          console.log(`Updating user role from ${existingUser.role} to ${role}`)

          const updatedUser = await prisma.user.update({
            where: { walletAddress: normalizedAddress },
            data: {
              role,
              profileCompleted: role === 'ADMIN' ? true : existingUser.profileCompleted,
              lastLoginAt: new Date()
            }
          })

          return NextResponse.json({
            success: true,
            user: {
              id: updatedUser.id,
              walletAddress: updatedUser.walletAddress,
              role: updatedUser.role,
              profileCompleted: updatedUser.profileCompleted,
              createdAt: updatedUser.createdAt,
              isUpdatedUser: true
            }
          })
        }

        // User exists with same role
        return NextResponse.json({
          success: true,
          user: {
            id: existingUser.id,
            walletAddress: existingUser.walletAddress,
            role: existingUser.role,
            profileCompleted: existingUser.profileCompleted,
            createdAt: existingUser.createdAt,
            isExistingUser: true
          }
        })
      }

      // Create new user
      const user = await prisma.user.create({
        data: {
          walletAddress: normalizedAddress,
          role,
          profileCompleted: role === 'ADMIN' ? true : false, // Admins don't need profile completion
          lastLoginAt: new Date()
        }
      })

      console.log('New user registered:', {
        id: user.id,
        address: user.walletAddress,
        role: user.role,
        profileCompleted: user.profileCompleted
      })

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          role: user.role,
          profileCompleted: user.profileCompleted,
          createdAt: user.createdAt,
          isNewUser: true
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Wallet auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}


function determineUserRole(walletAddress: string): 'USER' | 'ADMIN' {
  const adminWallets = [
    '0x68921410bd83A958e45Cf18e83fAecfDFcB80C3a',
  ]

  console.log(`Checking if ${walletAddress} is in admin wallets:`, adminWallets)

  const isAdmin = adminWallets.includes(walletAddress) || adminWallets.map(addr => addr.toLowerCase()).includes(walletAddress.toLowerCase())
  console.log(`Result: ${isAdmin ? 'ADMIN' : 'USER'}`)

  return isAdmin ? 'ADMIN' : 'USER'
}