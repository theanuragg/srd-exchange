import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';

export type TxLeg = {
  chainId: number;
  symbol: string;
  amount: string;
  address: string;
  addressLabel: string;
  iconUrl?: string;
};

export type Transaction = {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  timeAgo: string;
  fillTime?: string;
  from: TxLeg;
  to: TxLeg;
  kind: string;
  txHashShort: string;
  txHashFull: string;
  secondaryKind?: string;
  secondaryHashShort?: string;
  secondaryHashFull?: string;
};

export function useRelayTransactions(userAddress?: string) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) return;

    let isMounted = true;
    const fetchTxs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiKey = process.env.NEXT_PUBLIC_RELAY_API_KEY;
        const headers: HeadersInit = apiKey ? { 'x-api-key': apiKey } : {};
        
        const response = await fetch(`https://api.relay.link/requests/v2?user=${userAddress}&limit=20`, { headers });
        if (!response.ok) throw new Error('Failed to fetch transactions');
        const data = await response.json();
        
        if (!isMounted) return;

        const mappedTxs: Transaction[] = (data.requests || []).map((req: any) => {
          const inTx = req.data?.inTxs?.[0] || {};
          const outTx = req.data?.outTxs?.[0] || {};
          
          // Use metadata as fallback for currency info if inTxs/outTxs don't have it
          const inCurrency = req.data?.metadata?.currencyIn || inTx.currency || {};
          const outCurrency = req.data?.metadata?.currencyOut || outTx.currency || {};
          
          // Map Status
          let status: Transaction['status'] = 'pending';
          if (req.status === 'success') status = 'completed';
          if (req.status === 'failed' || req.status === 'refunded') status = 'failed';

          // Map Time
          const created = new Date(req.createdAt || Date.now());
          const now = new Date();
          const diffMins = Math.floor((now.getTime() - created.getTime()) / 60000);
          const timeAgo = diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins/60)}h ago`;

          // Format Amounts
          const formatAmt = (amt: string, dec: number) => {
            if (!amt) return "0.0000";
            try { return parseFloat(formatUnits(BigInt(amt), dec)).toFixed(4); } catch { return "0.0000"; }
          };

          const fromAmount = formatAmt(inTx.amount || inCurrency.amount, inCurrency.decimals || 18);
          const toAmount = formatAmt(outTx.amount || outCurrency.amount, outCurrency.decimals || 18);
          
          const inTxHash = inTx.hash || inTx.txHash;
          const outTxHash = outTx.hash || outTx.txHash;

          return {
            id: req.id,
            status,
            timeAgo,
            fillTime: req.status === 'success' ? 'Fast' : undefined,
            from: {
              chainId: inTx.chainId || req.originChainId || 1,
              symbol: inCurrency.symbol || 'Unknown',
              amount: fromAmount,
              address: req.user,
              addressLabel: 'User',
              iconUrl: undefined
            },
            to: {
              chainId: outTx.chainId || req.destinationChainId || 1,
              symbol: outCurrency.symbol || 'Unknown',
              amount: toAmount,
              address: req.recipient || req.user,
              addressLabel: 'Recipient',
              iconUrl: undefined
            },
            kind: 'Origin Tx',
            txHashShort: inTxHash ? `${inTxHash.slice(0, 6)}...${inTxHash.slice(-4)}` : '...',
            txHashFull: inTxHash || '',
            secondaryKind: outTxHash ? 'Dest Tx' : undefined,
            secondaryHashShort: outTxHash ? `${outTxHash.slice(0, 6)}...${outTxHash.slice(-4)}` : undefined,
            secondaryHashFull: outTxHash || undefined
          };
        });

        setTxs(mappedTxs);
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTxs();
  }, [userAddress]);

  return { txs, isLoading, error };
}
