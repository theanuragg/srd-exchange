import { createPublicClient, http } from 'viem';
import { avalanche } from 'viem/chains';

async function main() {
  const client = createPublicClient({ chain: avalanche, transport: http() });
  const code = await client.getCode({ address: '0x646330a046c4074B83571aB7F51C43306F25cab6' });
  console.log("CODE IS:", code, "TYPE:", typeof code);
}
main().catch(console.error);
