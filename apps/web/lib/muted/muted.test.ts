import {describe, expect, test} from 'vitest';
import {mutedCount, readMuted, withMuted} from './rule';
import {DAILY_QUESTIONS, questionIndexOfTheDay, questionOfTheDay} from '../journal-prompts/daily';
import {habitExtrasSchema} from '../habits-extras/schema';
import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {forgetAaDeviceRecords} from '../aa-device-forget';
import {DEVICE_PARTS} from '../restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from '../vault/backup-records';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {av2HabitsAnswer} from '../ai/local-answers/av2-habits';

/** Session AV lane 2 (habits; LEDGER #56): one list of hidden daily questions, journal templates and breathing patterns. */
const DAY = '2026-11-18';
describe('the hidden list', () => {
  test('hide, read, bring back; other fields and later fields kept; odd entries ignored', () => {
    const base = habitExtrasSchema.parse({version: 1, bells: {h: true}, muted: {later: 1}});
    const m = withMuted(withMuted(withMuted(base, 'questions', 3, true), 'templates', 'gratitude', true), 'breathing', '478', true);
    expect(readMuted(m)).toEqual({questions: new Set([3]), templates: new Set(['gratitude']), breathing: new Set(['478'])});
    expect((m as {muted: Record<string, unknown>}).muted.later).toBe(1);
    expect(habitExtrasSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
    expect(mutedCount(readMuted(withMuted(m, 'questions', 3, false)))).toBe(2);
    expect(readMuted({muted: {questions: [-1, 2.5, 'x', 4], templates: ['Bad Id', 'ok-1'], breathing: 7}})).toEqual({questions: new Set([4]), templates: new Set(['ok-1']), breathing: new Set()});
    expect(() => withMuted(base, 'templates', 'Not OK', true)).toThrow();
    // Hiding twice keeps one entry.
    expect((withMuted(withMuted(base, 'questions', 1, true), 'questions', 1, true) as unknown as {muted: {questions: number[]}}).muted.questions).toEqual([1]);
  });
  test('the daily question passes over hidden ones; all hidden, none is skipped', () => {
    const i = questionIndexOfTheDay(DAY);
    expect(questionOfTheDay(DAY, 0, 'en', new Set([i]))).toBe(DAILY_QUESTIONS[(i + 1) % DAILY_QUESTIONS.length]);
    expect(questionOfTheDay(DAY, 0, 'en', new Set([i, (i + 1) % DAILY_QUESTIONS.length]))).toBe(DAILY_QUESTIONS[(i + 2) % DAILY_QUESTIONS.length]);
    expect(questionOfTheDay(DAY, 0, 'en', new Set(DAILY_QUESTIONS.map((_, k) => k)))).toBe(DAILY_QUESTIONS[i]);
    expect(questionOfTheDay(DAY)).toBe(DAILY_QUESTIONS[i]); // nothing hidden: unchanged
  });
  test('export → erase → restore keeps it', () => {
    const m = new Map<string, string>();
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const extras = withMuted(withMuted({version: 1}, 'questions', 5, true), 'breathing', 'box', true);
    storage.setItem(HABIT_EXTRAS_KEY, JSON.stringify(extras));
    const {sections} = exportRecordSections(storage, {health: false});
    forgetAaDeviceRecords(storage);
    expect(m.has(HABIT_EXTRAS_KEY)).toBe(false);
    const section = sectionOf(DEVICE_PARTS.find(p => p.key === HABIT_EXTRAS_KEY)!)!;
    restoreRecordSection(storage, section, sections[section]!);
    expect(JSON.parse(m.get(HABIT_EXTRAS_KEY)!)).toEqual(extras);
  });
  test('NOVA and ZIGi say what is hidden, in English and Dutch', () => {
    const s = showcaseAll();
    const text = (q: string, x: unknown) => { const r = av2HabitsAnswer(q, zigiEnv({...s, ak: {...s.ak, habitExtras: x}})); return r && 'text' in r ? r.text : ''; };
    expect(text('which prompts have I hidden', {version: 1})).toContain('Nothing is hidden');
    expect(text('welke vragen heb ik verborgen', {version: 1})).toContain('Er is niets verborgen');
    const x = withMuted(withMuted({version: 1}, 'questions', 0, true), 'breathing', '478', true);
    expect(text('what questions did I hide', x)).toBe(`Hidden on this device: 1 daily question (“${DAILY_QUESTIONS[0]}”); breathing patterns: 4-7-8. Journal → Start from a prompt → Hidden prompts and exercises brings them back.`);
    expect(text('welke oefeningen heb ik verborgen', x)).toMatch(/^Verborgen op dit apparaat: 1 dagvraag \(“.+”\); ademhalingspatronen: 4-7-8\./);
  });
});
