import { useState, useEffect, useCallback } from 'react';
import { fetchChainAssets, type TokenAsset } from '@/lib/ankrApi';

interface UseChainAssetsResult {
  assets: TokenAsset[];
  totalUsd: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useChainAssets(
  address: string | null | undefined,
  chainId: number
): UseChainAssetsResult {
  const [assets, setAssets] = useState<TokenAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!address) {
      setAssets([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchChainAssets(address, chainId);
      setAssets(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch assets');
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const totalUsd = assets
    .reduce((sum, a) => sum + parseFloat(a.balanceUsd || '0'), 0)
    .toFixed(2);

  return { assets, totalUsd, isLoading, error, refetch: fetch };
}
