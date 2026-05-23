-- Add merchant UPI and tracking fields for QR scan payments
ALTER TABLE "qr_transactions" ADD COLUMN IF NOT EXISTS "sellRate" DECIMAL(65,30);
ALTER TABLE "qr_transactions" ADD COLUMN IF NOT EXISTS "userOpHash" TEXT;
ALTER TABLE "qr_transactions" ADD COLUMN IF NOT EXISTS "scannedUpiId" TEXT;
ALTER TABLE "qr_transactions" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "qr_transactions_userOpHash_key" ON "qr_transactions"("userOpHash");

-- APPROVED = admin accepted, payout pending
ALTER TYPE "QRTransactionStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
