import { NextRequest, NextResponse } from 'next/server';

// supportsInternal: only ETH (1) and Polygon (137) accept the 'internal' transfer category
const CHAINS = [
  { id: 56,     name: 'BNB Chain', rpc: 'https://bnb-mainnet.g.alchemy.com/v2',      explorer: 'https://bscscan.com/tx/',             logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',                  color: '#F3BA2F', supportsInternal: false },
  { id: 1,      name: 'Ethereum',  rpc: 'https://eth-mainnet.g.alchemy.com/v2',      explorer: 'https://etherscan.io/tx/',             logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',                     color: '#627EEA', supportsInternal: true  },
  { id: 8453,   name: 'Base',      rpc: 'https://base-mainnet.g.alchemy.com/v2',     explorer: 'https://basescan.org/tx/',             logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png', color: '#0052FF', supportsInternal: false },
  { id: 42161,  name: 'Arbitrum',  rpc: 'https://arb-mainnet.g.alchemy.com/v2',      explorer: 'https://arbiscan.io/tx/',              logo: 'https://assets.coingecko.com/coins/images/16547/small/arb.jpg',                        color: '#28A0F0', supportsInternal: false },
  { id: 10,     name: 'Optimism',  rpc: 'https://opt-mainnet.g.alchemy.com/v2',      explorer: 'https://optimistic.etherscan.io/tx/', logo: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',                    color: '#FF0420', supportsInternal: false },
  { id: 137,    name: 'Polygon',   rpc: 'https://polygon-mainnet.g.alchemy.com/v2',  explorer: 'https://polygonscan.com/tx/',          logo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',                     color: '#8247E5', supportsInternal: true  },
  { id: 43114,  name: 'Avalanche', rpc: 'https://avax-mainnet.g.alchemy.com/v2',     explorer: 'https://snowtrace.io/tx/',             logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', color: '#E84142', supportsInternal: false },
];

async function fetchEvmChainHistory(chain: typeof CHAINS[0], apiKey: string, address: string): Promise<any[]> {
  const rpcUrl = `${chain.rpc}/${apiKey}`;

  const categories = chain.supportsInternal
    ? ['external', 'internal', 'erc20', 'erc721', 'erc1155', 'specialnft']
    : ['external', 'erc20', 'erc721', 'erc1155', 'specialnft'];

  const body = (id: number, direction: 'to' | 'from') => JSON.stringify({
    jsonrpc: '2.0', id,
    method: 'alchemy_getAssetTransfers',
    params: [{
      fromBlock: '0x0',
      toBlock: 'latest',
      [direction === 'to' ? 'toAddress' : 'fromAddress']: address,
      category: categories,
      maxCount: '0x14',
      order: 'desc',
      withMetadata: true,
    }],
  });

  try {
    const [inRes, outRes] = await Promise.all([
      fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(1, 'to') }),
      fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(2, 'from') }),
    ]);

    const [inData, outData] = await Promise.all([inRes.json(), outRes.json()]);

    const format = (t: any, type: 'Deposit' | 'Withdraw') => {
      const ts = t.metadata?.blockTimestamp ? new Date(t.metadata.blockTimestamp).getTime() : 0;
      return {
        type,
        amount: t.value != null ? `${parseFloat(t.value).toFixed(4)} ${t.asset || ''}`.trim() : '—',
        date: ts
          ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ', ')
          : 'Recent',
        hash: t.hash,
        timestamp: ts,
        chainId: chain.id,
        chainName: chain.name,
        chainLogo: chain.logo,
        chainColor: chain.color,
        explorerUrl: `${chain.explorer}${t.hash}`,
      };
    };

    return [
      ...(inData.result?.transfers || []).map((t: any) => format(t, 'Deposit')),
      ...(outData.result?.transfers || []).map((t: any) => format(t, 'Withdraw')),
    ];
  } catch {
    return [];
  }
}

async function fetchSolanaHistory(apiKey: string, solanaAddress: string): Promise<any[]> {
  const rpcUrl = `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`;
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getSignaturesForAddress',
        params: [solanaAddress, { limit: 20 }],
      }),
    });
    const data = await res.json();
    const sigs: any[] = data.result || [];

    return sigs.map((s: any) => {
      const ts = s.blockTime ? s.blockTime * 1000 : 0;
      return {
        type: 'Transaction',
        amount: '—',
        date: ts
          ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ', ')
          : 'Recent',
        hash: s.signature,
        timestamp: ts,
        chainId: 101,
        chainName: 'Solana',
        chainLogo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
        chainColor: '#9945FF',
        explorerUrl: `https://solscan.io/tx/${s.signature}`,
      };
    });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const solanaAddress = searchParams.get('solanaAddress');

  if (!address) {
    return NextResponse.json({ error: 'Missing address', transactions: [] }, { status: 400 });
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ALCHEMY_API_KEY not set', transactions: [] }, { status: 500 });
  }

  const evmResults = await Promise.allSettled(
    CHAINS.map(chain => fetchEvmChainHistory(chain, apiKey, address))
  );

  const solanaResults = solanaAddress
    ? await fetchSolanaHistory(apiKey, solanaAddress)
    : [];

  const transactions = [
    ...evmResults.flatMap(r => r.status === 'fulfilled' ? r.value : []),
    ...solanaResults,
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  return NextResponse.json({ transactions });
}
