/**
 * Session AL Part 11 (lane L8): the core around the NOVA orb — four concentric rings that sum up today, one per pillar,
 * each a single figure another HUD panel shows the same way (never a blend of several):
 * - Health: today's water against the person's water target (the Water card's figure);
 * - Habits: the habits done of those due today (Today's focus count);
 * - Goals: the lead active goal's progress (NOVA's goal format, whole and rounded down);
 * - Wealth: the share of the headline currency's known value set aside for goals (the purpose flow's words).
 * A ring whose figure is unknown is drawn as a faint dashed track only (an ornament), with "—" and the reason in words.
 */
export type CorePillar = 'health' | 'habits' | 'goals' | 'wealth';
export type CoreRing = {pillar: CorePillar; label: string; measure: string; share: number | null; text: string; reason: string | null};
export type CoreInput = {
  water: {share: number | null; text: string; targetText: string | null} | null;
  habits: {due: number; done: number} | null;
  goal: {name: string; pct: number | null; text: string} | null;
  wealth: {allocated: bigint; total: bigint; shareText: string} | null;
};
const LABEL: Record<CorePillar, string> = {health: 'Health', habits: 'Habits', goals: 'Goals', wealth: 'Wealth'};
const unknown = (pillar: CorePillar, measure: string, reason: string): CoreRing => ({pillar, label: LABEL[pillar], measure, share: null, text: '—', reason});
export function coreRings(i: CoreInput): CoreRing[] {
  const health = !i.water ? unknown('health', 'Water today', 'Your Health journal is not read yet')
    : i.water.share === null ? unknown('health', 'Water today', 'No water target set')
    : {pillar: 'health' as const, label: LABEL.health, measure: 'Water today', share: i.water.share, text: `${i.water.text} of ${i.water.targetText}`, reason: null};
  const habits = !i.habits ? unknown('habits', 'Habits done today', 'Your habits are not read yet')
    : i.habits.due === 0 ? unknown('habits', 'Habits done today', 'No habit is due today')
    : {pillar: 'habits' as const, label: LABEL.habits, measure: 'Habits done today', share: i.habits.done / i.habits.due, text: `${i.habits.done} of ${i.habits.due}`, reason: null};
  const goals = !i.goal ? unknown('goals', 'Lead goal', 'No active goal yet')
    : i.goal.pct === null ? unknown('goals', i.goal.name, 'Its progress is unknown until it is valued')
    : {pillar: 'goals' as const, label: LABEL.goals, measure: i.goal.name, share: Math.min(1, i.goal.pct / 100), text: i.goal.text, reason: null};
  const wealth = !i.wealth || i.wealth.total <= 0n ? unknown('wealth', 'Set aside for goals', 'No valued holding yet')
    : {pillar: 'wealth' as const, label: LABEL.wealth, measure: 'Set aside for goals', share: Number(i.wealth.allocated * 10000n / i.wealth.total) / 10000, text: i.wealth.shareText, reason: null};
  return [health, habits, goals, wealth];
}
