const { Connection, PublicKey, TransactionMessage, VersionedTransaction, TransactionInstruction } = require('@solana/web3.js');
const fetch = require('node-fetch');

async function main() {
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  
  const body = {
    user: "27q8k7t3VAdZgeG679xpgmm9WD4g3EgVfNQaVgfGocPL",
    originChainId: 792703809,
    destinationChainId: 56,
    originCurrency: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 
    destinationCurrency: "0x55d398326f99059fF775485246999027B3197955",
    amount: "10000000",
    tradeType: 'EXACT_INPUT',
    recipient: "0xe9707eC66D9E7147420567FD94da21b21F14Bc59",
    useExternalTx: true
  };
  const res = await fetch("https://api.relay.link/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const quote = await res.json();
  const payload = quote.steps[0].items[0].data;
  
  if (payload.instructions) {
    const instructions = payload.instructions.map(ix => {
      return new TransactionInstruction({
        programId: new PublicKey(ix.programId),
        keys: ix.keys.map(k => ({
          pubkey: new PublicKey(k.pubkey),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        data: Buffer.from(ix.data, 'hex')
      });
    });

    // Lookup tables
    const addressLookupTableAccounts = [];
    if (payload.addressLookupTableAddresses) {
      for (const address of payload.addressLookupTableAddresses) {
        const lutAccount = await connection.getAddressLookupTable(new PublicKey(address));
        if (lutAccount.value) {
          addressLookupTableAccounts.push(lutAccount.value);
        }
      }
    }

    const { blockhash } = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey("27q8k7t3VAdZgeG679xpgmm9WD4g3EgVfNQaVgfGocPL"),
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message(addressLookupTableAccounts);
    
    const tx = new VersionedTransaction(messageV0);
    const base64Tx = Buffer.from(tx.serialize()).toString('base64');
    console.log("Built Base64 TX:", base64Tx.substring(0, 50) + "...");
  }
}
main().catch(console.error);
