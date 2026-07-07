import { useState, useCallback } from 'react';
import { getClient, createClient } from '@reservoir0x/relay-sdk';
import { Address } from 'viem';

// Initialize the Relay Client
// Note: In a production app with SSR, you might want to initialize this in a Provider component
try {
  const apiKey = process.env.NEXT_PUBLIC_RELAY_API_KEY;
  createClient({
    baseApiUrl: 'https://api.relay.link',
    source: 'srd-exchange',
    ...(apiKey && { apiKey }),
  });
} catch (e) {
  // Ignore error if client is already initialized
}

export interface QuoteParams {
  userAddress: string;
  solanaAddress?: string;
  originChainId: number;
  destinationChainId: number;
  originCurrency: string;
  destinationCurrency: string;
  amount: string; // Amount in wei string
  tradeType: 'EXACT_INPUT' | 'EXACT_OUTPUT';
}

export function useRelayQuote() {
  const [quote, setQuote] = useState<any | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async (params: QuoteParams) => {
    setIsFetching(true);
    setError(null);
    try {
      const relayClient = getClient();
      
      const user = params.originChainId === 792703809 ? params.solanaAddress : params.userAddress;
      const recipient = params.destinationChainId === 792703809 ? params.solanaAddress : params.userAddress;
      
      if (!user || !recipient) {
        throw new Error("Missing correct wallet address for the selected chains");
      }

      const quoteResponse = await relayClient.actions.getQuote({
        user: user,
        recipient: recipient,
        chainId: params.originChainId,
        toChainId: params.destinationChainId,
        currency: params.originCurrency,
        toCurrency: params.destinationCurrency,
        amount: params.amount,
        tradeType: params.tradeType,
        options: {
          slippageTolerance: '50', // 0.5% hardcoded for safety without exposing to UI
        }
      });

      setQuote(quoteResponse);
      return quoteResponse;
    } catch (err: any) {
      console.error('Failed to fetch Relay quote:', err);
      setError(err.message || 'Failed to fetch cross-chain quote');
      setQuote(null);
      return null;
    } finally {
      setIsFetching(false);
    }
  }, []);

  const clearQuote = () => {
    setQuote(null);
    setError(null);
  };

  return {
    quote,
    isFetching,
    error,
    fetchQuote,
    clearQuote,
  };
}
