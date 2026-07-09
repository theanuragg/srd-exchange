async function main() {
  const url = 'https://api.relay.link/quote';
  const body = {
    user: '27q8k7t3VAdZgeG679xpgmm9WD4g3EgVfNQaVgfGocPL',
    recipient: '0xe039691408Fa4d6961038AC2a3FcA2115F3916Bb',
    originChainId: 792703809,
    destinationChainId: 56,
    originCurrency: '11111111111111111111111111111111',
    destinationCurrency: '0x55d398326f99059fF775485246999027B3197955',
    amount: '50000000', // 0.05 SOL
    tradeType: 'EXACT_INPUT'
  };
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
