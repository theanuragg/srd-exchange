import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

// Alchemy RPC URL per chain
const ALCHEMY_RPC: Record<number, string> = {
  1:      'https://eth-mainnet.g.alchemy.com/v2',
  56:     'https://bnb-mainnet.g.alchemy.com/v2',
  8453:   'https://base-mainnet.g.alchemy.com/v2',
  42161:  'https://arb-mainnet.g.alchemy.com/v2',
  10:     'https://opt-mainnet.g.alchemy.com/v2',
  137:    'https://polygon-mainnet.g.alchemy.com/v2',
  43114:  'https://avax-mainnet.g.alchemy.com/v2',
  534352: 'https://scroll-mainnet.g.alchemy.com/v2',
  25:     'https://cronos-mainnet.g.alchemy.com/v2',
};

// DeFiLlama chain name per chain ID (for price lookups)
const LLAMA_CHAIN: Record<number, string> = {
  1: 'ethereum', 56: 'bsc', 8453: 'base', 42161: 'arbitrum',
  10: 'optimism', 137: 'polygon', 43114: 'avax', 534352: 'scroll', 25: 'cronos',
};

// CoinGecko ID for native token prices via DeFiLlama
const NATIVE_COINGECKO: Record<number, string> = {
  1: 'ethereum', 56: 'binancecoin', 8453: 'ethereum', 42161: 'ethereum',
  10: 'ethereum', 137: 'matic-network', 43114: 'avalanche-2', 534352: 'ethereum', 25: 'crypto-com-chain',
};

