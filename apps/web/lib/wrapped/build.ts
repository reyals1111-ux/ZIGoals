import {habitDay, habitStats} from '../habits';
import type {LifeReview, Window} from '../life-review/engine';
import {focusMinutesBetween} from '../focus-sessions/engine';
import type {FocusSessions} from '../focus-sessions/schema';
import {addLocalDays} from '../local-date';
import {formatMonth, formatNumber} from '../visual-format';
import {STORY_MIN_DAYS, factsByDay, pillarDays, type StoryPillar, type StoryRecords} from '../stories/days';
import {shareSafe, storyStyle} from '../stories/build';
import {wrappedWindow} from './door';

/**
 * ZIGoals Wrapped (Session AK, F5d): the year told back in a few cards, built on this device from the person's own
 * records, on Stories' own pieces (lib/stories: logged days, the person's "style", the share-safe word check) and the
 * Life review's engine for the year (Health beside the year before). Cards in a fixed order — the opener, the top habits,
 * the longest runs, the goals funded, Health, focus hours, the busiest month, the close — each left out when it has
 * nothing true to say. Fewer than three logged days make one honest card.
 *
 * Every card has two kinds of line: `lines` hold counts only (days, check-ins, contributions, sessions, hours of focus)
 * and pass `shareSafe`; `numbers` hold the sensitive figures — money put in, average sleep and steps — shown and shared
 * only when the person turns "Include numbers" on (off by default, every time). Nothing here is a judgement or a score.
 */
export type WrappedCardId = 'opener' | 'top-habits' | 'streaks' | 'goals-funded' | 'health' | 'focus' | 'best-month' | 'closing' | 'not-enough';
export type WrappedCard = {id: WrappedCardId; pillar: StoryPillar | null; eyebrow: string; title: string; big?: string; lines: string[]; numbers: string[]};
export type Wrapped = {year: number; key: string; start: string; end: string; complete: boolean; loggedDays: number; enough: boolean; example: boolean; cards: WrappedCard[]};

const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
const safe = (lines: readonly (string | null | undefined | false)[]) => lines.filter((l): l is string => !!l && shareSafe(l));
const dayOf = (iso: string) => iso.slice(0, 10);

/** The Life review's window for a Wrapped year (the year so far, beside the same span of the year before). */
export function wrappedReviewWindow(year: number, today: string): Window {
  const {start, end} = wrappedWindow(year, today), last = year - 1, md = end.slice(5);
  const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return {period: 'year', start, end, prevStart: `${last}-01-01`, prevEnd: md === '02-29' && !leap(last) ? `${last}-02-28` : `${last}-${md}`, key: `year:${year}`};
}

