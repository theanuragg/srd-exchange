import { createClient, getClient } from '@reservoir0x/relay-sdk';

async function main() {
  createClient({
    baseApiUrl: 'https://api.relay.link',
    source: 'srd-exchange'
  });

  const relayClient = getClient();
  const user = "27q8k7t3VAdZgeG679xpgmm9WD4g3EgVfNQaVgfGocPL";
  
  try {
      const quote = await relayClient.actions.getQuote({
        user: user,
        recipient: "0x646330a046c4074B83571aB7F51C43306F25cab6",
        chainId: 792703809,
        toChainId: 56,
        currency: "11111111111111111111111111111111",
        toCurrency: "0x55d398326f99059fF775485246999027B3197955",
        amount: "1000000", // 0.001 SOL
        tradeType: 'EXACT_INPUT'
      });
      console.log("Quote received!");
  } catch (e: any) {
      console.log("Error fetching quote:", e.message);
  }
}

main().catch(console.error);
