import {describe, expect, it} from 'vitest';
import {TEXT_LIMITS, VALUE_LIMITS, validateValue, weightIssue, waterEntryIssue} from '../limits/plausibility';

// Session AL (3d): one table, one validateValue for forms, Quick add, ZIGi/NOVA cards, the Checklist and imports.
describe('validateValue: numbers', () => {
  it('weight: kg and lb, decimal commas, converted to kg; the same bounds as the store (weightIssue)', () => {
    expect(validateValue('weight', '72,5')).toMatchObject({ok: true, value: 72.5, input: 72.5, unit: 'kg'});
    const lb = validateValue('weight', '160', 'lb');
    expect(lb.ok && lb.value).toBeCloseTo(72.57, 2);
    expect(validateValue('weight', '19.9').error).toBe('Enter a weight from 20 to 400 kg.');
    expect(validateValue('weight', '900', 'lb').error).toBe('Enter a weight from 45 to 881 lb.');
    // Every value the form accepts, the store accepts too.
    for (const [raw, unit] of [['20', 'kg'], ['400', 'kg'], ['45', 'lb'], ['881', 'lb']]) {
      const r = validateValue('weight', raw, unit);
      expect(r.ok, raw).toBe(true); if (r.ok) expect(weightIssue(r.value * 1000), raw).toBeNull();
    }
    expect(validateValue('weight', '70', 'cm').error).toBe('Choose kg or lb.');
    expect(validateValue('weight', '').error).toBe('Enter a weight.');
    expect(validateValue('weight', '72.555').error).toMatch(/2 decimal places/);
  });
  it('LS-007: a weight never logs without a value', () => {
    expect(validateValue('weight', undefined).ok).toBe(false);
    expect(validateValue('weight', null).ok).toBe(false);
  });
  it('height and waist in cm or inches (MO-140), returned in cm', () => {
    const w = validateValue('waist', '35,4', 'in');
    expect(w.ok && Math.round(w.value * 10) / 10).toBe(89.9);
    expect(validateValue('height', '180').value).toBe(180);
    expect(validateValue('height', '300').error).toBe('Enter a height from 50 to 272 cm.');
  });
  it('water per entry: mL, fl oz and L, same bound as the store', () => {
    expect(validateValue('water', '250')).toMatchObject({ok: true, value: 250});
    const oz = validateValue('water', '8', 'fl oz');
    expect(oz.ok && waterEntryIssue(oz.value)).toBeNull();
    expect(validateValue('water', '0').error).toBe('Enter an amount of water more than 0 and at most 5,000 mL.');
    expect(validateValue('water', '200', 'fl-oz-us').error).toBe('Enter an amount of water more than 0 and at most 169 fl oz.');
    expect(validateValue('water', '1,5', 'l').value).toBe(1500);
  });
  it('kcal, macros, sleep, minutes, steps, reps, counts, percent', () => {
    expect(validateValue('kcal', '2000').value).toBe(2000);
    expect(validateValue('kcal', '20000').error).toBe('Enter calories from 0 to 10,000 kcal.');
    expect(Math.round(validateValue('kcal', '8368', 'kj').value!)).toBe(2000);
    expect(validateValue('macro', '1200').error).toBe('Enter an amount from 0 to 1,000 g.');
    expect(validateValue('sleepHours', '7,5').value).toBe(7.5);
    expect(validateValue('sleepHours', '25').error).toBe('Enter hours of sleep from 0 to 24 hours.');
    expect(validateValue('minutes', '1441').error).toMatch(/1,440 minutes/);
    expect(validateValue('steps', '12.000').ok).toBe(true);
    expect(validateValue('steps', '1234.5').error).toBe('Enter a whole number from 0 to 100,000 steps.');
    expect(validateValue('steps', '1,000,000').error).toMatch(/100,000 steps/);
    expect(validateValue('reps', '10000').ok).toBe(false);
    expect(validateValue('count', '3').value).toBe(3);
    expect(validateValue('percent', '101').error).toBe('Enter a percentage from 0 to 100%.');
  });
  it('money: USD or EUR, two decimals, up to a trillion; exact text for parseUnits (TK-003)', () => {
    expect(validateValue('money', '1500,75', 'EUR')).toMatchObject({ok: true, value: 1500.75, text: '1500.75', unit: 'EUR'});
    expect(validateValue('money', '1.500,75', 'EUR').text).toBe('1500.75');
    expect(validateValue('money', '1,5', 'USD').text).toBe('1.5');
    expect(validateValue('money', '10.555', 'USD').error).toMatch(/2 decimal places/);
    expect(validateValue('money', '5', 'XYZ').error).toBe('Choose US dollars (USD) or euros (EUR).');
    expect(validateValue('money', '2000000000000').error).toMatch(/1,000,000,000,000/);
    expect(validateValue('money', '-5').error).toMatch(/not negative/);
  });
  it('quantity and goal targets: above zero', () => {
    expect(validateValue('quantity', '0,5').value).toBe(0.5);
    expect(validateValue('quantity', '0').ok).toBe(false);
    expect(validateValue('quantity', '0.123456789012345678').text).toBe('0.123456789012345678');
    expect(validateValue('goalTarget', '20').value).toBe(20);
    expect(validateValue('goalTarget', '0').error).toMatch(/more than 0/);
  });
  it('numbers from a card are checked the same way as typed text', () => {
    expect(validateValue('weight', 70)).toMatchObject({ok: true, value: 70});
    expect(validateValue('weight', 7000).ok).toBe(false);
    expect(validateValue('weight', {}).ok).toBe(false);
  });
  it('every row has sane bounds', () => {
    for (const [kind, row] of Object.entries(VALUE_LIMITS)) expect(row.min, kind).toBeLessThan(row.max);
  });
});
describe('validateValue: text and currency', () => {
  it('lengths per kind of field, trimmed; one-line fields collapse spaces, notes keep lines', () => {
    expect(validateValue('title', '  Read   20 books ').value).toBe('Read 20 books');
    expect(validateValue('title', '   ').error).toBe('A title can’t be empty.');
    expect(validateValue('name', 'x'.repeat(81)).error).toBe('A name can be at most 80 characters (this one has 81).');
    expect(validateValue('name', 'x'.repeat(80)).ok).toBe(true);
    expect(validateValue('note', '').ok).toBe(true);
    expect(validateValue('note', ' a\r\nb ').value).toBe('a\nb');
    expect(validateValue('label', 'x'.repeat(41)).ok).toBe(false);
    expect(validateValue('longNote', 'x'.repeat(2001)).error).toMatch(/2,000 characters/);
    expect(validateValue('message', '').error).toBe('A message can’t be empty.');
    expect(Object.keys(TEXT_LIMITS).sort()).toEqual(['label', 'longNote', 'message', 'name', 'note', 'title']);
  });
  it('currency: USD and EUR only; no code is invented (TK-014)', () => {
    expect(validateValue('currency', 'usd').value).toBe('USD');
    expect(validateValue('currency', '€').value).toBe('EUR');
    expect(validateValue('currency', 'XYZ').error).toMatch(/“XYZ” isn’t one of them/);
    expect(validateValue('currency', '').error).toMatch(/Choose a currency/);
  });
});
