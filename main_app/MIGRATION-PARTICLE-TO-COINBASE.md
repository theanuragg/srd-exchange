# Migration: Remove Particle Network → Coinbase CDP Embedded Wallets + Keep Alchemy Paymaster

## Project Overview

**SRD Exchange** — P2P USDT trading platform, Next.js 16, BSC mainnet. Currently uses **Particle Network** for auth + wallet + smart account (ERC-4337 via Biconomy). **Target**: Coinbase CDP Embedded Wallets (`@coinbase/cdp-core`, `@coinbase/cdp-react`, `@coinbase/cdp-hooks`) for auth + wallet creation (email/SMS/social login, same UX as Particle), CDP Smart Accounts for ERC-4337, and Alchemy paymaster for gas sponsorship. **No external wallets** (no MetaMask, no WalletConnect).

---

## 1. Dependencies

### Remove (7 packages)
```
@particle-network/auth-core
@particle-network/auth-core-modal
@particle-network/connectkit
@particle-network/provider
@particle-network/wallet
@solana/spl-token
@solana/web3.js
```

### Add (3 packages)
```
@coinbase/cdp-core
@coinbase/cdp-react
@coinbase/cdp-hooks
```

### Keep
```
viem          — still used (CDP's toViemAccount + direct viem reads)
wagmi         — optional, can simplify to just viem. Remove all connectors.
@tanstack/react-query  — still needed
```

---

## 2. Architecture Comparison

| Layer | Current (Particle) | New (CDP Embedded Wallets) |
|-------|-------------------|---------------------------|
| Auth | Particle email/social login | CDP email/SMS/social login (CDP Portal config) |
| Wallet | Particle Network creates wallet | CDP creates embedded Smart Account on login |
| Smart Account | Biconomy AA via Particle `aa` plugin | CDP's ERC-4337 Smart Account (`createOnLogin: "smart"`) |
| UserOp construction | Particle's `useSmartAccount().buildUserOperation()` | CDP's `sendUserOperation({ calls, paymasterUrl })` |
| Gas sponsorship | Alchemy Gas Manager via proxy endpoint | **Same** Alchemy Gas Manager via `paymasterUrl` pointing to our proxy |
| Bundler | Custom bundler endpoint (Alchemy/Biconomy) | CDP's bundler (handled internally by SDK) |
| Receipt polling | `/api/user-operations/receipt` custom endpoint | CDP's `waitForUserOperation()` |
| Solana | `particleAuth.solana.*` + `@solana/*` | **Removed** |
| External wallets | Pre-configured wagmi connectors | **Removed** — CDP is the only wallet |
| Signing | Particle + Biconomy key management | CDP key management (wrapped via `toViemAccount`) |

### How Alchemy Paymaster Still Works

CDP Smart Accounts support **any ERC-7677-compatible paymaster** via the `paymasterUrl` parameter. Since CDP Paymaster only supports Base (not BSC), we use Alchemy's Gas Manager as a third-party paymaster — exactly what you want.

**Flow with CDP:**
```
1. User signs in → CDP creates Smart Account (ERC-4337)
2. App calls CDP's sendUserOperation({ calls, paymasterUrl: "/api/user-operations/sponsor" })
3. CDP SDK builds UserOp → sends to paymasterUrl for sponsorship
4. Our proxy endpoint calls Alchemy Gas Manager (alchemy_requestGasAndPaymasterAndData)
5. Alchemy returns paymaster fields → our endpoint returns to CDP
6. CDP SDK signs UserOp → sends to CDP's bundler → UserOp executed on-chain
```

The `/api/user-operations/sponsor` endpoint stays — it receives UserOps from CDP and proxies to Alchemy's Gas Manager. Same Alchemy key, same policy ID, same server library (`lib/server/alchemyPaymaster.ts`). Only the request/response format may need minor adaptation for CDP (ERC-7677 vs current custom format).

CDP handles everything after paymaster sponsorship: signing, bundling, confirmation, and receipt polling.

---

## 3. Files to Modify — Complete Inventory

### Layer 1: Config & Providers

