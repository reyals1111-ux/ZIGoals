/**
 * The health-link Worker's fixed caps (Session W Part 8). Budgets come from the environment; these never do, so no
 * configuration can widen them.
 */
export const LIMITS={
 /** One request from the app: a provider name, a code or a token, a named request and its few parameters. */
 requestBytes:16_384,
 /** One provider answer passed back to the browser (a page of sleep or activity records). */
 responseBytes:4_194_304,
 /** The provider must answer within this. */
 timeoutMs:15_000,
};
