import {describe, expect, test} from 'vitest';
import {addBringUp, bringUpLineFrom, bringUpSchema, clearTicked, emptyBringUp, MAX_BRING_UP, openBringUp, removeBringUp, restoreBringUp, tickBringUp} from './bring-up';

/** Session AV lane 2, round 6 (r6-body; LEDGER #417): "To bring up" — the lines kept between visits for the report. */
const AT = new Date('2026-11-22T09:00:00.000Z'), LATER = new Date('2026-11-29T09:00:00.000Z');
describe('to bring up', () => {
  test('typed or from a journal entry or a check-in; ticked off after the visit; cleared with Undo', () => {
    let r = addBringUp(emptyBringUp(), {text: ' Ask about   the headaches ', from: 'typed'}, 'bu-0001-abcd', AT);
    r = addBringUp(r, {text: 'Felt tense', from: 'checkin', day: '2026-11-21'}, 'bu-0002-abcd', AT);
    expect(r.items.map(x => [x.text, x.from, x.day])).toEqual([['Ask about the headaches', 'typed', undefined], ['Felt tense', 'checkin', '2026-11-21']]);
    r = tickBringUp(r, 'bu-0001-abcd', true, LATER);
    expect(openBringUp(r).map(x => x.text)).toEqual(['Felt tense']);
    expect(tickBringUp(r, 'bu-0001-abcd', false, LATER).items[0]!.doneAt).toBeUndefined();
    const {record, removed} = clearTicked(r);
    expect(record.items.map(x => x.id)).toEqual(['bu-0002-abcd']);
    expect(restoreBringUp(record, removed[0]!, 0)).toEqual(r);
    const gone = removeBringUp(r, 'bu-0002-abcd');
    expect(restoreBringUp(gone, r.items[1]!, 1)).toEqual(r);
    expect(bringUpSchema.parse(r)).toEqual(r);
  });
  test('a journal entry gives its first sentence, cut at a word when long', () => {
    expect(bringUpLineFrom('Slept badly again. The dog barked all night.')).toBe('Slept badly again.');
    const long = bringUpLineFrom('word '.repeat(80));
    expect(long.length).toBeLessThanOrEqual(200); expect(long.endsWith('…')).toBe(true);
  });
  test('says a sentence for an empty line, an open repeat and a full list', () => {
    const r = addBringUp(emptyBringUp(), {text: 'Sleep', from: 'typed'}, 'bu-0001-abcd', AT);
    expect(() => addBringUp(r, {text: ' ', from: 'typed'}, 'bu-0002-abcd', AT)).toThrow('Type what you want to bring up first.');
    expect(() => addBringUp(r, {text: 'sleep', from: 'journal'}, 'bu-0002-abcd', AT)).toThrow('This is on your list already.');
    expect(addBringUp(tickBringUp(r, 'bu-0001-abcd', true, AT), {text: 'Sleep', from: 'typed'}, 'bu-0002-abcd', AT).items).toHaveLength(2);
    let full = emptyBringUp();
    for (let i = 0; i < MAX_BRING_UP; i++) full = addBringUp(full, {text: `Line ${i}`, from: 'typed'}, `bu-${String(i).padStart(4, '0')}-abcd`, AT);
    expect(() => addBringUp(full, {text: 'One more', from: 'typed'}, 'bu-9999-abcd', AT)).toThrow(`Up to ${MAX_BRING_UP} lines fit. Tick off or remove one first.`);
  });
});
