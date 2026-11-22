import {describe, expect, test} from 'vitest';
import {AV2_R5_NOTES_CATALOG_LABELS, AV2_R5_NOTES_ERASE_KEYS, AV2_R5_NOTES_EXPORT_KEYS, AV2_R5_NOTES_PERSONAL_KEYS, AV2_R5_NOTES_RESTORE, NOTE_CARDS_KEY_LITERAL} from '../av2-r5-notes-keys';
import {NOTE_CARDS_KEY, NEW_CARDS_A_DAY, allCards, cardId, cardsOfNote, dueToday, emptyNoteCards, noteCardsSchema, rateCard, schedule} from './cards';
import {notesSchema} from './schema';
import {DEVICE_KEYS, collectEverything} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';

/**
 * Session AV lane 2 (r5-notes; LEDGER #365, Logseq's flashcards; TIER 3 (stored format), a new device key): cards from
 * "question :: answer" lines and #card lines, a small spaced schedule written in code, the cards due today, and the
 * review record read on its own; never a card from a locked or archived note.
 */
const AT = '2026-11-20T09:00:00.000Z', TODAY = '2026-11-22';
describe('cards in the words', () => {
  test('question :: answer lines and #card lines with their indented answer; never code, headings or Logseq properties', () => {
    const body = ['Spanish words', '- hola :: hello', '- [ ] gracias :: thank you', 'key:: value', '## Title :: not a card', 'What is the capital of Peru? #card', '  - Lima', '  - on the coast', 'Plain line.', '```', 'x :: y', '```', 'hola :: hello again'].join('\n');
    const cards = cardsOfNote({id: 'n1', body, name: 'Fictional Spanish'});
    expect(cards.map(c => [c.question, c.answer])).toEqual([['hola', 'hello'], ['gracias', 'thank you'], ['What is the capital of Peru?', 'Lima\non the coast']]);
    expect(cards[0]!.id).toBe(cardId('n1', ' HOLA '));
    expect(cardId('n1', 'hola')).not.toBe(cardId('n2', 'hola'));
  });
  test('never from a locked, archived or inbox note', () => {
    const rec = notesSchema.parse({version: 1, voice: false, notes: [
      {id: 'a', kind: 'topic', title: 'Open', body: 'a :: b', createdAt: AT},
      {id: 'b', kind: 'topic', title: 'Locked', body: 'secret :: words', locked: true, createdAt: AT},
      {id: 'c', kind: 'topic', title: 'Archived', body: 'old :: card', archived: true, createdAt: AT},
      {id: 'd', kind: 'inbox', title: '', body: 'in :: box', createdAt: AT}]});
    expect(allCards(rec.notes).map(c => c.question)).toEqual(['a']);
  });
});
describe('the schedule', () => {
  test('gaps grow with good answers, start again after Again, and stay within a year', () => {
    const g1 = schedule(undefined, 'c-aaaaaaaa', 'good', TODAY);
    expect(g1).toMatchObject({due: '2026-11-23', interval: 1, reps: 1, ease: 2.5, last: TODAY, first: TODAY});
    const g2 = schedule(g1, g1.id, 'good', '2026-11-23'); expect(g2.interval).toBe(3);
    const g3 = schedule(g2, g1.id, 'good', '2026-11-26'); expect(g3.interval).toBe(8);
    const again = schedule(g3, g1.id, 'again', '2026-12-04');
    expect(again).toMatchObject({interval: 1, reps: 0, ease: 2.3, lapses: 1, first: TODAY});
    expect(schedule(undefined, 'c-b', 'easy', TODAY).interval).toBe(4);
    expect(schedule({...g3, interval: 300, reps: 9}, g1.id, 'easy', TODAY).interval).toBe(365);
    expect(schedule({...g3, ease: 1.3}, g1.id, 'hard', TODAY).ease).toBe(1.3);
  });
  test('due today: waiting ones first, then new ones, at most 20 new a day', () => {
    const cards = Array.from({length: 30}, (_, i) => ({id: `c-card${i}`, noteId: 'n', noteName: 'N', question: `q${i}`, answer: 'a'}));
    let rec = emptyNoteCards();
    rec = rateCard(rec, 'c-card29', 'good', '2026-11-20'); // due Nov 21
    const d = dueToday(cards, rec, TODAY);
    expect(d.due[0]!.id).toBe('c-card29');
    expect(d.due).toHaveLength(1 + NEW_CARDS_A_DAY);
    rec = rateCard(rec, 'c-card0', 'good', TODAY);
    const after = dueToday(cards, rec, TODAY);
    expect(after.due.map(c => c.id)).not.toContain('c-card0');
    expect(after.next).toBe('2026-11-23');
  });
  test('the record reads on its own: what this build cannot read is dropped', () => {
    const ok = rateCard(emptyNoteCards(), 'c-card1', 'good', TODAY);
    const odd = noteCardsSchema.parse({...ok, reviews: [...ok.reviews, {id: 'bad', due: 'x'}, {...ok.reviews[0], lapses: 'many'}], later: {kept: true}});
    expect(odd.reviews).toHaveLength(2); expect(odd.reviews[1]!.lapses).toBeUndefined();
    expect((odd as {later?: unknown}).later).toEqual({kept: true});
    expect(noteCardsSchema.parse({version: 1}).reviews).toEqual([]);
  });
});
describe('the new device key', () => {
  test('the literal equals its owner’s constant, and every list names it', () => {
    expect(NOTE_CARDS_KEY_LITERAL).toBe(NOTE_CARDS_KEY);
    const all = Object.values(AV2_R5_NOTES_EXPORT_KEYS);
    expect([...AV2_R5_NOTES_PERSONAL_KEYS].sort()).toEqual([...all].sort());
    expect([...AV2_R5_NOTES_ERASE_KEYS].sort()).toEqual([...all].sort());
    expect(Object.keys(AV2_R5_NOTES_CATALOG_LABELS)).toEqual(Object.keys(AV2_R5_NOTES_EXPORT_KEYS));
    expect(Object.keys(AV2_R5_NOTES_RESTORE)).toEqual(Object.keys(AV2_R5_NOTES_EXPORT_KEYS));
  });
  const registered = Object.values(DEVICE_KEYS as Record<string, string>).includes(NOTE_CARDS_KEY);
  test.skipIf(!registered)('Export everything → erase → Restore keeps the review days', () => {
    const value = rateCard(emptyNoteCards(), 'c-card1', 'good', TODAY);
    const collected = collectEverything({[NOTE_CARDS_KEY]: JSON.stringify(value)}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === NOTE_CARDS_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back ? back.value : undefined).toEqual(value);
  });
});
