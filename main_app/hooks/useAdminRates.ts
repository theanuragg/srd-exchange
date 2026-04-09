'use client'

import { useState, useCallback } from 'react'

export function useAdminRates() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateRates = useCallback(async (
    currency: 'UPI' | 'CDM',
    buyRate: string,
    sellRate: string
  ) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/rates', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency, buyRate, sellRate }),
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
  }, [])

  return { updateRates, loading, error }
}