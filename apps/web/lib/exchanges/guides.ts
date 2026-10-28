import type {ExchangeId} from './allowlist';

/** Session AI (J14): how to make a read-only key, per exchange (docs read 2026-10-28; docs/research/session-ai/EXCHANGES.md). */
export const KEY_LABELS: Record<ExchangeId, {keyId: string; secret: string; secretHint: string}> = {
  kraken: {keyId: 'API key', secret: 'Private key', secretHint: 'The private key Kraken shows once, a long base64 text.'},
  coinbase: {keyId: 'Key name', secret: 'Private key (ECDSA)', secretHint: 'The whole private key block Coinbase shows once, from its BEGIN EC PRIVATE KEY line to its END line.'},
  binance: {keyId: 'API key', secret: 'Secret key', secretHint: 'The secret key Binance shows once.'},
};
export const GUIDES: Record<ExchangeId, readonly string[]> = {
  kraken: ['In Kraken, open your profile → Settings → API, and choose Create API key.', 'Name it "ZIGoals read-only".', 'Tick only Query Funds, Query Open Orders & Trades, Query Closed Orders & Trades and Query Ledger Entries. Leave Withdraw, Deposit, Earn and every order permission off.', 'Generate the key, then copy the API key and the private key here.'],
  coinbase: ['Open portal.cdp.coinbase.com and sign in with your Coinbase account.', 'API Keys → Secret API Keys → Create API key; give it a nickname.', 'Under Advanced Settings, choose the portfolio to read and leave Trade and Transfer off, so the key can only view.', 'Choose the ECDSA signature algorithm, create the key, then copy the key name (organizations/…/apiKeys/…) and the private key here.'],
  binance: ['In Binance, open Account → API Management and create a system-generated key.', 'Leave only "Enable Reading" on: no trading, no withdrawals, no transfers.', 'Copy the API key and the secret key here.'],
};
