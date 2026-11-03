import {describe, expect, test} from 'vitest';
import {anchorOf, describeElement, normaliseRoute, roleOf, safeAnchorValue, viewportOf, type ElementLike} from './describe';

/** A DOM-like stub: a tag, its attributes, its parent, and text and a value it must never be asked about. */
type Stub = ElementLike & {textContent: string; value?: string; read: string[]};
function el(tagName: string, attrs: Record<string, string> = {}, parent: Stub | null = null, text = 'Ann Smith · €1,250 · 82.4 kg'): Stub {
  const read: string[] = [];
  return {tagName: tagName.toUpperCase(), parentElement: parent, textContent: text, value: 'my secret value', read,
    getAttribute(name: string) { read.push(name); return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name]! : null; }};
}
const PERSONAL = ['Ann', 'Smith', '1,250', '82.4', 'secret', 'House deposit', 'ann@example.com', 'Walk with Mia'];

describe('Point and tell (A17): what a note records about the tapped element', () => {
  test('a button inside a Today card: its role and the card\'s layout item, nothing else', () => {
    const card = el('section', {'data-layout-item': 'today:week', 'aria-label': 'Walk with Mia'});
    const button = el('button', {'aria-label': 'Complete House deposit', title: 'ann@example.com', class: 'primary'}, card);
    const d = describeElement(button);
    expect(d).toEqual({role: 'button', anchor: {kind: 'data-layout-item', value: 'today:week'}});
    // Never visible text, a value, an aria-label, a title, a class or an href.
    expect(JSON.stringify(d)).not.toMatch(new RegExp(PERSONAL.join('|')));
    const asked = new Set([...button.read, ...card.read]);
    for (const never of ['aria-label', 'title', 'class', 'href', 'value', 'alt', 'placeholder', 'aria-describedby']) expect(asked.has(never), never).toBe(false);
  });
  test('an input reports its kind by type only; its value and placeholder are never read', () => {
    const form = el('form', {'data-testid': 'goal-form'});
    const input = el('input', {type: 'text', value: '€1,250', placeholder: 'Ann Smith'}, form);
    expect(describeElement(input)).toEqual({role: 'textbox', anchor: {kind: 'data-testid', value: 'goal-form'}});
    expect(input.read).not.toContain('value'); expect(input.read).not.toContain('placeholder');
    expect(roleOf(el('input', {type: 'checkbox'}))).toBe('checkbox');
    expect(roleOf(el('input', {type: 'range'}))).toBe('slider');
  });
  test('roles: explicit known roles win, unknown words fall back to the tag, a link needs an href (never recorded)', () => {
    expect(roleOf(el('div', {role: 'switch'}))).toBe('switch');
    expect(roleOf(el('div', {role: 'Ann Smith'}))).toBe('generic');
    expect(roleOf(el('h2'))).toBe('heading');
    expect(roleOf(el('a', {href: '/app/goals/tracked/House-deposit'}))).toBe('link');
    expect(roleOf(el('a'))).toBe('generic');
    expect(roleOf(el('span'))).toBe('generic');
  });
  test('anchors: layout item first, then test id, then id; record ids masked; React and odd ids dropped', () => {
    expect(safeAnchorValue('help-aa-review')).toBe('help-aa-review');
    expect(safeAnchorValue('today:widget:3f2a9c1e-77aa-4b2c-9d1e-0123456789ab')).toBe('today:widget:#');
    expect(safeAnchorValue('row-77aa-title')).toBe('row-#-title');
    expect(safeAnchorValue('goal-9201-title')).toBe('goal-#-title');
    for (const odd of ['«r1»', ':r1:', '_r_1_-details', 'Ann Smith', 'ann@example.com', '1234', '', '#x', 'a b']) expect(safeAnchorValue(odd), odd).toBeNull();
    expect(safeAnchorValue('9201')).toBeNull();
    expect(safeAnchorValue('x'.repeat(201))).toBeNull();
    // Walks up: a React id on the element is skipped for the region's own id.
    const region = el('section', {id: 'life-review-highlights'});
    expect(anchorOf(el('li', {id: '_r_5_'}, el('ul', {}, region)))).toEqual({kind: 'id', value: 'life-review-highlights'});
    const top = el('main', {'data-layout-item': 'today:goals', 'data-testid': 'x-y', id: 'main'});
    expect(anchorOf(top)).toEqual({kind: 'data-layout-item', value: 'today:goals'});
    expect(anchorOf(el('span'))).toBeNull();
  });
  test('the search stops after 16 levels', () => {
    let node: Stub | null = el('section', {id: 'far-away'});
    for (let i = 0; i < 20; i++) node = el('div', {}, node);
    expect(anchorOf(node)).toBeNull();
  });
  test('routes keep plain words only; ids, numbers, names and queries leave', () => {
    expect(normaliseRoute('/app/review')).toBe('/app/review');
    expect(normaliseRoute('/app/goals/tracked/9201?contribute=1#x')).toBe('/app/goals/tracked/:id');
    expect(normaliseRoute('/app/goals/tracked/House%20deposit')).toBe('/app/goals/tracked/:id');
    expect(normaliseRoute('/app/health?view=sleep')).toBe('/app/health');
    expect(normaliseRoute('/')).toBe('/');
  });
  test('the viewport in whole pixels, bounded', () => {
    expect(viewportOf(390.4, 844.6)).toEqual({width: 390, height: 845});
    expect(viewportOf(Number.NaN, -5)).toEqual({width: 0, height: 0});
  });
});
