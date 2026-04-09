'use client'

import { useState, useCallback } from 'react'

export function useAdminAPI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const makeAdminRequest = useCallback(async (
    url: string,
    options: RequestInit = {}
  ) => {
    setLoading(true)
    setError(null)

    try {
      // Session cookie is sent automatically by the browser (httpOnly, same-origin)
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'same-origin',
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
  }, [])

  return { makeAdminRequest, loading, error }
}
