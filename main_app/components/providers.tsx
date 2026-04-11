'use client';

// CRITICAL: Import polyfills BEFORE any Particle imports
import '@/lib/particlePolyfills';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ParticleConnectkit } from '@/lib/connectkit';
import { useSmartAccount } from '@particle-network/connectkit';
import FontProvider from './FontProvider';
import { ReactNode, useEffect } from 'react';
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
  const { address, walletData, refetchBalances } = useWalletManager();
  const smartAccount = useSmartAccount();

  // Refetch balances when sidebar opens
  useEffect(() => {
    if (isSidebarOpen) {
      refetchBalances();
    }
  }, [isSidebarOpen, refetchBalances]);

  // Always use smart wallet address - no EOA fallback
  const smartAddress = walletData?.smartWallet?.address;
  const displayUsdtBalance = walletData?.smartWallet?.usdtBalance || "0";

  // Wait for smart wallet address to be computed
  if (isSidebarOpen && !smartAddress) {
    return (
      <>
        {children}
        <RightSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          address={smartAddress || undefined}
          smartWalletAddress={smartAddress}
          userBalances={null}
        />
      </>
    );
  }

  return (
    <>
      {children}
      <RightSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        address={smartAddress || undefined}
        smartWalletAddress={smartAddress}
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