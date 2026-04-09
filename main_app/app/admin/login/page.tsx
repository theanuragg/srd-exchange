'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react'

declare global {
  interface Window {
    ethereum?: any
  }
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'idle' | 'connecting' | 'signing' | 'verifying' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)

  const handleLogin = async () => {
    setError(null)

    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to continue.')
      return
    }

    try {
      // Step 1: Connect MetaMask
      setStep('connecting')
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const address = accounts[0]
      if (!address) throw new Error('No account selected in MetaMask')
      setConnectedAddress(address)

      // Step 2: Sign a message to prove ownership
      setStep('signing')
      const timestamp = Date.now()
      const message = `Sign in to SRD Exchange Admin\nTimestamp: ${timestamp}\nWallet: ${address}`
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      })

      // Step 3: Verify on server
      setStep('verifying')
      const res = await fetch('/api/auth/admin-wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      setStep('success')
      setTimeout(() => router.push('/admin'), 1200)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setStep('idle')
      setConnectedAddress(null)
    }
  }

  const stepLabel: Record<typeof step, string> = {
    idle: 'Connect with MetaMask',
    connecting: 'Connecting...',
    signing: 'Sign the message in MetaMask...',
    verifying: 'Verifying admin access...',
    success: 'Access granted!',
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white font-montserrat">Access Granted</h1>
          <p className="text-gray-400 mt-2 font-montserrat">Redirecting to admin dashboard...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md bg-[#111010] border border-[#3E3E3E] rounded-2xl p-8"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <motion.div
            className="w-16 h-16 bg-[#622DBF]/20 rounded-full flex items-center justify-center mx-auto mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
          >
            <Shield className="w-8 h-8 text-[#622DBF]" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white font-montserrat">Admin Login</h1>
          <p className="text-gray-400 text-sm mt-2 font-montserrat">
            Connect your authorized admin wallet to continue
          </p>
        </div>

        {/* Connected address pill */}
        <AnimatePresence>
          {connectedAddress && step !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <span className="text-white/60 text-sm font-mono">
                {connectedAddress.slice(0, 8)}...{connectedAddress.slice(-6)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main button */}
        <button
          onClick={handleLogin}
          disabled={step !== 'idle'}
          className="w-full flex items-center justify-center gap-3 bg-[#622DBF] hover:bg-[#5219d1] disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-base transition-all active:scale-[0.98] font-montserrat"
        >
          {step === 'idle' ? (
            <>
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-6 h-6" />
              Connect with MetaMask
            </>
          ) : (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {stepLabel[step]}
            </>
          )}
        </button>

        {/* Steps indicator */}
        <AnimatePresence>
          {step !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-2 overflow-hidden"
            >
              {[
                { key: 'connecting', label: 'Connect wallet' },
                { key: 'signing', label: 'Sign message (proves ownership)' },
                { key: 'verifying', label: 'Verify admin access' },
              ].map(({ key, label }) => {
                const steps = ['connecting', 'signing', 'verifying']
                const currentIdx = steps.indexOf(step)
                const thisIdx = steps.indexOf(key)
                const isDone = thisIdx < currentIdx
                const isActive = thisIdx === currentIdx
                return (
                  <div key={key} className="flex items-center gap-2.5 text-sm">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isDone ? 'bg-green-500 border-green-500' : isActive ? 'border-[#622DBF]' : 'border-white/20'}`}>
                      {isDone && <span className="text-white text-[10px]">✓</span>}
                      {isActive && <div className="w-2 h-2 rounded-full bg-[#622DBF]" />}
                    </div>
                    <span className={isDone ? 'text-green-400' : isActive ? 'text-white' : 'text-white/30'}>{label}</span>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm font-montserrat">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info */}
        <div className="mt-6 p-3 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-white/40 text-xs text-center font-montserrat leading-relaxed">
            Only pre-authorized wallet addresses can access the admin dashboard.
            Signing the message does not cost any gas.
          </p>
        </div>

        <button
          onClick={() => router.push('/')}
          className="mt-5 w-full text-gray-500 hover:text-gray-300 text-sm text-center transition-colors font-montserrat"
        >
          ← Back to Home
        </button>
      </motion.div>
    </div>
  )
}
