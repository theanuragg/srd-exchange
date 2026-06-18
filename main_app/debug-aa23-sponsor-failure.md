# Debug Session: AA23 Sponsor Failure

- Status: OPEN
- Session ID: `aa23-sponsor-failure`
- Started: 2026-06-17
- Symptom: `alchemy_requestGasAndPaymasterAndData` returns `AA23 reverted (or OOG)` while creating a sponsored sell order.

## Hypotheses

1. The sponsor route adds non-empty `initCode` for a sender that is already deployed from EntryPoint's perspective.
2. The `sender` does not match the Coinbase factory-derived address for the exact `createAccount(bytes[],uint256)` args encoded in `initCode`.
3. The dummy signature format is incompatible with Coinbase Smart Wallet validation, causing `validateUserOp` to revert.
4. The client and server disagree about deployment state or smart-account address selection.
5. Gas-manager simulation reaches account validation with malformed payload fields unrelated to chain replication.

## Evidence Plan

- Instrument sponsor route before and after `initCode` mutation.
- Log derived Coinbase counterfactual address from the provided `eoaAddress`.
- Log `eth_getCode` result and whether it matches local deployment checks.
- Log whether `sender`, derived counterfactual, and chosen `initCode` are internally consistent.
- Log the exact dummy-signature path used for sponsorship.

## Notes

- No business-logic changes have been made yet.
- First code changes after this file will be instrumentation only.
