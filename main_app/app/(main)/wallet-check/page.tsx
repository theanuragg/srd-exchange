'use client';

import { useState } from 'react';
import { useWalletManager } from '@/hooks/useWalletManager';
import AuthGuard from '@/components/auth/AuthGuard';
import Navigation from '@/components/landing/Navigation';

const CHAINS = [
  { name: 'Ethereum',     chainId: 1,      abbr: 'ETH',  explorer: 'https://etherscan.io/address/' },
  { name: 'BNB Chain',    chainId: 56,     abbr: 'BNB',  explorer: 'https://bscscan.com/address/' },
  { name: 'Base',         chainId: 8453,   abbr: 'BASE', explorer: 'https://basescan.org/address/' },
  { name: 'Arbitrum One', chainId: 42161,  abbr: 'ARB',  explorer: 'https://arbiscan.io/address/' },
  { name: 'Optimism',     chainId: 10,     abbr: 'OP',   explorer: 'https://optimistic.etherscan.io/address/' },
  { name: 'Polygon',      chainId: 137,    abbr: 'POL',  explorer: 'https://polygonscan.com/address/' },
  { name: 'Avalanche',    chainId: 43114,  abbr: 'AVAX', explorer: 'https://snowtrace.io/address/' },
  
];

export default function WalletCheckPage() {
  const {
    address,
    eoaAddress,
    smartWalletAddress,
    isConnected,
  } = useWalletManager();
  const displayAddress = smartWalletAddress || eoaAddress;
  const short = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  return (
    <AuthGuard requireAuth={true}>
      <div className="bg-black min-h-screen text-white">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-16">
          <h1 className="text-2xl font-bold mb-2">Wallet Address Check</h1>
          <p className="text-white/50 text-sm mb-8">
            Your smart wallet address. All transactions use the smart wallet with sponsored gas.
          </p>

          {/* Smart Wallet */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-8">
            <div className="text-xs text-purple-300 mb-1">Smart Wallet Address — BNB Chain</div>
            {displayAddress ? (
              <div className="font-mono text-base text-white break-all">{displayAddress}</div>
            ) : (
              <div className="text-white/40 text-sm">{isConnected ? 'No smart wallet available' : 'Not connected'}</div>
            )}
          </div>

          {/* EOA (small, secondary) */}
          {eoaAddress && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <div className="text-xs text-white/40 mb-1">EOA Address (signer — internal)</div>
              <div className="font-mono text-sm text-white/50 break-all">
                {eoaAddress}
              </div>
            </div>
          )}

          {/* Chain table */}
          {displayAddress && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
                Verify on Block Explorers
              </h2>
              {CHAINS.map((chain) => (
                <div
                  key={chain.chainId}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                      {chain.abbr}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{chain.name}</div>
                      <div className="text-xs text-white/40">Chain ID: {chain.chainId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-white/50 hidden sm:block">
                      {short(displayAddress)}
                    </span>
                    <a
                      href={`${chain.explorer}${displayAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      View →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {smartWalletAddress && (
            <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white/40 leading-relaxed">
              <strong className="text-white/60">Note:</strong> On chains where no transaction has been sent yet,
              the block explorer will show the address as empty. This is normal — the wallet contract deploys
              automatically on first use (counterfactual deployment). The address is still valid and reserved.
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
