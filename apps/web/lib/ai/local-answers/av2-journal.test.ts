import {describe, expect, test} from 'vitest';
import type {ToolEnv, ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_JOURNAL} from '../evals/as/cases-av2-journal';
import {av2JournalAnswer} from './av2-journal';
import type {LocalReply} from './engine';
import {addLocalDays} from '../../local-date';
import {DEFAULT_NOVA_SCOPES} from '../context-pack/nova';

/**
 * Session AV lane 2 (journal and notes): NOVA's and ZIGi's on-device answers to the lane's Journal and Notes questions, in
 * English and Dutch, from the Showcase and a fresh profile, each only where the journal is shared with the answer.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const zigi = (q: string, s: ToolSources = showcaseAll()) => av2JournalAnswer(q, zigiEnv(s));
const nova = (q: string, s: ToolSources = showcaseAll()) => av2JournalAnswer(q, novaEnv(s));
const withJournal = (s: ToolSources, change: (j: NonNullable<ToolSources['journal']>) => NonNullable<ToolSources['journal']>): ToolSources => ({...s, journal: change(s.journal!)});
const entry = (date: string, text = 'A fictional day.') => ({id: `e-${date}`, date, text, createdAt: `${date}T20:00:00.000Z`});

describe('every corpus question gets its own answer, in its language, from NOVA and ZIGi', () => {
  for (const c of AV2_JOURNAL) test(c.id, () => {
    for (const [lang, questions] of [['en', c.en], ['nl', c.nl]] as const) for (const q of questions) for (const ask of [zigi, nova]) {
      const r = ask(q);
      expect(r, `${q}`).not.toBeNull();
      expect(r!.kind, q).toBe('answer');
      for (const bad of c.never ?? []) expect(text(r), q).not.toContain(bad);
      if (lang === 'nl') expect(text(r), q).toMatch(/\b(?:je|jouw|er|nog|geen|staat|op|het|de)\b/);
    }
  });
  test('a question about something else is left to the other answers', () => {
    expect(zigi('how many steps did I walk today')).toBeNull();
    expect(zigi('remind me to write the report tomorrow')).toBeNull(); // a request, not a question
  });
});

describe('the reminder to write and the writing streak (LEDGER #40)', () => {
  test('the Showcase reminder, in English and Dutch; off on a fresh profile, with where to set it', () => {
    expect(text(zigi('when is my journal reminder'))).toBe('Your reminder to write is at 21:00, every day, unless you already wrote that day.');
    expect(text(zigi('wanneer is mijn schrijfherinnering'))).toBe('Je herinnering om te schrijven staat om 21:00, elke dag, behalve als je die dag al schreef.');
    const weekdays = withJournal(showcaseAll(), j => ({...j, reminder: {on: true, time: '07:30', days: 1 | 4 | 16}}));
    expect(text(zigi('wanneer is mijn schrijfherinnering', weekdays))).toContain('op ma, wo en vr');
    expect(text(zigi('do i have a reminder to write', freshAll()))).toContain('No reminder to write is set. Journal → Entries → Reminder to write');
  });
  test('the streak as the Journal counts it; a fresh profile says how to start one', () => {
    const s = withJournal(showcaseAll(), j => ({...j, entries: [entry(addLocalDays(DAY, -2)), entry(addLocalDays(DAY, -1))]}));
    expect(text(zigi('what is my writing streak', s))).toBe('Your writing streak: 2 days in a row; write today to keep it. Longest: 2 days.');
    expect(text(zigi('wat is mijn schrijfreeks', s))).toBe('Je schrijfreeks: 2 dagen op rij; schrijf vandaag om hem te houden. Langste: 2 dagen.');
    expect(text(zigi('what is my writing streak', freshAll()))).toContain('No journal entry yet');
  });
  test('closed where the journal is not shared: NOVA without its Journal permission refuses', () => {
    const env: ToolEnv = novaEnv(showcaseAll(), {...DEFAULT_NOVA_SCOPES, health: true, journal: false, notes: true});
    for (const q of ['what is my writing streak', 'wanneer is mijn schrijfherinnering']) expect(av2JournalAnswer(q, env)?.kind, q).toBe('refusal');
  });
});

describe('several journals and what was written on a day (LEDGER #43)', () => {
  test('the Showcase journals with their counts; a fresh profile has one and says how to make another', () => {
    expect(text(zigi('which journals do I have'))).toMatch(/^2 journals: Journal \(the main one\): \d+ entries and Example · Runs: 2 entries\.$/);
    expect(text(zigi('welke dagboeken heb ik'))).toMatch(/^2 dagboeken: Journal \(het hoofddagboek\): \d+ stukken en Example · Runs: 2 stukken\.$/);
    expect(text(zigi('how many journals do I have', freshAll()))).toContain('One journal, the main one, with 0 entries.');
  });
  test('a day as the Journal’s date search reads it; the words stay on the page', () => {
    const day = addLocalDays(DAY, -3);
    expect(text(zigi(`what did I write on ${day}`))).toBe(`1 journal entry on Sat, Nov 14. Their words stay on the Journal page: /app/journal?day=${day}.`);
    expect(text(zigi('wat heb ik op 14 nov geschreven'))).toContain('1 dagboekstuk op za 14 nov');
    expect(text(zigi('what did I write in my journal on 13 nov'))).toContain('No journal entry on');
    expect(zigi('what did I write in my journal yesterday')).toBeNull(); // no "on": left to the other answers
  });
});
