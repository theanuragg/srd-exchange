'use client'
import { useIsSignedIn, useSignOut } from '@coinbase/cdp-hooks'
import { AuthButton } from '@coinbase/cdp-react'
import { useWalletManager } from '@/hooks/useWalletManager'

export default function WalletConnect() {
  const { isSignedIn } = useIsSignedIn()
  const { signOut } = useSignOut()
  const { address } = useWalletManager()

  if (isSignedIn) {
    return (
      <div className="bg-green-100 p-4 rounded-lg">
        <p className="text-green-800 font-medium">Connected</p>
        <p className="text-sm text-gray-600">{address}</p>
        <button 
          onClick={() => signOut()}
          className="mt-3 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Connect Your Wallet</h3>
      <AuthButton />
    </div>
  )
}
