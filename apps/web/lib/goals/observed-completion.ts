import type {GoalHistory, Platform, PrivateGoal} from '../positions';

/**
 * Session AL fourth pass (PR-057, BUG-073, B-058, N-037): funding one goal runs a valuation tick over every goal
 * (lib/goal-intelligence.ts captureValuations), and the tick records "Target reached" for any goal that is at its target
 * without a completion in its cycle, stamped with the tick's time. A goal that was already at its target in its own
 * daily history (the Showcase's "My first 0.1 BTC", or records restored from an older build) then read as reached at the
 * very minute the Emergency fund was funded. Such a completion is dated where its own history first showed it reached
 * (the start of the latest unbroken run of reached readings for the same target), never at another goal's save.
 * A goal that crosses its target in this tick (its last reading was below) keeps the tick's time.
 */
export function dateObservedCompletions(before: Platform, after: Platform, now: number): Platform {
  if (before === after) return after;
  let changed = false;
  const goals = after.goals.map(g => {
    const old = before.goals.find(x => x.id === g.id), had = old?.lifecycle?.length ?? 0, events = g.lifecycle ?? [];
    if (events.length !== had + 1) return g;
    const added = events.at(-1)!;
    if (added.kind !== 'completed') return g;
    const at = firstReachedReading(after.goalHistory, g, added.target, events.at(-2)?.at ?? g.createdAt, now);
    if (!at || at >= added.at) return g;
    changed = true;
    return {...g, lifecycle: [...events.slice(0, -1), {...added, at}]};
  });
  return changed ? {...after, goals} : after;
}

/** The start of the latest unbroken run of readings at or above `target`, after `since` and not after `now`. */
export function firstReachedReading(history: readonly GoalHistory[], g: Pick<PrivateGoal, 'id' | 'asset' | 'decimals'>, target: string, since: string, now: number): string | undefined {
  const readings = history
    .filter((h): h is Extract<GoalHistory, {kind: 'valuation'}> => h.kind === 'valuation' && h.goalId === g.id && h.asset === g.asset && h.decimals === g.decimals && h.capturedAt > since && Date.parse(h.capturedAt) <= now)
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  let start: string | undefined;
  for (const h of readings) {
    const reached = h.target === target && !h.requiresReview && BigInt(h.current) >= BigInt(h.target);
    start = reached ? start ?? h.capturedAt : undefined;
  }
  return start;
}
