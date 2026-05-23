# SRD Exchange Tests

This directory contains unit and end-to-end tests for the QR scanning and payment workflow.

## Setup

To run these tests, you need to install the testing dependencies:

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest jest-environment-jsdom
npm install --save-dev @playwright/test
```

## Running Tests

### Unit Tests
```bash
npm test tests/qr-print.test.tsx
```

### E2E Tests
```bash
npx playwright test tests/e2e-workflow.spec.ts
```

## Coverage
- **QR Code Generation**: Verified in `qr-print.test.tsx` for correct size, error correction level, and margin inclusion (essential for print).
- **Workflow**: `e2e-workflow.spec.ts` covers the transition from scanning to the pending status screen, random GIF display, automatic refresh (countdown), and success redirection.
