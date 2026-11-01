/**
 * Session AK RB (RELEASE_REVIEW_2 R2-6, from lane RC): on a device that never chose the chain, the What's new card names
 * no chain feature — "Earlier updates" listed Staking, ZIG and Keplr. A line that names the chain (staking, ZIG, a
 * wallet, Keplr, Testnet, contracts, governance votes, crypto) waits until the chain is chosen (lib/chain-choice.ts).
 * Pure: the labels only; the Help answers themselves stay where they are.
 */
export const CHAIN_LINE = /\bZIG\b|ZIGChain|Keplr|Testnet|\bcontracts?\b|[Ss]imulated|\bstak(?:e|ed|ing)\b|\bwallets?\b|\bcrypto\b|\bBitcoin\b|\bproposals?\b|network fee/i;
export function consumerLines<L extends {label: string}>(links: readonly L[], chainChosen: boolean): L[] {
  return chainChosen ? [...links] : links.filter(l => !CHAIN_LINE.test(l.label));
}
