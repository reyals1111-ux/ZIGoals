import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {normalize, search, type SearchItem} from './engine';
import {HELP_ALIASES} from './help-aliases';
import {HELP_QUESTIONS} from './static';

/**
 * Session AW Part 3 (simplicity c): Help's extra search words (lib/search/help-aliases.ts) name real Help answers, cover
 * at least 150 of them, and find each feature by its own name and by another app's word, the brief's examples included.
 */
const help = readFileSync(new URL('../../components/help/help-page.tsx', import.meta.url), 'utf8');
const ids = new Set([...help.matchAll(/<HelpQuestion id="([^"]*)"/g)].map(m => m[1]!));
// The items as lib/search/static.ts builds them, with the aliases merged in (the integrator's wiring).
const items: SearchItem[] = HELP_QUESTIONS.map(([id, question]) => ({id: `help:${id}`, kind: 'help', title: question, subtitle: 'Help', href: `/app/help#help-${id}`, keywords: [...id.split('-').filter(w => w.length > 2), ...(HELP_ALIASES[id] ?? [])]}));
const found = (query: string) => search(items, query, {perKind: 6}).map(h => h.id.replace(/^help:/, ''));

describe('Help search aliases (Session AW Part 3)', () => {
  it('names only questions that are on the Help page, at least 150 of them', () => {
    const keys = Object.keys(HELP_ALIASES);
    expect(keys.length).toBeGreaterThanOrEqual(150);
    expect(keys.filter(id => !ids.has(id)), 'ids not in components/help/help-page.tsx').toEqual([]);
  });
  it('gives each answer a few plain, distinct words', () => {
    for (const [id, words] of Object.entries(HELP_ALIASES)) {
      expect(words.length, id).toBeGreaterThan(0);
      expect(words.length, id).toBeLessThanOrEqual(12);
      expect(new Set(words.map(normalize)).size, id).toBe(words.length);
      for (const w of words) { expect(w, id).toBe(w.trim()); expect(normalize(w).length, `${id}: ${w}`).toBeGreaterThan(0); }
    }
  });
  it('finds each feature by its competitor’s common name', () => {
    const cases: [string, string][] = [
      ['snowball', 'av-debt-plan'], ['debt avalanche', 'av-debt-plan'], ['time blocking', 'av2-r5-plan-what-is-a-time-block'],
      ['streak freeze', 'av2-habit-options'], ['couch to 5k', 'aj-guided'], ['pomodoro', 'tasks-what'],
      ['envelope budget', 'ap-ready-to-assign'], ['zero-based', 'ap-ready-to-assign'], ['habit stacking', 'w-habits'],
      ['sleepcast', 'av2-body-can-zigoals-help-me-get-ready-for-bed'], ['macro tracking', 'av2-food-can-i-have-different-targets-on-differen'],
      ['intermittent fasting', 'fasting'], ['bullet journal', 'notes-what'], ['daily review', 'w-wrapup'],
      ['eisenhower', 'ap-matrix'], ['spaced repetition', 'av2-r5-notes-can-i-learn-with-flashcards-from-my-notes'],
      ['progressive overload', 'av2-body-can-a-routine-tell-me-what-to-lift-next'], ['sankey', 'av-income-flow'],
      ['splitwise', 'av2-money-r2-i-paid-for-dinner-for-three-can-i-count'], ['typewriter mode', 'av2-r4-notes-can-i-write-without-distractions'],
    ];
    for (const [query, id] of cases) expect(found(query), query).toContain(id);
  });
});
