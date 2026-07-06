import { useEffect } from "react";
import { Copy, X, CheckCircle2 } from "lucide-react";
import { useRelayTransactions, type Transaction, type TxLeg } from "@/hooks/useRelayTransactions";
import { useWalletManager } from "@/hooks/useWalletManager";

function TokenIcon({ leg }: { leg: TxLeg }) {
  return (
    <div className="relative shrink-0">
      {leg.iconUrl ? (
        <img src={leg.iconUrl} alt={leg.symbol} className="w-9 h-9 rounded-full object-cover" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple to-[#5b1fc9] flex items-center justify-center text-white text-xs font-bold">
          {leg.symbol.slice(0, 3)}
        </div>
      )}
    </div>
  );
}

function Leg({ leg }: { leg: TxLeg }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <TokenIcon leg={leg} />
      <div className="min-w-0">
        <div className="text-white font-semibold text-sm md:text-base truncate">
          {leg.amount} {leg.symbol}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-text-tertiary text-xs">
          <span>{leg.addressLabel}:</span>
          <span className="text-purple-hover font-medium truncate max-w-[120px] inline-block align-bottom">{leg.address.slice(0, 6)}...{leg.address.slice(-4)}</span>
          <button
            onClick={() => navigator.clipboard?.writeText(leg.address)}
            className="opacity-70 hover:opacity-100"
            aria-label="Copy address"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function HashRow({ label, hash, fullHash }: { label: string; hash: string; fullHash: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-text-secondary font-semibold">{label}:</span>
      <span className="text-purple-hover font-medium">{hash}</span>
      <button
        onClick={() => navigator.clipboard?.writeText(fullHash)}
        className="opacity-70 hover:opacity-100 text-text-tertiary"
        aria-label="Copy hash"
      >
        <Copy className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function TransactionsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { smartWalletAddress } = useWalletManager();
  const { txs, isLoading } = useRelayTransactions(smartWalletAddress as string);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[88px] px-3 pb-6 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1120px] max-h-[calc(100vh-104px)] rounded-2xl bg-dark-card border border-white/10 shadow-[0_0_60px_rgba(123,47,247,0.25)] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-white font-bold text-lg md:text-xl">Transactions {isLoading && <span className="text-sm font-normal text-text-secondary ml-2">(Loading...)</span>}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {txs.length === 0 && !isLoading ? (
            <div className="text-center py-12 text-text-secondary">No transactions found for this wallet.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="grid grid-cols-[1.2fr_1.2fr_1.4fr_0.9fr_0.5fr] px-6 py-3 text-text-secondary text-xs uppercase tracking-wide border-b border-white/10">
                  <div>From</div>
                  <div>To</div>
                  <div>Transactions</div>
                  <div>Status</div>
                  <div>Fill Time</div>
                </div>
                <div className="divide-y divide-white/5">
                  {txs.map((tx) => (
                    <div key={tx.id} className="grid grid-cols-[1.2fr_1.2fr_1.4fr_0.9fr_0.5fr] px-6 py-4 items-center">
                      <Leg leg={tx.from} />
                      <Leg leg={tx.to} />
                      <div className="flex flex-col gap-1">
                        <HashRow label={tx.kind} hash={tx.txHashShort} fullHash={tx.txHashFull} />
                        {tx.secondaryHashShort && (
                          <HashRow label={tx.secondaryKind!} hash={tx.secondaryHashShort} fullHash={tx.secondaryHashFull!} />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold w-fit ${tx.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : tx.status === 'failed' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> {tx.status}
                        </span>
                        <span className="text-text-tertiary text-xs">{tx.timeAgo}</span>
                      </div>
                      <div className="text-white text-sm">{tx.fillTime ?? "-"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-white/5">
                {txs.map((tx) => (
                  <div key={tx.id} className="px-4 py-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${tx.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : tx.status === 'failed' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                        <CheckCircle2 className="w-3 h-3" /> {tx.status}
                      </span>
                      <span className="text-text-tertiary text-[11px]">
                        {tx.timeAgo}
                        {tx.fillTime && tx.fillTime !== "-" ? ` · ${tx.fillTime}` : ""}
                      </span>
                    </div>
                    <div>
                      <div className="text-text-tertiary text-[10px] uppercase tracking-wide mb-1">From</div>
                      <Leg leg={tx.from} />
                    </div>
                    <div>
                      <div className="text-text-tertiary text-[10px] uppercase tracking-wide mb-1">To</div>
                      <Leg leg={tx.to} />
                    </div>
                    <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                      <HashRow label={tx.kind} hash={tx.txHashShort} fullHash={tx.txHashFull} />
                      {tx.secondaryHashShort && (
                        <HashRow label={tx.secondaryKind!} hash={tx.secondaryHashShort} fullHash={tx.secondaryHashFull!} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
