'use client'
import { FC, useState } from 'react'
import { useIsSignedIn } from '@coinbase/cdp-hooks'
import { useWalletManager } from '@/hooks/useWalletManager'
import WalletConnect from './WalletConnect'

interface Props {
  onClose: () => void
}

const SignInModal: FC<Props> = ({ onClose }) => {
  const { isSignedIn } = useIsSignedIn()
  const { address } = useWalletManager()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleContinue = async () => {
    if (!address) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/check-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })

      const { exists, role } = await res.json()

      if (!exists) {
        window.location.href = '/register'
      } else if (role === 'ADMIN') {
        window.location.href = '/admin'
      } else {
        window.location.href = '/fiat'
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold mb-6">Sign In</h2>

        <WalletConnect />

        {isSignedIn && (
          <button
            onClick={handleContinue}
            disabled={loading}
            className="mt-6 w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Continue'}
          </button>
        )}

        {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  )
}

export default SignInModal
