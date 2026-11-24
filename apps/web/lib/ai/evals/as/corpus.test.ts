import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {CORPUS, questionCount, type Intent} from './cases';
import {ask, freshAll, novaEnv, showcaseAll, zigiEnv, type Asked, type Pillar} from './harness';
import {SAYS, saysIn} from './says';

/**
 * Session AS (ADR-042 Part 1): the corpus as unit tests. At least 400 questions; each must give the literal expected
 * answer (expected.json: the sentence in English and in Dutch, the lookup's facts and the answer's widgets, for the
 * Showcase on 17 November 2026 and for a fresh profile). Every other phrasing of a question must be answered and state
 * the same facts (says.ts, written by hand); none may fall to the examples list, and on a fresh profile none may state
 * a figure the empty-state answer does not hold. oracle.test.ts recomputes the key facts a second, simpler way from the raw records.
 *
 * `AS_WRITE=1 pnpm exec vitest run apps/web/lib/ai/evals/as/corpus.test.ts` writes expected.json from the engine as it
 * stands; the file is then read line by line and committed (a change in it is a change of an answer).
 */
type Expected = {en: string; nl: string; facts: unknown; widgets: string[]; fresh: string; freshNl: string};
const FILE = new URL('./expected.json', import.meta.url);
/** The facts without the sentence, the rule's words and the widget strings; long lists of rows cut to their first eight. */
function slim(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) return value.slice(0, value.every(v => typeof v !== 'object' || v === null) ? 40 : 8).map(v => slim(v, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([k]) => !(depth === 0 && (k === 'answer' || k === 'rule' || k === 'show'))).map(([k, v]) => [k, slim(v, depth + 1)]));
  return typeof value === 'bigint' ? String(value) : value;
}
/** Every figure of a sentence: numbers as written ("8,100", "42%", "10:30"), each once. */
const figures = (text: string): string[] => [...new Set(text.match(/\d[\d,.:]*\d|\d/g) ?? [])];
const showcase = novaEnv(showcaseAll()), fresh = novaEnv(freshAll());
const first = (c: Intent): Expected => {
  const en = ask(c.en[0]!, showcase), nl = ask(c.nl[0]!, showcase);
  return {en: en.text, nl: nl.text, facts: slim(en.facts), widgets: en.widgets, fresh: ask(c.en[0]!, fresh).text, freshNl: ask(c.nl[0]!, fresh).text};
};
if (process.env.AS_WRITE === '1') writeFileSync(FILE, `${JSON.stringify(Object.fromEntries(CORPUS.map(c => [c.id, first(c)])), null, 1)}\n`);
const EXPECTED: Record<string, Expected> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
const answered = (a: Asked) => a.kind === 'answer' || a.kind === 'choices';

