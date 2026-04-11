'use client'

import { useState, useEffect } from 'react'
import { useAccount } from '@particle-network/connectkit'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, CheckCircle2, AlertTriangle, Crown } from 'lucide-react'
import WalletConnectModal from '@/components/auth/WalletConnectModal'

export default function AdminSignupPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdminSignup = async () => {
    if (!address) return
    setLoading(true)
    setError(null)

    try {
      // Use wallet-auth route which now checks admin privileges automatically
      const registerRes = await fetch('/api/auth/wallet-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
          action: 'register'
        }),
      })

      const registerData = await registerRes.json()

      if (registerRes.ok) {
        if (registerData.user.role === 'ADMIN') {
          setSuccess(true)
          setTimeout(() => {
            router.push('/admin')
          }, 2000)
        } else {
          setError('This wallet address is not authorized for admin access')
        }
      } else {
        setError(registerData.error || 'Failed to register admin')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          className="text-center max-w-md w-full mx-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-4 font-montserrat">
            Admin Registered Successfully!
          </h1>
          <p className="text-gray-400 font-montserrat">
            Redirecting to admin dashboard...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          className="max-w-lg w-full bg-[#111010] border border-[#3E3E3E] rounded-xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Crown className="w-8 h-8 text-purple-500" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2 font-montserrat">
              Admin Registration
            </h1>
            <p className="text-gray-400 font-montserrat">
              Connect your authorized admin wallet to access the admin dashboard
            </p>
          </div>

          {/* Wallet Connection */}
          {!isConnected ? (
            <motion.button
              onClick={() => setShowWalletModal(true)}
              className="w-full bg-[#622DBF] text-white py-4 rounded-lg font-semibold hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-purple-600/25 font-montserrat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Connect Admin Wallet
            </motion.button>
          ) : (
            <div className="space-y-4">
              {/* Connected Wallet Info */}
              <div className="p-4 bg-[#1A1A1A] rounded-lg border border-green-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <div>
                    <p className="text-green-400 font-medium font-montserrat">Wallet Connected</p>
                    <p className="text-gray-400 text-sm font-montserrat">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Register Button */}
              <motion.button
                onClick={handleAdminSignup}
                disabled={loading}
                className="w-full bg-[#622DBF] text-white py-4 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-montserrat"
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registering...</span>
                  </div>
                ) : (
                  'Register as Admin'
                )}
              </motion.button>
            </div>
          )}

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400 text-sm font-montserrat">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Section */}
          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 font-medium font-montserrat">
                Admin Access Required
              </span>
            </div>
            <p className="text-gray-400 text-sm font-montserrat text-center">
              Only pre-authorized wallet addresses can register as admin. Contact the system administrator if you believe this is an error.
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white font-montserrat text-sm underline"
            >
              Back to Home
            </button>
          </div>
        </motion.div>
      </div>

      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSuccess={() => setShowWalletModal(false)}
      />
    </>
  )
}
