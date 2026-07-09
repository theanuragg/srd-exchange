import { Connection, PublicKey, TransactionMessage, VersionedTransaction, AddressLookupTableAccount, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { ComputeBudgetProgram } from '@solana/web3.js';

export async function relayInstructionsToBase64(
  payloadData: any,
  userAddress: string,
  rpcUrl: string
): Promise<string> {
  const connection = new Connection(rpcUrl);

  const instructions: TransactionInstruction[] = payloadData.instructions.map((ix: any) => ({
    programId: new PublicKey(ix.programId),
    keys: ix.keys.map((k: any) => ({
      pubkey: new PublicKey(k.pubkey),
      isSigner: k.isSigner,
      isWritable: k.isWritable
    })),
    data: Buffer.from(ix.data, 'hex')
  }));

  // Append Compute Budget instructions to the END of the array
  // This prevents Coinbase Wallet from automatically prepending its own Priority Fees,
  // which can shift instruction indices and break cross-chain routing contracts.
  instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }));
  instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }));


  const lookupTableAccounts: AddressLookupTableAccount[] = [];
  if (payloadData.addressLookupTableAddresses && payloadData.addressLookupTableAddresses.length > 0) {
    for (const address of payloadData.addressLookupTableAddresses) {
      const alt = await connection.getAddressLookupTable(new PublicKey(address));
      if (alt.value) {
        lookupTableAccounts.push(alt.value);
      }
    }
  }

  const { blockhash } = await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: new PublicKey(userAddress),
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTableAccounts);

  const transaction = new VersionedTransaction(messageV0);
  
  return Buffer.from(transaction.serialize()).toString('base64');
}
