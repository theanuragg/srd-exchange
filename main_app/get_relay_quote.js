const { createClient, getClient } = require('@reservoir0x/relay-sdk');
createClient({
  baseApiUrl: 'https://api.relay.link',
  source: 'srd-exchange',
});
async function main() {
  const relayClient = getClient();
  const quote = await relayClient.actions.getQuote({
    user: 'F7p3dFrjRTbtRp8FRF6qHLomXbKRBzpvBLjtQcfcgmNe',
    recipient: '0x1234567890123456789012345678901234567890',
    chainId: 792703809,
    toChainId: 56,
    currency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
    toCurrency: '0x55d398326f99059fF775485246999027B3197955', // USDT on BSC
    amount: '1000000', // 1 USDC (6 decimals)
    tradeType: 'EXACT_INPUT',
  });
  console.log(JSON.stringify(quote.steps[0].items[0].data, null, 2));
}
main().catch(console.error);
