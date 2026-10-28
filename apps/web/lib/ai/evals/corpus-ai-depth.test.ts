import {expect, test} from 'vitest';
import {ACTION_KINDS} from '../actions/schema';
import {PAGE_AREAS} from '../settings';
import {TOOLS} from '../tools/registry';
import {sentinelsIn} from '../tools/fixtures';
import {CORPUS, CORPUS_AREAS} from './corpus';
import {DEPTH} from './corpus-ai-depth';

/**
 * Session AI (ADR-034 N3): the depth set has the shape the harness needs. No model is called here: it checks the cases,
 * not the models.
 */
const TOOL_NAMES = new Set(TOOLS.map(t => t.name)), KINDS = new Set<string>(ACTION_KINDS);
const CATEGORIES = ['inj', 'typo', 'mix', 'multi', 'priv', 'adv', 'long', 'follow', 'read'] as const;
const category = (id: string) => CATEGORIES.find(c => id.startsWith(`ai-d-${c}-`));
const turnsOf = (c: (typeof DEPTH)[number]) => [{ask: c.ask, expect: c.expect}, ...(c.turns ?? [])];

test('at least 280 cases with unique ai-d- ids, kept apart from the typed corpus, at least 100 in Dutch and about a third important', () => {
  expect(DEPTH.length).toBeGreaterThanOrEqual(280);
  const ids = DEPTH.map(c => c.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every(id => id.startsWith('ai-d-'))).toBe(true);
  expect(CORPUS.some(c => c.id.startsWith('ai-d-'))).toBe(false);
  const nl = DEPTH.filter(c => c.lang === 'nl').length, important = DEPTH.filter(c => c.important).length;
  expect(nl).toBeGreaterThanOrEqual(100);
  expect(DEPTH.length - nl).toBeGreaterThanOrEqual(nl); // English stays the larger half
  expect(important).toBeGreaterThanOrEqual(Math.floor(DEPTH.length / 4));
  expect(important).toBeLessThanOrEqual(Math.ceil(DEPTH.length / 2));
  console.info(`ZIGi depth set: ${DEPTH.length} cases (${nl} Dutch, ${important} important); ${CATEGORIES.map(c => `${c} ${DEPTH.filter(d => category(d.id) === c).length}`).join(', ')}`);
});

test('every case belongs to one of the nine categories, each with at least 25 cases and both languages', () => {
  for (const c of DEPTH) expect(category(c.id), c.id).toBeDefined();
  for (const cat of CATEGORIES) {
    const cases = DEPTH.filter(c => category(c.id) === cat);
    expect(cases.length, cat).toBeGreaterThanOrEqual(25);
    for (const lang of ['en', 'nl'] as const) expect(cases.some(c => c.lang === lang), `${cat} ${lang}`).toBe(true);
  }
});

test('known areas, pages, languages and kinds; every card kind, field kind and tool exists; refusals carry no card; no local-first case', () => {
  for (const c of DEPTH) {
    expect(CORPUS_AREAS, c.id).toContain(c.area);
    expect(PAGE_AREAS, c.id).toContain(c.page);
    expect(['en', 'nl'], c.id).toContain(c.lang);
    expect(c.ask.trim().length, c.id).toBeGreaterThan(0);
    for (const turn of turnsOf(c)) {
      for (const k of turn.expect.kinds ?? []) expect(KINDS, `${c.id}: kind ${k}`).toContain(k);
      for (const f of turn.expect.fields ?? []) expect(KINDS, `${c.id}: field kind ${String(f.kind)}`).toContain(f.kind);
      for (const t of [...(turn.expect.tools ?? []), ...(turn.expect.toolsAny ?? []), ...(turn.expect.toolsNot ?? []), ...(turn.expect.facts ?? []).map(f => f.tool)]) expect(TOOL_NAMES, `${c.id}: tool ${t}`).toContain(t);
      if (turn.expect.refuse) expect(turn.expect.kinds, `${c.id}: a refusal expects no card`).toEqual([]);
      if (turn.expect.minCards !== undefined && turn.expect.maxCards !== undefined) expect(turn.expect.minCards, c.id).toBeLessThanOrEqual(turn.expect.maxCards);
      expect(turn.expect.localFirst, `${c.id}: the depth cases are the model's`).toBeUndefined();
    }
  }
});

test('the categories keep their shape: injection, privacy, advice and follow-up kinds; Health closed with sentinels; long asks of 2,000 to 6,000 characters', () => {
  const of = (cat: (typeof CATEGORIES)[number]) => DEPTH.filter(c => category(c.id) === cat);
  expect(of('inj').every(c => c.kind === 'injection')).toBe(true);
  expect(of('priv').every(c => c.kind === 'privacy')).toBe(true);
  expect(of('adv').every(c => c.kind === 'advice')).toBe(true);
  expect(of('multi').every(c => c.kind === 'multi')).toBe(true);
  for (const c of of('follow')) { expect(c.kind, c.id).toBe('followup'); expect(c.turns?.length ?? 0, c.id).toBeGreaterThanOrEqual(1); }
  // The harness checks a case's facts on every turn, so a follow-up carries none.
  for (const c of DEPTH) if (c.turns?.length) expect(c.expect.facts, c.id).toBeUndefined();
  for (const c of DEPTH) if (c.health === 'closed') expect(c.sentinels, c.id).toBe(true);
  expect(of('priv').filter(c => c.health === 'closed').length).toBeGreaterThanOrEqual(10);
  // A question gets an answer: no read case may expect a card.
  for (const c of of('read')) expect(c.expect.kinds, c.id).toEqual([]);
  for (const c of of('long')) {
    expect(c.ask.length, c.id).toBeGreaterThanOrEqual(2000);
    expect(c.ask.length, c.id).toBeLessThanOrEqual(6000);
    expect(c.expect.mustNot?.length ?? 0, `${c.id}: names the filler it must not echo`).toBeGreaterThan(0);
    for (const words of c.expect.mustNot ?? []) if (!words.startsWith('"') && !/should|kopen/.test(words)) expect(c.ask.includes(words), `${c.id}: ${words}`).toBe(true);
  }
  // No ask carries a planted sentinel value (the privacy check reads the messages too).
  for (const c of DEPTH) for (const turn of turnsOf(c)) expect(sentinelsIn(turn.ask), c.id).toEqual([]);
});
