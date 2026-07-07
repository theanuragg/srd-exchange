import { useState, useEffect } from 'react';
import { CHAIN_CONFIGS } from '@/lib/chainConfig';

export interface RelayChain {
  id: number;
  name: string;
  displayName: string;
  httpRpcUrl: string;
  wsRpcUrl: string;
  explorerUrl: string;
  currency: {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
    address?: string;
  };
  iconUrl?: string;
  featuredTokens?: Array<{
    id: string;
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    metadata?: { logoURI?: string };
  }>;
}

export function useRelayChains() {
  const [chains, setChains] = useState<RelayChain[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchChains() {
      try {
        const baseUrl = 'https://api.relay.link';
        
        const apiKey = process.env.NEXT_PUBLIC_RELAY_API_KEY;
        const headers: HeadersInit = apiKey ? { 'x-api-key': apiKey } : {};
        
        const response = await fetch(`${baseUrl}/chains`, { headers });
        if (!response.ok) throw new Error('Failed to fetch chains');
        
        const data = await response.json();
        if (data.chains) {
            const allowedChainIds = CHAIN_CONFIGS.map(c => c.id);
            const filteredChains = data.chains.filter((chain: RelayChain) => allowedChainIds.includes(chain.id));
            setChains(filteredChains);
        }
      } catch (err) {
        console.error("Error fetching Relay chains:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchChains();
  }, []);

  return { chains, isLoading };
}
