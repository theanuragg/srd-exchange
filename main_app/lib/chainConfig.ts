export type ChainId = number | 'solana'

export interface ChainConfig {
  id: ChainId
  name: string
  symbol: string
  abbr: string
  explorer: string
  color: string
  logo: string
}

export const CHAIN_CONFIGS: ChainConfig[] = [
  { id: 1,      name: 'Ethereum',  symbol: 'ETH',  abbr: 'ETH',  explorer: 'https://etherscan.io',            color: '#627EEA', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: 56,     name: 'BNB Chain', symbol: 'BNB',  abbr: 'BNB',  explorer: 'https://bscscan.com',             color: '#F3BA2F', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
  { id: 8453,   name: 'Base',      symbol: 'ETH',  abbr: 'BASE', explorer: 'https://basescan.org',            color: '#0052FF', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png' },
  { id: 42161,  name: 'Arbitrum',  symbol: 'ETH',  abbr: 'ARB',  explorer: 'https://arbiscan.io',             color: '#28A0F0', logo: 'https://assets.coingecko.com/coins/images/16547/small/arb.jpg' },
  { id: 10,     name: 'Optimism',  symbol: 'ETH',  abbr: 'OP',   explorer: 'https://optimistic.etherscan.io', color: '#FF0420', logo: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png' },
  { id: 137,    name: 'Polygon',   symbol: 'POL',  abbr: 'POL',  explorer: 'https://polygonscan.com',         color: '#8247E5', logo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png' },
  { id: 43114,  name: 'Avalanche', symbol: 'AVAX', abbr: 'AVAX', explorer: 'https://snowtrace.io',            color: '#E84142', logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
  { id: 'solana', name: 'Solana',  symbol: 'SOL',  abbr: 'SOL',  explorer: 'https://solscan.io',              color: '#9945FF', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
]

export function isEvmChain(chainId: ChainId): chainId is number {
  return typeof chainId === 'number'
}

export function isSolana(chainId: ChainId): chainId is 'solana' {
  return chainId === 'solana'
}

export function isBNB(chainId: ChainId): boolean {
  return chainId === 56
}

export function getChainById(chainId: ChainId): ChainConfig | undefined {
  return CHAIN_CONFIGS.find(c => c.id === chainId)
}
