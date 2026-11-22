import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R3_NOTES} from '../evals/as/cases-av2-r3-notes';
import {av2R3NotesAnswer} from './av2-r3-notes';
import type {LocalReply} from './engine';
import {addLocalDays} from '../../local-date';
import {quoteOfTheDay} from '../../journal/quotes';

/**
 * Session AV lane 2 (r3-notes): NOVA's and ZIGi's on-device answers to round 3's notes and journal features, in English
 * and Dutch, from the Showcase and a fresh profile; notes only under NOVA's Notes scope, the journal only where shared,
 * and never a letter's or a dream's words.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const nova = (q: string, s: ToolSources = showcaseAll()) => av2R3NotesAnswer(q, novaEnv(s));
const zigi = (q: string, s: ToolSources = showcaseAll()) => av2R3NotesAnswer(q, zigiEnv(s));
const stamp = `${DAY}T08:00:00.000Z`;
const withNotes = (notes: unknown[], extra: Record<string, unknown> = {}): ToolSources => { const s = showcaseAll(); s.nova = {...s.nova, notes: {version: 1, voice: false, notes, ...extra} as never}; return s; };
const withJournal = (entries: unknown[], extra: Record<string, unknown> = {}): ToolSources => { const s = showcaseAll(); return {...s, journal: {...s.journal!, entries: entries as never, ...extra}}; };

describe('every corpus question gets its own answer, in its language, from NOVA and ZIGi', () => {
  for (const c of AV2_R3_NOTES) test(c.id, () => {
    for (const [lang, questions] of [['en', c.en], ['nl', c.nl]] as const) for (const q of questions) for (const ask of [nova, zigi]) {
      const r = ask(q);
      expect(r, q).not.toBeNull();
      expect(r!.kind, q).toBe('answer');
      expect(text(r).length, q).toBeGreaterThan(20);
      if (lang === 'nl') expect(text(r), q).toMatch(/\b(?:je|jouw|er|nog|geen|staat|op|het|de|een|van|met|om|is)\b/);
    }
  });
  test('other questions are not these answers', () => {
    for (const q of ['what is my writing streak', 'which tasks are due today', 'log 500 ml water', 'which notes link to Japan adventure', 'what is my affirmation today']) expect(nova(q), q).toBeNull();
  });
});
describe('notes (LEDGER #264, #267, #270, #273), under NOVA’s Notes scope', () => {
  const notes = [
    {id: 'a', kind: 'topic', title: 'Fictional trip', body: 'Pack ==🟢light== bags.\n\n- [ ] passport\n- [x] tickets', createdAt: stamp, updatedAt: stamp, props: [{k: 'Status', t: 'choice', v: 'Planning'}]},
    {id: 'b', kind: 'daily', title: addLocalDays(DAY, -1), day: addLocalDays(DAY, -1), body: '- [ ] call the fictional plumber', createdAt: stamp}];
  test('open tick boxes, with their note; highlights with their colour', () => {
    expect(text(nova('which tick boxes are open in my notes', withNotes(notes)))).toBe('2 open tick boxes in your notes:\n• passport (“Fictional trip”)\n• call the fictional plumber (Mon, Nov 16)');
    expect(text(nova('welke vinkjes staan nog open in mijn notities', withNotes(notes)))).toMatch(/^2 open vinkjes in je notities:\n• passport \(“Fictional trip”\)\n• call the fictional plumber \(ma 16 nov\)/);
    expect(text(nova('what did I highlight in my notes', withNotes(notes)))).toBe('1 highlight in your notes:\n• light (green, “Fictional trip”)');
    expect(text(nova('wat heb ik gemarkeerd in mijn notities', withNotes(notes)))).toContain('light (groen, “Fictional trip”)');
  });
  test('properties with their values, and canvases with their cards and lines', () => {
    expect(text(nova('which properties do my notes have', withNotes(notes)))).toBe('Your notes use 1 property:\n• Status (choice, 1 note: Planning)\nNotes → Notes → Board groups them by a choice.');
    const board = {id: 'cv-trip0001', name: 'Fictional board', updatedAt: stamp, nodes: [{id: 'x', type: 'text', text: 'A', x: 0, y: 0, w: 100, h: 100}, {id: 'y', type: 'note', note: 'a', x: 200, y: 0, w: 100, h: 100}, {id: 'g', type: 'group', label: 'G', x: 0, y: 0, w: 400, h: 200}], edges: [{id: 'e', from: 'x', to: 'y'}]};
    expect(text(nova('which canvases do I have', withNotes(notes, {canvases: [board]})))).toBe('1 canvas in Notes → Canvas:\n• Fictional board (2 cards, 1 line)');
    expect(text(nova('welke canvassen heb ik', withNotes(notes, {canvases: [board]})))).toBe('1 canvas in Notes → Canvas:\n• Fictional board (2 kaarten, 1 lijn)');
  });
  test('empty notes teach where; ZIGi does not read notes', () => {
    expect(text(nova('which tick boxes are open in my notes', freshAll()))).toMatch(/^No open tick box in your notes\. A line that starts with - \[ \]/);
    expect(text(zigi('which tick boxes are open in my notes', withNotes(notes)))).toMatch(/^ZIGi doesn’t read your notes\./);
  });
});
describe('the journal (LEDGER #265, #266, #269, #277, #278, #279)', () => {
  test('the prompts written from, from the Showcase', () => {
    expect(text(nova('which prompts have I written from'))).toBe('You wrote from 1 prompt: Three good things (1 entry). Journal → Entries → Every answer to a prompt shows what you wrote under each heading.');
  });
  test('week, month and year entries', () => {
    const s = withJournal([{id: 'w', date: DAY, text: 'Fictional week.', createdAt: stamp, period: '2026-W47'}, {id: 'm', date: DAY, text: 'Fictional month.', createdAt: stamp, period: '2026-10'}]);
    expect(text(nova('which week or month look backs have I written', s))).toBe('2 periods with an entry about it: Week 47 (Nov 16 – Nov 22, 2026) and Oct 2026. Search by date lists them under their week, month or year.');
    expect(text(nova('welke terugblikken heb ik geschreven', s))).toMatch(/^2 periodes met een stuk erover: week 47 van 2026 en /);
  });
  test('today’s quote, in English and in the Dutch written for ZIGoals', () => {
    const q = quoteOfTheDay(DAY);
    expect(text(nova('what is today s stoic quote'))).toContain(`“${q.en}”`);
    expect(text(nova('wat is het citaat van vandaag'))).toContain(`“${q.nl}”`);
    expect(text(nova('what is today s stoic quote', withJournal([], {quotes: true})))).toContain('It is on your Today screen');
  });
  test('dreams and letters: counts and days, never their words', () => {
    const s = withJournal([
      {id: 'd1', date: DAY, text: 'A secret fictional dream about a lighthouse.', createdAt: stamp, journal: 'j-dreams01', night: DAY},
      {id: 'l1', date: '2026-01-02', text: 'Dear future me, secret fictional words.', createdAt: stamp, opensOn: '2027-01-02'},
      {id: 'l2', date: '2025-11-15', text: 'Dear me, secret words opened.', createdAt: stamp, opensOn: addLocalDays(DAY, -1)}], {journals: [{id: 'j-dreams01', name: 'Dreams', theme: 'cyan'}]});
    const d = text(nova('which dreams did I write down', s)), l = text(nova('when does my letter open', s));
    expect(d).toBe('1 dream written down, for 1 night; the latest for the night ending Tue, Nov 17. They are in your Dreams journal.');
    expect(l).toMatch(/^1 letter folded away; the next opens .*\. A letter opened this week: Today shows it\.$/);
    for (const t of [d, l, text(nova('wanneer gaat mijn brief open', s)), text(nova('welke dromen heb ik opgeschreven', s))]) expect(t).not.toMatch(/secret|lighthouse/);
  });
  test('the journal kept from NOVA without its permission', () => {
    const r = av2R3NotesAnswer('which dreams did I write down', novaEnv(showcaseAll(), {journal: false, notes: true} as never));
    expect(r?.kind === 'refusal' || /can’t be read/.test(text(r))).toBe(true);
  });
});
