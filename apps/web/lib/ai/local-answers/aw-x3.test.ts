import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, ask, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AW_X3} from '../evals/as/cases-aw-x3';
import {awX3Answer} from './aw-x3';
import type {LocalReply} from './engine';

/**
 * Session AW (x3; LEDGER #441, #442, #444, #445): NOVA's and ZIGi's on-device answers, in English and Dutch, from the
 * Showcase and a fresh profile, and through the engine (each corpus question reaches this answer, not another's): this
 * morning's page (never its words), a photo for every day (never "missed"), the searches kept in Notes (only with the
 * notes: ZIGi does not read them; Money keeps "my saved searches"), faster voice notes and morning and evening pages.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const nova = (q: string, s: ToolSources = showcaseAll(), extra = {}) => awX3Answer(q, novaEnv(s), extra);
const zigi = (q: string, s: ToolSources = showcaseAll(), extra = {}) => awX3Answer(q, zigiEnv(s), extra);
const withJournal = (entries: unknown[], more: Record<string, unknown> = {}): ToolSources => { const s = showcaseAll(); s.journal = {version: 1, shareWithAi: false, followUps: true, entries, ...more} as never; return s; };
const RE: Record<string, RegExp> = {'awx3-this-morning': /morning page|ochtendpagina|this morning|vanochtend/i, 'awx3-photo-a-day': /A photo a day/, 'awx3-saved-searches': /saved search|bewaarde zoekopdracht/i, 'awx3-voice-faster': /1\.25×|1,25×/, 'awx3-day-pages': /Morning and evening/};

describe('every corpus question gets its own answer, in its language', () => {
  for (const c of AW_X3) test(c.id, () => {
    for (const [lang, questions] of [['en', c.en], ['nl', c.nl]] as const) for (const q of questions) {
      const r = nova(q);
      expect(r, q).not.toBeNull();
      expect(r!.kind, q).toBe('answer');
      expect(text(r), q).toMatch(RE[c.id]!);
      if (lang === 'nl') expect(text(r), q).toMatch(/\b(?:je|er|nog|geen|staat|op|het|de|een|van|met|om|is)\b/);
      for (const never of c.never ?? []) expect(text(r), q).not.toContain(never);
      // Through the engine: the same answer (in NOVA's wording), not another feature's.
      expect(ask(q, novaEnv(showcaseAll())).text, `engine: ${q}`).toMatch(RE[c.id]!);
    }
  });
});
describe('this morning (#444)', () => {
  test('the Showcase’s morning page: how many answers, under which questions, never the words', () => {
    const t = text(nova('what did I write this morning'));
    expect(t).toBe('This morning’s page is written: 2 answers, under “I am grateful for…” and “What would make today great?”. Its words stay on the Journal page: Journal → Write → Morning and evening shows them above the evening page.');
    expect(t).not.toContain('sunshine');
    expect(text(nova('wat heb ik vanochtend geschreven'))).toMatch(/^De ochtendpagina van vandaag is geschreven: 2 antwoorden, onder /);
  });
  test('without a morning page: an entry before noon is counted; else nothing, said calmly', () => {
    const early = withJournal([{id: 'a', date: DAY, text: 'x', createdAt: `${DAY}T07:00:00.000Z`}]);
    expect(text(nova('what did I write this morning', early, {hour: () => 7}))).toBe('1 journal entry this morning (before noon). Its words stay on the Journal page, under Entries.');
    expect(text(nova('what did I write this morning', freshAll()))).toMatch(/^Nothing written in your journal this morning\. /);
    expect(text(nova('what did I write this morning', withJournal([], {dayPages: {on: true}})))).toMatch(/^Nothing on this morning’s page yet\./);
  });
  test('the journal only where it is shared', () => {
    const shut = nova('what did I write this morning', showcaseAll());
    expect(shut?.kind).toBe('answer');
    const closed = awX3Answer('what did I write this morning', novaEnv(showcaseAll(), {health: true, journal: false, notes: true} as never));
    expect(closed?.kind).toBe('refusal');
  });
});
describe('a photo a day (#445)', () => {
  const photo = (date: string, id: string) => ({id: `e-${date}`, date, text: 'A fictional day.', createdAt: `${date}T09:00:00.000Z`, photos: [id]});
  test('every day so far, not every day, or none: never a missed count', () => {
    const all = withJournal(Array.from({length: 17}, (_, i) => photo(`2026-11-${String(i + 1).padStart(2, '0')}`, `m-photo00${String(i + 10)}`)));
    expect(text(nova('do I have a photo for every day this month', all))).toMatch(/^Yes: every day of November so far has a photo \(17 days\)\./);
    const some = withJournal([photo('2026-11-03', 'm-photo0001'), photo('2026-11-09', 'm-photo0002')]);
    expect(text(nova('do I have a photo for every day this month', some))).toMatch(/^Not every day: a photo on 2 days of the 17 in November so far\. A day without one simply stays blank; nothing is counted as missed\./);
    expect(text(nova('heb ik deze maand elke dag een foto', some))).toMatch(/^Niet elke dag: een foto op 2 dagen van de 17 in november tot nu toe\./);
    expect(text(nova('do I have a photo for every day this month', freshAll()))).toMatch(/^No photo in your journal in November yet\./);
    expect(text(nova('did I have a photo every day last month', withJournal([photo('2026-10-31', 'm-photo0001')])))).toMatch(/^Not every day: a photo on 1 day of the 31 in October\./);
  });
});
describe('saved searches in Notes (#441)', () => {
  test('the Showcase’s two by name; none yet teaches where; ZIGi does not read notes; Money keeps its own', () => {
    expect(text(nova('my saved searches in notes'))).toBe('2 saved searches: “Example · Travel being planned” and “Example · Reading”. Notes → Notes lists them above the search; one tap opens each, and Rename or remove saved searches changes them.');
    expect(text(nova('my saved searches in notes', freshAll()))).toMatch(/^No saved searches yet\. In Notes → Notes, /);
    expect(text(zigi('my saved searches in notes'))).toMatch(/^ZIGi doesn’t read your notes\./);
    expect(nova('what are my saved searches')).toBeNull();
    expect(ask('what are my saved searches', novaEnv(showcaseAll())).text).not.toMatch(/Notes → Notes/);
  });
});
describe('voice notes faster (#442) and morning and evening (#444)', () => {
  test('the player’s speeds, the speed kept, and the transcript said plainly', () => {
    expect(text(nova('can I play my voice notes faster', showcaseAll(), {voiceSpeed: 1.5}))).toContain('Your speed now: 1.5×, kept on this device.');
    expect(text(nova('can I play my voice notes faster', showcaseAll(), {voiceSpeed: null}))).toContain('A written transcript is not made: it needs a model');
    expect(text(zigi('kan ik mijn spraakmemos sneller afspelen', showcaseAll(), {voiceSpeed: null}))).toMatch(/^Ja\. Een spraakmemo/);
  });
  test('where morning and evening is, whether it is on, and its two reminders', () => {
    expect(text(nova('how do I write a morning and evening page'))).toMatch(/It is off now\.$/);
    const on = withJournal([], {dayPages: {on: true}, morningReminder: {on: true, time: '07:15', days: 127}, reminder: {on: true, time: '21:00', days: 127}});
    expect(text(nova('how do I write a morning and evening page', on))).toMatch(/It is on\. Morning reminder: 07:15; evening reminder: 21:00\.$/);
    expect(text(nova('hoe schrijf ik een ochtend en avondpagina', on))).toMatch(/Het staat aan\. Ochtendherinnering: 07:15; avondherinnering: 21:00\.$/);
  });
});
