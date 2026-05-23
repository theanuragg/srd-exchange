'use client';

// CRITICAL: Import polyfills BEFORE any Particle imports
import '@/lib/particlePolyfills';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ParticleConnectkit } from '@/lib/connectkit';
import { useAccount } from '@particle-network/connectkit';
import { particleAuth } from '@particle-network/auth-core';
import FontProvider from './FontProvider';
import { ReactNode, useEffect, useState } from 'react';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import RightSidebar from './RightSidebar';
import { useWalletManager } from '@/hooks/useWalletManager';

// Create QueryClient outside component to prevent re-creation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function SidebarWrapper({ children }: { children: ReactNode }) {
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const { walletData, refetchBalances, eoaAddress: realEoaAddress } = useWalletManager();
  const { isConnected } = useAccount();
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);

  // realEoaAddress from useWalletManager uses useAccount().address which is the true EOA
  // This is different from the smart wallet address in smart account mode
  const eoaAddress = realEoaAddress ?? '';

  // Refetch balances when sidebar opens
  useEffect(() => {
    if (isSidebarOpen) {
      refetchBalances();
    }
  }, [isSidebarOpen, refetchBalances]);

  // Fetch Solana address once connected
  useEffect(() => {
    if (!isConnected) return;

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10000)
    );
    Promise.race([particleAuth.solana.connect(), timeout])
      .then(async () => {
        try {
          const pubKey = await particleAuth.solana.publicKey();
          if (pubKey) setSolanaAddress(pubKey.toBase58());
        } catch {
          const addr = particleAuth.solana.selectedAddress;
          if (addr) setSolanaAddress(addr);
        }
      })
      .catch(() => {});
  }, [isConnected]);

  // Save solana address to DB when resolved
  useEffect(() => {
    if (!eoaAddress || !solanaAddress) return;
    fetch('/api/auth/update-addresses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: eoaAddress,
        solanaAddress,
      }),
    }).catch(() => {});
  }, [eoaAddress, solanaAddress]);

  const displayUsdtBalance = walletData?.balances?.usdt?.formatted || "0";

  return (
    <>
      {children}
      <RightSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        eoaAddress={eoaAddress}
        solanaAddress={solanaAddress}
        userBalances={{
          usdt: displayUsdtBalance,
          inr: "0"
        }}
      />
    </>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ParticleConnectkit>
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <FontProvider />
          <div className="font-montserrat">
            <SidebarWrapper>
              {children}
            </SidebarWrapper>
          </div>
        </SidebarProvider>
      </QueryClientProvider>
    </ParticleConnectkit>
  );
}