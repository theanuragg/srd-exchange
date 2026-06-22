"use client";

import type { Hex, Address } from "viem";

export type SignHashFn = (params: {
  hash: Hex;
  smartAccountAddress?: Address;
  chainId?: number;
}) => Promise<Hex>;

export function createSignHashWithRetry(
  signHash: SignHashFn,
  options?: { maxAttempts?: number; delayMs?: number }
): SignHashFn {
  const maxAttempts = options?.maxAttempts ?? 3;
  const delayMs = options?.delayMs ?? 1500;

  return async (params: {
    hash: Hex;
    smartAccountAddress?: Address;
    chainId?: number;
  }) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await signHash(params);
        return result;
      } catch (signErr: any) {
        const isNetworkBlocked =
          signErr.message?.includes?.("Failed to fetch") ||
          signErr.message?.includes?.("content blocker") ||
          signErr.message?.includes?.("signing service");
        const isAccountNotFound =
          signErr.message?.includes?.("EVM account not found") ||
          signErr.message?.includes?.("account not found");

        if (attempt === maxAttempts) throw signErr;
        if (isNetworkBlocked) throw signErr;
        if (!isAccountNotFound) throw signErr;

        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw new Error("Signing failed after all retries");
  };
}
