// @vitest-environment jsdom
import {describe, expect, test} from 'vitest';
import {MAILTO_BODY_MAX, MAX_PINS, addPin, clearPins, describeTarget, editPin, emptyPointTell, pinPath, pinsMailto, pinsText, pointTellSchema, removePin, restorePin, selectorOf, setPointTellEnabled} from './store';

// Session AB-Cloud Part 6 (ADR-023 C23): Point & tell's device record and its plain-text export.
const at = '2026-10-14T09:00:00.000Z';
const pin = (id: string, note = 'Hard to read') => ({id: `pin-${id}`, path: '/app/goals', target: 'Create a goal', note, at});

describe('the record', () => {
  test('numbers grow and never reuse a removed number; edit, remove, Undo in place, clear', () => {
    let r = setPointTellEnabled(emptyPointTell(), true);
    r = addPin(addPin(addPin(r, pin('aaaaaaaa')), pin('bbbbbbbb')), pin('cccccccc'));
    expect(r.pins!.map(p => p.n)).toEqual([1, 2, 3]);
    const second = r.pins![1]!;
    r = removePin(r, second.id);
    r = addPin(r, pin('dddddddd'));
    expect(r.pins!.map(p => p.n)).toEqual([1, 3, 4]);
    r = restorePin(r, second);
    expect(r.pins!.map(p => p.n)).toEqual([1, 2, 3, 4]);
    expect(restorePin(r, second)).toBe(r);
    r = editPin(r, second.id, 'Better now');
    expect(r.pins!.find(p => p.id === second.id)!.note).toBe('Better now');
    expect(clearPins(r).pins).toEqual([]);
    expect(r.enabled).toBe(true);
  });
  test('a page path keeps no query or hash; long text is clipped; the limit is said; a later field is kept', () => {
    expect(pinPath('/app/goals/tracked/123?token=abc#x')).toBe('/app/goals/tracked/123');
    expect(pinPath('')).toBe('/');
    const r = addPin(emptyPointTell(), {...pin('eeeeeeee', 'x'.repeat(2000)), path: '/app/health?food=1', target: `  ${'Long '.repeat(60)}`});
    expect(r.pins![0]!.path).toBe('/app/health'); expect(r.pins![0]!.note).toHaveLength(1000); expect(r.pins![0]!.target.length).toBeLessThanOrEqual(120);
    let full = emptyPointTell();
    for (let i = 0; i < MAX_PINS; i++) full = addPin(full, pin(`f${String(i).padStart(7, '0')}`));
    expect(() => addPin(full, pin('zzzzzzzz'))).toThrow(/up to 100 notes/);
    expect(pointTellSchema.parse({version: 1, later: {x: 1}, pins: []})).toMatchObject({later: {x: 1}});
  });
  test('the export: plain text in number order with app version and day; the email is shortened safely', () => {
    const r = addPin(addPin(emptyPointTell(), pin('aaaaaaaa', 'Line one\nLine two')), {...pin('bbbbbbbb', ''), path: '/app/health', target: 'Water'});
    const text = pinsText(r.pins!, {version: '0.39.0', at});
    expect(text).toBe('ZIGoals Point & tell notes (2) · app 0.39.0 · 2026-10-14\n\n1. /app/goals — Create a goal\n   Line one\n   Line two\n\n2. /app/health — Water\n   (no note)\n');
    const mail = pinsMailto('contact@example.invalid', text);
    expect(mail.startsWith('mailto:contact@example.invalid?subject=ZIGoals%20Point%20%26%20tell%20notes&body=')).toBe(true);
    expect(decodeURIComponent(mail.split('body=')[1]!)).toBe(text);
    const long = pinsMailto('contact@example.invalid', 'n'.repeat(5000));
    expect(decodeURIComponent(long.split('body=')[1]!)).toMatch(new RegExp(`^n{${MAILTO_BODY_MAX}}\\n… \\(more notes`));
  });
});

describe('naming what was picked (A17: a role and a developer-made name, never visible text)', () => {
  test('a button in a region reads as its role and the region\'s name; a region\'s data-region wins the selector', () => {
    document.body.innerHTML = '<main><section aria-labelledby="h"><h2 id="h">Your goals</h2><div data-region="goal-list"><button><span>Create a goal</span></button></div></section></main>';
    const span = document.querySelector('span')!;
    expect(describeTarget(span)).toEqual({target: 'button · goal-list', selector: '[data-region="goal-list"]'});
  });
  test('without a region: the role and the nearest safe anchor; the selector still finds it again', () => {
    document.body.innerHTML = '<main id="main"><section><h2>Water</h2><p>Today <b>1.2 L</b></p></section></main>';
    const b = document.querySelector('b')!;
    const d = describeTarget(b);
    expect(d.target).toBe('generic · main');
    expect(document.querySelector(d.selector)).toBe(b);
    expect(selectorOf(b).startsWith('#main')).toBe(true);
    // A form field: its kind only; never its typed value, its placeholder or the form's label.
    document.body.innerHTML = '<form aria-label="Log a meal"><input value="secret value" placeholder="Ann\'s lunch" /></form>';
    expect(describeTarget(document.querySelector('input')!).target).toBe('textbox');
  });
  test('no visible text, label, title or record id ever reaches a pin\'s name', () => {
    document.body.innerHTML = '<main><article data-layout-item="today:goals" aria-label="Walk with Mia"><h3 title="House deposit">House deposit</h3><a href="/app/goals/12345" id="goal-8f3a9c21-5b7d-4e1a-9c3b-2d4e6f8a0b1c"><span>Ann Smith 1,250</span></a></article></main>';
    const d = describeTarget(document.querySelector('span')!);
    for (const personal of ['Walk with Mia', 'House deposit', 'Ann', 'Smith', '1,250', '12345', '8f3a9c21']) expect(d.target).not.toContain(personal);
    expect(d.target).toBe('link · goal-#');
    expect(d.selector).not.toContain('8f3a9c21');
  });
});

describe('Gate B security read, finding 5', () => {
  test('an emoji at a cut is never split: names, notes and the email body stay encodable', () => {
    const emoji = '🎯', name = `${'x'.repeat(118)}${emoji}${emoji}`;
    const r = addPin(emptyPointTell(), {...pin('aaaaaaaa', `${'n'.repeat(999)}${emoji}`), target: name});
    expect(() => encodeURIComponent(r.pins![0]!.target)).not.toThrow();
    expect(() => encodeURIComponent(r.pins![0]!.note)).not.toThrow();
    expect(Array.from(r.pins![0]!.note)).toHaveLength(1000);
    const text = 'y'.repeat(MAILTO_BODY_MAX - 1) + emoji + 'z';
    expect(() => pinsMailto('contact@example.invalid', text)).not.toThrow();
    expect(decodeURIComponent(pinsMailto('contact@example.invalid', text).split('body=')[1]!)).toContain(emoji);
    expect(() => pinsMailto('contact@example.invalid', 'lone \uD83C surrogate')).not.toThrow();
  });
});
