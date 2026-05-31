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

export const CHAIN_CONFIGS = [
  { id: 1,      name: 'Ethereum',  symbol: 'ETH',  abbr: 'ETH',  explorer: 'https://etherscan.io',            color: '#627EEA', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: 56,     name: 'BNB Chain', symbol: 'BNB',  abbr: 'BNB',  explorer: 'https://bscscan.com',             color: '#F3BA2F', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
  { id: 8453,   name: 'Base',      symbol: 'ETH',  abbr: 'BASE', explorer: 'https://basescan.org',            color: '#0052FF', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png' },
  { id: 42161,  name: 'Arbitrum',  symbol: 'ETH',  abbr: 'ARB',  explorer: 'https://arbiscan.io',             color: '#28A0F0', logo: 'https://assets.coingecko.com/coins/images/16547/small/arb.jpg' },
  { id: 10,     name: 'Optimism',  symbol: 'ETH',  abbr: 'OP',   explorer: 'https://optimistic.etherscan.io', color: '#FF0420', logo: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png' },
  { id: 137,    name: 'Polygon',   symbol: 'POL',  abbr: 'POL',  explorer: 'https://polygonscan.com',         color: '#8247E5', logo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png' },
  { id: 43114,  name: 'Avalanche', symbol: 'AVAX', abbr: 'AVAX', explorer: 'https://snowtrace.io',            color: '#E84142', logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },

  { id: 101,    name: 'Solana',    symbol: 'SOL',  abbr: 'SOL',  explorer: 'https://solscan.io',              color: '#9945FF', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
];

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
  chainId: number
): Promise<TokenAsset[]> {
  const res = await fetch(`/api/wallet/assets?address=${encodeURIComponent(walletAddress)}&chainId=${chainId}`);
  const data = await res.json().catch(() => ({ assets: [], error: 'Failed to parse response' }));
  if (!res.ok) {
    throw new Error(data?.error || `Failed to fetch assets (${res.status})`);
  }
  return data.assets ?? [];
}

export async function fetchSolanaAssets(
  solanaAddress: string
): Promise<TokenAsset[]> {
  const res = await fetch(`/api/wallet/solana-assets?address=${encodeURIComponent(solanaAddress)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Failed to fetch Solana assets (${res.status})`);
  }
  const data = await res.json();
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
