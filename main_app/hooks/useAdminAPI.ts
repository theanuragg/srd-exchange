'use client'

import { useAccount } from '@particle-network/connectkit'
import { useState, useCallback } from 'react'

export function useAdminAPI() {
  const { address } = useAccount()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const makeAdminRequest = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Request failed')
      }

      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [address])

  return { makeAdminRequest, loading, error }
}