/**
 * Session AV lane 2 (food; q3 #29 check 8, Cronometer's repeating items): the plans one "Repeat on" made are shown as one
 * group — the same saved meal, in the same meal slot, made at the same moment — instead of up to 84 flat rows. Each day
 * stays its own plan (logged only when eaten). Pure; no stored change.
 */
export type PlanLike = {id: string; savedMealId: string; name: string; date: string; meal: string; createdAt: string; loggedAt?: string};
export type PlanGroup<T extends PlanLike> = {key: string; name: string; meal: string; plans: T[]; first: string; last: string; logged: number};
export function groupPlans<T extends PlanLike>(plans: readonly T[]): PlanGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const p of [...plans].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    const key = `${p.savedMealId}|${p.meal}|${p.createdAt}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups].map(([key, ps]) => ({key, name: ps[0]!.name, meal: ps[0]!.meal, plans: ps, first: ps[0]!.date, last: ps.at(-1)!.date, logged: ps.filter(p => p.loggedAt).length}))
    .sort((a, b) => a.first.localeCompare(b.first) || a.key.localeCompare(b.key));
}
