'use client'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowDownLeft,
    ArrowUpRight,
    ExternalLink,
    ArrowLeft,
    Copy,
    Check,
    CheckCircle2,
    Info,
    LogOut,
    RefreshCw,
    FileClock,
    ChevronDown,
    Flame,
    X,
    HelpCircle,
    ScanLine,
    Repeat,
    ArrowUpDown,
} from 'lucide-react'
import { useState, useEffect, useRef, useId } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useIsSignedIn, useSignOut, useSignEvmHash, useSolanaAddress, useSendSolanaTransaction } from '@coinbase/cdp-hooks'
import { useSidebar } from '@/context/SidebarContext'
import { parseUnits, erc20Abi, isAddress } from 'viem'
import { useRouter } from 'next/navigation'
import { useWalletManager } from '@/hooks/useWalletManager'
import { useChainAssets } from '@/hooks/useChainAssets'
import { formatBalance, formatUsd, type TokenAsset } from '@/lib/ankrApi'
import { CHAIN_CONFIGS, getChainById, isBNB, isEvmChain, isSolana, type ChainId } from '@/lib/chainConfig'
import { sendSponsoredContractWrite, sendSponsoredSmartAccountTransaction } from '@/lib/sponsoredTransactions'
import { createSignHashWithRetry } from '@/lib/sponsoredSigning'
import { Html5Qrcode } from 'html5-qrcode'

