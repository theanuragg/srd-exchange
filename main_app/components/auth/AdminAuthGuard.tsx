'use client'

import { useAccount, useModal } from '@particle-network/connectkit'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle } from 'lucide-react'
import WalletConnectModal from './WalletConnectModal'

interface AdminAuthGuardProps {
  children: React.ReactNode
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { isConnected, address } = useAccount()
  const { setOpen } = useModal()
  const router = useRouter()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const verifyAdminAccess = async () => {
      if (!isConnected || !address) {
        setIsVerifying(false)
        setIsAuthorized(false)
        return
      }

      try {
        const res = await fetch('/api/auth/verify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address }),
        })

        const data = await res.json()

        if (res.ok && data.isAdmin) {
          setIsAuthorized(true)
          setAuthError(null)
        } else {
          setIsAuthorized(false)
          setAuthError(data.error || 'Access denied: Admin privileges required')
        }
      } catch (error) {
        console.error('Admin verification failed:', error)
        setIsAuthorized(false)
        setAuthError('Verification failed. Please try again.')
      } finally {
        setIsVerifying(false)
      }
    }

    verifyAdminAccess()
  }, [isConnected, address])

  // Show loading state while verifying
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 border-4 border-[#622DBF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2 font-montserrat">
            Verifying Admin Access...
          </h2>
          <p className="text-gray-400 font-montserrat">
            Please wait while we verify your admin privileges
          </p>
        </motion.div>
      </div>
    )
  }

  // Show auth required screen
  if (!isConnected || !isAuthorized) {
    return (
      <>
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <motion.div
            className="text-center max-w-md w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Shield className="w-10 h-10 text-red-500" />
            </motion.div>
            
            <motion.h2
              className="text-3xl font-bold text-white mb-4 font-montserrat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Admin Access Required
            </motion.h2>
            
            <motion.p
              className="text-gray-400 mb-8 font-montserrat leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              To access the admin dashboard, you need to connect an authorized admin wallet.
            </motion.p>

            {authError && (
              <motion.div
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400 text-sm font-montserrat">{authError}</p>
                </div>
              </motion.div>
            )}

            <motion.button
              onClick={() => setOpen(true)}
              className="bg-[#622DBF] text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-purple-600/25 font-montserrat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Connect Admin Wallet
            </motion.button>

            <motion.div
              className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400 font-medium font-montserrat">
                  Secure Admin Access
                </span>
              </div>
              <p className="text-gray-400 text-sm font-montserrat">
                Only pre-authorized wallet addresses can access the admin dashboard.
              </p>
            </motion.div>

            <motion.button
              onClick={() => router.push('/')}
              className="mt-6 text-gray-400 hover:text-white font-montserrat text-sm underline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Back to Home
            </motion.button>
          </motion.div>
        </div>
        
        <WalletConnectModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onSuccess={() => {
            setShowWalletModal(false)
            // The useEffect will handle re-verification
          }}
        />
      </>
    )
  }

  return <>{children}</>
}