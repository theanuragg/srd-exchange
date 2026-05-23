// Multi-chain transaction history using Alchemy (EVM) + Solana public RPC

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'demo';

const ALCHEMY_CHAINS = [
    { id: 56,     name: 'BNB Chain', rpc: `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,      explorer: 'https://bscscan.com/tx/',             logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',                                                                           color: '#F3BA2F' },
    { id: 1,      name: 'Ethereum',  rpc: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,      explorer: 'https://etherscan.io/tx/',             logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',                                                                               color: '#627EEA' },
    { id: 8453,   name: 'Base',      rpc: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,     explorer: 'https://basescan.org/tx/',             logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',                                                     color: '#0052FF' },
    { id: 42161,  name: 'Arbitrum',  rpc: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,     explorer: 'https://arbiscan.io/tx/',              logo: 'https://assets.coingecko.com/coins/images/16547/small/arb.jpg',                                                                                  color: '#28A0F0' },
    { id: 10,     name: 'Optimism',  rpc: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,     explorer: 'https://optimistic.etherscan.io/tx/',  logo: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',                                                                            color: '#FF0420' },
    { id: 137,    name: 'Polygon',   rpc: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, explorer: 'https://polygonscan.com/tx/',           logo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',                                                                               color: '#8247E5' },
    { id: 43114,  name: 'Avalanche', rpc: `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,    explorer: 'https://snowtrace.io/tx/',             logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',                                                      color: '#E84142' },
];

async function fetchEvmChainHistory(
    chain: typeof ALCHEMY_CHAINS[0],
    userAddress: string
): Promise<any[]> {
    try {
        const body = (id: number, direction: 'to' | 'from') => JSON.stringify({
            jsonrpc: '2.0', id,
            method: 'alchemy_getAssetTransfers',
            params: [{
                fromBlock: '0x0',
                toBlock: 'latest',
                [direction === 'to' ? 'toAddress' : 'fromAddress']: userAddress,
                category: ['external', 'internal', 'erc20', 'erc721', 'erc1155', 'specialnft'],
                maxCount: '0x14',
                order: 'desc',
                withMetadata: true,
            }]
        });

        const [inRes, outRes] = await Promise.all([
            fetch(chain.rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(1, 'to') }),
            fetch(chain.rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(2, 'from') }),
        ]);

        const inData = await inRes.json();
        const outData = await outRes.json();

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

async function fetchSolanaHistory(solanaAddress: string): Promise<any[]> {
    try {
        const sigRes = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0', id: 1,
                method: 'getSignaturesForAddress',
                params: [solanaAddress, { limit: 20 }],
            }),
        });
        const sigData = await sigRes.json();
        const sigs: any[] = sigData.result || [];

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

export async function fetchTransactionHistoryAlchemy(
    userAddress: string,
    solanaAddress?: string | null
): Promise<any[]> {
    const evmResults = await Promise.allSettled(
        ALCHEMY_CHAINS.map(chain => fetchEvmChainHistory(chain, userAddress))
    );

    const solanaResults = solanaAddress
        ? await fetchSolanaHistory(solanaAddress)
        : [];

    const all = [
        ...evmResults.flatMap(r => r.status === 'fulfilled' ? r.value : []),
        ...solanaResults,
    ]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);

    return all;
}
