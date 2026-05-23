'use client';

import { useSmartAccount, useAccount } from '@particle-network/connectkit';
import { particleAuth } from '@particle-network/auth-core';
import { useEffect, useState } from 'react';
import { recoverAddress } from 'viem';
import { keccak256, toBytes } from 'viem';
import AuthGuard from '@/components/auth/AuthGuard';
import SimpleNav from '@/components/simple-nav';

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
  const smartAccount = useSmartAccount();
  const { address: eoaAddress, isConnected } = useAccount();
  const [smartWalletAddress, setSmartWalletAddress] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<Record<string, string> | null>(null);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [solanaLoading, setSolanaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solanaError, setSolanaError] = useState<string | null>(null);

  const [onChainEntryPoint, setOnChainEntryPoint] = useState<string | null>(null);
  const [signatureTest, setSignatureTest] = useState<string | null>(null);
  const [signatureTestLoading, setSignatureTestLoading] = useState(false);

  useEffect(() => {
    if (!smartAccount || !isConnected || !eoaAddress) return;
    setSignatureTestLoading(true);
    setSignatureTest(null);
    const testHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`;
    (async () => {
      try {
        const sig = await (smartAccount as any).signUserOpHash(testHash);
        const { hashMessage, recoverAddress } = await import("viem");
        const ethSignedHash = hashMessage({ raw: testHash });
        const recovered = await recoverAddress({ hash: ethSignedHash, signature: sig });
        const match = recovered.toLowerCase() === eoaAddress.toLowerCase();
        setSignatureTest(
          `sigLen=${sig.length} recovered=${recovered} match=${match}`
        );
      } catch (e: any) {
        setSignatureTest("error: " + (e?.message || String(e)));
      }
      setSignatureTestLoading(false);
    })();
  }, [smartAccount, isConnected, eoaAddress]);

  useEffect(() => {
    if (!smartAccount || !isConnected) return;

    setLoading(true);
    setError(null);

    Promise.all([
      smartAccount.getAddress(),
      smartAccount.getAccount().catch(() => null),
    ])
      .then(([addr, info]) => {
        setSmartWalletAddress(addr);
        if (info) {
          setAccountInfo({
            entryPoint: (info as any).entryPointAddress,
            factory: (info as any).factoryAddress,
            implementation: (info as any).implementationAddress,
            deployed: String((info as any).isDeployed),
          });
        }
      })
      .catch((err: any) => setError(err?.message || 'Failed to get smart wallet address'))
      .finally(() => setLoading(false));
  }, [smartAccount, isConnected]);

  useEffect(() => {
    if (!smartWalletAddress) return;
    fetch("https://bnb-mainnet.g.alchemy.com/v2/tMv_F-SWjUGB-xx4J0hle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: smartWalletAddress, data: "0xb0d691fe" }, "latest"],
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.result && d.result !== "0x" && d.result.length >= 66) {
          setOnChainEntryPoint("0x" + d.result.slice(-40));
        } else {
          setOnChainEntryPoint("NOT_FOUND");
        }
      })
      .catch(() => setOnChainEntryPoint("CALL_FAILED"));
  }, [smartWalletAddress]);

  useEffect(() => {
    if (!isConnected) return;

    setSolanaLoading(true);
    setSolanaError(null);

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10000)
    );

    Promise.race([particleAuth.solana.connect(), timeout])
      .then(async () => {
        try {
          const pubKey = await particleAuth.solana.publicKey();
          if (pubKey) setSolanaAddress(pubKey.toBase58());
          else setSolanaError('Solana address not available for this account type.');
        } catch {
          const addr = particleAuth.solana.selectedAddress;
          if (addr) setSolanaAddress(addr);
          else setSolanaError('Solana address not generated yet.');
        }
      })
      .catch((err) => {
        if (err?.message === 'timeout') {
          setSolanaError('Solana address generation timed out. Try refreshing.');
        } else {
          setSolanaError('Could not fetch Solana address.');
        }
      })
      .finally(() => setSolanaLoading(false));
  }, [isConnected]);

  const short = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  return (
    <AuthGuard requireAuth={true}>
      <div className="bg-black min-h-screen text-white">
        <SimpleNav />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-16">
          <h1 className="text-2xl font-bold mb-2">Wallet Address Check</h1>
          <p className="text-white/50 text-sm mb-8">
            Verifies your EVM smart wallet (same address across all 9 chains) and your Solana EOA address.
            EVM address should be identical on every chain.
          </p>

          {/* EOA */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
            <div className="text-xs text-white/40 mb-1">EOA Address (signer)</div>
            <div className="font-mono text-sm text-white/80 break-all">
              {eoaAddress || '—'}
            </div>
          </div>

          {/* Smart Wallet */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
            <div className="text-xs text-purple-300 mb-1">AA Smart Wallet Address — EVM (same on all 9 chains)</div>
            {loading && <div className="text-white/40 text-sm">Fetching...</div>}
            {error && <div className="text-red-400 text-sm">{error}</div>}
            {smartWalletAddress && (
              <div className="font-mono text-base text-white break-all">{smartWalletAddress}</div>
            )}
            {!isConnected && <div className="text-white/40 text-sm">Not connected</div>}
          </div>

          {/* Account Info (AA config from Particle backend) */}
          {accountInfo && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
              <div className="text-xs text-amber-300 mb-2">AA Account Config (from Particle backend — BSC)</div>
              <div className="space-y-1 font-mono text-xs text-white/70">
                <div>entryPoint (Particle): <span className="text-white/90">{accountInfo.entryPoint}</span></div>
                <div>entryPoint (on-chain call): <span className={"text-white/90 " + (onChainEntryPoint === accountInfo.entryPoint ? "text-green-400" : "text-red-400")}>
                  {onChainEntryPoint || "checking..."}
                </span></div>
                <div>factory: <span className="text-white/90">{accountInfo.factory}</span></div>
                <div>implementation: <span className="text-white/90">{accountInfo.implementation}</span></div>
                <div>deployed: <span className="text-white/90">{accountInfo.deployed}</span></div>
              </div>
            </div>
          )}

          {/* Solana Wallet */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-8">
            <div className="text-xs text-green-300 mb-1">Solana EOA Address (Particle Auth users only)</div>
            {solanaLoading && <div className="text-white/40 text-sm">Fetching...</div>}
            {solanaError && <div className="text-yellow-400 text-sm">{solanaError}</div>}
            {solanaAddress && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="font-mono text-base text-white break-all">{solanaAddress}</div>
                <a
                  href={`https://solscan.io/account/${solanaAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  View on Solscan →
                </a>
            </div>
          )}

          {/* Signature Test */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-4">
            <div className="text-xs text-cyan-300 mb-2">AA Signature Recovery Test</div>
            {signatureTestLoading && <div className="text-white/40 text-sm">Testing...</div>}
            {signatureTest && (
              <div className="font-mono text-xs text-white/70 break-all">{signatureTest}</div>
            )}
          </div>
          </div>

          {/* Chain table */}
          {smartWalletAddress && (
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
                      {short(smartWalletAddress)}
                    </span>
                    <a
                      href={`${chain.explorer}${smartWalletAddress}`}
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
