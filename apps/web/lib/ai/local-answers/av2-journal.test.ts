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
      if (lang === 'nl') expect(text(r), q).toMatch(/\b(?:je|jouw|er|nog|geen|staat|op|het|de|een|elke|van|met|leeg)\b/);
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

describe('prompt packs (LEDGER #38)', () => {
  test('none on: where they are; on: their names; today’s question names its pack, and with none on is left to av-life', () => {
    expect(text(zigi('which prompt packs are on'))).toContain('No prompt pack is on. Journal → Write → Prompt packs has Sleep, Training');
    const s = withJournal(showcaseAll(), j => ({...j, packs: ['sleep', 'training']}));
    expect(text(zigi('which prompt packs are on', s))).toBe('2 prompt packs are on: Sleep and Training. Their questions take turns with the everyday one as today’s question.');
    expect(text(zigi('welke vragenpakketten staan aan', s))).toBe('2 vragenpakketten staan aan: Slaap en Training. Hun vragen wisselen af met de gewone vraag van de dag.');
    expect(text(zigi('what is today\'s journal question', s))).toMatch(/^Today’s journal question( \((?:Sleep|Training) pack\))?: “.+\?” Journal → Another question shows the next one\.$/);
    expect(zigi('what is today\'s journal question')).toBeNull();
  });
});

describe('the default template and the earlier versions (LEDGER #39, #33)', () => {
  test('new entries start empty, or from the chosen template', () => {
    expect(text(zigi('what is my default journal template'))).toContain('New journal entries start empty.');
    const s = withJournal(showcaseAll(), j => ({...j, defaultTemplate: 'own-showcase01'}));
    expect(text(zigi('which template do new entries start from', s))).toBe('New journal entries start from “Example · Run diary”. Journal → Start from a prompt changes it.');
    expect(text(zigi('welk sjabloon krijgen nieuwe stukken', withJournal(showcaseAll(), j => ({...j, defaultTemplate: 'gratitude'}))))).toContain('“Dankbaarheid”');
  });
  test('the Showcase’s changed entry and its earlier version; a fresh profile has none', () => {
    expect(text(zigi('which journal entries have I changed'))).toBe('1 journal entry has been changed (Sun, Nov 15), with 1 earlier version kept on this device. Each entry’s More lists them, to read or restore.');
    expect(text(zigi('welke dagboekstukken heb ik veranderd'))).toBe('1 dagboekstuk is veranderd (zo 15 nov), met 1 eerdere versie bewaard op dit apparaat. More bij elk stuk toont ze, om te lezen of terug te zetten.');
    expect(text(zigi('do I have earlier versions of my journal entries', freshAll()))).toContain('No journal entry has been changed');
  });
});

describe('repeating notes and the daily note template (LEDGER #32)', () => {
  test('the Showcase’s repeating note, in English and Dutch; a fresh profile has none and says where', () => {
    expect(text(zigi('which repeating notes do I have'))).toBe('1 repeating note: Example · Week plan (every Monday, made “Example · Week plan · 2026-11-16”). Daily notes start empty (Notes → Days → Daily note template).');
    expect(text(zigi('welke terugkerende notities heb ik'))).toBe('1 terugkerende notitie: Example · Week plan (elke maandag, gemaakt: “Example · Week plan · 2026-11-16”). Dagnotities beginnen leeg (Notes → Days → Daily note template).');
    expect(text(zigi('what are my note templates', freshAll()))).toContain('No repeating note yet.');
  });
  test('NOVA without its Notes scope refuses', () => {
    const env = novaEnv(showcaseAll(), {...DEFAULT_NOVA_SCOPES, health: true, journal: true, notes: false});
    expect(av2JournalAnswer('which repeating notes do I have', env)?.kind).toBe('refusal');
  });
});

describe('earlier versions of notes (LEDGER #33)', () => {
  test('the Showcase’s one, in English and Dutch; journal versions stay the journal’s answer', () => {
    expect(text(zigi('which notes have earlier versions'))).toBe('1 earlier version of 1 note: Books to read. Each note’s Earlier versions shows them, to read or restore.');
    expect(text(zigi('welke notities hebben eerdere versies'))).toBe('1 eerdere versie van 1 notitie: Books to read. Earlier versions bij elke notitie toont ze, om te lezen of terug te zetten.');
    expect(text(zigi('do I have earlier versions of my journal entries'))).toContain('1 journal entry has been changed');
    expect(text(zigi('which notes have earlier versions', freshAll()))).toContain('No note has an earlier version yet.');
  });
});

describe('imported entries (LEDGER #44)', () => {
  test('none yet: where to import; imported: how many and from when', () => {
    expect(text(zigi('how many journal entries did I import'))).toContain('No journal entry was imported yet.');
    const s = withJournal(showcaseAll(), j => ({...j, entries: j.entries.map((e, i) => i < 2 ? {...e, imported: 'dayone' as const} : e)}));
    expect(text(zigi('how many journal entries did I import', s))).toMatch(/^2 journal entries were imported, from .+ to .+\.$/);
    expect(text(zigi('hoeveel dagboekstukken heb ik geïmporteerd', s))).toMatch(/^2 dagboekstukken zijn geïmporteerd, van .+ tot .+\.$/);
  });
});

describe('photos and voice notes in entries (LEDGER #35, #42)', () => {
  test('none yet: where to add them; with media: the counts and the minutes, in English and Dutch', () => {
    expect(text(zigi('how many photos are in my journal'))).toContain('No photo or voice note in your journal yet.');
    const s = withJournal(showcaseAll(), j => ({...j, entries: j.entries.map((e, i) => i === 0 ? {...e, photos: ['m-photo00001', 'm-photo00002'], audio: [{id: 'm-audio00001', seconds: 150}]} : e)}));
    expect(text(zigi('do I have voice notes in my journal', s))).toBe('2 photos and 1 voice note (about 3 minutes) in 1 entry, kept on this device only.');
    expect(text(zigi('hoeveel foto’s staan er in mijn dagboek', s))).toBe('2 foto’s en 1 spraakmemo (ongeveer 3 minuten) in 1 stuk, alleen op dit apparaat bewaard.');
  });
});
