import { encodeAbiParameters, type Address, type Hash, type Hex } from "viem";

export const RAW_ECDSA_SIGNATURE_HEX_LENGTH = 132;

const COINBASE_SIGNATURE_WRAPPER_ABI = [
  {
    type: "tuple",
    components: [
      { name: "ownerIndex", type: "uint256" },
      { name: "signatureData", type: "bytes" },
    ],
  },
] as const;

export function isRawEcdsaSignature(signature: Hex): boolean {
  return signature.length === RAW_ECDSA_SIGNATURE_HEX_LENGTH;
}

/** EIP-712 typed data envelope (for ERC-1271 / replay-safe paths only, not userOp validateUserOp). */
export function createCoinbaseSmartWalletTypedData(params: {
  hash: Hash;
  chainId: number;
  smartAccountAddress: Address;
}) {
  return {
    domain: {
      name: "Coinbase Smart Wallet",
      version: "1",
      chainId: params.chainId,
      verifyingContract: params.smartAccountAddress,
    },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      CoinbaseSmartWalletMessage: [{ name: "hash", type: "bytes32" }],
    },
    primaryType: "CoinbaseSmartWalletMessage" as const,
    message: {
      hash: params.hash,
    },
  };
}

/**
 * Wrap a raw 65-byte ECDSA signature for Coinbase Smart Wallet userOp validation.
 * validateUserOp checks ecrecover(userOpHash, signatureData) — use the raw sig bytes as signatureData.
 */
export function wrapCoinbaseSmartWalletSignature(
  signatureHex: Hex,
  ownerIndex = 0n
): Hex {
  if (!isRawEcdsaSignature(signatureHex)) {
    return signatureHex;
  }

  return encodeAbiParameters(COINBASE_SIGNATURE_WRAPPER_ABI, [
    { ownerIndex, signatureData: signatureHex },
  ]);
}