export default function RightSidebar() {
    const router = useRouter()
    const [currentView, setCurrentView] = useState<'Main' | 'Send' | 'Receive' | 'History'>('Main')
    const [copyStatus, setCopyStatus] = useState(false)
    const [sendAmount, setSendAmount] = useState('')
    const [recipientAddress, setRecipientAddress] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)
    const [sendError, setSendError] = useState<string | null>(null)

    const [sellRate, setSellRate] = useState<number>(0)
    const [historyData, setHistoryData] = useState<any[]>([])
    const [isHistoryLoading, setIsHistoryLoading] = useState(false)
    const [historyTypeFilter, setHistoryTypeFilter] = useState<'All' | 'Deposit' | 'Withdraw'>('All')
    const [selectedAsset, setSelectedAsset] = useState<TokenAsset | null>(null)
    const [showAssetDropdown, setShowAssetDropdown] = useState(false)
    const [showChainDropdown, setShowChainDropdown] = useState(false)
    const [showWalletDropdown, setShowWalletDropdown] = useState(false)
    const [receiveMode, setReceiveMode] = useState<'EVM' | 'SOL'>('EVM')
    const [selectedChainId, setSelectedChainId] = useState<number>(56)
    const [sendHelpOpen, setSendHelpOpen] = useState(false)
    const [receiveHelpOpen, setReceiveHelpOpen] = useState(false)
    const [showInr, setShowInr] = useState(false)
    const [countdown, setCountdown] = useState(30)
    const [scanOpen, setScanOpen] = useState(false)
    const [scanError, setScanError] = useState<string | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const [animatedValue, setAnimatedValue] = useState(0)
    const animatedValueRef = useRef(0)
    const rafRef = useRef<number>()

    const { isSignedIn } = useIsSignedIn()
    const { signOut } = useSignOut()

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

    const { sendSolanaTransaction } = useSendSolanaTransaction()
    const { closeSidebar } = useSidebar()

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
    const isSolanaSelected = selectedChain === 792703809
    const isAvaxSelected = selectedChain === 43114
    const evmAddressForSidebar = isAvaxSelected ? (eoaAddress ?? address) : (smartWalletAddress ?? address)
    const assetsAddress = isSolanaSelected ? solanaAddress : evmAddressForSidebar
    const displayAddress = isSolanaSelected ? (solanaAddress ?? '') : (evmAddressForSidebar ?? '')

    const { assets, totalUsd, isLoading: assetsLoading, error: assetsError, refetch: refetchAssets } = useChainAssets(
        assetsAddress,
        selectedChain
    )
    const visibleAssets = assets.filter(a => {
        if (isSolanaSelected) return parseFloat(a.balance) > 0
        return parseFloat(a.balanceUsd) >= 0.01
    })

    const solanaWalletLoading = isSolanaSelected && !solanaAddress

    useEffect(() => {
        const target = parseFloat(totalUsd)
        const start = animatedValueRef.current
        if (target === start) return
        const duration = 600
        const startTime = performance.now()
        const animate = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            const current = start + (target - start) * eased
            animatedValueRef.current = current
            setAnimatedValue(current)
            if (progress < 1) rafRef.current = requestAnimationFrame(animate)
        }
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(animate)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [totalUsd])

    const handleLogout = async () => {
        try {
            signOut()
            if (typeof window !== 'undefined') {
                sessionStorage.clear()
            }
            router.push('/')
            setTimeout(() => router.refresh(), 100)
        } catch (error) {
            console.error('Logout error:', error)
            router.push('/')
            router.refresh()
        }
    }

    const sendEVMNormalToken = async (
        asset: TokenAsset,
        amount: string,
        recipient: string,
        chainId: number = 56,
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
                chainId,
            }, signHashWithRetry)
        }

        return sendSponsoredContractWrite({
            smartAccountAddress: smartWalletAddress as `0x${string}`,
            eoaAddress: eoaAddress as `0x${string}`,
            address: asset.contractAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipient as `0x${string}`, parseUnits(amount, asset.decimals)],
            skipInitCode: shouldSkipInitCode,
            chainId,
        } as any, signHashWithRetry)
    }

    const sendSolanaEoaToken = async (
        asset: TokenAsset,
        amount: string,
        recipient: string,
    ): Promise<string> => {
        if (!solanaAddress) throw new Error('Solana address not available.');
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) throw new Error('Enter a valid amount');

        const { PublicKey, Transaction, SystemProgram } = await import('@solana/web3.js');
        const SOLANA_RPC = `https://solana-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;

        const rpcCall = async (method: string, params: any[]) => {
            const res = await fetch(SOLANA_RPC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
            });
            const data = await res.json();
            if (data.error) throw new Error(`Solana RPC error: ${data.error.message}`);
            return data.result;
        };

        const fromPubkey = new PublicKey(solanaAddress);
        const toPubkey = new PublicKey(recipient);

        const bh = await rpcCall('getRecentBlockhash', []);
        const blockhash = bh.value.blockhash;

        const tx = new Transaction();
        tx.feePayer = fromPubkey;
        tx.recentBlockhash = blockhash;

        if (asset.isNative) {
            const lamports = Math.floor(amountNum * Math.pow(10, asset.decimals));
            tx.add(SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports,
            }));
        } else {
            const { createTransferInstruction, getAssociatedTokenAddress } = await import('@solana/spl-token');
            const mintPubkey = new PublicKey(asset.contractAddress);
            const fromAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey, true);
            const toAta = await getAssociatedTokenAddress(mintPubkey, toPubkey, true);
            const tokenAmount = Math.floor(amountNum * Math.pow(10, asset.decimals));

            tx.add(createTransferInstruction(
                fromAta,
                toAta,
                fromPubkey,
                BigInt(tokenAmount),
            ));
        }

        const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
        const bytes = serialized instanceof Uint8Array ? serialized : new Uint8Array(serialized);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        const result = await sendSolanaTransaction({
            solanaAccount: solanaAddress,
            network: 'solana',
            transaction: base64,
        });

        return result.transactionSignature;
    }

    const handleSend = async () => {
        if (!recipientAddress || !sendAmount || !selectedAsset) return
        setSendError(null)
        setTxHash(null)
        setIsSending(true)

        try {
            let hash: string;
            if (selectedChain === 792703809) {
                hash = await sendSolanaEoaToken(selectedAsset!, sendAmount, recipientAddress);
            } else {
                hash = await sendEVMNormalToken(selectedAsset!, sendAmount, recipientAddress, selectedChain);
            }

            setTxHash(hash)
            setSendAmount('')
            setRecipientAddress('')
            setTimeout(() => { if (historyEvmAddress) fetchOnChainHistory(historyEvmAddress, solanaAddress, eoaAddress) }, 5000)
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

    const fetchOnChainHistory = async (evmAddr: string, solAddr?: string | null, eoaAddr?: string | null) => {
        if (!evmAddr && !solAddr) return
        setIsHistoryLoading(true)
        try {
            const params = new URLSearchParams()
            if (evmAddr) params.set('address', evmAddr)
            if (solAddr) params.set('solanaAddress', solAddr)
            if (eoaAddr && eoaAddr !== evmAddr) params.set('eoaAddress', eoaAddr)
            const res = await fetch(`/api/wallet/history?${params}`)
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err?.error || `Failed to fetch history (${res.status})`)
            }
            const data = await res.json()
            setHistoryData(data.transactions ?? [])
        } catch (err) {
            console.error('Failed to fetch transaction history:', err)
            setHistoryData([])
        } finally {
            setIsHistoryLoading(false)
        }
    }

    const historyEvmAddress = isSolanaSelected ? (eoaAddress ?? address ?? '') : (evmAddressForSidebar ?? '')
    useEffect(() => {
        if (historyEvmAddress || solanaAddress) fetchOnChainHistory(historyEvmAddress, solanaAddress, eoaAddress)
    }, [historyEvmAddress, solanaAddress, eoaAddress])

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
        fetchRates()
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { fetchRates(); return 30 }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    const scanRegionId = `qr-scan-${useId().replace(/:/g, "-")}`

    const extractAddress = (text: string): string | null => {
        const trimmed = text.trim()
        if (trimmed.toLowerCase().startsWith("ethereum:")) {
            const after = trimmed.slice(9).split("?")[0]
            if (/^0x[a-fA-F0-9]{40}$/.test(after)) return after
        }
        if (trimmed.toLowerCase().startsWith("solana:")) {
            const after = trimmed.slice(7).split("?")[0]
            if (/^[a-zA-Z0-9]{32,44}$/.test(after)) return after
        }
        if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return trimmed
        if (/^[a-zA-Z0-9]{32,44}$/.test(trimmed)) return trimmed
        return null
    }

    const onScanRef = (node: HTMLDivElement | null) => {
        if (!node) {
            if (scannerRef.current) {
                const scanner = scannerRef.current
                scannerRef.current = null
                try { scanner.clear() } catch { }
            }
            return
        }
        if (scannerRef.current) return
        const init = () => {
            const element = document.getElementById(scanRegionId)
            if (!element) { setScanError("Could not initialize scanner"); return }
            setScanError(null)
            const scanner = new Html5Qrcode(scanRegionId)
            scannerRef.current = scanner
            scanner
                .start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        const extracted = extractAddress(decodedText)
                        if (extracted) { setRecipientAddress(extracted); setScanOpen(false) }
                        else { setScanError("No valid address found in QR code") }
                    },
                    () => { }
                )
                .catch((err) => { setScanError(err instanceof Error ? err.message : "Could not start camera") })
        }
        window.setTimeout(init, 100)
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
                <div className="relative flex flex-col px-4 py-3 gap-2 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                        <button
                            onClick={closeSidebar}
                            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                            title="Close sidebar"
                        >
                            <X className="w-5 h-5 text-white/60" />
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
                                    <div className="absolute top-full mt-1 -right-18 bg-[#0d0418]/98 backdrop-blur-2xl border border-white/20 rounded-2xl overflow-hidden z-50 shadow-[0_20px_60px_rgba(0,0,0,0.85)] min-w-[160px]">
                                        {CHAIN_CONFIGS.map(chain => (
                                            <button
                                                key={chain.id}
                                                onClick={() => { switchChain(chain.id); setShowChainDropdown(false) }}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/10 transition-colors text-left ${chain.id === selectedChain ? 'bg-white/5' : ''
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
                                                    <span className="ml-auto text-purple text-xs font-bold">✓</span>
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
                                    <img src="/srd_gen.svg" alt="User" className="w-[18px] h-[18px] shrink-0" />
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
                                    <div className="absolute top-full mt-1 right-0 bg-[#0d0418]/98 backdrop-blur-2xl border border-white/20 rounded-2xl overflow-hidden z-50 shadow-[0_20px_60px_rgba(0,0,0,0.85)] min-w-[160px]">
                                        
                                        <button
                                            onClick={() => { handleLogout(); setShowWalletDropdown(false) }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/10 transition-colors text-left"
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
            <div className="relative flex items-center bg-white/[0.03] backdrop-blur-xl px-4 py-4 shrink-0 border-b border-white/10">
                <button
                    onClick={() => setCurrentView('Main')}
                    className="absolute left-4 rounded-full transition-colors hover:bg-white/10 p-1"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <h2 className="text-white text-xl font-bold mx-auto">
                    {currentView === 'History' ? 'History' : currentView}
                </h2>
                {(currentView === 'Send' || currentView === 'Receive') && (
                    <button
                        onClick={() => currentView === 'Send' ? setSendHelpOpen(true) : setReceiveHelpOpen(true)}
                        aria-label="Help"
                        className="absolute right-4 rounded-full transition-colors hover:bg-white/10 p-1"
                    >
                        <HelpCircle className="w-5 h-5 text-white/60" />
                    </button>
                )}
            </div>
        )
    }

    const renderReceiveView = () => {
        const isSolReceive = receiveMode === 'SOL'
        const receiveAddr = isSolReceive ? (solanaAddress ?? '') : (smartWalletAddress ?? address ?? '')
        return (
            <div className="flex-1 overflow-y-auto">
                <div className="min-h-full flex flex-col items-center justify-center gap-6 px-6 pt-10 pb-28 lg:pb-8">
                    <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1.5">
                            {(['EVM', 'SOL'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => {
                                        setReceiveMode(mode);
                                        if (mode === 'EVM' && isSolana(selectedChainId)) setSelectedChainId(56);
                                        if (mode === 'SOL') setSelectedChainId(792703809);
                                    }}
                                    disabled={mode === 'SOL' && !solanaAddress}
                                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${receiveMode === mode ? 'bg-gradient-to-r from-purple to-[#5b1fc9] text-white shadow-[0_0_16px_rgba(123,47,247,0.5)]' : 'text-text-secondary hover:text-white'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                >
                                    {mode === 'SOL' ? 'Solana' : 'EVM'}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center">
                                {CHAIN_CONFIGS.filter(c => receiveMode === 'SOL' ? isSolana(c.id) : isEvmChain(c.id)).map((chain, i, arr) => (
                                    <div
                                        key={chain.id}
                                        className="w-6 h-6 rounded-full border-2 border-black overflow-hidden bg-black shrink-0"
                                        style={{ marginLeft: i === 0 ? 0 : '-6px', zIndex: arr.length - i }}
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
                    </div>

                    <p className="text-text-secondary text-xs text-center">
                        All {receiveMode === 'SOL' ? 'Solana' : 'EVM Compatible'} <span className="text-yellow-400 font-medium">tokens</span> can be securely deposited into this address
                    </p>

                    <div className="p-5 bg-white rounded-3xl shadow-[0_0_40px_rgba(123,47,247,0.35)]">
                        <QRCodeSVG value={receiveAddr} size={190} level="H" />
                    </div>

                    <div className="w-full space-y-2">
                        <p className="text-text-secondary text-sm font-medium text-center">
                            {receiveMode === 'SOL' ? 'Your Only Solana Address' : 'Your Smart Wallet Address'}
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
                                    <Check className="w-5 h-5 text-green-400" />
                                ) : (
                                    <Copy className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                                )}
                            </div>
                        </div>
                    </div>

                    {receiveHelpOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setReceiveHelpOpen(false)}>
                            <div className="bg-[#0d0418] border border-white/10 rounded-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto p-6 space-y-3" onClick={e => e.stopPropagation()}>
                                <h3 className="text-white font-bold text-base">Note</h3>
                                <div className="text-sm text-white/60 leading-relaxed space-y-3">
                                    <p>
                                        The address provided here is{' '}
                                        <span className="text-purple font-semibold">EVM-compatible</span> and can receive tokens from{' '}
                                        <span className="text-purple font-semibold">Arbitrum</span>,{' '}
                                        <span className="text-purple font-semibold">AVAX</span>,{' '}
                                        <span className="text-purple font-semibold">Base</span>,{' '}
                                        <span className="text-purple font-semibold">BNB</span>,{' '}
                                        <span className="text-purple font-semibold">Ethereum</span>,{' '}
                                        <span className="text-purple font-semibold">Optimism</span>, and{' '}
                                        <span className="text-purple font-semibold">Polygon</span>. All tokens and assets from these chains can be deposited here.
                                    </p>
                                    <p>
                                        However, before depositing any token, ensure it has value{' '}
                                        <span className="text-yellow-400 font-semibold">greater or equal to 0.01 USD</span> or is{' '}
                                        <span className="text-yellow-400 font-semibold">listed in our swap function</span>. Only listed tokens will appear in your wallet.
                                    </p>
                                    <p>
                                        Additionally, we have a separate address for{' '}
                                        <span className="text-purple font-semibold">Solana</span>. Solana tokens and assets should be deposited to that specific address. There is{' '}
                                        <span className="text-yellow-400 font-semibold">no minimum</span> on Solana, but we still recommend at least{' '}
                                        <span className="text-yellow-400 font-semibold">0.01 USD in value</span> for visibility.
                                    </p>
                                    <p>
                                        <span className="text-red-400 font-semibold">Important:</span>{' '}
                                        <span className="text-yellow-400 font-semibold">Double-check</span>{' '}
                                        the address before sending any tokens. Sending funds to an{' '}
                                        <span className="text-red-400 font-semibold">incorrect address</span> is at your{' '}
                                        <span className="text-red-400 font-semibold">own risk</span>. EVM and Solana addresses are different—ensure you are using the correct one for each chain. Very small deposits may not be visible so always{' '}
                                        <span className="text-yellow-400 font-semibold">verify</span> before proceeding.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setReceiveHelpOpen(false)}
                                    className="w-full mt-3 py-3 rounded-xl bg-purple hover:bg-purple-hover text-white font-semibold transition-colors"
                                >
                                    Got it
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="text-center pt-2">
                        <a
                            href="https://telegram.me/SrdExchangeGlobal"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-white/40 hover:text-purple transition-colors underline underline-offset-2 decoration-white/20 hover:decoration-purple"
                        >
                            Asset Not Received? Help here
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    const renderSendView = () => (
        <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col gap-5 px-6 pt-6 pb-28 lg:pb-8">
                {/* Chain indicator */}
                <div className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.03] p-1.5">
                    <div className="flex items-center gap-1">
                        <div
                            className="px-5 py-2 rounded-full text-sm font-semibold text-white"
                            style={{
                                background: chainConfig.color,
                                boxShadow: `0 0 16px ${chainConfig.color}80`,
                            }}
                        >
                            {chainConfig.name}
                        </div>
                    </div>
                    <div className="flex items-center pr-2">
                        <img
                            src={chainConfig.logo}
                            alt={chainConfig.name}
                            className="w-6 h-6 rounded-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                    </div>
                </div>

                {/* Gasless pill */}
                {selectedChain !== 792703809 && selectedChain !== 43114 && (
                    <div className="flex">
                        <div className="relative overflow-hidden flex items-center gap-2 px-4 py-1.5 rounded-full border bg-green-500/10 text-green-400 text-xs font-bold tracking-[0.05em]">
                            <Flame className="w-3.5 h-3.5 animate-flame-flicker" />
                            <span className="relative z-10">Gasless Withdrawal!</span>
                            <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-green-300/40 to-transparent blur-sm animate-gasless-shimmer" />
                        </div>
                    </div>
                )}

                {sendError && (
                    <div className="w-full p-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3">
                        <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-red-500 text-sm leading-tight">{sendError}</p>
                    </div>
                )}

                {/* Asset */}
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
                                    {assetsLoading ? 'Loading assets...' : visibleAssets.length === 0 ? (assets.length === 0 ? `No assets on ${chainConfig.name}` : 'No assets above $0.01') : 'Select asset to send'}
                                </span>
                            )}
                            <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${showAssetDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showAssetDropdown && visibleAssets.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                    className="absolute top-full mt-1 left-0 right-0 bg-[#0d0418]/98 backdrop-blur-2xl border border-white/20 rounded-2xl overflow-hidden z-50 shadow-[0_20px_60px_rgba(0,0,0,0.85)] max-h-52 overflow-y-auto"
                                >
                                    {visibleAssets.map((asset, i) => (
                                        <button
                                            key={`${asset.contractAddress}-${i}`}
                                            onClick={() => { setSelectedAsset(asset); setSendAmount(''); setShowAssetDropdown(false) }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 transition-colors text-left"
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
                    <div className="relative flex items-center rounded-2xl border border-white/10 bg-white/[0.03] focus-within:border-purple/60 transition">
                        <input
                            type="text"
                            placeholder={selectedChain === 792703809 ? 'Solana address...' : '0x...'}
                            value={recipientAddress}
                            onChange={(e) => setRecipientAddress(e.target.value)}
                            className="flex-1 bg-transparent px-4 py-3.5 text-white text-sm placeholder:text-white/20 outline-none"
                        />
                        <button
                            onClick={() => setScanOpen(true)}
                            aria-label="Scan QR code"
                            className="px-2 py-3.5 text-white/60 hover:text-purple transition"
                        >
                            <ScanLine className="w-4 h-4" />
                        </button>
                        <button
                            onClick={async () => setRecipientAddress(await navigator.clipboard.readText())}
                            className="px-2 sm:px-4 py-3.5 text-green-400 text-xs sm:text-sm font-bold hover:text-green-300 transition"
                        >Paste</button>
                    </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-white font-semibold block text-sm">Amount</label>
                        {selectedAsset && (
                            <div className="text-white/30 text-xs">
                                Balance: <span className="text-white font-medium">{formatBalance(selectedAsset.balance, selectedAsset.decimals)} {selectedAsset.symbol}</span>
                            </div>
                        )}
                    </div>
                    <div className="relative flex items-center rounded-2xl border border-white/10 bg-white/[0.03] focus-within:border-purple/60 transition">
                        <input
                            placeholder="0.00"
                            value={sendAmount}
                            onChange={(e) => setSendAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                            inputMode="decimal"
                            className="flex-1 bg-transparent px-4 py-3.5 text-white text-sm placeholder:text-white/20 outline-none"
                        />
                        <button
                            onClick={() => selectedAsset && setSendAmount(formatBalance(selectedAsset.balance, selectedAsset.decimals))}
                            className="px-2 sm:px-4 py-3.5 text-green-400 text-xs sm:text-sm font-bold hover:text-green-300 transition"
                        >Max</button>
                    </div>
                </div>

                {/* Fee summary */}
                <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Network</span>
                        <span className="text-white font-medium">{chainConfig.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Network fee</span>
                        <span className="text-green-400 font-semibold">Free (Gasless)</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">You send</span>
                        <span className="text-white font-semibold">
                            {sendAmount || '0.00'} {selectedAsset?.symbol ?? ''}
                        </span>
                    </div>
                </div>

                {/* Send button */}
                <div className="pt-2">
                    <button
                        onClick={handleSend}
                        disabled={!sendAmount || !recipientAddress || isSending || !selectedAsset}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-purple to-[#5b1fc9] text-white font-semibold shadow-[0_0_20px_rgba(123,47,247,0.45)] hover:shadow-[0_0_28px_rgba(123,47,247,0.7)] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-[0_0_20px_rgba(123,47,247,0.45)]"
                    >
                        <img src="/send.svg" alt="" className="w-4 h-4" />
                        <span>{isSending ? 'Sending...' : `Send${selectedAsset ? ` ${selectedAsset.symbol}` : ''}`}</span>
                    </button>
                </div>

                {/* Help link */}
                <div className="text-center pt-1">
                    <a
                        href="https://telegram.me/SrdExchangeGlobal"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-white/40 underline underline-offset-2"
                    >
                        Withdrawal Not Received? Help here
                    </a>
                </div>

                {/* Sending overlay */}
                {isSending && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="flex flex-col items-center gap-5">
                            <img src="/sending.svg" alt="Sending" className="w-32 h-32" />
                        </div>
                    </div>
                )}

                {/* Help dialog */}
                {sendHelpOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSendHelpOpen(false)}>
                        <div className="bg-[#0d0418] border border-white/10 rounded-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto p-6 space-y-3" onClick={e => e.stopPropagation()}>
                            <h3 className="text-white font-bold text-base">Note</h3>
                            <div className="text-sm text-white/60 leading-relaxed space-y-3">
                                <p>
                                    When using the <span className="text-purple font-semibold">Send (Withdraw)</span> function, you may withdraw tokens from these chains only: <span className="text-purple font-semibold">Arbitrum</span>, <span className="text-purple font-semibold">Avalanche (AVAX)</span>, <span className="text-purple font-semibold">Base</span>, <span className="text-purple font-semibold">BNB Chain</span>, <span className="text-purple font-semibold">Ethereum</span>, <span className="text-purple font-semibold">Optimism</span>, and <span className="text-purple font-semibold">Polygon</span>. All withdrawals on these chains are <span className="text-purple font-semibold">gasless</span>, as long as the gasless option is displayed. If gasless is not shown, you will need to pay the gas fee yourself.
                                </p>
                                <p>
                                    Before withdrawing, carefully verify the <span className="text-purple font-semibold">recipient address</span>. Sending to an incorrect address is solely your responsibility; we are <span className="text-red-400 font-semibold">not liable</span> for any loss.
                                </p>
                                <p>
                                    There is <span className="text-purple font-semibold">no minimum withdrawal limit</span>; you may send any amount. However, withdrawals will only succeed if the token value is not close to zero. To avoid issues, ensure your withdrawal value is at least <span className="text-yellow-400 font-semibold">0.01 USDT</span>, so that the system registers it as a valid asset.
                                </p>
                            </div>
                            <button
                                onClick={() => setSendHelpOpen(false)}
                                className="w-full mt-3 py-3 rounded-xl bg-purple hover:bg-purple-hover text-white font-semibold transition-colors"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                )}

                {/* QR Scanner */}
                {scanOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { setScanOpen(false); setScanError(null) }}>
                        <div className="bg-[#0d0418] border border-white/10 rounded-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
                            <h3 className="text-white font-bold text-base">Scan QR Code</h3>
                            <div
                                ref={onScanRef}
                                id={scanRegionId}
                                className="w-full aspect-square rounded-xl overflow-hidden bg-black"
                            />
                            {scanError && (
                                <p className="text-red-400 text-sm text-center">{scanError}</p>
                            )}
                            <p className="text-text-secondary text-xs text-center">
                                Point your camera at a wallet address QR code
                            </p>
                            <button
                                onClick={() => { setScanOpen(false); setScanError(null) }}
                                className="w-full py-3 rounded-xl bg-purple hover:bg-purple-hover text-white font-semibold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )

    const renderHistoryView = () => (
        <div className="flex-1 overflow-y-auto pb-28 lg:pb-0">
            <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-white/10 bg-white/[0.02] backdrop-blur-xl">
                <div className="flex items-center gap-2">
                    <div className="text-text-secondary text-xs">{chainConfig.name}</div>
                    <button
                        onClick={() => fetchOnChainHistory(historyEvmAddress, solanaAddress, eoaAddress)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-3 h-3 text-text-secondary ${isHistoryLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    {(['All', 'Deposit', 'Withdraw'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setHistoryTypeFilter(tab)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${historyTypeFilter === tab ? 'bg-purple text-white' : 'text-text-secondary hover:text-white/70 hover:bg-white/5'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 py-3 space-y-2">
                {isHistoryLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-6 h-6 border-2 border-purple border-t-transparent rounded-full animate-spin" />
                        <p className="text-text-secondary text-xs">Fetching transactions...</p>
                    </div>
                ) : historyData.filter(item =>
                    (historyTypeFilter === 'All' || item.type === historyTypeFilter) &&
                    (item.chainId === selectedChain || (selectedChain === 792703809 ? item.chainId === 101 : item.chainId === selectedChain))
                ).length === 0 ? (
                    <div className="text-center py-12 text-text-secondary text-sm">No transactions found</div>
                ) : (
                    historyData
                        .filter(item =>
                            (historyTypeFilter === 'All' || item.type === historyTypeFilter) &&
                            (item.chainId === selectedChain || (selectedChain === 792703809 ? item.chainId === 101 : item.chainId === selectedChain))
                        )
                        .map((item, i) => (
                            <div key={`${item.hash}-${i}`} className="flex items-center justify-between p-3 hover:bg-white/[0.03] border border-white/10 rounded-xl transition-colors bg-white/[0.02]">
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
                                        <div className="text-text-secondary text-xs">{item.chainName} · {item.date}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-white text-sm font-medium">{item.amount}</span>
                                    <a
                                        href={item.explorerUrl}
                                        target="_blank" rel="noopener noreferrer"
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 text-purple" />
                                    </a>
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    )

    return (
        <div className="flex flex-col h-full min-h-0">
            {renderHeader()}

            {currentView === 'Main' ? (
                <div className="flex-1 px-4 pb-6 flex flex-col min-h-0">
                    <div className="space-y-6 pt-4 shrink-0">
                        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                            <div
                                aria-hidden
                                className="pointer-events-none absolute -top-16 -left-10 w-64 h-64 rounded-full blur-[80px] opacity-40"
                                style={{
                                    background:
                                        "radial-gradient(circle, rgba(123,47,247,0.7) 0%, rgba(123,47,247,0) 70%)",
                                }}
                            />
                            <img
                                src="/image.png"
                                alt=""
                                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-40 h-40 opacity-10 select-none grayscale brightness-200"
                            />

                            <button
                                onClick={() => { setCurrentView('History'); fetchOnChainHistory(historyEvmAddress, solanaAddress, eoaAddress) }}
                                className="absolute top-4 right-4 z-20 w-11 h-11 rounded-lg bg-transparent flex items-center justify-center transition hover:bg-white/5"
                                title="Transaction History"
                            >
                                <FileClock className="w-5 h-5 text-white/50" />
                            </button>

                            <div className="relative z-10 flex flex-col gap-1">
                                <p className="text-text-secondary text-sm">Available balance</p>
                                {assetsLoading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                                ) : (
                                    <>
                                        <div className="relative inline-flex items-center gap-2">
                                            
                                            <AnimatePresence mode="wait">
                                                {showInr && sellRate > 0 ? (
                                                    <motion.div
                                                        key="inr"
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="font-heading text-4xl md:text-5xl font-bold text-white leading-none"
                                                    >
                                                        ₹ {(animatedValue * sellRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="usd"
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="font-heading text-4xl md:text-5xl font-bold text-white leading-none"
                                                    >
                                                        ${animatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        {sellRate > 0 && (
                                            <p className="text-text-secondary text-m flex items-center gap-1 mt-1.5">
                                                <span className="opacity-70">
                                                    {showInr
                                                        ? `~ $${animatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                        : `~ ₹ ${(animatedValue * sellRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    }
                                                </span>
                                                <button
                                                    onClick={() => setShowInr(v => !v)}
                                                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 hover:border-white/10 border border-transparent transition-all active:scale-90"
                                                    title={showInr ? 'Show USD' : 'Show INR'}
                                                >
                                                    <ArrowUpDown className="w-4 h-4 text-white/60" />
                                                </button>
                                                
                                            </p>
                                        )}
                                    </>
                                )}
                                <p className="text-text-secondary text-xs flex items-center gap-1 font-medium mt-1">
                                    <span className="opacity-50">Portfolio on</span>
                                    <span style={{ color: chainConfig.color }}>{chainConfig.name}</span>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setCurrentView('Receive')}
                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple to-[#5b1fc9] text-white py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(123,47,247,0.45)] hover:shadow-[0_0_28px_rgba(123,47,247,0.7)]"
                            >
                                <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                    <img src="/rec.svg" alt="Receive" className="w-6 h-6" />
                                </div>
                                Receive
                            </button>
                            {isEvmChain(selectedChain) || isSolana(selectedChain) ? (
                                <button
                                    onClick={() => setCurrentView('Send')}
                                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple to-[#5b1fc9] text-white py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(123,47,247,0.45)] hover:shadow-[0_0_28px_rgba(123,47,247,0.7)]"
                                >
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                        <img src="/send.svg" alt="Send" className="w-5 h-5" />
                                    </div>
                                    Send
                                </button>
                            ) : (
                                <div className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white/40 py-4 rounded-2xl font-bold text-lg cursor-not-allowed">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center opacity-40">
                                        <img src="/send.svg" alt="Send" className="w-5 h-5" />
                                    </div>
                                    View-only
                                </div>
                            )}
                        </div>

                        {isEvmChain(selectedChain) && selectedChain !== 43114 && (
                            <div className="flex justify-center">
                                <div className="relative overflow-hidden flex items-center gap-2 px-4 py-1.5 rounded-full border bg-green-500/10 text-green-400 text-xs font-bold tracking-[0.15em] uppercase animate-gasless-breathe">
                                    <Flame className="w-3.5 h-3.5 animate-flame-flicker" />
                                    <span className="relative z-10">Gasless Transaction</span>
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-green-300/40 to-transparent blur-sm animate-gasless-shimmer"
                                    />
                                </div>
                            </div>
                        )}

                        <hr className="border-white/5" />
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 md:p-5 flex flex-col flex-1 min-h-0 mt-6">
                        <div className="flex items-center justify-between mb-3 shrink-0">
                            <div>
                                <span className="text-white font-bold">Assets</span>
                                <span className="text-text-secondary text-xs ml-2">{chainConfig.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-text-secondary text-xs">${totalUsd}</span>
                                <button
                                    onClick={() => refetchAssets()}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 text-text-secondary" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
                            {assetsLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-5 h-5 border-2 border-purple border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                            {assetsError && (
                                <div className="flex items-center gap-2 py-3 px-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-2">
                                    <Info className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    <span className="text-red-400 text-xs">Failed to load assets. Balances may be incomplete.</span>
                                </div>
                            )}
                            {!assetsLoading && !assetsError && visibleAssets.length === 0 && (
                                <div className="text-center py-6 text-text-secondary text-sm">
                                    {solanaWalletLoading ? (
                                        <span>No Solana wallet found. Switch to Solana to create one.</span>
                                    ) : assets.length === 0 ? (
                                        `No assets on ${chainConfig.name}`
                                    ) : (
                                        'No assets above $0.01'
                                    )}
                                </div>
                            )}
                            {!assetsLoading && visibleAssets.map((asset, i) => (
                                <div
                                    key={`${asset.contractAddress}-${i}`}
                                    className="group flex items-center justify-between px-3 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all cursor-pointer"
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
                                        <div className="leading-tight">
                                            <div className="text-white font-semibold text-sm">{asset.symbol}</div>
                                            <div className="text-text-secondary text-xs">{asset.name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right leading-tight">
                                        <div className="text-white font-semibold text-sm">
                                            {formatBalance(asset.balance, asset.decimals)}
                                        </div>
                                        <div className="text-text-secondary text-xs">{formatUsd(asset.balanceUsd)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : currentView === 'Receive' ? (
                renderReceiveView()
            ) : currentView === 'Send' ? (
                renderSendView()
            ) : (
                renderHistoryView()
            )}
        </div>
    )
}
