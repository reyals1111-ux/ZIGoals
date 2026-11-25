import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AW_X4} from '../evals/as/cases-aw-x4';
import {CORPUS} from '../evals/as/cases';
import {awX4Answer} from './aw-x4';
import type {LocalReply} from './engine';
import {emptyPlatform, privateGoalSchema, type Platform} from '../../positions';
import {fundGoal} from '../../contribution-funding';
import {newOwnUnitPosition} from '../../goals/goal-units';
import {emptyGoalRepeat, setRepeat} from '../../goals/repeat';
import {addLocalDays} from '../../local-date';

/** Session AW (X4, Strides): the on-device answers to the year report and a goal that starts again, English and Dutch. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const OWN = new Set(AW_X4.map(c => c.id));
const E = 10n ** 18n;
const books = privateGoalSchema.parse({id: '71', name: 'Read 2 books a week', type: 'QUANTITY', status: 'active', asset: 'books', denom: 'manual:books', decimals: 18, target: (2n * E).toString(), notes: '', createdAt: '2026-10-01T10:00:00.000Z', milestones: []});
function reading(): {sources: ToolSources; repeat: ReturnType<typeof setRepeat>} {
  let p: Platform = {...emptyPlatform(), goals: [books]};
  const add = (day: string, n: bigint, id: string) => { const pos = p.positions.find(x => x.denom === 'manual:books'); p = fundGoal(p, {id, goalId: '71', ...(pos ? {positionId: pos.id} : {newPosition: newOwnUnitPosition(books, 'own-books', `${day}T12:00:00.000Z`)}), quantity: (n * E).toString(), occurredAt: `${day}T12:00:00.000Z`}, [], Date.parse(`${day}T12:00:00.000Z`)); };
  // Weeks of 2, 9 and 16 November: 2 books, 1 book, then 1 so far this week (DAY is Tuesday 17 November).
  const monday = addLocalDays(DAY, -1);
  add(addLocalDays(monday, -14), 2n, 'c1'); add(addLocalDays(monday, -6), 1n, 'c2'); add(DAY, 1n, 'c3');
  const repeat = setRepeat(emptyGoalRepeat(), books, 'week', addLocalDays(monday, -14), `${addLocalDays(monday, -14)}T12:00:00.000Z`);
  return {sources: {...freshAll(), platform: p}, repeat};
}

describe('every corpus question gets an answer of its own, in its language', () => {
  test.each(AW_X4.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]))('%s: %s', (id, q, lang) => {
    const r = awX4Answer(q, novaEnv(showcaseAll()));
    expect(r).not.toBeNull();
    const t = text(r);
    expect(t.length).toBeGreaterThan(20);
    for (const never of AW_X4.find(c => c.id === id)!.never ?? []) expect(t.toLowerCase()).not.toContain(never.toLowerCase());
    if (lang === 'nl') expect(t.replace(/“[^”]*”/g, '')).not.toMatch(/\b(?:the|your|and|with)\b/);
  });
  test('other questions are left to the other answers', () => {
    for (const q of ['how did my week go', 'how many habits did I do today', 'what are my goals', 'add a goal to read 2 books', 'how was my sleep this year', 'hoe ging mijn week']) expect(awX4Answer(q, zigiEnv(showcaseAll()))).toBeNull();
  });
  test('no other question of today’s corpus is answered here (wiring it first moves nothing)', () => {
    const taken: string[] = [], n = novaEnv(showcaseAll()), z = zigiEnv(showcaseAll());
    for (const c of CORPUS) if (!OWN.has(c.id)) for (const q of [...c.en, ...c.nl]) if (awX4Answer(q, n) || awX4Answer(q, z)) taken.push(`${c.id}: ${q}`);
    expect(taken).toEqual([]);
  }, 120_000);
});

describe('how did my year go (LEDGER #446)', () => {
  test('the Showcase: check-ins done of due, the longest runs, goals start → now; counts only', () => {
    const en = text(awX4Answer('how did my year go', zigiEnv(showcaseAll())));
    expect(en).toMatch(/^Your 2026 so far \(1 January to today\), from your own records:\n• Habits: [\d,]+ of [\d,]+ check-ins done\./);
    expect(en).toContain('Life review → This year shows it by life area.');
    const nl = text(awX4Answer('hoe ging mijn jaar', zigiEnv(showcaseAll())));
    expect(nl).toMatch(/^Je 2026 tot nu toe \(1 januari tot vandaag\)/);
    expect(nl).toContain('Alleen tellingen, nooit een cijfer.');
  });
  test('a fresh device: nothing to count, and where it fills', () => {
    expect(text(awX4Answer('how did my year go', zigiEnv(freshAll())))).toMatch(/^Nothing to count for 2026 yet\./);
    expect(text(awX4Answer('hoe was mijn jaar', zigiEnv(freshAll())))).toMatch(/^Nog niets te tellen voor 2026\./);
  });
});

describe('how often a goal that starts again was reached (LEDGER #447)', () => {
  test('reached in 1 of 2 finished weeks, and this week so far', () => {
    const {sources, repeat} = reading();
    const en = text(awX4Answer('how many times did I reach my weekly reading goal', zigiEnv(sources), {repeat}));
    expect(en).toMatch(/^“Read 2 books a week”: reached in 1 of 2 weeks \(week of .+ 2\/2 · week of .+ 1\/2\)\. This week: 1 of 2 books so far\./);
    const nl = text(awX4Answer('hoe vaak heb ik mijn wekelijkse leesdoel gehaald', zigiEnv(sources), {repeat}));
    expect(nl).toMatch(/^“Read 2 books a week”: gehaald in 1 van 2 weken \(week van 2 nov 2\/2 · week van 9 nov 1\/2\)\. Deze week: 1 van 2 books tot nu toe\./);
  });
  test('none repeats yet: it says how, never a count of nothing', () => {
    expect(text(awX4Answer('how many times did I reach my weekly reading goal', zigiEnv(freshAll()), {repeat: null}))).toMatch(/^None of your goals starts again each week yet/);
    expect(text(awX4Answer('hoe vaak heb ik mijn wekelijkse leesdoel gehaald', zigiEnv(freshAll()), {repeat: null}))).toMatch(/^Nog geen van je doelen begint opnieuw elke week/);
  });
});
