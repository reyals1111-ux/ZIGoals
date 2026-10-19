/**
 * Session AF (L1c, non-negotiable N1; PLAN_APPROVED 11.9): every word of the plan's plain-words list has a "What's this?"
 * tap where it first appears in each Earn section, in the Staking actions and review, and on Governance
 * (components/earn/whats-this.tsx). The words themselves have one source: the Earn glossary (lib/ai/earn/glossary.ts,
 * English), loaded on the first tap. This module holds only which glossary terms the plan's list names and the tap's
 * own question, so a page carries no definition until the person asks for one.
 */
export const PLAIN_TERMS = Object.freeze([
  'staking', 'validator', 'commission', 'apr', 'apy', 'unbonding', 'redelegate', 'rewards', 'slashing', 'jailed', 'voting-power',
  'liquid-staking', 'exchange-rate', 'pool', 'impermanent-loss', 'pool-depth', 'swap', 'slippage', 'copy-trading', 'custody', 'gas',
  'seed-phrase', 'practice-network', 'bridge', 'proposal', 'quorum', 'decoy', 'verified-link',
] as const);
export type PlainTerm = (typeof PLAIN_TERMS)[number];
/** The plan's list (section 11.9), item by item, with the glossary terms that explain it. */
export const PLAN_LIST: readonly (readonly [string, readonly PlainTerm[]])[] = Object.freeze([
  ['stake / delegate', ['staking']],
  ['validator', ['validator']],
  ['commission', ['commission']],
  ['APR vs APY', ['apr', 'apy']],
  ['unbonding (and its days)', ['unbonding']],
  ['redelegate', ['redelegate']],
  ['rewards / claim', ['rewards']],
  ['slashing', ['slashing']],
  ['jailed', ['jailed']],
  ['voting power', ['voting-power']],
  ['liquid staking / stZIG / exchange rate', ['liquid-staking', 'exchange-rate']],
  ['liquidity pool / impermanent loss / pool depth', ['pool', 'impermanent-loss', 'pool-depth']],
  ['swap / slippage', ['swap', 'slippage']],
  ['copy trading / profit sharing', ['copy-trading']],
  ['custody ("who holds the money")', ['custody']],
  ['gas / fee', ['gas']],
  ['seed phrase', ['seed-phrase']],
  ['practice network (testnet) vs real network (mainnet)', ['practice-network']],
  ['IBC / bridge', ['bridge']],
  ['governance proposal / quorum', ['proposal', 'quorum']],
  ['decoy token', ['decoy']],
  ['verified link', ['verified-link']],
]);
/** The tap's own words: a question naming the term, so several taps in one block stay distinct. */
export const PLAIN_ASK: Readonly<Record<PlainTerm, string>> = Object.freeze({
  staking: 'What’s staking?', validator: 'What’s a validator?', commission: 'What’s commission?', apr: 'What’s APR?', apy: 'What’s APY?',
  unbonding: 'What’s unbonding?', redelegate: 'What’s redelegating?', rewards: 'What are rewards?', slashing: 'What’s slashing?',
  jailed: 'What does jailed mean?', 'voting-power': 'What’s voting power?', 'liquid-staking': 'What’s liquid staking?',
  'exchange-rate': 'What’s the exchange rate?', pool: 'What’s a liquidity pool?', 'impermanent-loss': 'What’s impermanent loss?',
  'pool-depth': 'What’s pool depth?', swap: 'What’s a swap?', slippage: 'What’s slippage?', 'copy-trading': 'What’s copy trading?',
  custody: 'What’s custody?', gas: 'What’s gas?', 'seed-phrase': 'What’s a seed phrase?', 'practice-network': 'What’s the practice network?',
  bridge: 'What’s a bridge?', proposal: 'What’s a proposal?', quorum: 'What’s quorum?', decoy: 'What’s a decoy token?',
  'verified-link': 'What’s a verified link?',
});
