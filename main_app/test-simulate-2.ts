import { Connection, PublicKey, TransactionMessage, VersionedTransaction, AddressLookupTableAccount, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { createClient, getClient } from '@reservoir0x/relay-sdk';

async function main() {
  createClient({
    baseApiUrl: 'https://api.relay.link',
    source: 'srd-exchange'
  });

  const relayClient = getClient();
  const user = "27q8k7t3VAdZgeG679xpgmm9WD4g3EgVfNQaVgfGocPL";
  
  const quote = await relayClient.actions.getQuote({
    user: user,
    recipient: "0x646330a046c4074B83571aB7F51C43306F25cab6",
    chainId: 792703809,
    toChainId: 56,
    currency: "11111111111111111111111111111111",
    toCurrency: "0x55d398326f99059fF775485246999027B3197955",
    amount: "2000000",
    tradeType: 'EXACT_INPUT'
  });

  let payload = null;
  for (const step of quote.steps) {
    for (const item of step.items) {
      if (item.data && (item.data.instructions || item.data.data || item.data.transaction)) {
        payload = item.data;
        break;
      }
    }
    if (payload) break;
  }

  const rpcUrl = `https://solana-mainnet.g.alchemy.com/v2/tMv_F-SWjUGB-xx4J0hle`;
  const connection = new Connection(rpcUrl);

  const instructions: TransactionInstruction[] = payload.instructions.map((ix: any) => ({
    programId: new PublicKey(ix.programId),
    keys: ix.keys.map((k: any) => ({
      pubkey: new PublicKey(k.pubkey),
      isSigner: k.isSigner,
      isWritable: k.isWritable
    })),
    data: Buffer.from(ix.data, 'hex')
  }));

  const lookupTableAccounts: AddressLookupTableAccount[] = [];
  if (payload.addressLookupTableAddresses && payload.addressLookupTableAddresses.length > 0) {
    for (const address of payload.addressLookupTableAddresses) {
      const alt = await connection.getAddressLookupTable(new PublicKey(address));
      if (alt.value) lookupTableAccounts.push(alt.value);
    }
  }

  const { blockhash } = await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: new PublicKey(user),
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTableAccounts);

  const transaction = new VersionedTransaction(messageV0);

  const simulation = await connection.simulateTransaction(transaction);
  console.log(JSON.stringify(simulation, null, 2));
}

main().catch(console.error);
