// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {act, createElement, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import MakeItYours from '../../components/nova/make-it-yours';
import {PLANS_HREF, entitlement} from '../entitlements';
import {emptyNova, personaOf, type NovaRecord} from './store';

/**
 * Session AM (owner decision O4, ADR-038 D21): renaming NOVA is a Premium feature, built now and open to everyone. The
 * name field carries the label "Premium · free during the Alpha" as a link to Plans, and nothing gates the rename: the
 * name is saved with no plan read. Rendered for real (jsdom), no browser.
 */
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
  localStorage.clear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const flush = () => act(async () => { for (let i = 0; i < 4; i++) await new Promise(r => setTimeout(r, 0)); });
const type = (input: HTMLInputElement, value: string) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', {bubbles: true}));
});

let latest: NovaRecord, said: string[];
function Harness() {
  const [record, setRecord] = useState<NovaRecord>(emptyNova()), [status, setStatus] = useState('');
  latest = record;
  return createElement(MakeItYours, {record, entries: [], onReplay() {}, status, save: (change, done) => { const next = change(record); setRecord(next); if (done) { said.push(done); setStatus(done); } return true; }});
}
const nameForm = () => [...host.querySelectorAll('form')].find(f => f.textContent!.includes('Your assistant’s name'))!;

describe('Make NOVA yours: the name is Premium, free during the Alpha, for everyone', () => {
  beforeEach(() => { said = []; });
  it('the name field carries the label as a link to Plans, outside the field’s own label', async () => {
    await act(async () => root.render(createElement(Harness))); await flush();
    const form = nameForm(), badge = form.querySelector<HTMLAnchorElement>('a.premium-badge')!;
    expect(badge.textContent).toBe('Premium · free during the Alpha');
    expect(badge.textContent).toBe(entitlement('your-ai').label);
    expect(badge.getAttribute('href')).toBe(PLANS_HREF);
    expect(PLANS_HREF).toBe('/app/plans');
    // The field keeps its own name (tests/p1-nova-make.spec.ts finds it by "Your assistant’s name"), and it is the only
    // Premium label in Make it yours: every other part is for everyone, unlabelled.
    expect(form.querySelector('label')!.textContent).toBe('Your assistant’s name');
    expect(form.querySelector('label a')).toBeNull();
    expect(host.querySelectorAll('a.premium-badge')).toHaveLength(1);
  });
  it('renaming works with no plan check: the name is saved, said, and can be put back', async () => {
    await act(async () => root.render(createElement(Harness))); await flush();
    const form = nameForm(), input = form.querySelector('input')!, submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(submit.disabled).toBe(false); expect(input.disabled).toBe(false); expect(input.readOnly).toBe(false);
    await type(input, 'Vega');
    await act(async () => submit.click());
    expect(personaOf(latest)).toEqual({name: 'Vega', avatar: 'orb'});
    expect(said).toEqual(['Your assistant is called Vega now.']);
    expect(host.querySelector('.nova-status-line')!.textContent).toBe('Your assistant is called Vega now.');
    await type(nameForm().querySelector('input')!, '');
    await act(async () => nameForm().querySelector<HTMLButtonElement>('button[type=submit]')!.click());
    expect(personaOf(latest)).toEqual({name: 'NOVA', avatar: 'orb'});
    expect(said.at(-1)).toBe('Your assistant is called NOVA again.');
  });
  it('the component reads no entitlement and no plan: the badge is a label, never a gate', () => {
    const source = readFileSync(join(__dirname, '../../components/nova/make-it-yours.tsx'), 'utf8');
    expect(source).toContain("import {PremiumBadge} from '../plans/premium-badge';");
    expect(source).not.toMatch(/isUnlocked|entitlement\(|\.unlocked|lib\/entitlements/);
    expect(entitlement('your-ai').unlocked).toBe(true);
  });
});
