/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-13): NOVA's "Sees" chip named a count of five where the app
 * has four pillars ("4 of 5 pillars" read as a bug: Today was counted as a pillar). It names what NOVA sees instead.
 */
export type SeenAreas = {today: boolean; goals: boolean; habits: boolean; wealth: boolean; health: boolean};
const NAMES: readonly [keyof SeenAreas, string][] = [['today', 'Today'], ['goals', 'Goals'], ['habits', 'Habits'], ['wealth', 'Wealth'], ['health', 'Health']];
export function seesLine(a: SeenAreas): string {
  const seen = NAMES.filter(([k]) => a[k]).map(([, name]) => name);
  if (!seen.length) return 'Nothing yet';
  return `${seen.join(', ')}${a.health ? '' : ' · Health off'}`;
}
