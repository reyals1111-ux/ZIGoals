/**
 * Session AV lane 2 (fr-money, FR-L-4, the friend-readiness walk's Lina): "Log spending", her daily action, sat 2,100 to
 * 4,400 px down Wealth on a phone. The Wealth hero's "Log spending" and Quick add's Spending row ask for the existing form
 * here; Spending opens it (with the cursor in Amount) when it is on the page, or as soon as it mounts. Nothing is saved.
 */
export const LOG_SPENDING_EVENT = 'zigoals-log-spending';
let pending = false;
/** Ask Spending to open its "Log spending" form. */
export function requestLogSpending(): void {
  pending = true;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(LOG_SPENDING_EVENT));
}
/** True once after a request (Spending calls it when it mounts and when the event comes). */
export function takeLogSpending(): boolean {
  const was = pending; pending = false; return was;
}