| # | File | Change | Est. |
|---|------|--------|------|
| 1 | `lib/connectkit.tsx` | **DELETE entire file** (184 lines). All Particle config, Biconomy AA plugin, wallet connectors, chain configs. | 0.5h |
| 2 | `lib/particlePolyfills.ts` | **DELETE** (41 lines). Polyfills only needed for Particle. | 0.1h |
| 3 | `components/providers.tsx` | **REWRITE** (110 lines). Replace `<ParticleConnectkit>` with `<CDPReactProvider>`. Remove Solana address logic (lines 43-74). Remove `useAccount` from Particle, replace with CDP hooks. Remove `particleAuth.solana.connect()` / `particleAuth.solana.publicKey()` calls. Keep `<QueryClientProvider>`, `<SidebarProvider>`, `<FontProvider>`. | 1.5h |
| 4 | `components/ClientProviders.tsx` | **MINOR UPDATE** (12 lines). Dynamic import keeps pointing to providers.tsx — no change needed unless import path changes. | 0h |
| 5 | `lib/wagmi.ts` | **SIMPLIFY** (75 lines). Remove all connectors (injected, coinbaseWallet, walletConnect). Either delete entire file (use viem directly for reads) or keep minimal config with only transport for read operations. | 0.5h |

### Layer 2: Core Business Logic

| # | File | Change | Est. |
|---|------|--------|------|
| 6 | `hooks/useWalletManager.ts` | **REWRITE** (1175 lines). Replace all 6 Particle hooks: | 5-8h |
| | | `useAccount` → CDP's `useCurrentUser` / `toViemAccount` | |
| | | `useSwitchChain` → CDP chain switching | |
| | | `usePublicClient` → viem `createPublicClient` or CDP account | |
| | | `useWallets` → **removed** (no external wallets) | |
| | | `useSmartAccount` → `currentUser.evmSmartAccounts[0]` | |
| | | `useAddress` → **removed** (use smartAccount.address directly) | |
| | | `bsc` from Particle chains → `bsc` from `viem/chains` | |
| | | `sendSponsoredContractWrite` → CDP's `useSendUserOperation` with `paymasterUrl` | |
| | | `smartAccount.getAccount()` / resolvedSmartWalletAddress → use CDP Smart Account directly | |
| | | Remove `@solana/*` code references, remove `particleAuth.solana.*` pattern throughout | |
| 7 | `hooks/useUserOrders.ts` | **UPDATE** (58 lines). `useAccount` from Particle → CDP's `useCurrentUser` or equivalent. | 0.5h |

### Layer 3: Components

| # | File | Change | Est. |
|---|------|--------|------|
| 8 | `components/RightSidebar.tsx` | **REWRITE** (1271 lines, 2nd largest). Replace all Particle hooks: | 4-6h |
| | | `useDisconnect` → CDP logout | |
| | | `useSwitchChain` → CDP chain switching | |
| | | `useWallets` → **removed** | |
| | | `useSmartAccount` → CDP Smart Account | |
| | | `useAccount` → CDP user data | |
| | | `useAddress` → **removed** (use smartAccount address) | |
| | | All `particleAuth.solana.signAndSendTransaction` / Solana token sending → **removed** | |
| | | Wallet copy/export → CDP's `CopyAddress` / `ExportWallet` components | |
| 9 | `components/navbar.tsx` | **UPDATE** (403 lines). Replace Particle auth hooks with CDP. Use CDP's `AuthButton` component or custom CDP auth hooks. | 1-2h |
| 10 | `components/landingPage.tsx` | **UPDATE**. Replace Particle `setOpen(true)` with CDP's sign-in trigger. | 0.5h |
| 11 | `components/WalletConnect.tsx` | **REWRITE** (30 lines). Replace with CDP's `AuthButton` or `SignInModal`. | 0.5h |
| 12 | `components/SignInModal.tsx` | **REWRITE** (73 lines). Replace Particle modal trigger with CDP's `SignInModal`. | 1h |
| 13 | `components/auth/WalletConnectModal.tsx` | **REWRITE** (654 lines). Remove all external wallet selection UI (MetaMask, Coinbase extension, WalletConnect buttons). Replace with CDP's built-in sign-in modal or custom CDP auth flow. The "popular wallets" list is no longer needed since CDP handles auth internally. | 2-3h |
| 14 | `components/auth/AuthGuard.tsx` | **UPDATE** (107 lines). `useAccount` from Particle → CDP `useCurrentUser`. Check CDP auth status instead. | 1h |
| 15 | `components/buysellSection.tsx` | **UPDATE**. Remove `useSmartAccount` from Particle. Replace chain imports. | 0.5h |
| 16 | `components/orders.tsx` | **UPDATE**. `useAccount` from Particle → CDP. | 0.5h |
| 17 | `components/wallet/WalletDashboard.tsx` | **UPDATE**. Particle auth hooks → CDP hooks. | 1h |
| 18 | `components/admin_center.tsx` | **UPDATE**. Particle public client → viem/CDP. | 0.5h |

