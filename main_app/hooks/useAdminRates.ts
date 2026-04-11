'use client'

import { useState, useCallback } from 'react'
import { useAccount } from '@particle-network/connectkit'

export function useAdminRates() {
  const { address } = useAccount()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateRates = useCallback(async (
    currency: 'UPI' | 'CDM',
    buyRate: string,
    sellRate: string
  ) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/rates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          currency,
          buyRate,
          sellRate
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update rates')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [address])

  return {
    updateRates,
    loading,
    error
  }
}