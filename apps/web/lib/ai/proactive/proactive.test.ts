import {expect, test} from 'vitest';
import {habitDay, habitStats, latestHabitRule} from '../../habits';
import {addLocalDays} from '../../local-date';
import {addWater, waterSummary} from '../../health-daily';
import {createEmptyHealth, saveActivity} from '../../health';
import {insightCards, MIN_DAYS} from '../../insights/engine';
import {readDeviceRecord} from '../../device-record';
import {localAnswer} from '../local-answers/engine';
import {ZIGI} from '../store/records';
import {ZIGI_KEY} from '../store/keys';
import {toolEnv, type ToolSources} from '../tools/env';
import {gatesFor, SENTINEL, sentinelsIn, settingsWith, showcaseSources, withHandHealth, withSentinels} from '../tools/fixtures';
import {summaries} from '../tools/goals';
import {runTool} from '../tools/registry';
import {briefForAi, morningBrief} from './brief';
import {listNames, shortName, toneProblem} from './calm';
import {chipsFor, dataChips, MAX_CHIPS, REVIEW_STARTER, rotate} from './chips';
import {BRIEF_ID, dismissedOn, dismissFor} from './dismiss';
import {explainFor} from './explain';
import {sampleLine, usesHealth, zigiInsights} from './insights';
import {localReview, quietDays, reviewForAi} from './review';

// Session V Part 9: ZIGi's proactive side, computed on the device from the fictional Showcase records (2026-10-05) and
// hand fixtures. Every expectation is recomputed from the records themselves; every line passes the calm-tone rules.
const env = (sources: ToolSources = showcaseSources(), health = true, purpose: 'provider' | 'local' = 'local') => toolEnv(sources, gatesFor(health), purpose);
const storage = () => { const map = new Map<string, string>(); return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, map}; };

