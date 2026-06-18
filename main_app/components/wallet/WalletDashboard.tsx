'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIsSignedIn, useSignOut } from '@coinbase/cdp-hooks'
import { X, ChevronRight, CheckCircle2, Wallet, RefreshCw, Copy, ExternalLink, TrendingUp, TrendingDown, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWalletManager } from '@/hooks/useWalletManager'

interface WalletConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const walletOptions = [
  {
    name: 'Metamask',
    id: 'metaMask',
    icon: '🦊',
    status: 'Detected'
  },
  {
    name: 'Connect Binance Wallet',
    id: 'binanceWallet',
    icon: '🟡',
    status: 'Detected'
  },
  {
    name: 'Connect Other Wallet',
    id: 'walletConnect',
    icon: '💳',
    status: 'Detected'
  },
  {
    name: 'Phone Number/Email',
    id: 'phoneEmail',
    icon: '📊',
    status: 'Coming soon',
    disabled: true
  }
]

export default function WalletConnectModal({
  isOpen,
  onClose,
  onSuccess
}: WalletConnectModalProps) {
  const { isSignedIn } = useIsSignedIn()
  const { signOut } = useSignOut()
  const { address, walletData, fetchWalletData, isOnBSC, switchToBSC } = useWalletManager()
  const router = useRouter()

  const [selectedConnector, setSelectedConnector] = useState<string | null>(null)
  const [authStep, setAuthStep] = useState<'connect' | 'authenticating' | 'switching' | 'success'>('connect')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  useEffect(() => {
    if (isSignedIn && address) {
      handleWalletConnected()
    }
  }, [isSignedIn, address])

  const handleWalletConnected = async () => {
    if (!address) return

    setAuthStep('authenticating')

    try {
      // Fetch wallet data first (returns serializable version)
      const serializableWalletInfo = await fetchWalletData()

      // Switch to BSC if not already
      if (!isOnBSC) {
        setAuthStep('switching')
        const switched = await switchToBSC()
        if (!switched) {
          throw new Error('Failed to switch to Binance Smart Chain')
        }
      }

      // Authenticate with backend using serializable data
      const authRes = await fetch('/api/auth/wallet-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          walletData: serializableWalletInfo,
          action: 'login'
        }),
      })

      const authData = await authRes.json()

      if (authData.requiresRegistration) {
        // Register new user
        const registerRes = await fetch('/api/auth/wallet-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: address,
            walletData: serializableWalletInfo,
            action: 'register'
          }),
        })

        const registerData = await registerRes.json()

        if (registerRes.ok) {
          setAuthStep('success')
          setTimeout(() => {
            router.push(registerData.user.role === 'ADMIN' ? '/admin' : '/fiat')
            onClose()
          }, 1500)
        } else {
          throw new Error(registerData.error || 'Registration failed')
        }
      } else if (authData.exists) {
        // Existing user
        setAuthStep('success')
        setTimeout(() => {
          router.push(authData.user.role === 'ADMIN' ? '/admin' : '/fiat')
          onClose()
        }, 1500)
      }

      if (onSuccess) onSuccess()
    } catch (error) {
      console.error('Authentication failed:', error)
      signOut()
      setAuthStep('connect')
    }
  }

  const handleConnect = async (wallet?: { id: string }) => {
    if (!acceptedTerms) {
      alert("Please accept the Terms and Conditions to continue.")
      return
    }

    if (wallet?.id) setSelectedConnector(wallet.id)
  }

  // Loading states
  if (authStep === 'authenticating') {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed inset-0 bg-black/80 flex items-center justify-center z-9999">
            <motion.div className="bg-[#111010] rounded-xl p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#622DBF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-white text-xl font-semibold mb-2">
                  Authenticating Wallet...
                </h3>
                <p className="text-gray-400">
                  Verifying your wallet and fetching balances
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  if (authStep === 'switching') {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed inset-0 bg-black/80 flex items-center justify-center z-9999">
            <motion.div className="bg-[#111010] rounded-xl p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-white text-xl font-semibold mb-2">
                  Switching to BSC...
                </h3>
                <p className="text-gray-400">
                  Please approve the network switch in your wallet
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  if (authStep === 'success') {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed inset-0 bg-black/80 flex items-center justify-center z-9999">
            <motion.div className="bg-[#111010] rounded-xl p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                <h3 className="text-white text-xl font-semibold mb-2">
                  Welcome to SRD Exchange!
                </h3>
                <p className="text-gray-400">
                  Redirecting to your dashboard...
                </p>
                {walletData && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-400 text-sm">
                      USDT Balance: {parseFloat(walletData.balances.usdt.formatted).toFixed(2)} USDT
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/80 z-9998"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 flex items-center justify-center z-9997 p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            <div className="bg-black rounded-2xl max-w-2xl w-full p-8 relative">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Header */}
              <div className="mb-8 bg-black">
                <h1 className="text-white text-4xl font-bold mb-4">
                  Connect your wallet
                </h1>
                <p className="text-gray-400 text-lg">
                  Securely link your crypto wallet to start trading instantly — no sign-up, no hassle.
                </p>
              </div>

              {/* Wallet Options */}
              <div className="space-y-4">
                {walletOptions.map((wallet) => {
                  const isLoading = selectedConnector === wallet.id
                  const isComingSoon = wallet.status === 'Coming soon'
                  const isDisabled = isLoading || isComingSoon || !acceptedTerms

                  return (
                    <motion.button
                      key={wallet.id}
                      onClick={() => handleConnect(wallet)}
                      disabled={isDisabled}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${isComingSoon
                        ? 'bg-gray-900/50 border-gray-700/50 cursor-not-allowed opacity-60'
                        : !acceptedTerms
                          ? 'bg-gray-900/50 border-gray-700/50 cursor-not-allowed opacity-60'
                          : 'bg-gray-900/80 border-gray-700 hover:border-gray-600 hover:bg-gray-800/80'
                        }`}
                      whileHover={!isDisabled ? { scale: 1.02 } : {}}
                      whileTap={!isDisabled ? { scale: 0.98 } : {}}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">
                          {wallet.icon}
                        </div>
                        <span className="text-white font-medium text-lg">
                          {wallet.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className={`text-sm font-medium ${isComingSoon ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                            {wallet.status}
                          </span>
                        )}
                        {!isComingSoon && (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Terms and Conditions Checkbox */}
              <div className="mt-6 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => setAcceptedTerms(!acceptedTerms)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${acceptedTerms
                      ? 'bg-[#622DBF] border-[#622DBF]'
                      : 'border-gray-600 hover:border-gray-500'
                      }`}
                  >
                    {acceptedTerms && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      I have read and accept the{' '}
                      <button className="text-[#622DBF] hover:text-purple-400 underline transition-colors">
                        Terms of Use
                      </button>{' '}
                      and{' '}
                      <button className="text-[#622DBF] hover:text-purple-400 underline transition-colors">
                        Privacy Policy
                      </button>
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms Required Message */}
              {!acceptedTerms && (
                <motion.div
                  className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-yellow-400 text-sm text-center">
                    Please accept the Terms of Use and Privacy Policy to continue
                  </p>
                </motion.div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <div className="text-center">
                  <a className='text-white'>Watch Tutorial</a>
                  <span className="text-gray-400">Having issues? </span>
                  <a href='https://telegram.me/SrdExchangeGlobal' target='_blank' className="text-blue-400 hover:text-blue-300 underline transition-colors">
                    Connect us
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function WalletDashboard() {
  const {
    address,
    walletData,
    isLoading,
    fetchWalletData,
    refetchBalances,
    canTrade,
    isSmartAccountReady,
  } = useWalletManager()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`
  }

  if (!address) return null

  if (!isSmartAccountReady) {
    return (
      <motion.div
        className="bg-[#111010] border border-[#3E3E3E] rounded-xl p-6 max-w-2xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#622DBF]/20 rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#622DBF]" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg font-montserrat">
                Connected Wallet
              </h3>
            </div>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-[#1A1A1A] rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-[#1A1A1A] rounded-lg" />
            <div className="h-24 bg-[#1A1A1A] rounded-lg" />
          </div>
          <div className="h-20 bg-[#1A1A1A] rounded-lg" />
        </div>
        <p className="text-gray-500 text-sm text-center mt-4 font-montserrat">
          Loading smart wallet address...
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="bg-[#111010] border border-[#3E3E3E] rounded-xl p-6 max-w-2xl w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#622DBF]/20 rounded-full flex items-center justify-center">
            <Wallet className="w-5 h-5 text-[#622DBF]" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg font-montserrat">
              Connected Wallet
            </h3>
            <p className="text-gray-400 text-sm font-montserrat">
              {walletData?.lastUpdated && `Updated ${new Date(walletData.lastUpdated).toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetchBalances()}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Refresh balances"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Address */}
      <div className="flex items-center justify-between mb-6 p-3 bg-[#1A1A1A] rounded-lg">
        <div className="flex items-center space-x-3">
          <span className="text-white font-medium font-montserrat">
            {formatAddress(address)}
          </span>
          {copied && (
            <motion.span
              className="text-green-400 text-xs font-montserrat"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              Copied!
            </motion.span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-white transition-colors"
            title="Copy address"
          >
            <Copy className="w-4 h-4" />
          </button>
          <a
            href={`https://bscscan.com/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            title="View on BSCScan"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* BNB Balance */}
        <div className="p-4 bg-[#1A1A1A] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-montserrat">BNB</span>
            <TrendingUp className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-white font-bold text-lg font-montserrat">
            {walletData?.balances.bnb ?
              `${parseFloat(walletData.balances.bnb.formatted).toFixed(4)}` :
              '0.0000'
            }
          </div>
          <div className="text-gray-500 text-xs font-montserrat">
            Gas Fee Balance
          </div>
        </div>

        {/* USDT Balance */}
        <div className="p-4 bg-[#1A1A1A] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-montserrat">USDT</span>
            <TrendingDown className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-white font-bold text-lg font-montserrat">
            {walletData?.balances.usdt ?
              `${parseFloat(walletData.balances.usdt.formatted).toFixed(2)}` :
              '0.00'
            }
          </div>
          <div className="text-gray-500 text-xs font-montserrat">
            Trading Balance
          </div>
        </div>
      </div>

      {/* Trading Status */}
      <div className={`p-4 rounded-lg border ${canTrade
        ? 'bg-green-500/10 border-green-500/20'
        : 'bg-red-500/10 border-red-500/20'
        }`}>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${canTrade ? 'bg-green-400' : 'bg-red-400'
            }`} />
          <div>
            <p className={`font-medium font-montserrat ${canTrade ? 'text-green-400' : 'text-red-400'
              }`}>
              {canTrade ? 'Ready to Trade' : 'Insufficient Gas'}
            </p>
            <p className="text-gray-400 text-sm font-montserrat">
              {canTrade
                ? 'BNB transactions are gas-sponsored on BNB Chain'
                : 'Switch to BNB Chain to use sponsored transactions'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => window.open(`https://pancakeswap.finance/swap?outputCurrency=0x55d398326f99059fF775485246999027B3197955`, '_blank')}
          className="p-3 bg-[#622DBF] hover:bg-purple-700 rounded-lg text-white font-medium transition-colors font-montserrat"
        >
          Buy USDT
        </button>
        <button
          onClick={() => refetchBalances()}
          disabled={isLoading}
          className="p-3 bg-[#1A1A1A] hover:bg-[#222] border border-gray-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 font-montserrat"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </motion.div>
  )
}
