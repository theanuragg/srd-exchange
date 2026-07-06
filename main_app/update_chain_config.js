const fs = require('fs');

let content = fs.readFileSync('lib/chainConfig.ts', 'utf-8');

content = content.replace("export type ChainId = number | 'solana'", "export type ChainId = number");
content = content.replace("id: 'solana'", "id: 792703809");
content = content.replace(
  "export function isEvmChain(chainId: ChainId): chainId is number {\n  return typeof chainId === 'number'\n}",
  "export function isEvmChain(chainId: ChainId): boolean {\n  return chainId !== 792703809\n}"
);
content = content.replace(
  "export function isSolana(chainId: ChainId): chainId is 'solana' {\n  return chainId === 'solana'\n}",
  "export function isSolana(chainId: ChainId): boolean {\n  return chainId === 792703809\n}"
);

fs.writeFileSync('lib/chainConfig.ts', content, 'utf-8');

let wmContent = fs.readFileSync('hooks/useWalletManager.ts', 'utf-8');
wmContent = wmContent.replaceAll("'solana'", "792703809");
fs.writeFileSync('hooks/useWalletManager.ts', wmContent, 'utf-8');

console.log("Updated chain config and wallet manager.");
