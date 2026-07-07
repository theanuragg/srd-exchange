import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { Address } from 'viem';

export interface Token {
  symbol: string;
  address: Address;
  decimals: number;
  logo: string;
  name?: string;
}

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainId: number;
  onSelect: (token: Token) => void;
}

// Fallback popular tokens mapping
const POPULAR_TOKENS: Record<number, Token[]> = {
  1: [
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, logo: '/Usdt.png', name: 'Tether USD' },
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, logo: '/Usdc.png', name: 'USD Coin' },
    { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, logo: '/weth.png', name: 'Wrapped Ether' }
  ],
  56: [
    { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, logo: '/Usdt.png', name: 'Tether USD' },
    { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, logo: '/Usdc.png', name: 'USD Coin' },
    { symbol: 'WBNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, logo: '/wbnb.png', name: 'Wrapped BNB' }
  ],
  137: [
    { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, logo: '/Usdt.png', name: 'Tether USD' },
    { symbol: 'USDC', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, logo: '/Usdc.png', name: 'USD Coin' },
    { symbol: 'WPOL', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, logo: '/polygon.png', name: 'Wrapped Matic' }
  ],
  42161: [
    { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, logo: '/Usdt.png', name: 'Tether USD' },
    { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, logo: '/Usdc.png', name: 'USD Coin' },
    { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, logo: '/weth.png', name: 'Wrapped Ether' },
    { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, logo: '/arbitrum.png', name: 'Arbitrum' }
  ],
  8453: [
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, logo: '/Usdc.png', name: 'USD Coin' },
    { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, logo: '/weth.png', name: 'Wrapped Ether' }
  ],
  11155111: [
    { symbol: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6, logo: '/Usdc.png', name: 'USD Coin' },
    { symbol: 'WETH', address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', decimals: 18, logo: '/weth.png', name: 'Wrapped Ether' }
  ]
};

export function TokenModal({ isOpen, onClose, chainId, onSelect }: TokenModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Load default tokens for the selected chain
    const defaultTokens = POPULAR_TOKENS[chainId] || [];
    setTokens(defaultTokens);
    setSearchQuery('');
  }, [chainId, isOpen]);

  useEffect(() => {
    // Dynamic token search via Relay API
    if (searchQuery.startsWith('0x') && searchQuery.length === 42) {
      searchCustomToken(searchQuery);
    } else {
      // Filter defaults
      const defaultTokens = POPULAR_TOKENS[chainId] || [];
      if (searchQuery) {
        setTokens(defaultTokens.filter(t => 
          t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase()))
        ));
      } else {
        setTokens(defaultTokens);
      }
    }
  }, [searchQuery, chainId]);

  const searchCustomToken = async (address: string) => {
    setIsSearching(true);
    try {
      const baseUrl = 'https://api.relay.link';
      const apiKey = process.env.NEXT_PUBLIC_RELAY_API_KEY;
      const headers: HeadersInit = apiKey ? { 'x-api-key': apiKey } : {};
      
      const response = await fetch(`${baseUrl}/chains/${chainId}/currencies/${address}`, { headers });
      if (response.ok) {
        const data = await response.json();
        // The API returns the currency info directly
        if (data && data.currency) {
            setTokens([{
                symbol: data.currency.symbol,
                address: data.currency.address as Address,
                decimals: data.currency.decimals,
                logo: data.currency.metadata?.logoURI || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==',
                name: data.currency.name
            }]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch custom token", e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-md overflow-hidden bg-[#1E2028] border border-gray-800 shadow-2xl rounded-2xl"
          >
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Select a token</h2>
              <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-[#13141B] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Search name or paste address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="h-96 overflow-y-auto pr-2 custom-scrollbar">
                {isSearching ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : tokens.length > 0 ? (
                  <div className="space-y-2">
                    {tokens.map((token) => (
                      <button
                        key={token.address}
                        onClick={() => {
                          onSelect(token);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/50 transition-colors text-left group"
                      >
                        <img 
                          src={token.logo} 
                          alt={token.symbol} 
                          className="w-10 h-10 rounded-full"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==' }}
                        />
                        <div>
                          <div className="text-white font-medium group-hover:text-blue-400 transition-colors">{token.symbol}</div>
                          {token.name && <div className="text-sm text-gray-500">{token.name}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <p>No tokens found</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