export function buildWrapped({year, today, records, review, focus, example = false}: {year: number; today: string; records: StoryRecords; review: LifeReview | null; focus: FocusSessions | null; example?: boolean}): Wrapped {
  const {start, end, complete} = wrappedWindow(year, today), facts = factsByDay(records, start, end), logged = facts.size;
  const name = `ZIGoals Wrapped ${year}`, eyebrow = example ? `Example · ${name}` : name, span = complete ? `${year}` : `${year} so far`;
  const base = {year, key: `wrapped:${year}`, start, end, complete, loggedDays: logged, example};
  if (logged < STORY_MIN_DAYS) return {...base, enough: false, cards: [{id: 'not-enough', pillar: null, eyebrow, title: 'Not enough days yet', lines: [`Three logged days make a Wrapped. ${year} has ${plural(logged, 'day')} so far.`, 'Check in a habit, log a day of Health or move a goal, and your year starts to tell itself.'], numbers: []}]};
  const cards: WrappedCard[] = [], style = storyStyle(pillarDays(facts), 'year');
  cards.push({id: 'opener', pillar: style?.pillar ?? null, eyebrow, title: `Your ${span} in ${plural(logged, 'logged day')}`, big: formatNumber(logged), lines: safe([style ? `Your style this year: ${style.label}.` : null, style?.line]), numbers: []});

  // Top habits: the most days done in the year.
  const days: string[] = []; for (let d = start; d <= end && days.length < 366; d = addLocalDays(d, 1)) days.push(d);
  const done = records.habits.habits.map(h => ({title: h.title, n: days.filter(d => d >= h.startDate && habitDay(h, d, today).status === 'complete').length})).filter(x => x.n > 0).sort((a, b) => b.n - a.n || a.title.localeCompare(b.title)).slice(0, 3);
  if (done.length) cards.push({id: 'top-habits', pillar: 'habits', eyebrow: 'Top habits', title: done[0]!.title, big: formatNumber(done[0]!.n), lines: safe([`Done on ${plural(done[0]!.n, 'day')} this year.`, ...done.slice(1).map(x => `${x.title}: done on ${plural(x.n, 'day')}`)]), numbers: []});

  // Longest runs: each habit's best streak so far, in its own unit.
  const runs = records.habits.habits.map(h => { const s = habitStats(h, end); return {title: h.title, best: s.bestStreak, unit: s.streakUnit.replace(/s$/, '')}; }).filter(r => r.best > 1).sort((a, b) => b.best - a.best || a.title.localeCompare(b.title)).slice(0, 3);
  if (runs.length) cards.push({id: 'streaks', pillar: 'habits', eyebrow: 'Longest runs', title: runs[0]!.title, big: formatNumber(runs[0]!.best), lines: safe([`${plural(runs[0]!.best, runs[0]!.unit)} in a row at its best.`, ...runs.slice(1).map(r => `${r.title}: ${plural(r.best, r.unit)} in a row`)]), numbers: []});

  // Goals funded: contributions as counts per goal, goals finished; money put in only as a sensitive number.
  const inYear = (iso: string) => dayOf(iso) >= start && dayOf(iso) <= end, funded: string[] = [];
  let contributions = 0;
  for (const g of records.platform.goals) {
    const n = records.platform.contributions.filter(c => c.goalId === g.id && c.direction === 'IN' && !c.reversesId && inYear(c.occurredAt)).length;
    if (n) { funded.push(`${g.name}: ${plural(n, 'contribution')}`); contributions += n; }
  }
  const finished = (review?.wins ?? []).filter(w => w.startsWith('Finished ')), money = (review?.goalsMoved ?? []).filter(m => /put in/.test(m.line)).map(m => `${m.name}: ${m.line}`);
  const goalLines = safe([...finished.map(w => `${w}.`), ...funded]);
  if (goalLines.length) cards.push({id: 'goals-funded', pillar: 'goals', eyebrow: 'Goals funded', title: finished.length ? `${plural(finished.length, 'goal')} reached` : `${plural(funded.length, 'goal')} funded`, big: contributions ? formatNumber(contributions) : undefined, lines: [...(contributions ? [`${plural(contributions, 'contribution')} in all.`] : []), ...goalLines].slice(0, 5), numbers: money.slice(0, 4)});

  // Health: days with records beside the year before (counts); average sleep and steps are sensitive numbers.
  const trend = (label: string) => review?.health.find(t => t.label === label && t.now !== null);
  const counted = safe(['Days with water', 'Days with meals'].map(l => { const t = trend(l); return t ? `${l}: ${t.now}${t.before ? ` (the year before: ${t.before})` : ''}` : null; }));
  const figures = [trend('Sleep a night'), trend('Steps a day')].flatMap(t => t ? [`${t.label}: ${t.now} on average${t.before ? ` (the year before: ${t.before})` : ''}`] : []);
  const healthDays = review?.counts.healthDays ?? 0;
  if (counted.length || figures.length || healthDays) cards.push({id: 'health', pillar: 'health', eyebrow: 'Health', title: healthDays ? `${plural(healthDays, 'day')} with Health records` : 'Your year in Health', big: healthDays ? formatNumber(healthDays) : undefined, lines: counted, numbers: figures});

  // Focus: hours focused in the year's sessions.
  if (focus) {
    const {minutes, sessions} = focusMinutesBetween(focus, start, end), grown = focus.sessions.filter(s => s.day >= start && s.day <= end && s.outcome === 'grown').length;
    if (sessions) { const hours = Math.round(minutes / 6) / 10; cards.push({id: 'focus', pillar: null, eyebrow: 'Focus', title: `${formatNumber(hours, {maximumFractionDigits: 1})} ${hours === 1 ? 'hour' : 'hours'} of focus`, big: formatNumber(hours, {maximumFractionDigits: 1}), lines: safe([`${plural(sessions, 'session')}, ${formatNumber(grown)} grown to the end.`, 'Time with the page open and in front of you.']), numbers: []}); }
  }

  // The busiest month: the most logged days.
  const months = new Map<string, number>(); for (const d of facts.keys()) months.set(d.slice(0, 7), (months.get(d.slice(0, 7)) ?? 0) + 1);
  const best = [...months].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0];
  if (best && months.size > 1) cards.push({id: 'best-month', pillar: style?.pillar ?? null, eyebrow: 'Your busiest month', title: formatMonth(best[0], {year: false}), big: formatNumber(best[1]), lines: [`${plural(best[1], 'logged day')} in ${formatMonth(best[0])}.`], numbers: []});

  cards.push({id: 'closing', pillar: style?.pillar ?? null, eyebrow, title: complete ? `That was your ${year}.` : `That is your ${year}, so far.`, lines: safe([[review?.counts.habitCheckIns ? plural(review.counts.habitCheckIns, 'habit check-in') : null, contributions ? plural(contributions, 'contribution') : null].filter(Boolean).join(' · ') || null, complete ? 'Share a card to keep it.' : 'It grows until the year ends. Share a card to keep it.']), numbers: []});
  return {...base, enough: true, cards};
}
