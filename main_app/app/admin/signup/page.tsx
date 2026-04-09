'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, CheckCircle2, AlertTriangle, Crown, Wallet } from 'lucide-react'

export default function AdminSignupPage() {
  const router = useRouter()
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectMetaMask = async () => {
    const eth = (window as any).ethereum
    if (!eth) {
      setError('MetaMask not found. Please install MetaMask.')
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' })
      setAddress(accounts[0])
    } catch {
      setError('MetaMask connection rejected.')
    } finally {
      setConnecting(false)
    }
  }

  const handleAdminSignup = async () => {
    if (!address) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/wallet-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, action: 'register' }),
      })

      const data = await res.json()

      if (res.ok && data.user?.role === 'ADMIN') {
        setSuccess(true)
        setTimeout(() => router.push('/admin/login'), 2000)
      } else if (res.ok) {
        setError('This wallet address is not authorized for admin access.')
      } else {
        setError(data.error || 'Failed to register admin.')
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
        <motion.div className="text-center max-w-md w-full mx-4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 font-montserrat">Admin Registered!</h1>
          <p className="text-gray-400 font-montserrat">Redirecting to login...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        className="max-w-lg w-full bg-[#111010] border border-[#3E3E3E] rounded-xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-purple-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 font-montserrat">Admin Registration</h1>
          <p className="text-gray-400 font-montserrat text-sm">
            Connect your authorized MetaMask wallet to register as admin
          </p>
        </div>

        {!address ? (
          <button
            onClick={connectMetaMask}
            disabled={connecting}
            className="w-full bg-[#622DBF] text-white py-4 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-all font-montserrat flex items-center justify-center gap-2"
          >
            {connecting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Wallet className="w-5 h-5" />
            )}
            {connecting ? 'Connecting...' : 'Connect MetaMask'}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-[#1A1A1A] rounded-lg border border-green-500/20 flex items-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full shrink-0" />
              <div>
                <p className="text-green-400 font-medium font-montserrat text-sm">Wallet Connected</p>
                <p className="text-gray-400 text-xs font-mono">{address}</p>
              </div>
            </div>

            <button
              onClick={handleAdminSignup}
              disabled={loading}
              className="w-full bg-[#622DBF] text-white py-4 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-all font-montserrat"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Registering...</span>
                </div>
              ) : 'Register as Admin'}
            </button>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm font-montserrat">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 font-medium font-montserrat text-sm">Admin Access Required</span>
          </div>
          <p className="text-gray-400 text-xs font-montserrat text-center">
            Only pre-authorized wallet addresses can register as admin. After registering, use the login page to access the dashboard.
          </p>
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => router.push('/admin/login')} className="text-gray-400 hover:text-white font-montserrat text-sm underline">
            Already registered? Login
          </button>
        </div>
      </motion.div>
    </div>
  )
}
