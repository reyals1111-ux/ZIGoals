import {describe, expect, test} from 'vitest';
import {freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AW_X1} from '../evals/as/cases-aw-x1';
import {CORPUS} from '../evals/as/cases';
import {awX1Answer, type AwX1Extra} from './aw-x1-due';
import type {LocalReply} from './engine';
import {emptyTimers, pauseTimer, startTimer, type Timers} from '../../timers/store';
import {showcaseTimers} from '../../timers/showcase';

/** Session AW (X1, LEDGER #438–#440; Due): the on-device answers, English and Dutch, NOVA and ZIGi. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const OWN = new Set(AW_X1.map(c => c.id));
const env = () => novaEnv(showcaseAll()), now = () => env().now.getTime();
function running(): Timers {
  let r = startTimer(emptyTimers(), {name: 'Pasta', seconds: 540}, now() - 60_000, 'tm-p').timers;
  r = startTimer(r, {name: 'Laundry', seconds: 45 * 60}, now() - 5 * 60_000, 'tm-l').timers;
  return pauseTimer(r, 'tm-l', now());
}
const extra = (over: AwX1Extra = {}): AwX1Extra => ({timers: running(), taskAgain: {every: 10, times: 6}, snoozes: [{for: 120}, {at: '19:00', day: 'next'}], ...over});

describe('every corpus question gets an answer of its own, in its language', () => {
  test.each(AW_X1.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]))('%s: %s', (id, q, lang) => {
    const t = text(awX1Answer(q, env(), {...extra(), timers: showcaseTimers(now())}));
    expect(t.length).toBeGreaterThan(20);
    for (const never of AW_X1.find(c => c.id === id)!.never ?? []) expect(t.toLowerCase()).not.toContain(never.toLowerCase());
    if (lang === 'nl') expect(t.replace(/“[^”]*”/g, '')).not.toMatch(/\b(?:the|your|and|with)\b/);
  });
  test('other questions are left to the other answers', () => {
    for (const q of ['plan my day', 'what is due today', 'remind me to call mum at 6', 'which tasks are overdue', 'how long did I sleep', 'what are my reminders']) expect(awX1Answer(q, zigiEnv(showcaseAll()), extra())).toBeNull();
  });
  // Session AW (x1-due, deliberate): round 6's "which timers are running" (`av2-timers`) is taken in the browser, where the
  // named timers can be read: one answer names both kinds (tested below). Every other question stays with its own answer.
  const SHARED = new Set(['av2-timers']);
  test('no other question of today’s corpus is answered here (wiring it first moves nothing but the shared timers one)', () => {
    const taken: string[] = [], n = novaEnv(showcaseAll()), z = zigiEnv(showcaseAll()), x = extra();
    for (const c of CORPUS) if (!OWN.has(c.id) && !SHARED.has(c.id)) for (const q of [...c.en, ...c.nl]) if (awX1Answer(q, n, x) || awX1Answer(q, z, x)) taken.push(`${c.id}: ${q}`);
    expect(taken).toEqual([]);
    // In the corpus harness (no browser storage) nothing is read, so even the shared one stays where it was.
    for (const q of [...CORPUS.find(c => c.id === 'av2-timers')!.en, ...CORPUS.find(c => c.id === 'av2-timers')!.nl]) expect(awX1Answer(q, n)).toBeNull();
  }, 120_000);
});
describe('named timers (LEDGER #440)', () => {
  test('which are running, paused or done; none says how to start one', () => {
    expect(text(awX1Answer('what timers are running', zigiEnv(showcaseAll()), extra()))).toMatch(/^2 timers are on:\n• Pasta: 8 min left \(ends at .+\)\n• Laundry: paused, 40 min left$/);
    expect(text(awX1Answer('welke timers lopen er', zigiEnv(showcaseAll()), extra()))).toMatch(/^2 timers staan aan:\n• Pasta: nog 8 min \(klaar om \d\d:\d\d\)\n• Laundry: gepauzeerd, nog 40 min$/);
    expect(text(awX1Answer('what timers are running', zigiEnv(freshAll()), extra({timers: emptyTimers()})))).toMatch(/^No timer is running\. Open Timers.*A task can also be timed in Tasks → Today; none is now\.$/);
  });
  test('a question about timers also names the tasks being timed', () => {
    const s = showcaseAll(), task = s.nova!.tasks!.tasks.find(t => !t.doneAt)!;
    s.nova = {...s.nova, taskPlan: {version: 1, timers: [{taskId: task.id, since: s.now!.getTime() - 25 * 60_000}]}} as typeof s.nova;
    const t = text(awX1Answer('which timers are running', zigiEnv(s), extra()));
    expect(t).toMatch(/^2 timers are on:\n• Pasta: /);
    expect(t).toContain(`Tasks being timed (1):\n• ${task.title}: 25 min so far`);
    expect(text(awX1Answer('welke timers lopen er', zigiEnv(s), extra({timers: emptyTimers()})))).toMatch(/^Taken die getimed worden \(1\):\n• .+: 25 min tot nu$/);
  });
  test('when one ends, by its name; one not found lists the running ones', () => {
    expect(text(awX1Answer('when does my pasta timer end', zigiEnv(showcaseAll()), extra()))).toMatch(/^Your Pasta timer ends at .+, in 8 min\.$/);
    expect(text(awX1Answer('wanneer is mijn pastatimer klaar', zigiEnv(showcaseAll()), extra()))).toMatch(/^Je timer Pasta is klaar om \d\d:\d\d, over 8 min\.$/);
    expect(text(awX1Answer('when is my laundry timer done', zigiEnv(showcaseAll()), extra()))).toMatch(/^Your Laundry timer is paused with 40 min left/);
    expect(text(awX1Answer('when does my egg timer end', zigiEnv(showcaseAll()), extra()))).toMatch(/^I can’t find a timer called “egg”\. Running now:\n• Pasta/);
  });
  test('unreadable timers are said, never shown as none; with no record to read, left to the other answers', () => {
    expect(text(awX1Answer('what timers are running', zigiEnv(showcaseAll()), extra({timers: null})))).toMatch(/can’t be read/);
    expect(awX1Answer('what timers are running', zigiEnv(showcaseAll()), {})).toBeNull();
  });
});
describe('remind again and snooze choices (LEDGER #438, #439)', () => {
  test('the default and the own choices, or how to set them', () => {
    expect(text(awX1Answer('can a reminder keep reminding me', zigiEnv(showcaseAll()), extra()))).toMatch(/^Your task reminders remind you again every 10 minutes, up to 6 times/);
    expect(text(awX1Answer('can a reminder keep reminding me', zigiEnv(showcaseAll()), extra({taskAgain: null})))).toMatch(/^A task reminder goes off once now\./);
    expect(text(awX1Answer('what are my snooze choices', zigiEnv(showcaseAll()), extra()))).toBe('Your snooze choices: 2 h, This evening 7:00 PM. The first, “2 h”, is also the snooze button on a notification. Change them in Tasks → This week → Reminders.');
    expect(text(awX1Answer('wat zijn mijn snoozekeuzes', zigiEnv(showcaseAll()), extra({snoozes: undefined})))).toMatch(/^Een herinnering biedt de gewone drie/);
  });
});