### Layer 4: Pages

| # | File | Change | Est. |
|---|------|--------|------|
| 19 | `app/(main)/fiat/page.tsx` | **UPDATE** (86 lines). `useDisconnect` from Particle → CDP. | 0.5h |
| 20 | `app/(main)/wallet-check/page.tsx` | **REWRITE**. Remove `useSmartAccount`, `useAccount`, all `particleAuth.solana.*` code. | 1h |

### Layer 5: API / Server (Major Reduction)

| # | File | Change | Est. |
|---|------|--------|------|
| 21 | `lib/userOperation.ts` | **DELETE** (64 lines). CDP handles UserOp types internally. | 0.1h |
| 22 | `lib/server/sendUserOp.ts` | **DELETE** (503 lines). All bundler logic (verifyUserOpHash, sendUserOpToBundler, waitForUserOpReceipt, Nexus normalization, signature verification) is handled by CDP's SDK. No longer needed. | 0.1h |
| 23 | `lib/server/alchemyPaymaster.ts` | **KEEP** (167 lines). Same Alchemy Gas Manager integration. May need minor format adaptation for CDP's paymaster request format (ERC-7677 vs current). | 1h |
| 24 | `app/api/user-operations/sponsor/route.ts` | **UPDATE** (60 lines). Keep the endpoint but adapt input/output to match CDP's paymaster expectations (ERC-7677 `pm_sponsorUserOperation` format). Core Alchemy call stays identical. | 1-2h |
| 25 | `app/api/user-operations/send/route.ts` | **DELETE**. CDP handles bundling. No custom bundler endpoint needed. | 0.1h |
| 26 | `app/api/user-operations/receipt/route.ts` | **DELETE** or KEEP as optional. CDP's `waitForUserOperation` handles receipt polling natively. | 0.5h |

### Layer 6: Environment Variables

| Variable | Action |
|----------|--------|
| `NEXT_PUBLIC_PROJECT_ID` (Particle) | **REMOVE** |
| `NEXT_PUBLIC_CLIENT_KEY` (Particle) | **REMOVE** |
| `NEXT_PUBLIC_APP_ID` (Particle) | **REMOVE** |
| `NEXT_PUBLIC_CDP_PROJECT_ID` (new) | **ADD** — from CDP Portal |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | **REMOVE** (no WalletConnect) |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | **KEEP** |
| `ALCHEMY_POLICY_ID` | **KEEP** |
| `ALCHEMY_RPC_URL` | **KEEP** |
| `NEXT_PUBLIC_APP_NAME` | **KEEP** |
| `ENTRY_POINT` | **MAYBE REMOVE** — CDP handles entry point internally |
| `BUNDLER_RPC_URL` | **REMOVE** — CDP handles bundling |
| `NEXT_PUBLIC_GAS_STATION_ENABLED` | **KEEP** |

---

## 4. New CDP Integration Brief

### Provider Setup (`components/providers.tsx`)

```tsx
import { CDPReactProvider } from '@coinbase/cdp-react';

<CDPReactProvider config={{
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID!,
  appName: 'SRD Exchange',
  appLogoUrl: '/srd.jpg',
  ethereum: { createOnLogin: "smart" },  // Creates Smart Account on sign-in
  // No solana config
}}>
  {children}
</CDPReactProvider>
```

### Auth & Wallet (replaces `useAccount`, `useSmartAccount`, `useAddress`)

```tsx
import { useCurrentUser } from '@coinbase/cdp-hooks';
import { AuthButton } from '@coinbase/cdp-react/components/AuthButton';
import { useSendUserOperation } from '@coinbase/cdp-hooks';  // or equivalent API

const { currentUser } = useCurrentUser();
const smartAccount = currentUser?.evmSmartAccounts?.[0];
const eoaAddress = smartAccount?.address;

// Sponsored transaction
const { sendUserOperation } = useSendUserOperation();

await sendUserOperation({
  evmSmartAccount: smartAccount,
  network: "bsc",
  calls: [{ to: contractAddress, value: 0n, data: callData }],
  paymasterUrl: "/api/user-operations/sponsor",  // → our proxy → Alchemy
});
```

