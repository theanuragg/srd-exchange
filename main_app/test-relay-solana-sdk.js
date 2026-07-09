const { getClient, createClient } = require('@reservoir0x/relay-sdk');
const util = require('util');

createClient({
  baseApiUrl: 'https://api.relay.link',
  source: 'srd-exchange'
});

async function main() {
  const relayClient = getClient();
  const quote = await relayClient.actions.getQuote({
    user: '27q8k7t3VAdZgeG679xpgmm9WD4g3EgVfNQaVgfGocPL', 
    recipient: '0xe039691408Fa4d6961038AC2a3FcA2115F3916Bb', 
    chainId: 792703809, 
    toChainId: 56, 
    currency: '11111111111111111111111111111111', 
    toCurrency: '0x55d398326f99059fF775485246999027B3197955', 
    amount: '50000000', 
    tradeType: 'EXACT_INPUT'
  });
  console.log(util.inspect(quote.steps, { depth: null, colors: true }));
}
main().catch(console.error);
