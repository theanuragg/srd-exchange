import { Connection, PublicKey, TransactionMessage, VersionedTransaction, AddressLookupTableAccount, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';

const payloadData = {
  "instructions": [
    {
      "keys": [
        {
          "pubkey": "Dodg2HifwU8rmaVVyMyUZDGTRbqAJTyVYxXPwcbNpBKc",
          "isSigner": false,
          "isWritable": false
        },
        {
          "pubkey": "27q8k7t3VAdZgeG679xpgmm9WD4g3EgVfNQaVgfGocPL",
          "isSigner": true,
          "isWritable": true
        },
        {
          "pubkey": "27q8k7t3VAdZgeG679xpgmm9WD4g3EgVfNQaVgfGocPL",
          "isSigner": false,
          "isWritable": false
        },
        {
          "pubkey": "7uTT8Xi5RWXzy7h9XL244GRgEycDYDhLjr3ZyNdXi8pZ",
          "isSigner": false,
          "isWritable": true
        },
        {
          "pubkey": "11111111111111111111111111111111",
          "isSigner": false,
          "isWritable": false
        }
      ],
      "programId": "99vQwtBwYtrqqD9YSXbdum3KBdxPAVxYTaQ3cfnJSrN2",
      "data": "0d9e0ddf5fd51c06809698000000000014dde76fee19fe608e718acf1c9d29bdcf3caa142b82f2df800530cae1572cd7"
    }
  ],
  "addressLookupTableAddresses": [
    "Hm9fUgcn7qwDaiNTFiGh6pNtVATgnaRcmK6Bbx6EMZfP"
  ]
};

async function main() {
  const rpcUrl = `https://solana-mainnet.g.alchemy.com/v2/tMv_F-SWjUGB-xx4J0hle`; // user's key from .env
  const connection = new Connection(rpcUrl);

  const instructions = payloadData.instructions.map((ix: any) => ({
    programId: new PublicKey(ix.programId),
    keys: ix.keys.map((k: any) => ({
      pubkey: new PublicKey(k.pubkey),
      isSigner: k.isSigner,
      isWritable: k.isWritable
    })),
    data: Buffer.from(ix.data, 'hex')
  }));

  const lookupTableAccounts: AddressLookupTableAccount[] = [];
  if (payloadData.addressLookupTableAddresses) {
    for (const address of payloadData.addressLookupTableAddresses) {
      const alt = await connection.getAddressLookupTable(new PublicKey(address));
      if (alt.value) {
        lookupTableAccounts.push(alt.value);
      }
    }
  }

  const { blockhash } = await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: new PublicKey("27q8k7t3VAdZgeG679xpgmm9WD4g3EgVfNQaVgfGocPL"),
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTableAccounts);

  const transaction = new VersionedTransaction(messageV0);
  
  const b64 = Buffer.from(transaction.serialize()).toString('base64');
  console.log("BASE64 TX:", b64);
}

main().catch(console.error);
