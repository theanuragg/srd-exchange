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
    ChevronDown,
    LogOut,
    RefreshCw,
    FileClock,
} from 'lucide-react'
import { FC, useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Image from 'next/image'
import { useDisconnect, useSwitchChain, useWallets, useSmartAccount, useAccount, useAddress } from '@particle-network/connectkit'
import { particleAuth } from '@particle-network/auth-core'
import { parseUnits, erc20Abi } from 'viem'
import { ethers } from 'ethers'
import { useRouter } from 'next/navigation'
import { useChainAssets } from '@/hooks/useChainAssets'
import { CHAIN_CONFIGS, formatBalance, formatUsd, type TokenAsset } from '@/lib/ankrApi'
import { sendSponsoredContractWrite, sendSponsoredSmartAccountTransaction } from '@/lib/sponsoredTransactions'


interface RightSidebarProps {
    isOpen: boolean
    onClose: () => void
    eoaAddress?: string | null
    solanaAddress?: string | null
    userBalances: {
        usdt: string
        inr: string
    } | null
}

const RightSidebar: FC<RightSidebarProps> = ({ isOpen, onClose, eoaAddress, solanaAddress }) => {
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
    const [showDisconnect, setShowDisconnect] = useState(false)
    const [selectedChainId, setSelectedChainId] = useState(56)
    const [isSwitchingChain, setIsSwitchingChain] = useState(false)
    const [showChainDropdown, setShowChainDropdown] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [historyChainFilter, setHistoryChainFilter] = useState<number | 'all'>('all')
    // Receive/Send mode toggles
    const [receiveMode, setReceiveMode] = useState<'EVM' | 'SOL'>('EVM')
    const [sendMode, setSendMode] = useState<'EVM' | 'SOL'>('EVM')
    const [selectedAsset, setSelectedAsset] = useState<TokenAsset | null>(null)
    const [showAssetDropdown, setShowAssetDropdown] = useState(false)
    const [selectedSolanaAsset, setSelectedSolanaAsset] = useState<TokenAsset | null>(null)
    const [showSolanaAssetDropdown, setShowSolanaAssetDropdown] = useState(false)
    const [showHistoryChainDropdown, setShowHistoryChainDropdown] = useState(false)
    const [historyTypeFilter, setHistoryTypeFilter] = useState<'All' | 'Deposit' | 'Withdraw'>('All')

    const wallets = useWallets()
    const primaryWallet = wallets[0]
    const smartAccount = useSmartAccount()
    const { disconnect } = useDisconnect()
    const { switchChainAsync } = useSwitchChain()
    const router = useRouter()

    const { isConnected } = useAccount()

    // Smart wallet address: useAddress() (sync) + async getAccount() fallback
    // This mirrors useWalletManager.ts's three-level fallback pattern:
    //   resolvedSmartWalletAddress ?? smartAddress ?? eoaAddress
    const smartFromAddress = useAddress()
    const [smartFromAccount, setSmartFromAccount] = useState<string | null>(null)
    useEffect(() => {
        if (!smartAccount || !isConnected || !eoaAddress) {
            setSmartFromAccount(null)
            return
        }
        smartAccount.getAccount().then(acc => {
            if (acc?.smartAccountAddress) setSmartFromAccount(acc.smartAccountAddress)
        }).catch(() => {})
    }, [smartAccount, isConnected, eoaAddress, selectedChainId])
    const smartWalletAddress = smartFromAddress ?? smartFromAccount ?? null

    // Show the right address per chain:
    // - Solana → solanaAddress
    // - BSC → smartWalletAddress (where sponsored txns/trading happens)
    // - Other EVM → eoaAddress (smart wallet not deployed/funded there)
    const displayAddress = selectedChainId === 101 ? solanaAddress : (
        selectedChainId === 56 ? smartWalletAddress : eoaAddress
    )

    // Use smart wallet on BSC (trading/sponsored txns), EOA on other EVM chains
    const tradingAddress = selectedChainId === 56
        ? (smartWalletAddress ?? eoaAddress)
        : eoaAddress
    const selectedChain = CHAIN_CONFIGS.find(c => c.id === selectedChainId) ?? CHAIN_CONFIGS[1]
    const { assets, totalUsd, isLoading: assetsLoading, error: assetsError, refetch: refetchAssets } = useChainAssets(
        selectedChainId === 101 ? null : tradingAddress,
        selectedChainId,
        solanaAddress
    )
    // Always fetch Solana assets for the SOL send dropdown
    const { assets: solanaAssets, isLoading: solanaAssetsLoading } = useChainAssets(
        null,
        101,
        solanaAddress
    )

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

    const sendEVMNormalToken = async (
        asset: TokenAsset,
        amount: string,
        recipient: string,
    ): Promise<string> => {
        if (!ethers.isAddress(recipient)) throw new Error('Invalid recipient address');
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) throw new Error('Enter a valid amount');

        if (selectedChainId === 56 && smartAccount) {
            if (asset.isNative) {
                return sendSponsoredSmartAccountTransaction({
                    smartAccount,
                    chainId: 56,
                    transaction: {
                        to: recipient as `0x${string}`,
                        value: `0x${parseUnits(amount, asset.decimals).toString(16)}` as `0x${string}`,
                    },
                })
            }

            return sendSponsoredContractWrite({
                smartAccount,
                chainId: 56,
                address: asset.contractAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'transfer',
                args: [recipient as `0x${string}`, parseUnits(amount, asset.decimals)],
            } as any)
        }

        if (!primaryWallet) throw new Error('Wallet not available');
        const walletClient = await primaryWallet.getWalletClient();
        if (!walletClient?.account) throw new Error('Wallet client not available');

        if (asset.isNative) {
            const hash = await walletClient.sendTransaction({
                to: recipient as `0x${string}`,
                value: parseUnits(amount, asset.decimals),
                account: walletClient.account,
                chain: walletClient.chain,
            });
            return hash;
        } else {
            const hash = await walletClient.writeContract({
                address: asset.contractAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'transfer',
                args: [recipient as `0x${string}`, parseUnits(amount, asset.decimals)],
                account: walletClient.account,
                chain: walletClient.chain,
            } as any);
            return hash;
        }
    };

    const sendSolanaAsset = async (asset: TokenAsset, recipient: string, amount: string): Promise<string> => {
        if (!solanaAddress) throw new Error('Solana wallet not connected');
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) throw new Error('Enter a valid amount');

        const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } =
            await import('@solana/web3.js');

        let toPubkey: InstanceType<typeof PublicKey>;
        try { toPubkey = new PublicKey(recipient); } catch { throw new Error('Invalid Solana address'); }

        const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
        const connection = new Connection(
            `https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`,
            'confirmed'
        );
        const fromPubkey = new PublicKey(solanaAddress);
        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        if (asset.isNative) {
            // Native SOL transfer
            const lamports = Math.round(amountNum * LAMPORTS_PER_SOL);
            transaction.add(SystemProgram.transfer({ fromPubkey, toPubkey, lamports }));
        } else {
            // SPL token transfer
            // @ts-ignore — spl-token ESM exports mismatch (types exist but not resolvable via package.json exports)
            const splToken = await import('@solana/spl-token' as any);
            const { getAssociatedTokenAddress, createTransferInstruction } = splToken;
            const mintPubkey = new PublicKey(asset.contractAddress);
            const rawAmount = BigInt(Math.round(amountNum * 10 ** asset.decimals));
            const fromAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
            const toAta = await getAssociatedTokenAddress(mintPubkey, toPubkey);
            transaction.add(createTransferInstruction(fromAta, toAta, fromPubkey, rawAmount));
        }

        const hash = await particleAuth.solana.signAndSendTransaction(transaction as any);
        console.log('✅ Solana tx:', hash);
        return hash as string;
    };

    const handleSend = async () => {
        if (!recipientAddress || !sendAmount) return
        if (sendMode === 'EVM' && !selectedAsset) return
        setSendError(null)
        setTxHash(null)
        setIsSending(true)

        try {
            if (sendMode === 'EVM') {
                const hash = await sendEVMNormalToken(selectedAsset!, sendAmount, recipientAddress)
                setTxHash(hash)
                setSendAmount('')
                setRecipientAddress('')
                setTimeout(() => { if (tradingAddress) fetchOnChainHistory(tradingAddress) }, 5000)
            } else {
                // Solana
                if (!selectedSolanaAsset) throw new Error('Select an asset to send')
                const hash = await sendSolanaAsset(selectedSolanaAsset, recipientAddress, sendAmount)
                setTxHash(hash)
                setSendAmount('')
                setRecipientAddress('')
            }
        } catch (err: any) {
            console.error('[Send error]', err)
            let msg = err.message || 'Unknown error'
            if (msg.includes('timeout')) msg = 'Request timed out. Check your connection and try again.'
            else if (msg.includes('rejected') || msg.includes('cancel')) msg = 'Transaction rejected or cancelled.'
            setSendError(msg)
        } finally {
            setIsSending(false)
        }
    }

    const fetchOnChainHistory = async (userAddress: string) => {
        if (!userAddress) return

        console.log('🔍 Fetching transaction history for:', userAddress)
        setIsHistoryLoading(true)

        try {
            const params = new URLSearchParams({ address: userAddress })
            if (solanaAddress) params.set('solanaAddress', solanaAddress)
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

    useEffect(() => {
        if (isOpen && tradingAddress) {
            console.log('🔄 Sidebar opened, fetching history:', tradingAddress)
            fetchOnChainHistory(tradingAddress)
        }
    }, [isOpen, tradingAddress])

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
                        {/* Close */}
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0">
                            <Image src="/side.svg" alt="Close" width={24} height={24} />
                        </button>

                        <div className="flex items-center gap-2 min-w-0">
                            {/* Chain selector — left of address */}
                            <div className="relative">
                                <button
                                    onClick={() => { if (!isSwitchingChain) { setShowChainDropdown(p => !p); setShowDisconnect(false); } }}
                                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-60"
                                    disabled={isSwitchingChain}
                                >
                                    {isSwitchingChain ? (
                                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                                    ) : (
                                        <img
                                            src={selectedChain.logo}
                                            alt={selectedChain.name}
                                            className="w-4 h-4 rounded-full shrink-0 object-contain"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                        />
                                    )}
                                    <span className="text-white text-xs font-medium hidden sm:block">
                                        {isSwitchingChain ? 'Switching...' : selectedChain.name}
                                    </span>
                                    {!isSwitchingChain && <ChevronDown className={`w-3 h-3 text-white/40 transition-transform shrink-0 ${showChainDropdown ? 'rotate-180' : ''}`} />}
                                </button>

                                <AnimatePresence>
                                    {showChainDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            className="absolute top-full mt-1 left-0 w-48 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl"
                                        >
                                            {CHAIN_CONFIGS.map(chain => (
                                                <button
                                                    key={chain.id}
                                                    onClick={async () => {
                                                        setShowChainDropdown(false);
                                                        setSelectedAsset(null);
                                                        setSelectedSolanaAsset(null);
                                                        setSendAmount('');
                                                        setRecipientAddress('');
                                                        if (chain.id === 101) {
                                                            // Solana — no EVM chain switch needed
                                                            setSendMode('SOL');
                                                            setReceiveMode('SOL');
                                                            setSelectedChainId(101);
                                                        } else {
                                                            setSendMode('EVM');
                                                            setReceiveMode('EVM');
                                                            setSelectedChainId(chain.id);
                                                            // Actually switch Particle's active chain so smartAccount uses the right bundler
                                                            try {
                                                                setIsSwitchingChain(true);
                                                                await switchChainAsync({ chainId: chain.id });
                                                            } catch (e) {
                                                                console.warn('Chain switch failed:', e);
                                                            } finally {
                                                                setIsSwitchingChain(false);
                                                            }
                                                        }
                                                    }}
                                                    disabled={chain.id === 101 && !solanaAddress}
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left
                                                        ${selectedChainId === chain.id ? 'bg-white/10' : ''}
                                                        ${chain.id === 101 && !solanaAddress ? 'opacity-40 cursor-not-allowed' : ''}
                                                    `}
                                                >
                                                    <img
                                                        src={chain.logo}
                                                        alt={chain.name}
                                                        className="w-5 h-5 rounded-full shrink-0 object-contain"
                                                        onError={(e) => {
                                                            const el = e.target as HTMLImageElement;
                                                            el.style.display = 'none';
                                                            el.nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                    />
                                                    <div className="hidden w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: chain.color }}>
                                                        {chain.abbr}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-white text-sm truncate">{chain.name}</div>
                                                        {chain.id === 101 && !solanaAddress && (
                                                            <div className="text-white/30 text-xs">Auth login only</div>
                                                        )}
                                                    </div>
                                                    {selectedChainId === chain.id && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#622DBF] ml-auto shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Address + disconnect dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => { setShowDisconnect(p => !p); setShowChainDropdown(false); }}
                                    className={`flex items-center gap-1.5 bg-white/5 border px-2.5 py-1.5 rounded-full hover:bg-white/10 transition-colors min-w-0 ${showDisconnect ? 'border-white/20 bg-white/10' : 'border-white/10'}`}
                                >
                                    <Image src="/srd_gen.svg" alt="User" width={18} height={18} className="shrink-0" />
                                    <span className="text-white text-xs font-medium truncate">{displayAddress ? formatAddress(displayAddress) : <span className="text-white/40">Loading...</span>}</span>
                                    <ChevronDown className={`w-3 h-3 text-white/40 transition-transform shrink-0 ${showDisconnect ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showDisconnect && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                            className="absolute top-full mt-1 right-0 w-56 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl"
                                        >
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                                            >
                                                <LogOut className="w-4 h-4 shrink-0" />
                                                Disconnect
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
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
        const receiveAddr = receiveMode === 'SOL' ? solanaAddress : displayAddress
        return (
            <div className="flex-1 overflow-y-auto [&::-webkit-
        bar]:hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="min-h-full flex flex-col items-center justify-center gap-6 px-6 pt-10 pb-28">

                    {/* EVM / Solana toggle */}
                    <div className="w-full flex items-center justify-between">
                        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                            {(['EVM', 'SOL'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => {
                                        setReceiveMode(mode);
                                        if (mode === 'EVM' && selectedChainId === 101) setSelectedChainId(56);
                                        if (mode === 'SOL') setSelectedChainId(101);
                                    }}
                                    disabled={mode === 'SOL' && !solanaAddress}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${receiveMode === mode ? 'bg-[#6320EE] text-white' : 'text-white/40 hover:text-white/70'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                >
                                    {mode === 'SOL' ? 'Solana' : 'EVM'}
                                </button>
                            ))}
                        </div>

                        {/* Stacked chain logos */}
                        <div className="flex items-center">
                            {CHAIN_CONFIGS.filter(c => receiveMode === 'SOL' ? c.id === 101 : c.id !== 101).map((chain, i, arr) => (
                                <div
                                    key={chain.id}
                                    className="w-6 h-6 rounded-full border-2 border-black overflow-hidden bg-black shrink-0"
                                    style={{ marginLeft: i === 0 ? 0 : '-8px', zIndex: arr.length - i }}
                                    title={chain.name}
                                >
                                    <img
                                        src={chain.logo}
                                        alt={chain.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const el = e.target as HTMLImageElement
                                            el.style.display = 'none'
                                            el.parentElement!.style.background = chain.color
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-white/30 text-xs text-center -mt-2">
                        {receiveMode === 'EVM' ? (
                            <>All EVM-compatible <span className="text-yellow-400 font-medium">tokens</span> can be securely deposited into this address</>
                        ) : (
                            <>All Solana-compatible <span className="text-yellow-400 font-medium">tokens</span> can be securely deposited into this address</>
                        )}
                    </p>

                    {/* QR Code */}
                    <div className="p-5 bg-white rounded-3xl shadow-2xl">
                        <QRCodeSVG value={receiveAddr || ''} size={190} level="H" />
                    </div>

                    {/* Address Box */}
                    <div className="w-full space-y-2">
                        <p className="text-gray-500 text-sm font-medium text-center">
                            Your {receiveMode === 'SOL' ? 'Solana' : 'Wallet'} Address
                        </p>
                        <div
                            onClick={() => copyToClipboard(receiveAddr || '')}
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors group"
                        >
                            <span className="text-white font-mono text-sm break-all flex-1 mr-4">
                                {receiveAddr || (receiveMode === 'SOL' ? 'Solana address not available' : 'Wallet not connected')}
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

                {/* EVM / Solana toggle */}
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1 w-fit">
                    {(['EVM', 'SOL'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => {
                                setSendMode(mode);
                                setSendError(null);
                                setTxHash(null);
                                setSendAmount('');
                                setRecipientAddress('');
                                setSelectedAsset(null);
                                setSelectedSolanaAsset(null);
                                // Sync header chain: if switching to EVM while Solana is selected, reset to BNB
                                if (mode === 'EVM' && selectedChainId === 101) setSelectedChainId(56);
                                // If switching to SOL while an EVM chain is selected, set to Solana
                                if (mode === 'SOL') setSelectedChainId(101);
                            }}
                            disabled={mode === 'SOL' && !solanaAddress}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${sendMode === mode ? 'bg-[#6320EE] text-white' : 'text-white/40 hover:text-white/70'} disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                            {mode === 'SOL' ? 'Solana' : 'EVM'}
                        </button>
                    ))}
                </div>

                {/* Status messages */}
                {txHash && (
                    <div className="w-full p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-green-500">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-bold">Transaction Sent!</span>
                        </div>
                        <a
                            href={sendMode === 'SOL'
                                ? `https://solscan.io/tx/${txHash}`
                                : `${selectedChain.explorer}${txHash}`}
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

                {sendMode === 'EVM' ? (
                    <>
                        {/* Asset selector */}
                        <div className="space-y-2">
                            <label className="text-white font-semibold block text-sm">Asset <span className="text-white/30 font-normal">({selectedChain.name})</span></label>
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
                                            {assetsLoading ? 'Loading assets...' : assets.length === 0 ? `No assets on ${selectedChain.name}` : 'Select asset to send'}
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-white/40 transition-transform shrink-0 ${showAssetDropdown ? 'rotate-180' : ''}`} />
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

                        {/* Recipient */}
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

                        {/* Amount */}
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
                    </>
                ) : (
                    /* ── Solana send ── */
                    <>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/10 text-[#9945FF] text-xs font-bold w-fit">
                            <Info className="w-3.5 h-3.5" />
                            Network fees are paid in SOL by the user
                        </div>

                        {/* Solana Asset selector */}
                        <div className="space-y-2">
                            <label className="text-white font-semibold block text-sm">Asset <span className="text-white/30 font-normal">(Solana)</span></label>
                            <div className="relative">
                                <button
                                    onClick={() => setShowSolanaAssetDropdown(p => !p)}
                                    className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl py-3 px-4 hover:bg-white/10 transition-colors"
                                >
                                    {selectedSolanaAsset ? (
                                        <>
                                            <div className="relative w-8 h-8 shrink-0">
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/60">
                                                    {selectedSolanaAsset.symbol.slice(0, 3).toUpperCase()}
                                                </div>
                                                {(selectedSolanaAsset.thumbnail || (!selectedSolanaAsset.isNative && selectedSolanaAsset.contractAddress)) && (
                                                    <img
                                                        src={selectedSolanaAsset.thumbnail || `https://tokens.1inch.io/${selectedSolanaAsset.contractAddress.toLowerCase()}.png`}
                                                        alt={selectedSolanaAsset.symbol}
                                                        className="absolute inset-0 w-8 h-8 rounded-full object-cover"
                                                        onError={(e) => {
                                                            const el = e.target as HTMLImageElement;
                                                            const f = `https://tokens.1inch.io/${selectedSolanaAsset.contractAddress.toLowerCase()}.png`;
                                                            if (!selectedSolanaAsset.isNative && el.src !== f) { el.src = f; } else { el.style.display = 'none'; }
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="text-white text-sm font-medium">{selectedSolanaAsset.symbol}</div>
                                                <div className="text-white/30 text-xs">{formatBalance(selectedSolanaAsset.balance, selectedSolanaAsset.decimals)} available</div>
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-white/40 text-sm flex-1 text-left">
                                            {solanaAssetsLoading ? 'Loading assets...' : solanaAssets.length === 0 ? 'No assets on Solana' : 'Select asset to send'}
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-white/40 transition-transform shrink-0 ${showSolanaAssetDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showSolanaAssetDropdown && solanaAssets.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                            className="absolute top-full mt-1 left-0 right-0 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl max-h-52 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                                        >
                                            {solanaAssets.map((asset, i) => (
                                                <button
                                                    key={`${asset.contractAddress}-${i}`}
                                                    onClick={() => { setSelectedSolanaAsset(asset); setSendAmount(''); setShowSolanaAssetDropdown(false) }}
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

                        {/* Recipient */}
                        <div className="space-y-2">
                            <label className="text-white font-semibold block text-sm">Recipient Solana Address</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Solana address..."
                                    value={recipientAddress}
                                    onChange={(e) => setRecipientAddress(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 pr-20 text-white focus:border-[#9945FF] outline-none transition-all placeholder:text-white/20 text-sm font-mono"
                                />
                                <button
                                    onClick={async () => setRecipientAddress(await navigator.clipboard.readText())}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9945FF] font-bold text-sm hover:opacity-80"
                                >Paste</button>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <label className="text-white font-semibold block text-sm">Amount</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={sendAmount}
                                    onChange={(e) => setSendAmount(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 pr-28 text-white focus:border-[#9945FF] outline-none transition-all placeholder:text-white/20 font-medium text-sm"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {selectedSolanaAsset && <span className="text-white/30 text-xs font-bold">{selectedSolanaAsset.symbol}</span>}
                                    <button
                                        onClick={() => {
                                            if (!selectedSolanaAsset) return;
                                            if (selectedSolanaAsset.isNative) {
                                                // Reserve 2x estimated fee (~0.00001 SOL) as buffer
                                                const max = Math.max(0, parseFloat(formatBalance(selectedSolanaAsset.balance, selectedSolanaAsset.decimals)) - 0.00001);
                                                setSendAmount(max > 0 ? max.toString() : '0');
                                            } else {
                                                setSendAmount(formatBalance(selectedSolanaAsset.balance, selectedSolanaAsset.decimals));
                                            }
                                        }}
                                        className="text-[#9945FF] font-bold text-sm hover:opacity-80"
                                    >Max</button>
                                </div>
                            </div>
                            {selectedSolanaAsset && (
                                <p className="text-white/30 text-xs px-1">
                                    Balance: {formatBalance(selectedSolanaAsset.balance, selectedSolanaAsset.decimals)} {selectedSolanaAsset.symbol}
                                    {selectedSolanaAsset.balanceUsd && parseFloat(selectedSolanaAsset.balanceUsd) > 0 && ` · ${formatUsd(selectedSolanaAsset.balanceUsd)}`}
                                </p>
                            )}
                        </div>
                    </>
                )}

                {/* Send Button — same for both modes */}
                <div className="mt-auto pt-2">
                    <button
                        onClick={handleSend}
                        disabled={
                            !sendAmount || !recipientAddress || isSending ||
                            (sendMode === 'EVM' && !selectedAsset) ||
                            (sendMode === 'SOL' && !selectedSolanaAsset)
                        }
                        className={`w-full disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${sendMode === 'SOL'
                            ? 'bg-[#9945FF] hover:bg-[#7c35cc] shadow-[0_8px_30px_rgba(153,69,255,0.3)]'
                            : 'bg-[#6320EE] hover:bg-[#5219d1] shadow-[0_8px_30px_rgb(99,32,238,0.3)]'
                            }`}
                    >
                        {isSending ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Image src="/send.svg" alt="Send" width={20} height={20} />
                        )}
                        {isSending ? 'Sending...' : sendMode === 'EVM' ? `Send${selectedAsset ? ` ${selectedAsset.symbol}` : ''}` : `Send${selectedSolanaAsset ? ` ${selectedSolanaAsset.symbol}` : ''}`}
                    </button>
                </div>

            </div>
        </div>
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full sm:w-[480px] h-[100dvh] bg-black shadow-2xl z-[201] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        {renderHeader()}

                        {currentView === 'Main' ? (
                            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-4 pb-20">
                                <div className="space-y-6 pt-4">
                                    {/* Wallet Card */}
                                    <div className="relative overflow-hidden aspect-[1.8/1] rounded-3xl bg-[#111] border border-white/5 p-8 flex flex-col justify-center">
                                        {/* Background Watermark/Logo */}
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
                                            <Image src="/image.png" alt="" width={160} height={160} className="grayscale brightness-200" />
                                        </div>

                                        {/* History icon */}
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
                                                <span style={{ color: selectedChain.color }}>{selectedChain.name}</span>
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

                                    <hr className="border-white/5" />

                                    {/* Assets */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-white font-bold">Assets</span>
                                                <span className="text-white/40 text-xs ml-2">{selectedChain.name}</span>
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

                                        {/* Asset List */}
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
                                                    No assets on {selectedChain.name}
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
                                                                        // Try 1inch as secondary fallback for EVM tokens
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

                    {/* History Panel — slides in over the sidebar */}
                    {showHistory && (
                        <motion.div
                            key="history-panel"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full sm:w-[480px] h-[100dvh] bg-black shadow-2xl z-[202] flex flex-col overflow-hidden"
                        >
                            {/* Header */}
                            <div className="relative flex items-center bg-white/5 px-4 py-4 shrink-0">
                                <button onClick={() => setShowHistory(false)} className="absolute left-4 rounded-full p-1 hover:bg-white/10 transition-colors">
                                    <ArrowLeft className="w-6 h-6 text-white" />
                                </button>
                                <h2 className="text-white text-xl font-bold mx-auto">History</h2>
                            </div>

                            {/* Chain filter + Type filter tabs */}
                            <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-white/5">
                                {/* Chain filter */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowHistoryChainDropdown(p => !p)}
                                        className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-full text-xs text-white hover:bg-white/10 transition-colors"
                                    >
                                        {historyChainFilter === 'all' ? (
                                            <span>All Chains</span>
                                        ) : (
                                            <>
                                                <img
                                                    src={CHAIN_CONFIGS.find(c => c.id === historyChainFilter)?.logo}
                                                    className="w-3.5 h-3.5 rounded-full"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                />
                                                <span>{CHAIN_CONFIGS.find(c => c.id === historyChainFilter)?.name}</span>
                                            </>
                                        )}
                                        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${showHistoryChainDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showHistoryChainDropdown && (
                                        <div className="absolute top-full mt-1 left-0 w-44 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
                                            <button
                                                onClick={() => { setHistoryChainFilter('all'); setShowHistoryChainDropdown(false); }}
                                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors text-left ${historyChainFilter === 'all' ? 'text-white' : 'text-white/60'}`}
                                            >
                                                All Chains
                                                {historyChainFilter === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-[#622DBF] ml-auto" />}
                                            </button>
                                            {CHAIN_CONFIGS.map(chain => (
                                                <button
                                                    key={chain.id}
                                                    onClick={() => { setHistoryChainFilter(chain.id); setShowHistoryChainDropdown(false); }}
                                                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors text-left ${historyChainFilter === chain.id ? 'text-white bg-white/5' : 'text-white/60'}`}
                                                >
                                                    <img src={chain.logo} className="w-4 h-4 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                                    {chain.name}
                                                    {historyChainFilter === chain.id && <div className="w-1.5 h-1.5 rounded-full bg-[#622DBF] ml-auto" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Type tabs */}
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

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-4 py-3 space-y-2">
                                {isHistoryLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <div className="w-6 h-6 border-2 border-[#6320EE] border-t-transparent rounded-full animate-spin" />
                                        <p className="text-white/30 text-xs">Fetching transactions...</p>
                                    </div>
                                ) : historyData.filter(item =>
                                    (historyChainFilter === 'all' || item.chainId === historyChainFilter) &&
                                    (historyTypeFilter === 'All' || item.type === historyTypeFilter)
                                ).length === 0 ? (
                                    <div className="text-center py-12 text-white/30 text-sm">No transactions found</div>
                                ) : (
                                    historyData
                                        .filter(item =>
                                            (historyChainFilter === 'all' || item.chainId === historyChainFilter) &&
                                            (historyTypeFilter === 'All' || item.type === historyTypeFilter)
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
                                                        {item.chainLogo && (
                                                            <img
                                                                src={item.chainLogo}
                                                                alt={item.chainName}
                                                                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black object-contain"
                                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                            />
                                                        )}
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
                                                        target="_blank"
                                                        rel="noopener noreferrer"
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
