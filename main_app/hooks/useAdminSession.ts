'use client'

import { useEffect, useState } from 'react'

interface AdminSession {
  address: string | null
  chainId: number | undefined
  isLoading: boolean
}

export function useAdminSession(): AdminSession {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/admin-session')
      .then(r => r.json())
      .then(data => setAddress(data.valid ? data.address : null))
      .catch(() => setAddress(null))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const eth = (window as any).ethereum
    if (!eth) return

    const readChain = () =>
      eth.request({ method: 'eth_chainId' })
        .then((hex: string) => setChainId(parseInt(hex, 16)))
        .catch(() => {})

    readChain()

    const onChainChanged = (hex: string) => setChainId(parseInt(hex, 16))
    eth.on('chainChanged', onChainChanged)
    return () => eth.removeListener('chainChanged', onChainChanged)
  }, [])

  return { address, chainId, isLoading }
}