### Viem Compatibility

```tsx
import { toViemAccount, getCurrentUser } from '@coinbase/cdp-core';

const user = await getCurrentUser();
const viemAccount = toViemAccount(user.evmAccountObjects[0].address);
// Use viemAccount with any viem-compatible library
```

---

## 5. What Gets Simpler

| Aspect | Before (Particle) | After (CDP) |
|--------|------------------|-------------|
| Packages to manage | 5 Particle + 2 Solana | 3 CDP packages |
| Server-side API routes | 3 (sponsor, send, receipt) | 1 (sponsor only) |
| Server lib files | 3 (alchemyPaymaster, sendUserOp, userOperation) | 1 (alchemyPaymaster) |
| Solana code | Multiple files (providers, RightSidebar, wallet-check) | Zero |
| UserOp building | Custom `buildSponsoredSmartAccountTransaction` | CDP's `sendUserOperation` handles it |
| Bundler management | Custom `sendUserOpToBundler` + receipt polling | CDP handles all bundler communication |
| Signature verification | Custom ERC-1271 + Nexus validator logic | CDP handles signing internally |
| Smart account deployment | Manual `ensureWalletDeployed` + `deployWalletContract` | CDP auto-deploys on first use |
| Chain switching | Complex custom chain switching | CDP manages network configuration |
| Gas estimation | Manual gas estimation + buffers | CDP handles gas estimation |
| initCode handling | Manual `clearInitCode` logic | CDP manages deployment state |

---

## 6. Effort & Complexity Breakdown

| Layer | Files | Est. Hours | Notes |
|-------|-------|-----------|-------|
| Config & Providers | 5 files | 2-3h | Delete 3 files, rewrite providers, simplify wagmi |
| useWalletManager.ts | 1 file | 5-8h | 1175 lines, deepest business logic. Replaces Particle hooks with CDP hooks. |
| Other hooks | 1 file | 0.5h | Trivial hook swap |
| RightSidebar | 1 file | 4-6h | 1271 lines. Remove Solana, switch to CDP wallet data |
| WalletConnectModal | 1 file | 2-3h | 654 lines. Remove external wallet UI, replace with CDP auth flow |
| Other components (8 files) | 8 files | 3-5h | Hook swaps, button replacements |
| Pages | 2 files | 1-2h | |
| API / Server | 5 files | 2-3h | Delete 3 files, update 1, keep 1 |
| CDP Portal setup | N/A | 1h | Create CDP project, configure auth methods, whitelist origins |
| Testing & QA | full app | 3-5h | |
| **Total** | **~24 files** | **23-36 hrs** | **3-5 professional developer days** |

**Recommended quote: 28 hours** (3.5 days).

---

## 7. CDP Portal Setup Steps

1. **Create CDP account** at https://portal.cdp.coinbase.com
2. **Create a project** and copy the Project ID
3. **Configure auth methods** in Embedded Wallet settings: enable email, SMS, or social login
4. **Whitelist app origin** in Embedded Wallet CORS settings (e.g., `http://localhost:3000`, `https://your-app.com`)
5. **Add `NEXT_PUBLIC_CDP_PROJECT_ID`** to `.env.local` and Vercel env vars
6. **Remove Particle env vars** from Vercel

---

## 8. Implementation Order

1. **CDP Portal setup + env vars** (parallel task)
2. **Install CDP packages, remove Particle + Solana packages** from package.json
3. **Rewrite providers.tsx** — switch from ParticleConnectkit → CDPReactProvider
4. **Delete files**: connectkit.tsx, particlePolyfills.ts, userOperation.ts, sendUserOp.ts, send API route, receipt API route
5. **Update sponsor API route** — adapt for CDP format
6. **Rewrite useWalletManager.ts** — biggest effort, CDP hooks throughout
7. **Rewrite RightSidebar.tsx** — remove Solana, CDP wallet data
8. **Rewrite WalletConnectModal.tsx** — remove external wallets, CDP auth
9. **Update remaining components** — navbar, landingPage, etc.
10. **Update pages** — fiat, wallet-check
11. **Simplify wagmi config** — remove connectors
12. **Testing** — auth flow, wallet creation, sponsored transactions, all trading flows
