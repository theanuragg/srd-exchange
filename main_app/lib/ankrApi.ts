import { CHAIN_CONFIGS, isSolana, type ChainId } from './chainConfig';
export { CHAIN_CONFIGS };

// Maps our chain IDs to Ankr's chain name strings
export const CHAIN_ID_TO_ANKR: Record<number, string> = {
  1:      'eth',
  56:     'bsc',
  8453:   'base',
  42161:  'arbitrum',
  10:     'optimism',
  137:    'polygon',
  43114:  'avalanche',
};

export interface TokenAsset {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;        // raw balance string
  balanceUsd: string;     // USD value
  thumbnail: string;
  tokenPrice: string;
  chainId: number;
  isNative: boolean;
}

export async function fetchChainAssets(
  walletAddress: string,
  chainId: ChainId
): Promise<TokenAsset[]> {
  const endpoint = isSolana(chainId)
    ? `/api/wallet/assets-solana?address=${encodeURIComponent(walletAddress)}`
    : `/api/wallet/assets?address=${encodeURIComponent(walletAddress)}&chainId=${chainId}`;

  const res = await fetch(endpoint);
  const data = await res.json().catch(() => ({ assets: [], error: 'Failed to parse response' }));
  if (!res.ok) {
    throw new Error(data?.error || `Failed to fetch assets (${res.status})`);
  }
  return data.assets ?? [];
}

export function formatBalance(balance: string, _decimals?: number): string {
  const num = parseFloat(balance);
  if (isNaN(num) || num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(4);
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatUsd(usd: string): string {
  const num = parseFloat(usd);
  if (isNaN(num) || num === 0) return '$0.00';
  if (num < 0.01) return '<$0.01';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
