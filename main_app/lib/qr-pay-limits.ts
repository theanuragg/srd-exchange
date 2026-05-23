/** QR scan & pay (sell) — INR limits */
export const SELL_QR_SCAN_MIN_INR = 10;
export const SELL_QR_SCAN_MAX_INR = 2000;

export const QR_PAY_MIN_INR = SELL_QR_SCAN_MIN_INR;
export const QR_PAY_MAX_INR = SELL_QR_SCAN_MAX_INR;

export function validateQrPayInrAmount(amount: number): { valid: boolean; error?: string } {
  if (!Number.isFinite(amount) || amount < QR_PAY_MIN_INR) {
    return {
      valid: false,
      error: `Minimum QR payment is ₹${QR_PAY_MIN_INR}.`,
    };
  }
  if (amount > QR_PAY_MAX_INR) {
    return {
      valid: false,
      error: `Maximum QR payment is ₹${QR_PAY_MAX_INR.toLocaleString("en-IN")}.`,
    };
  }
  return { valid: true };
}
