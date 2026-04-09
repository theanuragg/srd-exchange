import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Missing address', assets: [] }, { status: 400 });
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ALCHEMY_API_KEY not set', assets: [] }, { status: 500 });
  }

  const RPC = `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`;

  async function rpc(id: number, method: string, params: any[]) {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'RPC error');
    return data.result;
  }

  try {
    // Fetch everything independently so one failure doesn't kill the rest
    const [balResult, splResult, tokenListRes, priceRes] = await Promise.allSettled([
      rpc(1, 'getBalance', [address]),
      rpc(2, 'getTokenAccountsByOwner', [
        address,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' },
      ]),
      fetch('https://token.jup.ag/strict', { next: { revalidate: 3600 } }),
      fetch('https://coins.llama.fi/prices/current/coingecko:solana', { next: { revalidate: 60 } }),
    ]);

    // SOL balance
    const balValue = balResult.status === 'fulfilled' ? balResult.value : null;
    const solBalance = (balValue?.value ?? 0) / 1e9;

    // SOL price
    let solPrice = 0;
    try {
      if (priceRes.status === 'fulfilled') {
        const priceData = await priceRes.value.json();
        solPrice = priceData?.coins?.['coingecko:solana']?.price ?? 0;
      }
    } catch {}

    // Jupiter token map: mint → { symbol, name, logoURI }
    const tokenMap: Record<string, { symbol: string; name: string; logoURI: string }> = {};
    try {
      if (tokenListRes.status === 'fulfilled') {
        const list: any[] = await tokenListRes.value.json();
        for (const t of list) {
          if (t.address) tokenMap[t.address] = { symbol: t.symbol, name: t.name, logoURI: t.logoURI || '' };
        }
      }
    } catch {}

    // SPL accounts
    const splValue = splResult.status === 'fulfilled' ? splResult.value : null;

    // SPL accounts
    const splAccounts: any[] = splValue?.value ?? [];

    // Collect mints with non-zero balance
    const validAccounts = splAccounts
      .map((acc: any) => {
        const info = acc.account?.data?.parsed?.info;
        if (!info) return null;
        const balance = parseFloat(info.tokenAmount?.uiAmountString || '0');
        if (balance === 0) return null;
        return { mint: info.mint as string, balance, decimals: info.tokenAmount.decimals };
      })
      .filter(Boolean) as { mint: string; balance: number; decimals: number }[];

    // Batch price lookup for all mints
    const splPriceMap: Record<string, number> = {};
    if (validAccounts.length > 0) {
      try {
        const keys = validAccounts.map(a => `solana:${a.mint}`).join(',');
        const splPriceRes = await fetch(`https://coins.llama.fi/prices/current/${keys}`, { next: { revalidate: 60 } });
        const splPriceData = await splPriceRes.json();
        const coins = splPriceData?.coins || {};
        for (const acc of validAccounts) {
          const key = `solana:${acc.mint}`;
          if (coins[key]) splPriceMap[acc.mint] = coins[key].price || 0;
        }
      } catch {}
    }

    // Build SPL asset list
    const splAssets = validAccounts.map(({ mint, balance, decimals }) => {
      const meta = tokenMap[mint];
      const price = splPriceMap[mint] || 0;
      return {
        contractAddress: mint,
        name: meta?.name || mint.slice(0, 8) + '...',
        symbol: meta?.symbol || 'SPL',
        decimals,
        balance: balance.toString(),
        balanceUsd: (balance * price).toString(),
        thumbnail: meta?.logoURI || '',
        tokenPrice: price.toString(),
        chainId: 101,
        isNative: false,
      };
    });

    const assets = [
      {
        contractAddress: '',
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
        balance: solBalance.toString(),
        balanceUsd: (solBalance * solPrice).toString(),
        thumbnail: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
        tokenPrice: String(solPrice),
        chainId: 101,
        isNative: true,
      },
      ...splAssets,
    ]
      .filter((a) => parseFloat(a.balance) > 0)
      .sort((a, b) => {
        if (a.isNative && !b.isNative) return -1;
        if (!a.isNative && b.isNative) return 1;
        return parseFloat(b.balanceUsd) - parseFloat(a.balanceUsd);
      });

    return NextResponse.json({ assets });
  } catch (error: any) {
    console.error('Solana assets error:', error?.message);
    return NextResponse.json({ error: error?.message || 'Failed to fetch Solana assets', assets: [] }, { status: 500 });
  }
}
