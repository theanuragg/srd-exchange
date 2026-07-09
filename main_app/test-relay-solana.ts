import { fetch } from 'cross-fetch';

async function main() {
    const url = 'https://api.relay.link/quote';
    const payload = {
        user: "27q8k7t3VAdZgeG679xpgmm9WD4g3EgVfNQaVgfGocPL", // user's solana address
        originChainId: "792703809",
        destinationChainId: "56", // BNB
        originCurrency: "11111111111111111111111111111111", // SOL
        destinationCurrency: "0x55d398326f99059fF775485246999027B3197955", // USDT on BNB
        amount: "1000000000", // 1 SOL (10^9 lamports)
        recipient: "0x646330a046c4074B83571aB7F51C43306F25cab6", // user's smart wallet on BNB
        tradeType: 'EXACT_INPUT'
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
