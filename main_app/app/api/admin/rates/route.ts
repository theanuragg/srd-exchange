import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureConnection } from '@/lib/prisma'
import { CurrencyType, RateType } from '@prisma/client'
import { verifyAdminAccess } from '@/lib/admin-middleware'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
    try {
        await ensureConnection()

        const authResult = await verifyAdminAccess(request)
        if (authResult instanceof NextResponse) return authResult
        const adminUser = authResult.user

        // Parse body
        const body = await request.json()
        const { currency, buyRate, sellRate } = body

        if (!currency || !buyRate || !sellRate) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const buyRateNum = parseFloat(buyRate)
        const sellRateNum = parseFloat(sellRate)

        if (isNaN(buyRateNum) || isNaN(sellRateNum)) {
            return NextResponse.json(
                { success: false, error: 'Invalid rate values' },
                { status: 400 }
            )
        }

        console.log('Admin updating rates:', { currency, buyRate, sellRate, updatedBy: adminUser.walletAddress })

        // Upsert the rate
        // We use the composite unique constraint: @@unique([type, currency])
        const updatedRate = await prisma.rate.upsert({
            where: {
                type_currency: {
                    type: RateType.CURRENT,
                    currency: currency as CurrencyType
                }
            },
            update: {
                buyRate: buyRateNum,
                sellRate: sellRateNum,
                updatedBy: adminUser.walletAddress
            },
            create: {
                type: RateType.CURRENT,
                currency: currency as CurrencyType,
                buyRate: buyRateNum,
                sellRate: sellRateNum,
                updatedBy: adminUser.walletAddress
            }
        })

        return NextResponse.json({
            success: true,
            rate: updatedRate
        })

    } catch (error) {
        console.error('Error updating rates:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update rates' },
            { status: 500 }
        )
    }
}
