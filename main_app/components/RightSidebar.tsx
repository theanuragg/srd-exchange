'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowDownLeft,
    ArrowUpRight,
    ExternalLink,
    ArrowLeft,
    Copy,
    CheckCircle2,
    Info,
    LogOut,
    RefreshCw,
    FileClock,
    ChevronDown,
} from 'lucide-react'
import { FC, useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Image from 'next/image'
import { useIsSignedIn, useSignOut, useSignEvmHash, useSolanaAddress } from '@coinbase/cdp-hooks'
import { parseUnits, erc20Abi, isAddress } from 'viem'
import { useRouter } from 'next/navigation'
import { useWalletManager } from '@/hooks/useWalletManager'
import { useChainAssets } from '@/hooks/useChainAssets'
import { formatBalance, formatUsd, type TokenAsset } from '@/lib/ankrApi'
import { CHAIN_CONFIGS, getChainById, isBNB, isEvmChain, isSolana, type ChainId } from '@/lib/chainConfig'
import { sendSponsoredContractWrite, sendSponsoredSmartAccountTransaction } from '@/lib/sponsoredTransactions'
import { createSignHashWithRetry } from '@/lib/sponsoredSigning'

interface RightSidebarProps {
    isOpen: boolean
    onClose: () => void
}

const RightSidebar: FC<RightSidebarProps> = ({ isOpen, onClose }) => {
    const [currentView, setCurrentView] = useState<'Main' | 'Send' | 'Receive'>('Main')
    const [copyStatus, setCopyStatus] = useState(false)
    const [sendAmount, setSendAmount] = useState('')
    const [recipientAddress, setRecipientAddress] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)
    const [sendError, setSendError] = useState<string | null>(null)

    const [sellRate, setSellRate] = useState<number>(0)
    const [historyData, setHistoryData] = useState<any[]>([])
    const [isHistoryLoading, setIsHistoryLoading] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [historyTypeFilter, setHistoryTypeFilter] = useState<'All' | 'Deposit' | 'Withdraw'>('All')
    const [selectedAsset, setSelectedAsset] = useState<TokenAsset | null>(null)
    const [showAssetDropdown, setShowAssetDropdown] = useState(false)
    const [showChainDropdown, setShowChainDropdown] = useState(false)
    const [showWalletDropdown, setShowWalletDropdown] = useState(false)

    const { isSignedIn } = useIsSignedIn()
    const { signOut } = useSignOut()
    const router = useRouter()

    const {
      address,
      eoaAddress,
      smartWalletAddress,
      solanaAddress,
      selectedChain,
      selectedAddress,
      isConnected,
      signHash,
      shouldSkipInitCode,
      switchChain,
    } = useWalletManager()

    const chainDropdownRef = useRef<HTMLDivElement>(null)
    const walletDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (chainDropdownRef.current && !chainDropdownRef.current.contains(e.target as Node)) {
                setShowChainDropdown(false)
            }
            if (walletDropdownRef.current && !walletDropdownRef.current.contains(e.target as Node)) {
                setShowWalletDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const chainConfig = getChainById(selectedChain) ?? CHAIN_CONFIGS[0]
    const assetsAddress = selectedChain === 'solana'
        ? solanaAddress
        : smartWalletAddress
    const displayAddress = selectedAddress ?? address ?? ''

    const { assets, totalUsd, isLoading: assetsLoading, error: assetsError, refetch: refetchAssets } = useChainAssets(
        assetsAddress,
        selectedChain
    )

    const handleLogout = async () => {
        try {
            signOut()
            if (typeof window !== 'undefined') {
                sessionStorage.clear()
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

    const sendEVMNormalToken = async (
        asset: TokenAsset,
        amount: string,
        recipient: string,
        chainId: number,
    ): Promise<string> => {
        if (!isAddress(recipient)) throw new Error('Invalid recipient address');
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) throw new Error('Enter a valid amount');
        if (!smartWalletAddress) throw new Error('Smart wallet address not available. Please ensure your account is set up.');
        if (!eoaAddress) throw new Error('EOA address not available. Please sign in again.');

        const signHashWithRetry = createSignHashWithRetry(signHash);
        if (asset.isNative) {
            return sendSponsoredSmartAccountTransaction({
                smartAccountAddress: smartWalletAddress as `0x${string}`,
                eoaAddress: eoaAddress as `0x${string}`,
                transaction: {
                    to: recipient as `0x${string}`,
                    value: `0x${parseUnits(amount, asset.decimals).toString(16)}` as `0x${string}`,
                },
                skipInitCode: shouldSkipInitCode,
            }, signHashWithRetry, chainId)
        }

        return sendSponsoredContractWrite({
            smartAccountAddress: smartWalletAddress as `0x${string}`,
            eoaAddress: eoaAddress as `0x${string}`,
            address: asset.contractAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipient as `0x${string}`, parseUnits(amount, asset.decimals)],
            skipInitCode: shouldSkipInitCode,
        } as any, signHashWithRetry, chainId)
    }

    const handleSend = async () => {
        if (!recipientAddress || !sendAmount || !selectedAsset) return
        setSendError(null)
        setTxHash(null)
        setIsSending(true)

        try {
            const chainId = selectedChain === 'solana' ? 56 : (selectedChain as number)
            const hash = await sendEVMNormalToken(selectedAsset!, sendAmount, recipientAddress, chainId)
            setTxHash(hash)
            setSendAmount('')
            setRecipientAddress('')
            setTimeout(() => { if (historyEvmAddress) fetchOnChainHistory(historyEvmAddress, solanaAddress) }, 5000)
        } catch (err: any) {
            console.error('[Send error]', err)
            let msg = err.message || 'Unknown error'
            if (msg.includes('timeout')) msg = 'Request timed out. Check your connection and try again.'
            else if (msg.includes('rejected') || msg.includes('cancel')) msg = 'Transaction rejected or cancelled.'
            else if (msg.includes('content blocker') || msg.includes('signing service')) msg = 'Unable to sign transaction. Please disable any ad blockers or content blockers for this site, then try again.'
            else if (msg.includes('bundler') || msg.includes('userOp') || msg.includes('sponsor')) msg = 'Transaction failed due to a network error. Please try again.'
            setSendError(msg)
        } finally {
            setIsSending(false)
        }
    }

    const fetchOnChainHistory = async (evmAddr: string, solAddr?: string | null) => {
        if (!evmAddr && !solAddr) return
        setIsHistoryLoading(true)
        try {
            const params = new URLSearchParams()
            if (evmAddr) params.set('address', evmAddr)
            if (solAddr) params.set('solanaAddress', solAddr)
            const res = await fetch(`/api/wallet/history?${params}`)
            const data = await res.json()
            setHistoryData(data.transactions ?? [])
        } catch (err) {
            console.error('Failed to fetch transaction history:', err)
            setHistoryData([])
        } finally {
            setIsHistoryLoading(false)
        }
    }

    const historyEvmAddress = smartWalletAddress ?? address ?? ''
    useEffect(() => {
        if (isOpen && historyEvmAddress) {
            fetchOnChainHistory(historyEvmAddress, solanaAddress)
        }
    }, [isOpen, historyEvmAddress, solanaAddress])

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const res = await fetch('/api/rates')
                const data = await res.json()
                if (data.rates && data.rates.length > 0) {
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
                <div className="relative flex flex-col px-4 py-3 gap-2 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0">
                            <Image src="/side.svg" alt="Close" width={24} height={24} />
                        </button>

                        <div className="flex items-center gap-2 min-w-0">
                            <div className="relative" ref={chainDropdownRef}>
                                <button
                                    onClick={() => setShowChainDropdown(p => !p)}
                                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-full hover:bg-white/10 transition-colors"
                                >
                                    <img
                                        src={chainConfig.logo}
                                        alt={chainConfig.name}
                                        className="w-4 h-4 rounded-full shrink-0 object-contain"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                    <span className="text-white text-xs font-medium">{chainConfig.abbr}</span>
                                    <motion.div
                                        animate={{ rotate: showChainDropdown ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown className="w-3.5 h-3.5 text-white/60" />
                                    </motion.div>
                                </button>

                                {showChainDropdown && (
                                    <div className="absolute top-full mt-1 right-0 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl min-w-[160px]">
                                        {CHAIN_CONFIGS.map(chain => (
                                            <button
                                                key={chain.id}
                                                onClick={() => { switchChain(chain.id); setShowChainDropdown(false) }}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left ${
                                                    chain.id === selectedChain ? 'bg-white/5' : ''
                                                }`}
                                            >
                                                <img
                                                    src={chain.logo}
                                                    alt={chain.name}
                                                    className="w-5 h-5 rounded-full shrink-0 object-contain"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                />
                                                <span className="text-white text-sm font-medium">{chain.name}</span>
                                                {chain.id === selectedChain && (
                                                    <span className="ml-auto text-[#6320EE] text-xs font-bold">✓</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={walletDropdownRef}>
                                <button
                                    onClick={() => setShowWalletDropdown(p => !p)}
                                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-full hover:bg-white/10 transition-colors"
                                >
                                    <Image src="/srd_gen.svg" alt="User" width={18} height={18} className="shrink-0" />
                                    <span className="text-white text-xs font-medium truncate">
                                        {displayAddress ? formatAddress(displayAddress) : <span className="text-white/40">Loading...</span>}
                                    </span>
                                    <motion.div
                                        animate={{ rotate: showWalletDropdown ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown className="w-3.5 h-3.5 text-white/60" />
                                    </motion.div>
                                </button>

                                {showWalletDropdown && (
                                    <div className="absolute top-full mt-1 right-0 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl min-w-[160px]">
                                        <button
                                            onClick={() => { handleLogout(); setShowWalletDropdown(false) }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                                        >
                                            <LogOut className="w-4 h-4 text-red-400" />
                                            <span className="text-red-400 text-sm">Disconnect</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div className="relative flex items-center bg-white/5 px-4 py-4 shrink-0">
                <button
                    onClick={() => setCurrentView('Main')}
                    className="absolute left-4 rounded-full transition-colors hover:bg-white/10 p-1"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <h2 className="text-white text-xl font-bold mx-auto">{currentView}</h2>
            </div>
        )
    }

    const renderReceiveView = () => {
        const receiveAddr = isSolana(selectedChain) ? (solanaAddress ?? '') : (smartWalletAddress ?? address ?? '')
        const chainLabel = isSolana(selectedChain) ? 'Solana' : chainConfig.name + '-compatible'
        return (
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="min-h-full flex flex-col items-center justify-center gap-6 px-6 pt-10 pb-28">
                    <p className="text-white/30 text-xs text-center">
                        All {chainLabel} <span className="text-yellow-400 font-medium">tokens</span> can be securely deposited into this address
                    </p>

                    <div className="p-5 bg-white rounded-3xl shadow-2xl">
                        <QRCodeSVG value={receiveAddr} size={190} level="H" />
                    </div>

                    <div className="w-full space-y-2">
                        <p className="text-gray-500 text-sm font-medium text-center">
                            Your {chainConfig.name} Address
                        </p>
                        <div
                            onClick={() => copyToClipboard(receiveAddr)}
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors group"
                        >
                            <span className="text-white font-mono text-sm break-all flex-1 mr-4">
                                {receiveAddr || 'Wallet not connected'}
                            </span>
                            <div className="shrink-0">
                                {copyStatus ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Copy className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const renderSendView = () => (
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="min-h-full flex flex-col gap-5 px-6 pt-8 pb-28">
                {txHash && (
                    <div className="w-full p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-green-500">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-bold">Transaction Sent!</span>
                        </div>
                        <a
                            href={`${chainConfig.explorer}${txHash}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-green-500/80 hover:underline break-all"
                        >
                            View on explorer ↗
                        </a>
                    </div>
                )}
                {sendError && (
                    <div className="w-full p-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3">
                        <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-red-500 text-sm leading-tight">{sendError}</p>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-white font-semibold block text-sm">Asset <span className="text-white/30 font-normal">({chainConfig.name})</span></label>
                    <div className="relative">
                        <button
                            onClick={() => setShowAssetDropdown(p => !p)}
                            className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl py-3 px-4 hover:bg-white/10 transition-colors"
                        >
                            {selectedAsset ? (
                                <>
                                    <div className="relative w-8 h-8 shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/60">
                                            {selectedAsset.symbol.slice(0, 3).toUpperCase()}
                                        </div>
                                        {(selectedAsset.thumbnail || (!selectedAsset.isNative && selectedAsset.contractAddress)) && (
                                            <img
                                                src={selectedAsset.thumbnail || `https://tokens.1inch.io/${selectedAsset.contractAddress.toLowerCase()}.png`}
                                                alt={selectedAsset.symbol}
                                                className="absolute inset-0 w-8 h-8 rounded-full object-cover"
                                                onError={(e) => {
                                                    const el = e.target as HTMLImageElement;
                                                    const f = `https://tokens.1inch.io/${selectedAsset.contractAddress.toLowerCase()}.png`;
                                                    if (!selectedAsset.isNative && el.src !== f) { el.src = f; } else { el.style.display = 'none'; }
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-white text-sm font-medium">{selectedAsset.symbol}</div>
                                        <div className="text-white/30 text-xs">{formatBalance(selectedAsset.balance, selectedAsset.decimals)} available</div>
                                    </div>
                                </>
                            ) : (
                                <span className="text-white/40 text-sm flex-1 text-left">
                                    {assetsLoading ? 'Loading assets...' : assets.length === 0 ? `No assets on ${chainConfig.name}` : 'Select asset to send'}
                                </span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showAssetDropdown && assets.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                    className="absolute top-full mt-1 left-0 right-0 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl max-h-52 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                                >
                                    {assets.map((asset, i) => (
                                        <button
                                            key={`${asset.contractAddress}-${i}`}
                                            onClick={() => { setSelectedAsset(asset); setSendAmount(''); setShowAssetDropdown(false) }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                                        >
                                            <div className="relative w-7 h-7 shrink-0">
                                                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/60">
                                                    {asset.symbol.slice(0, 3).toUpperCase()}
                                                </div>
                                                {(asset.thumbnail || (!asset.isNative && asset.contractAddress)) && (
                                                    <img
                                                        src={asset.thumbnail || `https://tokens.1inch.io/${asset.contractAddress.toLowerCase()}.png`}
                                                        alt={asset.symbol}
                                                        className="absolute inset-0 w-7 h-7 rounded-full object-cover"
                                                        onError={(e) => {
                                                            const el = e.target as HTMLImageElement;
                                                            const f = `https://tokens.1inch.io/${asset.contractAddress.toLowerCase()}.png`;
                                                            if (!asset.isNative && el.src !== f) { el.src = f; } else { el.style.display = 'none'; }
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white text-sm font-medium">{asset.symbol}</div>
                                                <div className="text-white/30 text-xs truncate">{asset.name}</div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-white/60 text-xs">{formatBalance(asset.balance, asset.decimals)}</div>
                                                <div className="text-white/30 text-xs">{formatUsd(asset.balanceUsd)}</div>
                                            </div>
                                            
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-white font-semibold block text-sm">Recipient Address</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="0x..."
                            value={recipientAddress}
                            onChange={(e) => setRecipientAddress(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 pr-20 text-white focus:border-[#6320EE] outline-none transition-all placeholder:text-white/20 text-sm"
                        />
                        <button
                            onClick={async () => setRecipientAddress(await navigator.clipboard.readText())}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00FF5E] font-bold text-sm hover:opacity-80"
                        >Paste</button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-white font-semibold block text-sm">Amount</label>
                    <div className="relative">
                        <input
                            type="number"
                            placeholder="0.00"
                            value={sendAmount}
                            onChange={(e) => setSendAmount(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 pr-28 text-white focus:border-[#6320EE] outline-none transition-all placeholder:text-white/20 font-medium text-sm"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {selectedAsset && <span className="text-white/30 text-xs font-bold">{selectedAsset.symbol}</span>}
                            <button
                                onClick={() => selectedAsset && setSendAmount(formatBalance(selectedAsset.balance, selectedAsset.decimals))}
                                className="text-[#00FF5E] font-bold text-sm hover:opacity-80"
                            >Max</button>
                        </div>
                    </div>
                    {selectedAsset && (
                        <p className="text-white/30 text-xs px-1">
                            Balance: {formatBalance(selectedAsset.balance, selectedAsset.decimals)} {selectedAsset.symbol}
                            {selectedAsset.balanceUsd && parseFloat(selectedAsset.balanceUsd) > 0 && ` · ${formatUsd(selectedAsset.balanceUsd)}`}
                        </p>
                    )}
                </div>

                <div className="mt-auto pt-2">
                    <button
                        onClick={handleSend}
                        disabled={!sendAmount || !recipientAddress || isSending || !selectedAsset}
                        className="w-full disabled:opacity-50 disabled:cursor-not-allowed bg-[#6320EE] hover:bg-[#5219d1] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_8px_30px_rgb(99,32,238,0.3)]"
                    >
                        {isSending ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Image src="/send.svg" alt="Send" width={20} height={20} />
                        )}
                        {isSending ? 'Sending...' : `Send${selectedAsset ? ` ${selectedAsset.symbol}` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    )

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full sm:w-[480px] h-[100dvh] bg-black shadow-2xl z-[201] flex flex-col overflow-hidden"
                    >
                        {renderHeader()}

                        {currentView === 'Main' ? (
                            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-4 pb-20">
                                <div className="space-y-6 pt-4">
                                    <div className="relative overflow-hidden aspect-[1.8/1] rounded-3xl bg-[#111] border border-white/5 p-8 flex flex-col justify-center">
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
                                            <Image src="/image.png" alt="" width={160} height={160} className="grayscale brightness-200" />
                                        </div>

                                        <button
                                            onClick={() => setShowHistory(true)}
                                            className="absolute top-3 right-3 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
                                            title="Transaction History"
                                        >
                                            <FileClock className="w-4 h-4 text-white/50" />
                                        </button>

                                        <div className="relative z-10 flex flex-col gap-1">
                                            {assetsLoading ? (
                                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                                            ) : (
                                                <>
                                                    <h3 className="text-3xl font-bold text-white tracking-tight">
                                                        ${parseFloat(totalUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </h3>
                                                    {sellRate > 0 && (
                                                        <p className="text-gray-400 text-lg flex items-center gap-2 font-medium">
                                                            <span className="opacity-50">== ~</span>
                                                            {(parseFloat(totalUsd) * sellRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₹
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                            <p className="text-gray-400 text-xs flex items-center gap-1 font-medium mt-1">
                                                <span className="opacity-50">Portfolio on</span>
                                                <span style={{ color: chainConfig.color }}>{chainConfig.name}</span>
                                            </p>
                                        </div>
                                    </div>

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
                                        {isEvmChain(selectedChain) ? (
                                            <button
                                                onClick={() => setCurrentView('Send')}
                                                className="flex items-center justify-center gap-2 bg-[#6320EE] hover:bg-[#5219d1] text-white py-4 rounded-xl font-bold text-lg transition-all active:scale-95"
                                            >
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                                    <Image src="/send.svg" alt="Send" width={20} height={20} />
                                                </div>
                                                Send
                                            </button>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white/40 py-4 rounded-xl font-bold text-lg cursor-not-allowed">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center opacity-40">
                                                    <Image src="/send.svg" alt="Send" width={20} height={20} />
                                                </div>
                                                View-only
                                            </div>
                                        )}
                                    </div>

                                    <hr className="border-white/5" />

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-white font-bold">Assets</span>
                                                <span className="text-white/40 text-xs ml-2">{chainConfig.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/40 text-xs">${totalUsd}</span>
                                                <button
                                                    onClick={() => refetchAssets()}
                                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5 text-white/40" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {assetsLoading && (
                                                <div className="flex items-center justify-center py-8">
                                                    <div className="w-5 h-5 border-2 border-[#622DBF] border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            )}
                                            {assetsError && (
                                                <div className="flex items-center gap-2 py-3 px-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-2">
                                                    <Info className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                                    <span className="text-red-400 text-xs">Failed to load assets. Balances may be incomplete.</span>
                                                </div>
                                            )}
                                            {!assetsLoading && !assetsError && assets.length === 0 && (
                                                <div className="text-center py-6 text-white/30 text-sm">
                                                    No assets on {chainConfig.name}
                                                </div>
                                            )}
                                            {!assetsLoading && assets.map((asset, i) => (
                                                <div
                                                    key={`${asset.contractAddress}-${i}`}
                                                    className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative w-8 h-8 shrink-0">
                                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60">
                                                                {asset.symbol.slice(0, 3).toUpperCase()}
                                                            </div>
                                                            {asset.thumbnail && (
                                                                <img
                                                                    src={asset.thumbnail}
                                                                    alt={asset.symbol}
                                                                    className="absolute inset-0 w-8 h-8 rounded-full object-cover bg-white/5"
                                                                    onError={(e) => {
                                                                        const img = e.target as HTMLImageElement;
                                                                        if (asset.contractAddress && !img.src.includes('1inch')) {
                                                                            img.src = `https://tokens.1inch.io/${asset.contractAddress.toLowerCase()}.png`;
                                                                        } else {
                                                                            img.style.display = 'none';
                                                                        }
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-white text-sm font-medium">{asset.symbol}</div>
                                                            <div className="text-white/40 text-xs">{asset.name}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-white text-sm font-medium">
                                                            {formatBalance(asset.balance, asset.decimals)}
                                                        </div>
                                                        <div className="text-white/40 text-xs">{formatUsd(asset.balanceUsd)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : currentView === 'Receive' ? (
                            renderReceiveView()
                        ) : (
                            renderSendView()
                        )}
                    </motion.div>

                    {showHistory && (
                        <motion.div
                            key="history-panel"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full sm:w-[480px] h-[100dvh] bg-black shadow-2xl z-[202] flex flex-col overflow-hidden"
                        >
                            <div className="relative flex items-center bg-white/5 px-4 py-4 shrink-0">
                                <button onClick={() => setShowHistory(false)} className="absolute left-4 rounded-full p-1 hover:bg-white/10 transition-colors">
                                    <ArrowLeft className="w-6 h-6 text-white" />
                                </button>
                                <h2 className="text-white text-xl font-bold mx-auto">History</h2>
                            </div>

                            <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-white/5">
                                <div className="text-white/40 text-xs">{chainConfig.name}</div>
                                <div className="flex items-center gap-1">
                                    {(['All', 'Deposit', 'Withdraw'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setHistoryTypeFilter(tab)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${historyTypeFilter === tab ? 'bg-[#6320EE] text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-4 py-3 space-y-2">
                                {isHistoryLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <div className="w-6 h-6 border-2 border-[#6320EE] border-t-transparent rounded-full animate-spin" />
                                        <p className="text-white/30 text-xs">Fetching transactions...</p>
                                    </div>
                                ) : historyData.filter(item =>
                                    (historyTypeFilter === 'All' || item.type === historyTypeFilter) &&
                                    (item.chainId === selectedChain || (selectedChain === 'solana' ? item.chainId === 101 : item.chainId === selectedChain))
                                ).length === 0 ? (
                                    <div className="text-center py-12 text-white/30 text-sm">No transactions found</div>
                                ) : (
                                    historyData
                                        .filter(item =>
                                            (historyTypeFilter === 'All' || item.type === historyTypeFilter) &&
                                            (item.chainId === selectedChain || (selectedChain === 'solana' ? item.chainId === 101 : item.chainId === selectedChain))
                                        )
                                        .map((item, i) => (
                                            <div key={`${item.hash}-${i}`} className="flex items-center justify-between p-3 hover:bg-white/5 border border-white/5 rounded-xl transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-9 h-9 shrink-0">
                                                        <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center">
                                                            {item.type === 'Deposit' ? (
                                                                <ArrowDownLeft className="w-4 h-4 text-green-400" />
                                                            ) : item.type === 'Withdraw' ? (
                                                                <ArrowUpRight className="w-4 h-4 text-orange-400" />
                                                            ) : (
                                                                <ExternalLink className="w-4 h-4 text-white/40" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-white text-sm font-semibold">{item.type}</div>
                                                        <div className="text-white/30 text-xs">{item.chainName} · {item.date}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-white text-sm font-medium">{item.amount}</span>
                                                    <a
                                                        href={item.explorerUrl}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5 text-[#6320EE]" />
                                                    </a>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </>
            )}
        </AnimatePresence>
    )
}

export default RightSidebar