// Native token info per chain
const NATIVE: Record<number, { symbol: string; name: string; decimals: number; logo: string }> = {
  1:      { symbol: 'ETH',  name: 'Ethereum',  decimals: 18, logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  56:     { symbol: 'BNB',  name: 'BNB',       decimals: 18, logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
  8453:   { symbol: 'ETH',  name: 'Ethereum',  decimals: 18, logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  42161:  { symbol: 'ETH',  name: 'Ethereum',  decimals: 18, logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  10:     { symbol: 'ETH',  name: 'Ethereum',  decimals: 18, logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  137:    { symbol: 'POL',  name: 'Polygon',   decimals: 18, logo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png' },
  43114:  { symbol: 'AVAX', name: 'Avalanche', decimals: 18, logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
  534352: { symbol: 'ETH',  name: 'Ethereum',  decimals: 18, logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  25:     { symbol: 'CRO',  name: 'Cronos',    decimals: 18, logo: 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png' },
};

// TrustWallet blockchain names for logo fallback
const TW_CHAIN: Record<number, string> = {
  1: 'ethereum', 56: 'smartchain', 8453: 'base', 42161: 'arbitrum',
  10: 'optimism', 137: 'polygon', 43114: 'avalanchec', 534352: 'scroll', 25: 'cronos',
};

async function rpc(url: string, method: string, params: any[]) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'RPC error');
  return data.result;
}

// ERC-20 ABI encoded calls for symbol() and name() as fallback
const SIG_SYMBOL = '0x95d89b41'; // keccak256("symbol()")
const SIG_NAME   = '0x06fdde03'; // keccak256("name()")

function decodeString(hex: string): string {
  try {
    if (!hex || hex === '0x') return '';
    const buf = hex.slice(2);
    if (buf.length === 0) return '';

    // Try dynamic string ABI encoding first: offset(32) + length(32) + data
    const firstWord = parseInt(buf.slice(0, 64), 16);
    if (firstWord === 32) {
      // Standard dynamic string
      const len = parseInt(buf.slice(64, 128), 16);
      const strHex = buf.slice(128, 128 + len * 2);
      const decoded = Buffer.from(strHex, 'hex').toString('utf8').replace(/\0/g, '').trim();
      if (decoded) return decoded;
    }

    // Fallback: bytes32 encoding (many older/non-standard tokens use this)
    // The entire 32 bytes is the string, right-padded with null bytes
    const bytes32 = Buffer.from(buf.slice(0, 64), 'hex').toString('utf8').replace(/\0/g, '').trim();
    if (bytes32) return bytes32;

    return '';
  } catch { return ''; }
}

async function fetchTokenInfoOnChain(rpcUrl: string, contractAddress: string): Promise<{ symbol: string; name: string }> {
  try {
    const [symRes, nameRes] = await Promise.all([
      fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: contractAddress, data: SIG_SYMBOL }, 'latest'] }) }),
      fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_call', params: [{ to: contractAddress, data: SIG_NAME }, 'latest'] }) }),
    ]);
    const [symData, nameData] = await Promise.all([symRes.json(), nameRes.json()]);
    const symbol = decodeString(symData.result || '');
    const name   = decodeString(nameData.result || '');
    return {
      symbol: symbol || '?',
      name:   name   || symbol || 'Unknown',
    };
  } catch { return { symbol: '?', name: 'Unknown' }; }
}

// Multi-source logo lookup for tokens not in Alchemy or TrustWallet
async function fetchTokenLogo(chainId: number, contractAddress: string, twChain: string): Promise<string> {
  let checksumAddr = contractAddress;
  try { checksumAddr = getAddress(contractAddress); } catch {}

  // Sources to try in order
  const sources = [
    twChain ? `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${twChain}/assets/${checksumAddr}/logo.png` : null,
    `https://tokens.1inch.io/${contractAddress.toLowerCase()}.png`,
    `https://raw.githubusercontent.com/SmolDapp/tokenAssets/main/tokens/${chainId}/${contractAddress.toLowerCase()}/logo.png`,
  ].filter(Boolean) as string[];

  for (const url of sources) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return url;
    } catch {}
  }
  return '';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const chainId = parseInt(searchParams.get('chainId') || '0');

  if (!address || !chainId) {
    return NextResponse.json({ error: 'Missing address or chainId', assets: [] }, { status: 400 });
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ALCHEMY_API_KEY not set', assets: [] }, { status: 500 });
  }

  const rpcBase = ALCHEMY_RPC[chainId];
  if (!rpcBase) {
    return NextResponse.json({ error: 'Unsupported chain', assets: [] }, { status: 400 });
  }

  const rpcUrl = `${rpcBase}/${apiKey}`;
  const llamaChain = LLAMA_CHAIN[chainId];
  const native = NATIVE[chainId];

  try {
    // 1. Native balance + all ERC-20 balances (we filter spam ourselves below)
    const [nativeHex, tokenRes] = await Promise.all([
      rpc(rpcUrl, 'eth_getBalance', [address, 'latest']),
      rpc(rpcUrl, 'alchemy_getTokenBalances', [address, 'erc20']),
    ]);

    const nativeWei = BigInt(nativeHex || '0x0');
    const nativeBalance = Number(nativeWei) / 1e18;

    // Filter tokens with non-zero balance
    const nonZeroTokens: { contractAddress: string; tokenBalance: string }[] =
      (tokenRes?.tokenBalances || []).filter(
        (t: any) => t.tokenBalance && t.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
      );

    // 2. Batch fetch metadata for all tokens
    let metadataMap: Record<string, any> = {};
    if (nonZeroTokens.length > 0) {
      const metaResults = await Promise.allSettled(
        nonZeroTokens.map(t => rpc(rpcUrl, 'alchemy_getTokenMetadata', [t.contractAddress]))
      );
      nonZeroTokens.forEach((t, i) => {
        const r = metaResults[i];
        if (r.status === 'fulfilled') metadataMap[t.contractAddress.toLowerCase()] = r.value;
      });
    }

    // Spam detection — catches scam airdrops while allowing real altcoins/memecoins
    const URL_PATTERN = /https?:\/\/|t\.me\/|telegram|discord\.gg|\.(com|io|net|xyz|org|gg|app|finance|swap|claim)\b/i;
    const SCAM_WORDS = /\b(visit|claim|airdrop|reward|bonus|free|winner|promo|voucher)\b/i;

    function isSpam(meta: any): boolean {
      if (!meta) return false;
      // 1. Alchemy's own spam flag
      if (meta.possiblySpam === true) return true;
      const name: string = meta.name || '';
      const symbol: string = meta.symbol || '';
      // 2. Name/symbol contains URLs or social links (classic airdrop scam)
      if (URL_PATTERN.test(name) || URL_PATTERN.test(symbol)) return true;
      // 3. Name contains scam action words
      if (SCAM_WORDS.test(name)) return true;
      // 4. Abnormally long symbol (legitimate tokens are ≤ ~10 chars)
      if (symbol.length > 15) return true;
      return false;
    }

    // 3. Batch price lookup via DeFiLlama
    const priceMap: Record<string, number> = {};
    const nativeCgId = NATIVE_COINGECKO[chainId];

    try {
      const tokenKeys = nonZeroTokens.map(t => `${llamaChain}:${t.contractAddress}`);
      const nativeKey = `coingecko:${nativeCgId}`;
      const allKeys = [nativeKey, ...tokenKeys].join(',');

      const priceRes = await fetch(`https://coins.llama.fi/prices/current/${allKeys}`, {
        next: { revalidate: 60 },
      });
      const priceData = await priceRes.json();
      const coins = priceData.coins || {};

      // Native price
      if (coins[nativeKey]) priceMap['native'] = coins[nativeKey].price || 0;

      // Token prices
      tokenKeys.forEach((key, i) => {
        if (coins[key]) priceMap[nonZeroTokens[i].contractAddress.toLowerCase()] = coins[key].price || 0;
      });
    } catch {
      // Prices optional — continue without them
    }

    // 4. Build assets array
    const assets: any[] = [];

    // Native token
    if (nativeBalance > 0) {
      const price = priceMap['native'] || 0;
      assets.push({
        contractAddress: '',
        name: native.name,
        symbol: native.symbol,
        decimals: native.decimals,
        balance: nativeBalance.toString(),
        balanceUsd: (nativeBalance * price).toString(),
        thumbnail: native.logo,
        tokenPrice: price.toString(),
        chainId,
        isNative: true,
      });
    }

    // ERC-20 tokens — fetch on-chain info in parallel for tokens with missing metadata
    const tokensMissingMeta = nonZeroTokens.filter(t => {
      const meta = metadataMap[t.contractAddress.toLowerCase()];
      return !meta || !meta.symbol || meta.symbol === '?' || !meta.name;
    });
    if (tokensMissingMeta.length > 0) {
      const onChainResults = await Promise.allSettled(
        tokensMissingMeta.map(t => fetchTokenInfoOnChain(rpcUrl, t.contractAddress))
      );
      tokensMissingMeta.forEach((t, i) => {
        const r = onChainResults[i];
        if (r.status === 'fulfilled') {
          const addr = t.contractAddress.toLowerCase();
          metadataMap[addr] = { ...metadataMap[addr], ...r.value };
        }
      });
    }

    // Fetch logos for tokens missing them (parallel, best-effort)
    const tokensMissingLogo = nonZeroTokens.filter(t => !metadataMap[t.contractAddress.toLowerCase()]?.logo);
    const logoResults = await Promise.allSettled(
      tokensMissingLogo.map(t => fetchTokenLogo(chainId, t.contractAddress, TW_CHAIN[chainId] || ''))
    );
    tokensMissingLogo.forEach((t, i) => {
      const r = logoResults[i];
      const addr = t.contractAddress.toLowerCase();
      if (r.status === 'fulfilled' && r.value) {
        metadataMap[addr] = { ...metadataMap[addr], logo: r.value };
      }
    });

    // ERC-20 tokens
    for (const token of nonZeroTokens) {
      const addr = token.contractAddress.toLowerCase();
      if (isSpam(metadataMap[addr])) continue;
      const meta = metadataMap[addr] || {};
      const decimals = meta.decimals ?? 18;
      const rawBal = parseInt(token.tokenBalance, 16);
      const balance = rawBal / Math.pow(10, decimals);
      if (balance <= 0) continue;

      const price = priceMap[addr] || 0;
      const logo = meta.logo || '';

      assets.push({
        contractAddress: token.contractAddress,
        name: meta.name || 'Unknown',
        symbol: meta.symbol || '?',
        decimals,
        balance: balance.toString(),
        balanceUsd: (balance * price).toString(),
        thumbnail: logo,
        tokenPrice: price.toString(),
        chainId,
        isNative: false,
      });
    }

    // Sort: native first, then by USD value
    assets.sort((a, b) => {
      if (a.isNative && !b.isNative) return -1;
      if (!a.isNative && b.isNative) return 1;
      return parseFloat(b.balanceUsd) - parseFloat(a.balanceUsd);
    });

    return NextResponse.json({ assets });
  } catch (error: any) {
    console.error(`Alchemy assets error [chainId=${chainId}]:`, error?.message);
    return NextResponse.json({ error: error?.message || 'Internal error', assets: [] }, { status: 500 });
  }
}
