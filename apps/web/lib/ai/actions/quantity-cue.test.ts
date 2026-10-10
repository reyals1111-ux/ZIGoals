import {expect, test} from 'vitest';
import {applyQuantityCue, quantityCue} from './quantity-cue';
import {applyDayCue} from './day-cue';
import {parseReply} from './parse';

// Session Z-Local Part 4 (ADR-020 L6): the spoken quantity fills or corrects a log card on the device.
const block = (json: string) => `Done.\n\n\`\`\`zigoals-action\n${json}\n\`\`\``;
const cards = (reply: string) => parseReply(reply).proposals;

test('quantityCue: exactly one quantity with a unit the log kinds take; none, two, a range or a bare number give null', () => {
  expect(quantityCue('log two and a half litres')).toMatchObject({value: 2.5, unit: 'litres'});
  expect(quantityCue('ik heb drie glazen water gedronken')).toMatchObject({value: 3, unit: 'glazen'});
  expect(quantityCue('I walked ten thousand steps')).toMatchObject({value: 10000, unit: 'steps'});
  expect(quantityCue('twenty minutes of meditation, no wait, twenty five')).toMatchObject({value: 25, unit: 'minutes'});
  expect(quantityCue('I weigh seventy two point five kilos')).toMatchObject({value: 72.5, unit: 'kilos'});
  expect(quantityCue('log 3 glasses and 20 minutes')).toBeNull();
  expect(quantityCue('3 to 5 glasses')).toBeNull();
  expect(quantityCue('log 3')).toBeNull();
  expect(quantityCue('remind me at 7:30')).toBeNull();
  expect(quantityCue('How many steps did I walk?')).toBeNull();
});
test('a log card without the figure takes the spoken one; a card whose figure appears in the message is left alone', () => {
  const filled = cards(applyQuantityCue(block('{"kind":"log-water"}'), 'log two glasses of water'));
  expect(filled).toEqual([{kind: 'log-water', glasses: 2, day: 'today'}]);
  const litres = cards(applyQuantityCue(block('{"kind":"log-water"}'), 'ik dronk anderhalve liter water'));
  expect(litres).toEqual([{kind: 'log-water', millilitres: 1500, day: 'today'}]);
  const typed = block('{"kind":"log-water","glasses":3}');
  expect(applyQuantityCue(typed, 'log 3 glasses')).toBe(typed);
  const converted = block('{"kind":"log-water","millilitres":500}');
  expect(applyQuantityCue(converted, 'log two glasses of water')).toBe(converted); // 2 × 250 mL: a correct conversion stays
});
test('a misheard number word is corrected: the card carries a figure that appears nowhere in the message', () => {
  const steps = cards(applyQuantityCue(block('{"kind":"log-steps","steps":1000}'), 'I walked ten thousand steps'));
  expect(steps).toEqual([{kind: 'log-steps', steps: 10000, day: 'today'}]);
  const minutes = cards(applyQuantityCue(block('{"kind":"log-meditation","minutes":20}'), 'twenty minutes of meditation, no wait, twenty five'));
  expect(minutes).toEqual([{kind: 'log-meditation', minutes: 25, day: 'today'}]);
  const weight = cards(applyQuantityCue(block('{"kind":"log-weight","value":72,"unit":"kg"}'), 'I weigh seventy two point five kilos'));
  expect(weight).toEqual([{kind: 'log-weight', value: 72.5, unit: 'kg', day: 'today'}]);
  const pounds = cards(applyQuantityCue(block('{"kind":"log-weight","value":160,"unit":"kg"}'), 'I weigh one hundred and sixty five pounds'));
  expect(pounds).toEqual([{kind: 'log-weight', value: 165, unit: 'lb', day: 'today'}]);
  const water = cards(applyQuantityCue(block('{"kind":"log-water","millilitres":250}'), 'ik heb drie glazen water gedronken'));
  expect(water).toEqual([{kind: 'log-water', glasses: 3, day: 'today'}]);
});
test('other kinds, a second quantity in the message, and a card of another kind are untouched; arrays are handled card by card', () => {
  const habit = block('{"kind":"check-in","habit":"h1"}');
  expect(applyQuantityCue(habit, 'I read twenty pages')).toBe(habit);
  const two = block('{"kind":"log-water","glasses":1}');
  expect(applyQuantityCue(two, 'two glasses of water and 30 minutes of walking')).toBe(two);
  const both = cards(applyQuantityCue(block('[{"kind":"log-water"},{"kind":"check-in","habit":"h1"}]'), 'two glasses of water'));
  expect(both).toEqual([{kind: 'log-water', glasses: 2, day: 'today'}, {kind: 'check-in', habit: 'h1', day: 'today'}]);
});
test('applyDayCue applies the quantity cue too, so the app\'s one call and the harness\'s read both', () => {
  const out = cards(applyDayCue(block('{"kind":"log-water"}'), 'yesterday I drank two glasses of water', '2026-09-20'));
  expect(out).toEqual([{kind: 'log-water', glasses: 2, day: 'yesterday'}]);
});
test('a check-in that already carries minutes keeps that one field (the strict schema refuses a second); a mis-heard figure is corrected in the card\'s own name', () => {
  const kept = block('{"kind":"check-in","habit":"h1","minutes":20}');
  expect(applyQuantityCue(kept, 'Meditated 20 minutes')).toBe(kept);
  expect(parseReply(applyQuantityCue(block('[{"kind":"check-in","habit":"h1","minutes":20},{"kind":"check-in","habit":"h2","minutes":30}]'), 'Meditated 20 minutes and read 30')).proposals).toHaveLength(2);
  expect(cards(applyQuantityCue(block('{"kind":"check-in","habit":"h1","minutes":2}'), 'I meditated for twenty minutes'))).toEqual([{kind: 'check-in', habit: 'h1', minutes: 20, day: 'today'}]);
  expect(cards(applyQuantityCue(block('{"kind":"check-in","habit":"h1"}'), 'I meditated for twenty minutes'))).toEqual([{kind: 'check-in', habit: 'h1', minutes: 20, day: 'today'}]);
});
