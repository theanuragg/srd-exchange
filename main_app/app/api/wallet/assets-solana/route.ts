import { NextRequest, NextResponse } from 'next/server';

const ALCHEMY_SOLANA_RPC = 'https://solana-mainnet.g.alchemy.com/v2';

const SOL_DECIMALS = 9;

async function solanaRpc(apiKey: string, method: string, params: any[]) {
  const res = await fetch(`${ALCHEMY_SOLANA_RPC}/${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || `Solana RPC error: ${method}`);
  return data.result;
}

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

  try {
    const [balanceResult, tokenResult] = await Promise.allSettled([
      solanaRpc(apiKey, 'getBalance', [address]),
      solanaRpc(apiKey, 'alchemy_getTokenBalances', [address]),
    ]);

    const nativeLamports = balanceResult.status === 'fulfilled'
      ? (balanceResult.value?.value ?? 0)
      : 0;
    const nativeBalance = nativeLamports / Math.pow(10, SOL_DECIMALS);

    const priceMap: Record<string, number> = {};
    try {
      const priceRes = await fetch('https://coins.llama.fi/prices/current/coingecko:solana', {
        next: { revalidate: 60 },
      });
      const priceData = await priceRes.json();
      if (priceData.coins?.['coingecko:solana']) {
        priceMap['native'] = priceData.coins['coingecko:solana'].price || 0;
      }
    } catch {}

    const assets: any[] = [];

    if (nativeBalance > 0) {
      const price = priceMap['native'] || 0;
      assets.push({
        contractAddress: '',
        name: 'Solana',
        symbol: 'SOL',
        decimals: SOL_DECIMALS,
        balance: nativeBalance.toString(),
        balanceUsd: (nativeBalance * price).toString(),
        thumbnail: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
        tokenPrice: price.toString(),
        chainId: 101,
        isNative: true,
      });
    }

    if (tokenResult.status === 'fulfilled') {
      const tokens = tokenResult.value?.tokens || [];
      const nonZeroTokens = tokens.filter((t: any) => {
        if (!t || !t.tokenBalance) return false;
        return t.tokenBalance !== '0';
      });

      const tokenPriceKeys = nonZeroTokens
        .map((t: any) => `solana:${t.mint}`)
        .join(',');
      if (tokenPriceKeys) {
        try {
          const tkPriceRes = await fetch(`https://coins.llama.fi/prices/current/${tokenPriceKeys}`, {
            next: { revalidate: 60 },
          });
          const tkPriceData = await tkPriceRes.json();
          const coins = tkPriceData.coins || {};
          nonZeroTokens.forEach((t: any) => {
            const key = `solana:${t.mint}`;
            if (coins[key]) priceMap[t.mint] = coins[key].price || 0;
          });
        } catch {}
      }

      const metadataResults = await Promise.allSettled(
        nonZeroTokens.map((t: any) =>
          solanaRpc(apiKey, 'alchemy_getTokenMetadata', [t.mint]).catch(() => null)
        )
      );

      nonZeroTokens.forEach((token: any, i: number) => {
        const meta = metadataResults[i]?.status === 'fulfilled' ? metadataResults[i].value : null;
        const decimals = meta?.decimals ?? token.decimals ?? 0;
        const rawBal = BigInt(token.tokenBalance);
        const balance = Number(rawBal) / Math.pow(10, decimals);
        if (balance <= 0) return;

        const price = priceMap[token.mint] || 0;
        const symbol = meta?.symbol || '?';
        const name = meta?.name || 'Unknown';

        assets.push({
          contractAddress: token.mint,
          name,
          symbol,
          decimals,
          balance: balance.toString(),
          balanceUsd: (balance * price).toString(),
          thumbnail: '',
          tokenPrice: price.toString(),
          chainId: 101,
          isNative: false,
        });
      });
    }

    assets.sort((a, b) => {
      if (a.isNative && !b.isNative) return -1;
      if (!a.isNative && b.isNative) return 1;
      return parseFloat(b.balanceUsd) - parseFloat(a.balanceUsd);
    });

    return NextResponse.json({ assets });
  } catch (error: any) {
    console.error('Solana assets error:', error?.message);
    return NextResponse.json({ error: error?.message || 'Internal error', assets: [] }, { status: 500 });
  }
}
