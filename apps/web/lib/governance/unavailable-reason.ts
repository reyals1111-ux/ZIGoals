/**
 * Session AL (P-BN-30, BN-073/BN-093): why the governance read failed, in words a person can act on. The route
 * (app/api/chain/proposals) used one sentence for every failure; now it tells apart a chain that could not be reached
 * (try again soon), an answer ZIGoals could not read (a format change; trying again rarely helps) and an answer that did
 * not hold together (another block or network). An empty list is not a failure: it is an ok answer with no proposals,
 * and the page says "No proposals on this network yet."
 */
export type GovernanceFailure = 'unreachable' | 'unreadable' | 'inconsistent';
export const GOVERNANCE_REASONS: Readonly<Record<GovernanceFailure, string>> = Object.freeze({
  unreachable: 'The network’s public endpoint could not be reached just now, so proposals are unavailable. Try again in a minute.',
  unreadable: 'The network answered, but not in a form ZIGoals can read, so no proposals are shown. Trying again may not help until ZIGoals is updated.',
  inconsistent: 'The network’s answers did not match one another (another block or network), so none are shown. Try again in a minute.',
});
/** Sorts an error thrown while reading proposals. Unknown errors count as "unreachable" (the safe, retryable reading). */
export function governanceFailure(error: unknown): GovernanceFailure {
  if (error instanceof SyntaxError) return 'unreadable';
  const name = error && typeof error === 'object' && 'name' in error ? String((error as {name: unknown}).name) : '';
  if (name === 'ZodError' || (error && typeof error === 'object' && Array.isArray((error as {issues?: unknown}).issues))) return 'unreadable';
  const message = error instanceof Error ? error.message : '';
  if (/too large|seconds|does not know|another proposal/i.test(message)) return 'unreadable';
  if (/different block|another network/i.test(message)) return 'inconsistent';
  return 'unreachable';
}
export const governanceReason = (error: unknown) => GOVERNANCE_REASONS[governanceFailure(error)];
