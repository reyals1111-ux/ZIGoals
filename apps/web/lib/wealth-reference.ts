/**
 * Session AL (PR-007, P-PR-72): a hand-valued holding that also has a market reference price states both figures:
 * what the quantity comes to at the reference price, beside the value the person entered (the one that counts).
 * Exact integer arithmetic, cut (never rounded up) to the cent.
 */
export function referenceValueCents(quantity: string, quantityDecimals: number, price: string, priceDecimals: number): bigint | null {
  if (!/^\d+$/.test(quantity) || !/^\d+$/.test(price)) return null;
  const scale = 10n ** BigInt(quantityDecimals + priceDecimals);
  return BigInt(quantity) * BigInt(price) * 100n / scale;
}
