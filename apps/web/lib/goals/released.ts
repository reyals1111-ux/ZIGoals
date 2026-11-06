/**
 * Session AL third pass (L4; TK-196): an archived asset that counted toward an open Goal stops counting (archiving releases
 * its allocations, lib/asset-management.ts) with no trace on the Goal. This reads, from the Goal's own value snapshots,
 * what each archived asset counted just before, so the Goal can say so and ask for a review. Marking it reviewed writes
 * an ordinary goal-history line (an existing record kind and free-text label; nothing new is stored).
 */
import type {Platform} from '../positions';

/** `counted` is absent when no value snapshot named the asset before it was archived (the Showcase's example history). */
export type ReleasedSource = {positionId: string; name: string; at: string; counted?: string; asset: string; decimals: number};
/** The goal-history line that says the person reviewed a release (kept as an ordinary history line). */
export const reviewedReleaseLabel = (name: string) => `Reviewed: ${name.slice(0, 200)} was archived and no longer counts`;
/**
 * Fix-up (CI 1539, TK-196 in the Showcase): the goal-history line written when archiving an asset releases what it
 * counted here (lib/goal-intelligence.ts recordGoalChanges; an existing record kind and a free-text label). It keeps the
 * release known when no value snapshot named the asset first: the Showcase's example history carries no per-source
 * evidence, and a goal valued earlier the same day takes no second snapshot.
 */
export const archivedReleaseLabel = (name: string) => `Released: ${name.slice(0, 200)} was archived and stopped counting here`;
/**
 * TK-196: assets that counted toward this open Goal in its last value snapshot before they were archived (archiving
 * releases what they counted, lib/asset-management.ts). Each stays listed until the person marks it reviewed.
 */
export function releasedByArchive(s: Platform, goalId: string): ReleasedSource[] {
 const goal = s.goals.find(g => g.id === goalId);
 if (!goal || goal.status === 'closed' || goal.type === 'PROJECT') return [];
 const out: ReleasedSource[] = [];
 const history = s.goalHistory.filter(h => h.goalId === goalId);
 for (const p of s.positions) {
  if (!p.archivedAt || s.allocations.some(a => a.goalId === goalId && a.positionId === p.id)) continue;
  const archivedAt = Date.parse(p.archivedAt);
  if (!Number.isFinite(archivedAt) || archivedAt < Date.parse(goal.createdAt)) continue;
  let counted: string | undefined, asset = goal.asset, decimals = goal.decimals;
  for (let i = history.length - 1; i >= 0; i--) {
   const h = history[i]!;
   if (h.kind !== 'valuation' || Date.parse(h.capturedAt) > archivedAt) continue;
   const e = h.evidence.find(x => x.positionId === p.id);
   if (e && BigInt(e.counted) > 0n) { counted = e.counted; asset = h.asset; decimals = h.decimals; }
   break;
  }
  const name = p.validator?.name ?? p.providerId;
  // The release line is written in the same save as the archive (a minute's leeway for the two clocks of one save).
  if (!counted && !history.some(h => h.kind === 'allocation' && h.label === archivedReleaseLabel(name) && Date.parse(h.capturedAt) >= archivedAt - 60_000)) continue;
  if (history.some(h => h.kind !== 'valuation' && Date.parse(h.capturedAt) >= archivedAt && h.label === reviewedReleaseLabel(name))) continue;
  out.push({positionId: p.id, name, at: p.archivedAt, ...(counted ? {counted} : {}), asset, decimals});
 }
 return out;
}
/** The goal-history line written when the person marks the release reviewed (an existing record kind; nothing new). */
export function markReleaseReviewed(s: Platform, goalId: string, r: Pick<ReleasedSource, 'name'>, at = new Date().toISOString()): Platform {
 return {...s, goalHistory: [...s.goalHistory, {id: crypto.randomUUID(), goalId, kind: 'allocation', capturedAt: at, label: reviewedReleaseLabel(r.name), provenance: 'LOCAL_EDIT'}]};
}

