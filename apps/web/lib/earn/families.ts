/** Session AF (L1): the Earn page's live families, each with its own route and how often it is read while visible. */
export const EARN_FAMILIES = Object.freeze({
  chain: {path: '/api/earn/chain?network=mainnet', pollMs: 120_000},
  valdora: {path: '/api/earn/valdora', pollMs: 120_000},
  oroswap: {path: '/api/earn/oroswap', pollMs: 120_000},
  defillama: {path: '/api/earn/defillama', pollMs: 600_000},
  validators: {path: '/api/chain/validators?network=zigchain-1', pollMs: 120_000},
  // Session AF chunk 2: the vault products, and the measured staking figure (a 10,000-block window: read every 10 minutes).
  vaults: {path: '/api/earn/vaults', pollMs: 300_000},
  measured: {path: '/api/earn/measured', pollMs: 600_000},
} as const);
export type EarnFamily = keyof typeof EARN_FAMILIES;
