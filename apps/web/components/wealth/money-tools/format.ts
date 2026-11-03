/** Session AK (lane M): an amount in its own currency for the money tools (never converted). */
export const money = (amount: string | number, currency: string) => {
  try { return new Intl.NumberFormat('en-GB', {style: 'currency', currency}).format(Number(amount)); } catch { return `${amount} ${currency}`; }
};
export const moneyCents = (cents: number | bigint, currency: string) => money(Number(cents) / 100, currency);
