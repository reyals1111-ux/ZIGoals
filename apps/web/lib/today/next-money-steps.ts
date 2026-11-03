import type {AttentionItem} from '../product-insights';

/**
 * Session AK RB (RELEASE_REVIEW_2 R2-9): Today's "Next money steps" — "Needs attention" and "Your funding agenda" in one
 * list, and a goal shown once on Today. A goal already on Today ("What matters today", or its card under "Your goals") is
 * left out here: its card carries its status and next contribution, the panel its funding facts. What stays: every asset
 * that needs a look, then the steps and planned contributions of goals not shown elsewhere on Today (a hidden goal card,
 * a goal whose card is not on Today), each goal once — an attention step before its agenda row. Pure.
 */
export type AgendaRow = {goalId: string};
export type MoneyStep<R extends AgendaRow = AgendaRow> = {kind: 'attention'; item: AttentionItem} | {kind: 'agenda'; row: R};
export function nextMoneySteps<R extends AgendaRow>(items: readonly AttentionItem[], agenda: readonly R[], shownGoals: ReadonlySet<string>): MoneyStep<R>[] {
  const steps: MoneyStep<R>[] = items.filter(i => !(i.goalId && shownGoals.has(i.goalId))).map(item => ({kind: 'attention' as const, item}));
  const listed = new Set(items.flatMap(i => i.goalId ? [i.goalId] : []));
  for (const row of agenda) if (!shownGoals.has(row.goalId) && !listed.has(row.goalId)) { steps.push({kind: 'agenda', row}); listed.add(row.goalId); }
  return steps;
}
/** "3 assets · 1 goal" for the heading (each goal counted once). */
export function stepSplit(steps: readonly MoneyStep[]): string {
  const assets = steps.filter(s => s.kind === 'attention' && !s.item.goalId).length;
  const goals = new Set(steps.flatMap(s => s.kind === 'attention' ? (s.item.goalId ? [s.item.goalId] : []) : [s.row.goalId])).size;
  return [assets && `${assets} ${assets === 1 ? 'asset' : 'assets'}`, goals && `${goals} ${goals === 1 ? 'goal' : 'goals'}`].filter(Boolean).join(' · ');
}
