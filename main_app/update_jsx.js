const fs = require('fs');

let content = fs.readFileSync('components/MultiChainSwap.tsx', 'utf-8');

const replacement = `
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

  const handlePercent = (pct) => {
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
        <TrendingBar chains={chains} />
        <button
          onClick={() => {}}
          aria-label="Transaction history"
          className="shrink-0 w-11 h-11 rounded-xl bg-dark-card border border-white/10 flex items-center justify-center text-text-secondary hover:text-white hover:border-purple/40 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/70"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* SELL */}
      <div className="rounded-2xl bg-dark-card border border-white/5 p-5 transition-colors hover:border-purple/20 focus-within:border-purple/40">
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
            <span></span>
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
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { l: "20%", v: 20 },
            { l: "50%", v: 50 },
            { l: "MAX", v: 100 },
          ].map((b) => (
            <button
              key={b.l}
              onClick={() => handlePercent(b.v)}
              aria-label={\`Set amount to \${b.l}\`}
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
      <div className="rounded-2xl bg-dark-card border border-white/5 p-5 transition-colors hover:border-purple/20">
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
          <span className="text-text-tertiary text-sm"></span>
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
        className={\`mt-4 w-full min-h-14 py-4 rounded-2xl font-bold text-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black \${
          canSwap
            ? "bg-gradient-to-r from-purple to-[#5b1fc9] text-white shadow-[0_0_20px_rgba(123,47,247,0.35)] hover:shadow-[0_0_32px_rgba(123,47,247,0.7)] active:scale-[0.985]"
            : isSwapping
              ? "bg-gradient-to-r from-purple to-[#5b1fc9] text-white cursor-wait"
              : "bg-white/10 text-text-secondary cursor-not-allowed"
        }\`}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {isSwapping && <Loader2 className="w-5 h-5 animate-spin" />}
          {ctaLabel}
        </span>
      </button>

      {/* Swap Completed Toast */}
      {(txStatus === 'success' || txStatus === 'failed') && (
        <div
          role="status"
          className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm animate-scale-in"
        >
          <div className={\`relative rounded-2xl bg-dark-card/95 backdrop-blur-xl border \${txStatus === 'success' ? 'border-purple/40 shadow-[0_0_40px_rgba(123,47,247,0.45)]' : 'border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.45)]'} p-4\`}>
            <button
              onClick={() => setTxStatus('idle')}
              aria-label="Dismiss"
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-white hover:bg-white/10 transition z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className={\`shrink-0 w-11 h-11 rounded-full flex items-center justify-center \${txStatus === 'success' ? 'bg-gradient-to-br from-purple to-[#5b1fc9] shadow-[0_0_20px_rgba(123,47,247,0.6)]' : 'bg-gradient-to-br from-red-500 to-red-700 shadow-[0_0_20px_rgba(239,68,68,0.6)]'}\`}>
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
      <DynamicTokenModal
        isOpen={showSourceDropdown}
        onClose={() => setShowSourceDropdown(false)}
        chains={chains}
        selectedChainId={sourceChain}
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
        onSelect={(chainId, token) => {
          setDestChain(chainId);
          setDestToken(token);
        }}
      />
    </div>
  )
}
`;

const startIndex = content.indexOf('if (isChainsLoading) {');
if (startIndex !== -1) {
  content = content.substring(0, startIndex) + replacement;
  fs.writeFileSync('components/MultiChainSwap.tsx', content, 'utf-8');
  console.log("Replaced successfully!");
} else {
  console.log("Could not find start index");
}
