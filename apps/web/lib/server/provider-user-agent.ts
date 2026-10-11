/** The User-Agent of every CoinGecko read (Session U Part 2a). CoinGecko refuses a request without a descriptive
 * User-Agent with 403 ("Please add a descriptive User-Agent to your request", real provider, 2026-10-04), Workers'
 * fetch sends none, and a 403 is UNKNOWN by design: that was the public Alpha's "UNAVAILABLE (UNKNOWN)". It names the
 * app and its public site only: no version of a deployment, account, contact or key. */
export const PROVIDER_USER_AGENT='ZIGoals/1.0 (+https://zigoals.app)';