test('the corpus holds at least 400 questions, every pillar, unique ids, English and Dutch for each', () => {
  expect(questionCount()).toBeGreaterThanOrEqual(400);
  expect(new Set(CORPUS.map(c => c.id)).size).toBe(CORPUS.length);
  const pillars: Pillar[] = ['habits', 'health', 'goals', 'wealth', 'tasks', 'notes', 'journal', 'agenda', 'checklist', 'focus', 'nova'];
  for (const p of pillars) expect(CORPUS.some(c => c.pillar === p), p).toBe(true);
  for (const c of CORPUS) { expect(c.en.length, c.id).toBeGreaterThanOrEqual(1); expect(c.nl.length, c.id).toBeGreaterThanOrEqual(1); expect(EXPECTED[c.id], c.id).toBeTruthy(); expect(SAYS[c.id], c.id).toBeTruthy(); }
});
describe('the Showcase on 17 November 2026: every question gets its expected answer, in every phrasing', () => {
  const failures: Record<string, string[]> = {};
  const note = (pillar: string, message: string) => { (failures[pillar] ??= []).push(message); };
  for (const c of CORPUS) {
    const want = EXPECTED[c.id];
    if (!want) continue;
    const check = (question: string, lang: 'en' | 'nl', lead: boolean) => {
      const got = ask(question, showcase), text = lang === 'nl' ? want.nl : want.en;
      if (!answered(got)) return note(c.pillar, `${c.id} “${question}”: ${got.kind} (${got.text.slice(0, 70)})`);
      if (lead && got.text !== text) return note(c.pillar, `${c.id} “${question}”: said “${got.text.slice(0, 160)}”, expected “${text.slice(0, 160)}”`);
      // Session AV lane 2 (Dutch dates, deliberate): a Dutch phrasing states each date fact the Dutch way (says.ts saysIn); English as before.
      const missing = saysIn(c.id, lang).filter(fact => !got.text.includes(fact));
      if (missing.length) return note(c.pillar, `${c.id} “${question}”: lacks ${missing.join(' · ')} in “${got.text.slice(0, 140)}”`);
      for (const bad of c.never ?? []) if (got.text.includes(bad)) return note(c.pillar, `${c.id} “${question}”: says “${bad}”`);
      const exact = got.tools.includes('life_facts');
      if (exact && lead && lang === 'en' && JSON.stringify(slim(got.facts)) !== JSON.stringify(want.facts)) return note(c.pillar, `${c.id} “${question}”: the lookup's facts differ`);
      if (exact && lead && lang === 'en' && JSON.stringify(got.widgets) !== JSON.stringify(want.widgets)) return note(c.pillar, `${c.id} “${question}”: widgets ${got.widgets.join(', ')}; expected ${want.widgets.join(', ')}`);
    };
    c.en.forEach((q, i) => check(q, 'en', i === 0)); c.nl.forEach((q, i) => check(q, 'nl', i === 0));
  }
  test('every phrasing', () => { expect(Object.values(failures).flat()).toEqual([]); });
  test('the result per pillar (for ADR-042)', () => {
    const rows = [...new Set(CORPUS.map(c => c.pillar))].map(p => { const asked = CORPUS.filter(c => c.pillar === p).reduce((n, c) => n + c.en.length + c.nl.length, 0); return `${p}: ${asked - (failures[p]?.length ?? 0)} of ${asked}`; });
    if (process.env.AS_REPORT === '1') console.log(`AS corpus · ${rows.join(' · ')} · ${questionCount()} questions`);
    expect(rows.length).toBeGreaterThanOrEqual(11);
  });
});
describe('a fresh profile: the same questions get the empty-state answer, never a figure that is not there', () => {
  const failures: string[] = [];
  for (const c of CORPUS) {
    const want = EXPECTED[c.id];
    if (!want) continue;
    const check = (question: string, lang: 'en' | 'nl', lead: boolean) => {
      const got = ask(question, fresh), text = lang === 'nl' ? want.freshNl : want.fresh;
      if (got.kind === 'none') return failures.push(`${c.id} “${question}”: no reply`);
      if (lead && got.text !== text) return failures.push(`${c.id} “${question}”: said “${got.text.slice(0, 140)}”, expected “${text.slice(0, 140)}”`);
      // A count of nothing and the length of a named period are not figures of the person's records.
      const extra = figures(got.text).filter(f => !figures(`${want.fresh} ${want.freshNl}`).includes(f) && !['0', '7', '14', '30', '90'].includes(f));
      if (extra.length && got.kind !== 'examples') return failures.push(`${c.id} “${question}”: figures ${extra.join(' ')} on a fresh profile in “${got.text.slice(0, 120)}”`);
    };
    c.en.forEach((q, i) => check(q, 'en', i === 0)); c.nl.forEach((q, i) => check(q, 'nl', i === 0));
  }
  test('every phrasing', () => { expect(failures).toEqual([]); });
});
test('ZIGi gives the same answer as NOVA to the same question (A1): the corpus’s lead phrasings, both languages', () => {
  const zigi = zigiEnv(showcaseAll()), differs: string[] = [];
  for (const c of CORPUS) for (const q of [c.en[0]!, c.nl[0]!]) {
    const a = ask(q, showcase), b = ask(q, zigi);
    // Only the place a permission is changed is named differently (NOVA → Permissions, Settings → ZIGi), and NOVA speaks as NOVA.
    if (a.kind === 'answer' && b.kind === 'answer' && a.tools.includes('life_facts') && a.text !== b.text) differs.push(`${c.id} “${q}”: NOVA “${a.text.slice(0, 90)}” · ZIGi “${b.text.slice(0, 90)}”`);
    if (a.tools.includes('life_facts') !== b.tools.includes('life_facts') && c.pillar !== 'notes' && c.pillar !== 'journal') differs.push(`${c.id} “${q}”: answered by different layers`);
  }
  expect(differs).toEqual([]);
}, 120_000);
