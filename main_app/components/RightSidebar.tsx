'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
    X,
    CircleUser,
    ArrowDownLeft,
    ArrowUpRight,
    Flame,
    ExternalLink,
    ChevronRight,
    ShoppingCart,
    ArrowLeft,
    Copy,
    CheckCircle2,
    Info,
    Wallet,
    ChevronDown,
    LogOut
} from 'lucide-react'
import { FC, useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Image from 'next/image'
import { usePublicClient, useSmartAccount, useDisconnect, useWallets } from '@particle-network/connectkit'
import { formatUnits, Address, parseAbiItem, parseUnits, erc20Abi } from 'viem'
import { ethers } from 'ethers'
import { useRouter } from 'next/navigation'
import { retryWithRPCFailover } from '@/lib/rpcManager'

const CONTRACTS = {
    USDT: {
        [56]: "0x55d398326f99059fF775485246999027B3197955" as `0x${string}`,
    },
}

interface RightSidebarProps {
    isOpen: boolean
    onClose: () => void
    address: string | undefined
    smartWalletAddress?: string | null
    userBalances: {
        usdt: string
        inr: string
    } | null
}

const RightSidebar: FC<RightSidebarProps> = ({ isOpen, onClose, address, smartWalletAddress, userBalances }) => {
    const [activeTab, setActiveTab] = useState<'All' | 'Deposit' | 'Withdraw'>('Deposit')
    const [currentView, setCurrentView] = useState<'Main' | 'Send' | 'Receive'>('Main')
    const [copyStatus, setCopyStatus] = useState(false)
    const [sendAmount, setSendAmount] = useState('')
    const [recipientAddress, setRecipientAddress] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)
    const [sendError, setSendError] = useState<string | null>(null)

    // CRITICAL: ONLY use smart wallet address - NO fallback to EOA
    // If smartWalletAddress is null, we wait for it to be computed
    const displayAddress = smartWalletAddress
    const isSmartWalletDeployed = !!smartWalletAddress

    const [sellRate, setSellRate] = useState<number>(0)
    const [historyData, setHistoryData] = useState<any[]>([])
    const [isHistoryLoading, setIsHistoryLoading] = useState(false)
    const [showDisconnect, setShowDisconnect] = useState(false)
    const publicClient = usePublicClient()
    const smartAccount = useSmartAccount()
    const { disconnect } = useDisconnect()
    const [primaryWallet] = useWallets()
    const router = useRouter()

    const handleLogout = async () => {
        try {
            disconnect()
            // Clear storage
            if (typeof window !== 'undefined') {
                sessionStorage.clear()
                const keysToRemove = Object.keys(localStorage).filter(key =>
                    key.includes('wagmi') ||
                    key.includes('wallet') ||
                    key.includes('user') ||
                    key.includes('auth')
                )
                keysToRemove.forEach(key => localStorage.removeItem(key))
            }
            onClose()
            router.push('/')
            setTimeout(() => window.location.reload(), 100)
        } catch (error) {
            console.error('Logout error:', error)
            router.push('/')
            window.location.reload()
        }
    }

    const sendGaslessUSDT = async (
        recipientAddress: string,
        usdtAmount: string,
        usdtDecimals: number
    ): Promise<string> => {
        if (!smartAccount) throw new Error('Smart account not initialized');

        try {
            console.log(`🚀 Sending ${usdtAmount} USDT to ${recipientAddress} (gasless)`);

            // Validate recipient address
            if (!ethers.isAddress(recipientAddress)) {
                throw new Error('Invalid recipient address format');
            }

            // Validate amount
            const amount = parseFloat(usdtAmount);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Please enter a valid USDT amount');
            }

            // Create contract interface for USDT transfer
            const iface = new ethers.Interface(erc20Abi as any);
            const parsedAmount = parseUnits(usdtAmount, usdtDecimals);

            // Encode transfer function
            const data = iface.encodeFunctionData('transfer', [
                recipientAddress,
                parsedAmount
            ]);

            // Prepare transaction
            const tx = {
                to: CONTRACTS.USDT[56],
                value: '0x0',
                data: data,
            };

            console.log('📋 Getting gasless fee quotes...');

            // Get fee quotes with timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Fee quote timeout. Please try again.')), 30000)
            );

            const feeQuotesResult = await Promise.race([
                smartAccount.getFeeQuotes(tx),
                timeoutPromise
            ]) as any;

            if (!feeQuotesResult) {
                throw new Error('Failed to get fee quotes');
            }

            const gaslessQuote = feeQuotesResult.verifyingPaymasterGasless;

            if (!gaslessQuote) {
                throw new Error('Gasless transactions not available right now. Please try again later.');
            }

            console.log('✅ Sending gasless user operation...');

            // Send user operation
            const hash = await smartAccount.sendUserOperation({
                userOp: gaslessQuote.userOp,
                userOpHash: gaslessQuote.userOpHash,
            });

            console.log('✅ Transaction hash:', hash);
            return hash;

        } catch (error: any) {
            console.error('❌ Gasless USDT transfer error:', error);

            let userMessage = 'Transaction failed: ';

            if (error.message.includes('insufficient')) {
                userMessage += 'Insufficient USDT balance in your smart wallet.';
            } else if (error.message.includes('timeout')) {
                userMessage += 'Request timed out. Please check your connection and try again.';
            } else if (error.message.includes('rejected')) {
                userMessage += 'Transaction was rejected or canceled.';
            } else if (error.message.includes('gasless')) {
                userMessage += 'Gasless transactions are temporarily unavailable.';
            } else {
                userMessage += error.message || 'Unknown error occurred.';
            }

            throw new Error(userMessage);
        }
    };

    const handleSend = async () => {
        if (!recipientAddress || !sendAmount) return
        setSendError(null)
        setTxHash(null)
        setIsSending(true)

        try {
            const hash = await sendGaslessUSDT(recipientAddress, sendAmount, 18)
            setTxHash(hash)
            setSendAmount('')
            setRecipientAddress('')
            // Refetch after a short delay
            setTimeout(() => {
                if (displayAddress) fetchOnChainHistory(displayAddress)
            }, 5000)
        } catch (err: any) {
            setSendError(err.message)
        } finally {
            setIsSending(false)
        }
    }

    const fetchOnChainHistory = async (userAddress: string) => {
        if (!userAddress) return

        console.log('🔍 Fetching transaction history for:', userAddress)
        setIsHistoryLoading(true)

        try {
            // Use Alchemy's optimized getAssetTransfers API
            const { fetchTransactionHistoryAlchemy } = await import('@/lib/alchemyApi')
            const transactions = await fetchTransactionHistoryAlchemy(userAddress)
            setHistoryData(transactions)
        } catch (err) {
            console.error('Failed to fetch transaction history:', err)
            setHistoryData([])
        } finally {
            setIsHistoryLoading(false)
        }
    }

    useEffect(() => {
        // Only fetch history when we have a smart wallet address
        if (isOpen && displayAddress) {
            console.log('🔄 Sidebar opened, fetching history for smart wallet:', displayAddress)
            fetchOnChainHistory(displayAddress)
        } else if (isOpen && !displayAddress) {
            console.log('⏳ Waiting for smart wallet address to be computed...')
        }
    }, [isOpen, displayAddress])

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const res = await fetch('/api/rates')
                const data = await res.json()
                if (data.rates && data.rates.length > 0) {
                    // Try to find UPI rate, otherwise use the first one
                    const upiRate = data.rates.find((r: any) => r.currency === 'UPI') || data.rates[0]
                    setSellRate(upiRate.sellRate)
                }
            } catch (err) {
                console.error('Failed to fetch rates:', err)
            }
        }

        if (isOpen) {
            fetchRates()
        }
    }, [isOpen])

    const calculateInr = () => {
        if (!userBalances?.usdt || !sellRate) return "0.00"
        const usdt = parseFloat(userBalances.usdt)
        return (usdt * sellRate).toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        })
    }

    const formatAddress = (addr: string) => {
        if (!addr) return ''
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`
    }

    const copyToClipboard = (text: string) => {
        if (!text) return
        navigator.clipboard.writeText(text)
        setCopyStatus(true)
        setTimeout(() => setCopyStatus(false), 2000)
    }

    const renderHeader = () => {
        if (currentView === 'Main') {
            return (
                <div className="relative flex flex-col p-6 gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <Image src="/side.svg" alt="Close" width={24} height={24} />
                        </button>
                        <button
                            onClick={() => setShowDisconnect(!showDisconnect)}
                            className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <Image src="/srd_gen.svg" alt="User" width={24} height={24} />
                            <span className="text-white text-sm font-medium">{formatAddress(displayAddress || "0x0000...0000")}</span>
                        </button>
                    </div>

                    <AnimatePresence>
                        {showDisconnect && (
                            <motion.button
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                onClick={handleLogout}
                                className="absolute top-[75px] right-18 flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl transition-all shadow-xl z-50 font-bold"
                            >
                                <LogOut className="w-4 h-4" />
                                Disconnect
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            )
        }

        return (
            <div className="flex items-center bg-white/5 justify-between p-4">
                <button
                    onClick={() => setCurrentView('Main')}
                    className="rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <h2 className="text-white text-xl font-bold">{currentView}</h2>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>
        )
    }

    const renderReceiveView = () => (
        <div className="flex-1 px-6 pb-20 flex flex-col items-center space-y-8 overflow-y-auto [&::-webkit-scrollbar]:hidden animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Warning Box */}
            <div className="w-full p-4 rounded-2xl bg-[#EAB308]/10 border border-[#EAB308]/20 flex gap-3">
                <div className="mt-1">
                    <div className="w-5 h-5 rounded-full bg-[#EAB308] flex items-center justify-center">
                        <span className="text-black text-xs font-bold font-serif">!</span>
                    </div>
                </div>
                <p className="text-white text-sm font-medium pt-2 leading-tight">
                    Only send Tether USD (BEP20) assets to this address. Other assets will be lost forever.
                </p>
            </div>

            {/* USDT Banner */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 relative">
                    <Image src="https://cryptologos.cc/logos/tether-usdt-logo.png" alt="USDT" fill className="object-contain" />
                </div>
                <div className="flex flex-col">
                    <span className="text-white font-bold text-xl">USDT <span className="text-gray-500 font-medium">BEP20</span></span>
                </div>
            </div>

            {/* QR Code */}
            <div className="p-6 bg-white rounded-3xl shadow-2xl">
                <QRCodeSVG value={displayAddress || ''} size={200} level="H" />
            </div>

            {/* Address Box */}
            <div className="w-full space-y-2">
                <p className="text-gray-500 text-sm font-medium text-center">
                    Your {isSmartWalletDeployed ? 'Smart Wallet' : 'Wallet'} Address
                </p>
                <div
                    onClick={() => copyToClipboard(displayAddress || '')}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors group"
                >
                    <span className="text-white font-mono text-sm break-all flex-1 mr-4">
                        {displayAddress}
                    </span>
                    <div className="shrink-0">
                        {copyStatus ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                            <Copy className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                        )}
                    </div>
                </div>
                {!isSmartWalletDeployed && displayAddress && (
                    <div className="w-full p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-2">
                        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-blue-400 text-xs leading-tight">
                            This is your smart wallet address. It will be activated on your first transaction.
                        </p>
                    </div>
                )}
            </div>


        </div>
    )

    const renderSendView = () => (
        <div className="flex-1 px-6 pb-20 flex flex-col space-y-8 overflow-y-auto [&::-webkit-scrollbar]:hidden animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Warning Box */}
            <div className="w-full p-4 rounded-2xl bg-[#EAB308]/10 border border-[#EAB308]/20 flex gap-3">
                <div className="mt-1 shrink-0">
                    <div className="w-5 h-5 rounded-full bg-[#EAB308] flex items-center justify-center">
                        <span className="text-black text-xs font-bold font-serif">!</span>
                    </div>
                </div>
                <p className="text-[#EAB308] text-sm font-medium leading-tight">
                    Only send Tether USD (BEP20) assets to this address. Other assets will be lost forever.
                </p>
            </div>

            {txHash && (
                <div className="w-full p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-bold">Transaction Sent!</span>
                    </div>
                    <a
                        href={`https://bscscan.com/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-500/80 hover:underline break-all"
                    >
                        View on BscScan: {txHash}
                    </a>
                </div>
            )}

            {
                sendError && (
                    <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3">
                        <div className="shrink-0 mt-0.5">
                            <Info className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-red-500 text-sm font-medium leading-tight">
                            {sendError}
                        </p>
                    </div>
                )
            }

            {/* Address Input */}
            <div className="space-y-3">
                <label className="text-white font-bold block">Address or Domain Name</label>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search or Enter"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        className="w-full bg-transparent border border-white/20 rounded-2xl py-4 px-5 pr-20 text-white focus:border-[#6320EE] focus:ring-1 focus:ring-[#6320EE] outline-none transition-all placeholder:text-gray-600"
                    />
                    <button
                        onClick={async () => {
                            const text = await navigator.clipboard.readText()
                            setRecipientAddress(text)
                        }}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-[#00FF5E] font-bold text-sm hover:opacity-80"
                    >
                        Paste
                    </button>
                </div>
            </div>

            {/* Network Selector (Hardcoded for now as per image) */}
            <div className="space-y-3">
                <label className="text-white font-bold block">Destination network</label>
                <button className="flex items-center gap-3 bg-white/5 border border-white/20 rounded-2xl py-2 px-2 hover:bg-white/15 transition-colors">
                    <div className="w-5 h-5  rounded-full flex items-center justify-center overflow-hidden">
                        <Image src="/bsc.svg" alt="BNB" width={18} height={18} />
                    </div>
                    <span className="text-white font-medium">BNB Smart chain</span>
                    <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
                </button>
            </div>

            {/* Amount Input */}
            <div className="space-y-3">
                <label className="text-white font-bold block">Amount</label>
                <div className="relative">
                    <input
                        type="number"
                        placeholder="USDT Amount"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        className="w-full bg-transparent border border-white/20 rounded-2xl py-4 px-5 pr-24 text-white focus:border-[#6320EE] focus:ring-1 focus:ring-[#6320EE] outline-none transition-all placeholder:text-gray-600 font-medium"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-gray-500 font-bold text-sm">USDT</span>
                        <button
                            onClick={() => setSendAmount(userBalances?.usdt || '0')}
                            className="text-[#00FF5E] font-bold text-sm hover:opacity-80"
                        >
                            Max
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center px-1">
                    <span className="text-gray-500 text-xs">Available: {userBalances?.usdt || '0'} USDT</span>
                </div>
            </div>

            {/* Send Button */}
            <div className="pt-4  mb-6 mt-auto">
                <button
                    onClick={handleSend}
                    disabled={!sendAmount || !recipientAddress || isSending}
                    className="w-full bg-[#6320EE] hover:bg-[#5219d1] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_8px_30px_rgb(99,32,238,0.3)]"
                >
                    {isSending ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <div className="w-4 h-4 border-2 border-white rounded-full flex items-center justify-center">
                            <Image src="/send.svg" alt="Send" width={24} height={24} />
                        </div>
                    )}
                    {isSending ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div >
    )






    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[101]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full sm:w-[480px] h-[100dvh] bg-black shadow-2xl z-[102] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        {renderHeader()}

                        {currentView === 'Main' ? (
                            <div className="flex-1 flex flex-col overflow-hidden px-6 pb-20">
                                {/* Fixed Content Section */}
                                <div className="shrink-0 space-y-8 pt-8">
                                    {/* Wallet Card */}
                                    <div className="relative overflow-hidden aspect-[1.8/1] rounded-3xl bg-[#111] border border-white/5 p-8 flex flex-col justify-center">
                                        {/* Background Watermark/Logo */}
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
                                            <Image src="/image.png" alt="" width={160} height={160} className="grayscale brightness-200" />
                                        </div>

                                        <div className="relative z-10 flex flex-col gap-1">
                                            <h3 className="text-3xl font-bold text-white tracking-tight">
                                                {parseFloat(userBalances?.usdt || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDT
                                            </h3>
                                            <p className="text-gray-400 text-lg flex items-center gap-2 font-medium">
                                                <span className="opacity-50">== ~</span> {calculateInr()} ₹
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setCurrentView('Receive')}
                                            className="flex items-center justify-center gap-2 bg-[#6320EE] hover:bg-[#5219d1] text-white py-4 rounded-xl font-bold text-lg transition-all active:scale-95"
                                        >
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                                <Image src="/rec.svg" alt="Receive" width={24} height={24} />
                                            </div>
                                            Receive
                                        </button>
                                        <button
                                            onClick={() => setCurrentView('Send')}
                                            className="flex items-center justify-center gap-2 bg-[#6320EE] hover:bg-[#5219d1] text-white py-4 rounded-xl font-bold text-lg transition-all active:scale-95"
                                        >
                                            <div className="w-6 h-6  rounded-full flex items-center justify-center">
                                                <Image src="/send.svg" alt="Send" width={24} height={24} />
                                            </div>
                                            Send
                                        </button>
                                    </div>

                                    {/* Gasless Badge */}
                                    <div className="flex justify-center">
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 text-[#00FF5E] text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(0,255,94,0.1)]">
                                            <Flame className="w-4 h-4 fill-current" />
                                            Gasless Transaction
                                        </div>
                                    </div>

                                    <hr className="border-white/5" />
                                </div>

                                {/* Scrollable History Section */}
                                <div className="flex-1 flex flex-col min-h-0 mt-2">
                                    <h4 className="text-center text-xl font-bold text-white mb-6 shrink-0">History</h4>

                                    {/* Tabs */}
                                    <div className="flex justify-center p-2 rounded-xl gap-4 shrink-0">
                                        {(['All', 'Deposit', 'Withdraw'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`flex-1 py-2 px-2 text-sm font-bold  transition-all ${activeTab === tab
                                                    ? 'bg-[#6320EE] text-white shadow-lg'
                                                    : 'text-gray-100 hover:text-white'
                                                    }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    {/* List - This is the only scrollable part */}
                                    <div className="flex-1 overflow-y-scroll pr-2 space-y-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#6320EE]/5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#6320EE]/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#6320EE]/40">
                                        {isHistoryLoading ? (
                                            <div className="flex flex-col items-center justify-center py-8 space-y-3">
                                                <div className="w-6 h-6 border-2 border-[#6320EE] border-t-transparent rounded-full animate-spin" />
                                                <p className="text-gray-500 text-xs font-medium">
                                                    Fetching blockchain data...
                                                </p>
                                            </div>
                                        ) : historyData.length === 0 ? (
                                            <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                                                <p className="text-gray-500 text-xs">
                                                    No recent transactions found
                                                </p>
                                            </div>
                                        ) : (
                                            historyData
                                                .filter(item => {
                                                    if (activeTab === 'All') return true
                                                    return item.type === activeTab
                                                })
                                                .map((item, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center justify-between p-3 hover:bg-white/[0.07] border border-white/5 rounded-xl transition-all group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                                                {item.type === 'Deposit' ? (
                                                                    <Image src="/deposit.svg" alt="Deposit" width={16} height={16} className="w-4 h-4 text-green-400" />
                                                                ) : (
                                                                    <Image src="/withdraw.svg" alt="Withdraw" width={16} height={16} className="w-4 h-4 text-orange-400" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-white text-sm font-bold">{item.type}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <span className="text-white text-sm font-bold">
                                                                {item.amount?.split(' ')[0].slice(0, 8)} USDT
                                                            </span>
                                                            <a
                                                                href={`https://bscscan.com/tx/${item.hash}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-[#6320EE] hover:text-[#7e45f1] transition-colors font-medium"
                                                            >
                                                                <span className="text-xs">Tx Hash</span>
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : currentView === 'Receive' ? (
                            renderReceiveView()
                        ) : (
                            renderSendView()
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default RightSidebar
