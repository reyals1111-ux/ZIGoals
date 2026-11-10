/**
 * Session AL (Part 15, C-BN-14 / P-BN-79 / GAP-144): a trend for the value locked that Ecosystem shows on its five cards
 * with a DefiLlama read. DefiLlama's answer through ZIGoals' route holds today's figure only, so the trend is built from
 * the reads this device made: one figure per project per day (the day's last read), the last 90 days. The card says so
 * ("from the reads on this device"), never as a full history. `zigoals:eco-tvl-history:v1`, this device only, never synced;
 * public figures, nothing personal. A record that does not read counts as empty; unknown fields are kept (additive).
 */
export const TVL_HISTORY_KEY = 'zigoals:eco-tvl-history:v1';
export const TVL_HISTORY_DAYS = 90;
export type TvlPoint = {day: string; usd: number};
export type TvlHistory = {version: 1; projects: Record<string, TvlPoint[]>} & Record<string, unknown>;
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const DAY = /^\d{4}-\d{2}-\d{2}$/, SLUG = /^[a-z0-9-]{1,60}$/;
export const emptyTvlHistory = (): TvlHistory => ({version: 1, projects: {}});
const pointOf = (v: unknown): TvlPoint | null => { const p = v as Partial<TvlPoint> | null; return p && typeof p.day === 'string' && DAY.test(p.day) && typeof p.usd === 'number' && Number.isFinite(p.usd) && p.usd >= 0 ? {day: p.day, usd: p.usd} : null; };
export function readTvlHistory(storage: Store | null): TvlHistory {
  try {
    const raw = storage?.getItem(TVL_HISTORY_KEY); if (!raw) return emptyTvlHistory();
    const r = JSON.parse(raw) as Record<string, unknown>;
    if (!r || r.version !== 1 || !r.projects || typeof r.projects !== 'object' || Array.isArray(r.projects)) return emptyTvlHistory();
    const projects: Record<string, TvlPoint[]> = {};
    for (const [slug, points] of Object.entries(r.projects as Record<string, unknown>)) if (SLUG.test(slug) && Array.isArray(points)) projects[slug] = points.map(pointOf).filter((p): p is TvlPoint => p !== null).slice(-TVL_HISTORY_DAYS);
    return {...r, version: 1, projects};
  } catch { return emptyTvlHistory(); }
}
/** Records one read: today's figure replaces an earlier one of the same day; the oldest days fall off after 90. */
export function withTvlRead(h: TvlHistory, slug: string, day: string, usd: number): TvlHistory {
  if (!SLUG.test(slug) || !DAY.test(day) || !Number.isFinite(usd) || usd < 0) return h;
  const points = (h.projects[slug] ?? []).filter(p => p.day !== day);
  const last = h.projects[slug]?.find(p => p.day === day);
  if (last && last.usd === usd) return h;
  return {...h, projects: {...h.projects, [slug]: [...points, {day, usd}].sort((a, b) => a.day.localeCompare(b.day)).slice(-TVL_HISTORY_DAYS)}};
}
export function saveTvlHistory(storage: Store | null, h: TvlHistory): boolean {
  try { if (!storage) return false; storage.setItem(TVL_HISTORY_KEY, JSON.stringify(h)); return true; } catch { return false; }
}
export type TvlTrend = {from: string; days: number; change: number | null};
/** From the first to the last day read on this device; null below two days. `change` is a fraction (0.04 = +4 %); null when the first figure was 0. */
export function tvlTrend(h: TvlHistory, slug: string): TvlTrend | null {
  const points = h.projects[slug] ?? [];
  if (points.length < 2) return null;
  const first = points[0]!, last = points[points.length - 1]!;
  return {from: first.day, days: points.length, change: first.usd > 0 ? (last.usd - first.usd) / first.usd : null};
}
/** "up 4 %", "down 12 %", "about the same" (under half a percent either way), or null when it cannot be worked out. */
export function trendWords(t: TvlTrend | null): string | null {
  if (!t || t.change === null) return null;
  const pct = Math.round(Math.abs(t.change) * 100);
  if (Math.abs(t.change) < 0.005) return 'about the same';
  return `${t.change > 0 ? 'up' : 'down'} ${pct < 1 ? 'under 1' : pct} %`;
}
