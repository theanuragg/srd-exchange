const fetch = require('node-fetch'); // Use fetch
async function main() {
  const body = {
    user: "27q8k7t3VAdZgeG679xpgmm9WD4g3EgVfNQaVgfGocPL",
    originChainId: 792703809,
    destinationChainId: 56,
    originCurrency: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 
    destinationCurrency: "0x55d398326f99059fF775485246999027B3197955",
    amount: "10000000",
    tradeType: 'EXACT_INPUT',
    recipient: "0xe9707eC66D9E7147420567FD94da21b21F14Bc59",
    useExternalTx: true,
    txFormat: "base64",
    txVersion: 0
  };
  const res = await fetch("https://api.relay.link/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  console.log(JSON.stringify(data.steps, null, 2));
}
main().catch(console.error);
