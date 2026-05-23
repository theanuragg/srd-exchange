export const BUY_CDM_MIN_USDT = 100;
export const BUY_CDM_MAX_USDT = 150;

export const SELL_CDM_MIN_INR = 5000;
export const SELL_CDM_MAX_USDT = 250;

export function getSellCdmMinUsdt(sellRate: number): number {
  if (!sellRate || sellRate <= 0) return Infinity;
  return SELL_CDM_MIN_INR / sellRate;
}
