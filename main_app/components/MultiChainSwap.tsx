'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ArrowDownUp, Info, X, ArrowDown, ArrowUpDown, Check, ChevronRight, ExternalLink, Flame, History, Loader2 } from 'lucide-react'
import { useRelayChains } from '@/hooks/useRelayChains'
import { DynamicTokenModal, Token } from './DynamicTokenModal'
import TransactionsPanel from './TransactionsPanel'
import { useWalletManager } from '@/hooks/useWalletManager'
import { useRelayQuote } from '@/hooks/useRelayQuote'
import { formatUnits, parseUnits, Address, parseAbi, Hex } from 'viem'
import { sendSponsoredBatchSmartAccountTransaction } from '@/lib/sponsoredTransactions'
import { createSignHashWithRetry } from '@/lib/sponsoredSigning'
import { retryWithRPCFailover } from '@/lib/rpcManager'
import { waitForUserOperationReceipt } from '@/lib/userOpBuilder'
export { DynamicTokenModal };

function TokenChip({
  token,
  chainId,
  chainConfig,
  onClick,
  variant = "solid",
}: {
  token: Token | null;
  chainId: number;
  chainConfig: any;
  onClick: () => void;
  variant?: "solid" | "cta";
}) {
  if (!token) {
    return (
      <button
        onClick={onClick}
        className={`group relative flex items-center gap-2 pl-5 pr-3 py-2.5 rounded-full font-bold text-sm transition-all ${
          variant === "cta"
            ? "bg-gradient-to-r from-purple to-[#5b1fc9] text-white shadow-[0_0_20px_rgba(123,47,247,0.45)] hover:shadow-[0_0_28px_rgba(123,47,247,0.7)]"
            : "bg-white/10 text-white hover:bg-white/15"
        }`}
      >
        <span className="tracking-wider">SELECT TOKEN</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
    >
      <div className="relative shrink-0">
        <img src={token.logo || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg=='} alt={token.symbol} className="w-9 h-9 rounded-full object-cover" />
        {chainConfig?.iconUrl && (
          <img
            src={chainConfig.iconUrl}
            alt={chainConfig.displayName}
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ring-2 ring-[#0a0a0a] object-cover"
          />
        )}
      </div>
      <div className="text-left leading-tight">
        <div className="text-white font-bold text-[15px]">{token.symbol}</div>
        <div className="text-text-tertiary text-[11px]">{chainConfig?.displayName ?? chainId}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-white transition" />
    </button>
  );
}

export default function MultiChainSwap() {
  const {
    address,
    eoaAddress,
    smartWalletAddress,
    selectedChain,
    signHash,
    shouldSkipInitCode,
    switchChain,
    solanaAddress
  } = useWalletManager()
  const { quote, isFetching, error, fetchQuote, clearQuote } = useRelayQuote()

  const { chains, isLoading: isChainsLoading } = useRelayChains()

  // Source State
  const [sourceChain, setSourceChain] = useState<number>(selectedChain as number || 56)
  const [sourceToken, setSourceToken] = useState<Token | null>(null)
  const [amountIn, setAmountIn] = useState<string>('')

  // Destination State
  const [destChain, setDestChain] = useState<number>(56)
  const [destToken, setDestToken] = useState<Token | null>(null)

  // Initialize Default Tokens
  useEffect(() => {
    if (chains.length > 0) {
      if (!sourceToken) {
        const chain = chains.find(c => c.id === sourceChain) || chains[0]
        if (chain && chain.featuredTokens && chain.featuredTokens.length > 0) {
          setSourceToken({
            symbol: chain.featuredTokens[0].symbol,
            address: chain.featuredTokens[0].address as Address,
            decimals: chain.featuredTokens[0].decimals,
            logo: chain.featuredTokens[0].metadata?.logoURI || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==',
            name: chain.featuredTokens[0].name
          })
        }
      }
      if (!destToken) {
        const chain = chains.find(c => c.id === destChain) || chains[0]
        if (chain && chain.featuredTokens && chain.featuredTokens.length > 1) {
          setDestToken({
            symbol: chain.featuredTokens[1].symbol,
            address: chain.featuredTokens[1].address as Address,
            decimals: chain.featuredTokens[1].decimals,
            logo: chain.featuredTokens[1].metadata?.logoURI || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==',
            name: chain.featuredTokens[1].name
          })
        }
      }
    }
  }, [chains]);

  // UI State
  const [isSwapping, setIsSwapping] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle')
  const [showSourceDropdown, setShowSourceDropdown] = useState(false)
  const [showDestDropdown, setShowDestDropdown] = useState(false)
  const [showTxs, setShowTxs] = useState(false)

  const [sourceTokenBalance, setSourceTokenBalance] = useState<bigint | null>(null)
  const [isFetchingBalance, setIsFetchingBalance] = useState(false)
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0)

  // Fetch Balance
  useEffect(() => {
    if (!smartWalletAddress || !sourceToken || !sourceChain) return;

    let isMounted = true;
    const fetchBalance = async () => {
      setIsFetchingBalance(true);
      try {
        const balance = await retryWithRPCFailover(async (client) => {
          const isNative = sourceToken.address === '0x0000000000000000000000000000000000000000' || sourceToken.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
          if (isNative) {
            return await client.getBalance({ address: smartWalletAddress as Address });
          } else {
            return await client.readContract({
              address: sourceToken.address as Address,
              abi: parseAbi(["function balanceOf(address owner) view returns (uint256)"]),
              functionName: "balanceOf",
              args: [smartWalletAddress as Address],
            });
          }
        }, 3, sourceChain);
        
        if (isMounted && balance !== null) {
          setSourceTokenBalance(balance as bigint);
        }
      } catch (err) {
        // Silently ignore balance fetch errors (e.g. token contract doesn't exist on this chain yet)
        // to prevent spamming the console with viem ContractFunctionExecutionErrors
        if (isMounted) setSourceTokenBalance(null);
      } finally {
        if (isMounted) setIsFetchingBalance(false);
      }
    };
    fetchBalance();

    return () => { isMounted = false; };
  }, [smartWalletAddress, sourceToken, sourceChain, balanceRefreshTrigger]);

  // Remove the old SUPPORTED_TOKENS re-sync logic since users explicitly select tokens now from the modal.

  // Fetch Quote when inputs change
  useEffect(() => {
    const handler = setTimeout(() => {
      if (amountIn && parseFloat(amountIn) > 0 && sourceToken && destToken && smartWalletAddress) {
        fetchQuote({
          userAddress: (smartWalletAddress || eoaAddress) as string,
          solanaAddress: solanaAddress ?? undefined,
          originChainId: sourceChain,
          destinationChainId: destChain,
          originCurrency: sourceToken.address,
          destinationCurrency: destToken.address,
          amount: parseUnits(amountIn, sourceToken.decimals).toString(),
          tradeType: 'EXACT_INPUT'
        })
      } else {
        clearQuote()
      }
    }, 500)
    return () => clearTimeout(handler)
  }, [amountIn, sourceChain, destChain, sourceToken, destToken, smartWalletAddress])

  const handleSwap = async () => {
    if (!quote?.steps?.[0]?.items?.[0]?.data) return
    if (!smartWalletAddress || !eoaAddress) return

    setIsSwapping(true)
    setTxHash(null)
    setTxStatus('idle')

    try {
      // Step 1: Ensure wallet is connected to the source chain
      if (selectedChain !== sourceChain) {
        await switchChain(sourceChain)
      }

      // Step 2: Execute all sponsored cross-chain Relay transactions atomically via batch execution
      const transactions = [];

      if (sourceChain === 792703809) {
        throw new Error("Swapping FROM Solana requires a native SOL balance for gas. For now, please swap TO Solana instead.");
      }

      for (const step of quote.steps) {
        for (const item of step.items) {
          const txPayload = item.data;
          if (!txPayload) continue;

          transactions.push({
            to: txPayload.to as Address,
            data: txPayload.data as `0x${string}`,
            value: txPayload.value ? `0x${BigInt(txPayload.value).toString(16)}` as `0x${string}` : "0x0"
          });
        }
      }

      if (transactions.length === 0) {
        throw new Error("No transactions to execute");
      }

      const hash = await sendSponsoredBatchSmartAccountTransaction({
        smartAccountAddress: smartWalletAddress as Address,
        eoaAddress: eoaAddress as Address,
        transactions,
        skipInitCode: shouldSkipInitCode,
        chainId: sourceChain
      }, createSignHashWithRetry(signHash));

      setTxHash(hash);
      setTxStatus('pending');

      const receipt = await waitForUserOperationReceipt(hash as Hex, sourceChain);
      if (!receipt.success) {
        setTxStatus('failed');
        throw new Error(`Batch transaction failed`);
      }

      setTxStatus('success');
      if (receipt?.receipt?.transactionHash) {
        setTxHash(receipt.receipt.transactionHash);
      }
      // Refetch balance after success
      setBalanceRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Swap execution failed", err)
      setTxStatus('failed')
    } finally {
      setIsSwapping(false)
    }
  }

  const amountInParsed = amountIn && !isNaN(Number(amountIn)) ? parseUnits(amountIn, sourceToken?.decimals || 18) : 0n;
  const isInsufficientBalance = sourceTokenBalance !== null && amountInParsed > 0n && amountInParsed > sourceTokenBalance;

  const sChainConfig = chains.find(c => c.id === sourceChain)
  const dChainConfig = chains.find(c => c.id === destChain)

  
  if (isChainsLoading) {
    return (
      <div className="w-full max-w-[520px] mx-auto bg-dark-card border border-white/5 rounded-3xl p-6 flex items-center justify-center min-h-[400px]">
         <div className="w-8 h-8 border-4 border-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const amountNum = parseFloat(amountIn || "0");
  const insufficient = sourceTokenBalance !== null && amountInParsed > 0n && amountInParsed > sourceTokenBalance;
  const canSwap = !!sourceToken && !!destToken && amountNum > 0 && !insufficient && !isSwapping && !isFetching;
  
  const ctaLabel =
    isSwapping
      ? "Swapping..."
      : !destToken || !sourceToken
        ? "Select a token"
        : !amountNum
          ? "Enter an amount"
          : insufficient
            ? "Insufficient funds"
            : "Swap";

  const handlePercent = (pct: number) => {
    if (sourceTokenBalance === null) return;
    const maxAmount = (sourceTokenBalance * BigInt(pct)) / 100n;
    setAmountIn(formatUnits(maxAmount, sourceToken?.decimals || 18));
  };

  const handleFlip = () => {
    const tempChain = sourceChain; setSourceChain(destChain); setDestChain(tempChain);
    const tempToken = sourceToken; setSourceToken(destToken); setDestToken(tempToken);
  };

  return (
    <div className="w-full max-w-[520px] mx-auto">
      {/* Top row: trending + transaction history */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex-1 flex items-center bg-[#2B1B54] rounded-2xl px-3 py-2 overflow-hidden border border-purple/30 mr-2 shadow-[0_0_15px_rgba(123,47,247,0.15)]">
          <div className="flex items-center gap-1.5 shrink-0 pr-3 mr-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#A874FF]"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg>
            <span className="text-white font-bold text-xs tracking-wide">Trending</span>
          </div>
          <div className="flex flex-1 items-center gap-2 overflow-x-hidden relative mask-fade-right">
            {(chains.find(c => c.id === sourceChain)?.featuredTokens || []).slice(0, 5).map((t) => (
              <div 
                key={t.symbol} 
                onClick={() => setSourceToken({
                  address: t.address as Address,
                  symbol: t.symbol,
                  decimals: t.decimals,
                  logo: t.metadata?.logoURI || undefined,
                  name: t.name
                })}
                className="flex items-center gap-1.5 shrink-0 bg-black/40 rounded-full px-2 py-0.5 border border-white/5 cursor-pointer hover:bg-black/60 transition-colors"
              >
                {t.metadata?.logoURI ? (
                  <img src={t.metadata.logoURI} alt={t.symbol} className="w-3.5 h-3.5 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-3.5 h-3.5 bg-purple rounded-full flex items-center justify-center border border-white/10">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                )}
                <span className="text-[10px] font-bold text-white tracking-wide">{t.symbol}</span>
              </div>
            ))}
          </div>
          <div className="shrink-0 pl-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white/50"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </div>
        <button
          onClick={() => setShowTxs(true)}
          aria-label="Transaction history"
          className="shrink-0 w-11 h-11 rounded-xl bg-dark-card border border-white/10 flex items-center justify-center text-text-secondary hover:text-white hover:border-purple/40 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/70"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* SELL */}
      <div className="rounded-2xl bg-dark-card border border-white/5 p-4 transition-colors hover:border-purple/20 focus-within:border-purple/40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-text-secondary text-sm">Sell</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <input
            inputMode="decimal"
            aria-label="Sell amount"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            className="flex-1 min-w-0 bg-transparent text-white font-bold text-4xl md:text-5xl outline-none placeholder:text-white/60 caret-purple"
          />
          <TokenChip token={sourceToken} chainId={sourceChain} chainConfig={sChainConfig} onClick={() => setShowSourceDropdown(true)} />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-text-tertiary text-sm">
            <span>{quote?.details?.currencyIn?.amountUsd ? `~$${Number(quote.details.currencyIn.amountUsd).toFixed(2)}` : ''}</span>
            <button
              onClick={handleFlip}
              aria-label="Flip currency display"
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/70"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-text-tertiary text-sm">
            Balance: {sourceTokenBalance !== null ? formatUnits(sourceTokenBalance, sourceToken?.decimals || 18).slice(0, 8) : isFetchingBalance ? '...' : '0'}
          </span>
        </div>

        {/* Percent buttons */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { l: "20%", v: 20 },
            { l: "50%", v: 50 },
            { l: "MAX", v: 100 },
          ].map((b) => (
            <button
              key={b.l}
              onClick={() => handlePercent(b.v)}
              aria-label={`Set amount to ${b.l}`}
              className="min-h-11 py-2.5 rounded-lg bg-black/40 border border-white/5 text-white font-semibold text-sm hover:bg-black/60 hover:border-purple/40 active:scale-[0.97] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/70"
            >
              {b.l}
            </button>
          ))}
        </div>
      </div>

      {/* Swap flip button */}
      <div className="flex justify-center -my-3 relative z-10">
        <button
          onClick={handleFlip}
          aria-label="Swap direction"
          className="w-11 h-11 rounded-xl bg-[#111] border border-white/10 flex items-center justify-center text-white hover:border-purple/60 hover:text-purple-hover hover:rotate-180 active:scale-90 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/70"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      </div>

      {/* BUY */}
      <div className="rounded-2xl bg-dark-card border border-white/5 p-4 transition-colors hover:border-purple/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-text-secondary text-sm">Buy</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0 text-white font-bold text-4xl md:text-5xl truncate">
            {quote?.details?.currencyOut?.amount ? formatUnits(BigInt(quote.details.currencyOut.amount), destToken?.decimals || 18).slice(0, 8) : "0"}
          </div>
          <TokenChip token={destToken} chainId={destChain} chainConfig={dChainConfig} onClick={() => setShowDestDropdown(true)} variant="cta" />
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-text-tertiary text-sm">{quote?.details?.currencyOut?.amountUsd ? `~$${Number(quote.details.currencyOut.amountUsd).toFixed(2)}` : ''}</span>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2 items-center">
          <Info className="w-4 h-4 text-red-500" />
          <p className="text-red-500 text-xs">{error}</p>
        </div>
      )}

      {/* CTA */}
      <button
        disabled={!canSwap}
        onClick={handleSwap}
        aria-label={ctaLabel}
        aria-busy={isSwapping}
        className={`mt-3 w-full min-h-12 py-3.5 rounded-2xl font-bold text-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
          canSwap
            ? "bg-gradient-to-r from-purple to-[#5b1fc9] text-white shadow-[0_0_20px_rgba(123,47,247,0.35)] hover:shadow-[0_0_32px_rgba(123,47,247,0.7)] active:scale-[0.985]"
            : isSwapping
              ? "bg-gradient-to-r from-purple to-[#5b1fc9] text-white cursor-wait"
              : "bg-white/10 text-text-secondary cursor-not-allowed"
        }`}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {isSwapping && <Loader2 className="w-5 h-5 animate-spin" />}
          {ctaLabel}
        </span>
      </button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium text-white/40">
        <span>Powered by</span>
        <a href="https://relay.link" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:opacity-80 transition-opacity flex items-center gap-1">
          <img src="/lockup_white.svg" alt="Relay" className="h-5 w-auto ml-1" />
        </a>
      </div>
      {/* Swap Completed Toast */}
      {(txStatus === 'success' || txStatus === 'failed') && (
        <div
          role="status"
          className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm animate-scale-in"
        >
          <div className={`relative rounded-2xl bg-dark-card/95 backdrop-blur-xl border ${txStatus === 'success' ? 'border-purple/40 shadow-[0_0_40px_rgba(123,47,247,0.45)]' : 'border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.45)]'} p-4`}>
            <button
              onClick={() => setTxStatus('idle')}
              aria-label="Dismiss"
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-white hover:bg-white/10 transition z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${txStatus === 'success' ? 'bg-gradient-to-br from-purple to-[#5b1fc9] shadow-[0_0_20px_rgba(123,47,247,0.6)]' : 'bg-gradient-to-br from-red-500 to-red-700 shadow-[0_0_20px_rgba(239,68,68,0.6)]'}`}>
                {txStatus === 'success' ? <Check className="w-6 h-6 text-white" strokeWidth={3} /> : <X className="w-6 h-6 text-white" strokeWidth={3} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white font-bold text-base">{txStatus === 'success' ? 'Swap Completed' : 'Swap Failed'}</div>
                {txHash && (
                  <a
                    href={sChainConfig?.explorerUrl + '/tx/' + txHash}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-purple-hover hover:text-white text-xs font-semibold transition mt-0.5"
                  >
                    Transaction link
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <TransactionsPanel open={showTxs} onClose={() => setShowTxs(false)} />
      <DynamicTokenModal
        isOpen={showSourceDropdown}
        onClose={() => setShowSourceDropdown(false)}
        chains={chains}
        selectedChainId={sourceChain}
        evmAddress={(smartWalletAddress || eoaAddress) as string}
        solanaAddress={solanaAddress as string}
        onSelect={(chainId, token) => {
          setSourceChain(chainId);
          setSourceToken(token);
        }}
      />
      <DynamicTokenModal
        isOpen={showDestDropdown}
        onClose={() => setShowDestDropdown(false)}
        chains={chains}
        selectedChainId={destChain}
        evmAddress={(smartWalletAddress || eoaAddress) as string}
        solanaAddress={solanaAddress as string}
        onSelect={(chainId, token) => {
          setDestChain(chainId);
          setDestToken(token);
        }}
      />
    </div>
  )
}
