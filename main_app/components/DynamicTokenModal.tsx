import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { Address } from 'viem';
import { RelayChain } from '@/hooks/useRelayChains';
import { useTokenBalances } from '@/hooks/useTokenBalances';

export interface Token {
  symbol: string;
  address: Address;
  decimals: number;
  logo: string;
  name?: string;
}

interface DynamicTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  chains: RelayChain[];
  selectedChainId: number;
  evmAddress?: string;
  solanaAddress?: string;
  onSelect: (chainId: number, token: Token) => void;
}

export function DynamicTokenModal({ isOpen, onClose, chains, selectedChainId, evmAddress, solanaAddress, onSelect }: DynamicTokenModalProps) {
  const [activeChain, setActiveChain] = useState(selectedChainId);
  const [chainSearchQuery, setChainSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setActiveChain(selectedChainId);
  }, [selectedChainId, isOpen]);

  useEffect(() => {
    // Load tokens for active chain
    const activeChainObj = chains.find(c => c.id === activeChain);
    let defaultTokens: Token[] = [];
    
    if (activeChainObj) {
        const nativeToken: Token = {
            symbol: activeChainObj.currency.symbol,
            address: (activeChainObj.currency.address || '0x0000000000000000000000000000000000000000') as Address,
            decimals: activeChainObj.currency.decimals,
            logo: activeChainObj.iconUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==',
            name: activeChainObj.currency.name
        };
        
        const featuredTokens = activeChainObj.featuredTokens?.map(t => ({
            symbol: t.symbol,
            address: t.address as Address,
            decimals: t.decimals,
            logo: t.metadata?.logoURI || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==',
            name: t.name
        })) || [];
        
        // Remove native token from featured if it's there to avoid duplicates
        const filteredFeatured = featuredTokens.filter(t => t.address.toLowerCase() !== nativeToken.address.toLowerCase());
        
        defaultTokens = [nativeToken, ...filteredFeatured];
    }
    
    const displayTokens = isSearching ? searchResults : defaultTokens;
    
    if (searchQuery) {
      searchCustomToken(activeChain, searchQuery);
    } else {
      setTokens(defaultTokens);
      setIsSearching(false);
    }
  }, [activeChain, searchQuery, isOpen]);

  const activeChainObj = chains.find(c => c.id === activeChain);
  const { balances, isLoading: isLoadingBalances } = useTokenBalances(
    activeChain, 
    tokens, 
    activeChainObj?.httpRpcUrl, 
    evmAddress, 
    solanaAddress
  );

  const yourTokens = tokens.filter(t => (balances[t.address]?.raw || 0n) > 0n);
  const allTokens = tokens.filter(t => (balances[t.address]?.raw || 0n) === 0n);

  const searchCustomToken = async (chainId: number, query: string) => {
    setIsSearching(true);
    try {
      const isTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === 'true';
      const baseUrl = isTestnet ? 'https://api.testnets.relay.link' : 'https://api.relay.link';
      
      // If it's a contract address
      if (query.startsWith('0x') && query.length === 42) {
        const response = await fetch(`${baseUrl}/chains/${chainId}/currencies/${query}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.currency) {
              setTokens([{
                  symbol: data.currency.symbol,
                  address: data.currency.address as Address,
                  decimals: data.currency.decimals,
                  logo: data.currency.metadata?.logoURI || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==',
                  name: data.currency.name
              }]);
              return;
          }
        }
      } else {
        // Text search across all Relay currencies
        const response = await fetch(`${baseUrl}/currencies/v1`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 50, chainIds: [chainId], term: query })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            // Data is an array of arrays [ [ {currency1} ], [ {currency2} ] ]
            const searchResults = data.map((item: any) => item[0]).filter(Boolean).map((currency: any) => ({
                symbol: currency.symbol,
                address: currency.address as Address,
                decimals: currency.decimals,
                logo: currency.metadata?.logoURI || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==',
                name: currency.name
            }));
            setTokens(searchResults);
            return;
          }
        }
      }
      
      setTokens([]);
    } catch (e) {
      console.error("Failed to fetch custom token", e);
      setTokens([]);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#111] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0">
          <h3 className="text-white font-bold text-lg">Select Token & Chain</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition bg-white/5 hover:bg-white/10 p-1.5 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex flex-1 min-h-0 pt-2">
          {/* Sidebar for Chains */}
          <div className="w-1/3 border-r border-white/10 p-2 flex flex-col min-h-0">
            <div className="relative mb-3 shrink-0">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                    <Search size={16} />
                </div>
                <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#6320EE] transition-colors"
                    placeholder="Search chains"
                    value={chainSearchQuery}
                    onChange={(e) => setChainSearchQuery(e.target.value)}
                />
            </div>
            <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1">
            {chains.filter(c => c.displayName.toLowerCase().includes(chainSearchQuery.toLowerCase())).map(chain => (
              <button
                key={chain.id}
                onClick={() => {
                    setActiveChain(chain.id);
                    setSearchQuery('');
                }}
                className={`w-full flex items-center gap-2 p-3 rounded-xl transition ${activeChain === chain.id ? 'bg-[#6320EE] text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
              >
                <img src={chain.iconUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg=='} className="w-6 h-6 rounded-full shrink-0" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==' }} />
                <span className="font-semibold text-xs text-left truncate">{chain.displayName}</span>
              </button>
            ))}
            </div>
          </div>

          {/* Main area for Tokens */}
          <div className="w-2/3 p-2 flex flex-col min-h-0">
            <div className="relative mb-3 shrink-0">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                    <Search size={16} />
                </div>
                <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#6320EE] transition-colors"
                    placeholder="Search for a token or paste address"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pb-4">
            {isSearching ? (
                <div className="flex justify-center items-center h-full">
                    <div className="w-6 h-6 border-2 border-[#6320EE] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : tokens.length > 0 ? (
                <>
                  {yourTokens.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-white/40 mb-2 px-3 uppercase tracking-wider">Your Tokens</div>
                      {yourTokens.map(token => (
                        <button
                            key={token.address}
                            onClick={() => { onSelect(activeChain, token); onClose(); }}
                            className="w-full flex items-center justify-between p-3 rounded-xl transition hover:bg-white/5"
                        >
                            <div className="flex items-center gap-3">
                              <img src={token.logo} className="w-8 h-8 rounded-full shrink-0" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==' }} />
                              <div className="text-left">
                                <div className="text-white font-bold">{token.symbol}</div>
                                {token.name && <div className="text-xs text-white/40">{token.name}</div>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-white font-medium">
                                {isLoadingBalances ? <span className="animate-pulse bg-white/20 h-4 w-12 rounded inline-block"></span> : balances[token.address]?.formatted || '0.00'}
                              </div>
                            </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] font-bold text-white/40 mb-2 mt-2 px-3 uppercase tracking-wider">All Tokens</div>
                    {allTokens.map(token => (
                      <button
                          key={token.address}
                          onClick={() => { onSelect(activeChain, token); onClose(); }}
                          className="w-full flex items-center justify-between p-3 rounded-xl transition hover:bg-white/5"
                      >
                          <div className="flex items-center gap-3">
                            <img src={token.logo} className="w-8 h-8 rounded-full shrink-0" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==' }} />
                            <div className="text-left">
                              <div className="text-white font-bold">{token.symbol}</div>
                              {token.name && <div className="text-xs text-white/40">{token.name}</div>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-white/30 font-medium">
                              0.00
                            </div>
                          </div>
                      </button>
                    ))}
                  </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/40 text-sm p-4 text-center">
                    No tokens found for this chain. Paste a valid smart contract address to import a custom token.
                </div>
            )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
