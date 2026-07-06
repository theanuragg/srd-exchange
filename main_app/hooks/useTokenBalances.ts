import { useState, useEffect } from 'react';
import { createPublicClient, http, Address, formatUnits } from 'viem';
import { Token } from '@/components/DynamicTokenModal';

const ERC20_ABI = [{
  constant: true,
  inputs: [{ name: "_owner", type: "address" }],
  name: "balanceOf",
  outputs: [{ name: "balance", type: "uint256" }],
  type: "function"
}] as const;

export interface TokenWithBalance extends Token {
  balanceRaw: bigint;
  balanceFormatted: string;
}

export function useTokenBalances(
  chainId: number,
  tokens: Token[],
  rpcUrl?: string,
  evmAddress?: string,
  solanaAddress?: string
) {
  const [balances, setBalances] = useState<Record<string, { raw: bigint, formatted: string }>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchBalances() {
      if (!tokens.length) return;
      if (chainId !== 792703809 && !evmAddress) return;
      if (chainId === 792703809 && !solanaAddress) return;

      setIsLoading(true);

      try {
        const newBalances: Record<string, { raw: bigint, formatted: string }> = {};

        if (chainId === 792703809) {
          // Solana Logic
          if (!rpcUrl) throw new Error("No RPC URL for Solana");
          
          // 1. Fetch Native SOL
          const nativeRes = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 1, method: 'getBalance', params: [solanaAddress]
            })
          });
          const nativeData = await nativeRes.json();
          const nativeLamports = BigInt(nativeData.result?.value || 0);
          const nativeToken = tokens.find(t => (t.address as string) === '11111111111111111111111111111111');
          if (nativeToken) {
            newBalances[nativeToken.address] = {
              raw: nativeLamports,
              formatted: formatUnits(nativeLamports, nativeToken.decimals)
            };
          }

          // 2. Fetch SPL Tokens
          const splRes = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
              params: [solanaAddress, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }]
            })
          });
          const splData = await splRes.json();
          const tokenAccounts = splData.result?.value || [];
          
          const splMap: Record<string, bigint> = {};
          for (const account of tokenAccounts) {
            const parsedInfo = account.account?.data?.parsed?.info;
            if (parsedInfo) {
              const mint = parsedInfo.mint;
              const amount = BigInt(parsedInfo.tokenAmount?.amount || "0");
              splMap[mint] = amount;
            }
          }

          for (const token of tokens) {
            if ((token.address as string) !== '11111111111111111111111111111111') {
              const amount = splMap[token.address] || 0n;
              newBalances[token.address] = {
                raw: amount,
                formatted: formatUnits(amount, token.decimals)
              };
            }
          }

        } else {
          // EVM Logic
          if (!rpcUrl) throw new Error("No RPC URL for EVM");
          const client = createPublicClient({ transport: http(rpcUrl) });
          
          const calls = tokens.map(token => {
            if (token.address === '0x0000000000000000000000000000000000000000') {
               // We will fetch native separately or use Multicall getEthBalance
               // Using multicall wrapper for native balance might be complex without specific abi here
               return null; 
            }
            return {
              address: token.address as Address,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [evmAddress as Address]
            };
          }).filter(Boolean);

          const [results, nativeBalance] = await Promise.all([
            calls.length > 0 ? client.multicall({ 
              contracts: calls as any,
              multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11'
            }) : Promise.resolve([]),
            client.getBalance({ address: evmAddress as Address })
          ]);

          let callIndex = 0;
          for (const token of tokens) {
            if (token.address === '0x0000000000000000000000000000000000000000') {
              newBalances[token.address] = {
                raw: nativeBalance,
                formatted: formatUnits(nativeBalance, token.decimals)
              };
            } else {
              const res = results[callIndex++];
              const amount = res?.status === 'success' ? (res.result as bigint) : 0n;
              newBalances[token.address] = {
                raw: amount,
                formatted: formatUnits(amount, token.decimals)
              };
            }
          }
        }

        if (isMounted) {
          setBalances(newBalances);
        }
      } catch (err) {
        console.error("Error fetching balances:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchBalances();

    return () => { isMounted = false; };
  }, [chainId, tokens, rpcUrl, evmAddress, solanaAddress]);

  return { balances, isLoading };
}
