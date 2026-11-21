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

/** What the page would hold: the record after each save, and what was said. */
const saved: {record: NovaRecord; said: string[]} = {record: emptyNova(), said: []};
const note = (record: NovaRecord, done?: string) => { saved.record = record; if (done) saved.said.push(done); };
function Harness({onSave}: {onSave: (record: NovaRecord, done?: string) => void}) {
  const [record, setRecord] = useState<NovaRecord>(emptyNova()), [status, setStatus] = useState('');
  return createElement(MakeItYours, {record, entries: [], onReplay() {}, status, save: (change, done) => { const next = change(record); onSave(next, done); setRecord(next); if (done) setStatus(done); return true; }});
}
const nameForm = () => [...host.querySelectorAll('form')].find(f => f.textContent!.includes('Your assistant’s name'))!;

describe('Make NOVA yours: renaming is for everyone, with no Premium badge during the Alpha', () => {
  beforeEach(() => { saved.record = emptyNova(); saved.said = []; });
  // Session AV (owner follow-up 3, L-9; deliberate test change, equally strict): no Premium badge during the Alpha. The
  // earlier check that the badge was there and linked to Plans becomes a check that no badge or Plans link is there.
  it('no Premium badge during the Alpha: nothing in Make it yours links to Plans, and the field keeps its own name', async () => {
    await act(async () => root.render(createElement(Harness, {onSave: note}))); await flush();
    const form = nameForm();
    expect(host.querySelectorAll('a.premium-badge')).toHaveLength(0);
    expect(host.querySelectorAll(`a[href="${PLANS_HREF}"]`)).toHaveLength(0);
    expect(host.textContent).not.toContain('Premium');
    expect(PLANS_HREF).toBe('/app/plans');
    expect(form.querySelector('label')!.textContent).toBe('Your assistant’s name');
    expect(form.querySelector('label a')).toBeNull();
  });
  it('renaming works with no plan check: the name is saved, said, and can be put back', async () => {
    await act(async () => root.render(createElement(Harness, {onSave: note}))); await flush();
    const form = nameForm(), input = form.querySelector('input')!, submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(submit.disabled).toBe(false); expect(input.disabled).toBe(false); expect(input.readOnly).toBe(false);
    await type(input, 'Vega');
    await act(async () => submit.click());
    expect(personaOf(saved.record)).toEqual({name: 'Vega', avatar: 'orb'});
    expect(saved.said).toEqual(['Your assistant is called Vega now.']);
    expect(host.querySelector('.nova-status-line')!.textContent).toBe('Your assistant is called Vega now.');
    await type(nameForm().querySelector('input')!, '');
    await act(async () => nameForm().querySelector<HTMLButtonElement>('button[type=submit]')!.click());
    expect(personaOf(saved.record)).toEqual({name: 'NOVA', avatar: 'orb'});
    expect(saved.said.at(-1)).toBe('Your assistant is called NOVA again.');
  });
  it('the component reads no entitlement and no plan: nothing gates the rename', () => {
    const source = readFileSync(join(__dirname, '../../components/nova/make-it-yours.tsx'), 'utf8');
    expect(source).not.toContain('PremiumBadge');
    expect(source).not.toMatch(/isUnlocked|entitlement\(|\.unlocked|lib\/entitlements/);
    expect(entitlement('your-ai').unlocked).toBe(true);
  });
});
