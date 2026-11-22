import {describe, expect, test} from 'vitest';
import {DAY, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_SYNC} from '../evals/as/cases-av2-sync';
import {av2SyncAnswer, type Av2SyncExtra} from './av2-sync';
import type {LocalReply} from './engine';

/** Session AV lane 2 (sync and appearance): the on-device answers, English and Dutch, NOVA and ZIGi, from the device's own choices. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const FULL: Av2SyncExtra = {sections: {journal: true, money: false, workouts: true}, extrasOn: true, look: {theme: 'dark', darkStyle: 'contrast', font: 'serif'}, backup: {version: 1, savedOn: '2026-11-10', schedule: {every: 'week', folder: 'Backups', lastOn: '2026-11-10'}}};

describe('every corpus question gets an answer of its own, in its language, with and without the choices', () => {
  test.each(AV2_SYNC.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]))('%s: %s', (_id, q, lang) => {
    for (const env of [novaEnv(showcaseAll()), zigiEnv(showcaseAll())]) for (const extra of [FULL, {}]) {
      const t = text(av2SyncAnswer(q, env, extra));
      expect(t.length, q).toBeGreaterThan(20);
      // ("of" is Dutch for "or", so only the English words that never appear in Dutch.)
      if (lang === 'nl') expect(t, q).not.toMatch(/\b(?:the|your|this|is not)\b/);
    }
  });
});

describe('answers read the choices', () => {
  const env = novaEnv(showcaseAll());
  test('which sections travel, and that the workout log needs Health sync; none chosen; extras off', () => {
    expect(text(av2SyncAnswer('is my journal synced', env, FULL))).toBe('This device syncs your journal and your workout log, end-to-end encrypted; your money records stay here. Photos and voice notes stay on the device where you added them. The workout log travels only while Health sync is on.');
    expect(text(av2SyncAnswer('is my journal synced', env, {...FULL, sections: {journal: false, money: false, workouts: false}}))).toMatch(/^None of them/);
    expect(text(av2SyncAnswer('wordt mijn dagboek gesynchroniseerd', env, {...FULL, extrasOn: false}))).toMatch(/^Extra-synchronisatie staat uit/);
  });
  test('Dark\'s style and the theme; the font', () => {
    expect(text(av2SyncAnswer('is high contrast on', env, FULL))).toBe('You use Dark, style High contrast. Every word is at least 7:1 on black, with strong focus rings.');
    expect(text(av2SyncAnswer('welk thema gebruik ik', env, {...FULL, look: {theme: 'light', darkStyle: 'black', font: 'system'}}))).toMatch(/^Je gebruikt Light\. De stijl van Dark is Puur zwart/);
    expect(text(av2SyncAnswer('which font am I using', env, FULL))).toMatch(/^Your font is Serif\./);
  });
  test('the schedule: how often, where, the last and the next copy', () => {
    expect(text(av2SyncAnswer('when is my next backup', env, FULL))).toMatch(/^A copy every week into “Backups”\. The last copy was .+\. One is due now; it is made when you next open ZIGoals\.$/);
    const later = text(av2SyncAnswer('when is my next backup', env, {...FULL, backup: {version: 1, schedule: {every: 'month', lastOn: DAY}}}));
    expect(later).toMatch(/^A copy every month \(a reminder: this browser does not write into a folder\)\. The last copy was .+ The next one is /);
    expect(text(av2SyncAnswer('heb ik een automatische back-up', env, {...FULL, backup: {version: 1}}))).toMatch(/Er is geen kopie op schema/);
  });
  test('not these questions: null', () => {
    for (const q of ['how many habits did I do today', 'what did I spend this week', 'show my journal']) expect(av2SyncAnswer(q, env, FULL), q).toBeNull();
  });
});