test('chips come from the records, at most three of them, then T\'s starters; all calm, short and rotated by day', () => {
  const e = env(), today = dataChips('today', null, e);
  // The longest current streak (three or more) and the habits still open today, recomputed from the records.
  const active = e.habits.habits.filter(h => latestHabitRule(h).state === 'active');
  const best = active.map(h => ({h, s: habitStats(h, e.habitDay).currentStreak})).filter(x => x.s >= 3).sort((a, b) => b.s - a.s || a.h.title.localeCompare(b.h.title))[0];
  if (best) expect(today.find(c => c.id.startsWith('streak:'))?.text).toBe(`${shortName(best.h.title)} streak is ${best.s} days — how do I keep it going?`);
  const open = active.filter(h => ['due', 'partial'].includes(habitDay(h, e.habitDay, e.habitDay).status));
  expect(today.some(c => c.id === 'open-today')).toBe(open.length > 0);
  const goal = summaries(e).filter(g => g.status === 'active' && g.progressBound !== 'unavailable').map(g => Math.floor(Number(g.progressPct))).filter(p => p > 0 && p < 100);
  expect(today.some(c => c.id.startsWith('goal:'))).toBe(goal.length > 0);
  for (const area of ['today', 'goals', 'habits', 'health', 'wealth', 'help'] as const) {
    const chips = chipsFor({area, env: e, day: e.habitDay});
    expect(chips.length, area).toBeGreaterThanOrEqual(3); expect(chips.length, area).toBeLessThanOrEqual(MAX_CHIPS);
    expect(chips.filter(c => !c.id.startsWith('starter:')).length, area).toBeLessThanOrEqual(3);
    for (const chip of chips) { expect(toneProblem(chip.text), chip.text).toBeNull(); expect(chip.text.length, chip.text).toBeLessThanOrEqual(70); }
  }
  // The same day always shows the same order; another day may differ, and every day shows the same set when it fits.
  const items = Array.from({length: 8}, (_, i) => ({id: `c${i}`}));
  expect(rotate(items, '2026-10-05')).toEqual(rotate(items, '2026-10-05'));
  const orders = new Set(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'].map(day => rotate(items, day).map(i => i.id).join()));
  expect(orders.size).toBeGreaterThan(1);
  // A new device (nothing readable): T's starters only; the weekly review starter opens the guided review.
  const fresh = chipsFor({area: 'today', env: null, day: '2026-10-05'});
  expect(fresh.every(c => c.id.startsWith('starter:'))).toBe(true);
  expect(fresh.find(c => c.text === REVIEW_STARTER)?.action).toBe('review');
});
test('chips respect the gates: no Health chip with the gate closed, no area its switch keeps closed; hidden ones stay away for the day', () => {
  const sources = withHandHealth(showcaseSources()), today = sources.healthDay;
  const unknown = sources.health.diary.filter(d => d.date === today && d.snapshot.nutrients.proteinMg === null).length;
  expect(dataChips('health', null, env(sources, true)).some(c => c.id === 'protein-unknown')).toBe(unknown > 0);
  expect(dataChips('health', null, env(sources, false))).toEqual([]);
  expect(chipsFor({area: 'today', env: env(sources, false), day: today}).some(c => /protein/i.test(c.text) && !c.id.startsWith('starter:'))).toBe(false);
  // Sending to the AI with the Habits switch off: no habit chip at all.
  const base = settingsWith(true), noHabits = toolEnv(sources, gatesFor(true, 'today', '/app', {settings: {...base, pageShare: {...base.pageShare, habits: false}}}), 'provider');
  expect(dataChips('today', null, noHabits).some(c => c.id.startsWith('streak:') || c.id === 'open-today')).toBe(false);
  expect(dataChips('habits', null, noHabits)).toEqual([]);
  const s = storage();
  const first = chipsFor({area: 'today', env: env(), day: '2026-10-05'}).find(c => !c.id.startsWith('starter:'))!;
  dismissFor(s, '2026-10-05', first.id);
  const record = readDeviceRecord(s, ZIGI).data;
  expect(chipsFor({area: 'today', env: env(), day: '2026-10-05', dismissed: dismissedOn(record, '2026-10-05')}).some(c => c.id === first.id)).toBe(false);
  // A new day starts with everything back; only today's ids are kept.
  expect(dismissedOn(record, '2026-10-06').size).toBe(0);
  dismissFor(s, '2026-10-06', BRIEF_ID);
  expect(readDeviceRecord(s, ZIGI).data.dismissed).toEqual({day: '2026-10-06', ids: [BRIEF_ID]});
  expect(s.map.has(ZIGI_KEY)).toBe(true);
});
test('the morning brief: what is open today, one thing from yesterday, one to start with; calm, recomputed, null when empty', () => {
  const e = env(), brief = morningBrief(e)!;
  const active = e.habits.habits.filter(h => latestHabitRule(h).state === 'active');
  const open = active.filter(h => ['due', 'partial'].includes(habitDay(h, e.habitDay, e.habitDay).status));
  expect(brief.due).toBe(open.length ? `Still open today: ${listNames(open.map(h => shortName(h.title)))}.` : null);
  const yesterday = addLocalDays(e.habitDay, -1), done = active.filter(h => habitDay(h, yesterday, e.habitDay).status === 'complete');
  if (done.length) expect(brief.win).toMatch(/^From yesterday: /);
  for (const line of brief.lines) expect(toneProblem(line), line).toBeNull();
  expect(briefForAi(brief).split('\n').slice(1)).toEqual(brief.lines.map(l => `- ${l}`));
  // Nothing recorded: no brief at all.
  const empty = showcaseSources(undefined, {habits: {...e.habits, habits: []}, platform: {...e.platform, goals: []}, localGoals: []});
  expect(morningBrief(env(empty, false))).toBeNull();
  // The same with the Health gate closed: water from yesterday never appears.
  expect(JSON.stringify(morningBrief(env(withHandHealth(empty), false)))).not.toMatch(/water/i);
});
test('insights: the engine\'s minimum sample (14 paired days, 5 each side), sample sizes kept, Health pairings only with the gate', () => {
  const sources = withHandHealth(showcaseSources());
  const open = zigiInsights(env(sources, true)), shut = zigiInsights(env(sources, false));
  for (const card of open) {
    expect(card.detail.sampleDays).toBeGreaterThanOrEqual(MIN_DAYS);
    expect(card.detail.withA.total).toBeGreaterThanOrEqual(5); expect(card.detail.withoutA.total).toBeGreaterThanOrEqual(5);
    expect(toneProblem(card.sentence, true), card.sentence).toBeNull(); expect(sampleLine(card)).toMatch(/^\d+ paired days from \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}: \d+ on one side, \d+ on the other\.$/);
  }
  expect(shut.some(usesHealth)).toBe(false);
  // Today shows two; ZIGi's view lists every qualifying pairing.
  const all = insightCards({habits: sources.habits, health: sources.health, today: sources.habitDay, max: 99});
  expect(open.length).toBe(Math.min(6, all.length));
  // Thirteen paired days are not enough for any pairing; twenty with both sides filled are (the control).
  const paired = (days: number) => {
    let health = createEmptyHealth();
    health = {...health, targets: {...health.targets, steps: 8000}};
    for (let i = 0; i < days; i++) {
      const date = addLocalDays(sources.habitDay, -i), at = `${date}T08:00:00.000Z`;
      health = saveActivity(health, {id: `health_activity-p-${i}`, date, name: 'Walk', steps: i % 2 ? 9000 : 3000, minutes: 30}, at);
      if (i % 3) health = addWater(health, {id: `health_water-p-${i}`, date, amountMilli: 500_000, unit: 'ml'}, at);
    }
    return zigiInsights(toolEnv({...sources, habits: {...sources.habits, habits: []}, health}, gatesFor(true), 'local')).map(c => c.id);
  };
  expect(paired(13)).toEqual([]);
  expect(paired(20)).toContain('steps-water');
});
test('the weekly review: the review week\'s figures and the days without a check-in, worded without grades; Health only with the gate', () => {
  const e = env(withHandHealth(showcaseSources()), true), review = localReview(e)!;
  expect(review.from <= review.to).toBe(true);
  const data = runTool('weekly_review', {}, e);
  if (!data.ok) throw Error('the review tool refused');
  expect(review.checkIns).toBe((data.data as {habitCheckIns: number}).habitCheckIns);
  expect(review.quietDays).toEqual(quietDays(e, review.from, review.to));
  for (const day of review.quietDays) { expect(day >= review.from && day <= e.habitDay).toBe(true); expect(e.habits.habits.some(h => h.entries.some(x => x.date === day && x.disposition === 'logged'))).toBe(false); }
  expect(localReview(env(withHandHealth(showcaseSources()), false))!.health).toBeNull();
  expect(reviewForAi(env(withHandHealth(showcaseSources()), false, 'provider'))).not.toMatch(/"health":\[|healthEntries/);
});
test('"Ask ZIGi about this": a question the device answers where it can, and the number\'s records as a chip that runs', () => {
  const e = env(withHandHealth(showcaseSources()), true), goal = summaries(e).find(g => g.status === 'active')!, habit = e.habits.habits.find(h => latestHabitRule(h).state === 'active')!;
  const local: [string, string, string?][] = [['goal', 'progress', goal.name], ['goal', 'next-contribution', goal.name], ['habit', 'streak', habit.title], ['habit', 'today', habit.title], ['health', 'kcal'], ['health', 'macros'], ['health', 'water'], ['health', 'weight'], ['health', 'steps'], ['health', 'history'], ['meal', 'kcal'], ['wealth', 'USD']];
  for (const [kind, metric, name] of local) {
    const explain = explainFor(kind, metric, name)!;
    expect(['answer', 'choices'], `${kind}/${metric}: ${explain.question}`).toContain(localAnswer(explain.question, e).kind);
    expect(runTool(explain.about.tool, explain.about.args, e).ok, `${kind}/${metric} chip`).toBe(true);
  }
  // No on-device answer for these overviews: the question goes to the person's AI with the chip (or, with none, ZIGi
  // offers examples it answers); the chip itself always runs.
  for (const [kind, metric] of [['goals', 'overview'], ['habits', 'overview'], ['streak', 'best'], ['checkins', 'week'], ['exercise', 'counts'], ['habit-history', 'days']] as const) {
    const explain = explainFor(kind, metric)!;
    expect(explain.question.length, kind).toBeGreaterThan(10); expect(runTool(explain.about.tool, explain.about.args, e).ok, `${kind} chip`).toBe(true);
  }
  // A goal or habit needs its name; kinds without a question get none.
  expect(explainFor('goal', 'progress')).toBeNull(); expect(explainFor('asset', 'value')).toBeNull(); expect(explainFor('ecosystem', 'directory')).toBeNull();
});
test('privacy: with the Health gate closed, the brief, chips, review and insight requests carry no Health sentinel', () => {
  const sources = withSentinels(withHandHealth(showcaseSources()));
  for (const purpose of ['provider', 'local'] as const) {
    const e = env(sources, false, purpose);
    const brief = morningBrief(e);
    expect(sentinelsIn(JSON.stringify(brief) + (brief ? briefForAi(brief) : '')), purpose).toEqual([]);
    for (const area of ['today', 'goals', 'habits', 'health', 'wealth', 'help'] as const) expect(sentinelsIn(JSON.stringify(chipsFor({area, env: e, day: e.habitDay}))), `${purpose} ${area}`).toEqual([]);
    expect(sentinelsIn(JSON.stringify(localReview(e)) + (reviewForAi(e) ?? '')), purpose).toEqual([]);
    expect(sentinelsIn(JSON.stringify(zigiInsights(e))), purpose).toEqual([]);
  }
  // The controls: with the gate open the review carries its Health lines, and a brief with no habits or goals falls
  // back to yesterday's water, which never shows with the gate closed.
  expect(reviewForAi(env(sources, true, 'provider'))).toContain('"health":[');
  const yesterday = addLocalDays(sources.healthDay, -1);
  const waterOnly: ToolSources = {...sources, habits: {...sources.habits, habits: []}, platform: {...sources.platform, goals: []}, localGoals: [],
    health: addWater(sources.health, {id: 'health_water-yesterday-1', date: yesterday, amountMilli: SENTINEL.waterMl * 1000, unit: 'ml'}, `${yesterday}T09:00:00.000Z`)};
  expect(morningBrief(env(waterOnly, true))!.win).toBe(`From yesterday: ${Number((waterSummary(waterOnly.health, yesterday).millilitres / 1000).toFixed(1))} L of water logged.`);
  expect(morningBrief(env(waterOnly, false))).toBeNull();
});
