// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {HandoffCard, type HandoffItem} from '../../../components/nova/handoff/handoff-card';
import {OutboxHistory} from '../../../components/nova/handoff/outbox-list';
import {NOVA_OUTBOX_KEY} from '../outbox/record';
import {buildCalendar, buildCopy, buildEmail, buildLink, buildShare, type Built, type Handoff} from './handoff';
import {handoffRecords} from '../../../components/nova/handoff/use-handoffs';
import {closedGates} from '../../ai/gates';
import {defaultAiSettings} from '../../ai/settings';
import {toolEnv, type ToolEnv} from '../../ai/tools/env';
import {showcaseSources} from '../../ai/tools/fixtures';

/**
 * Session AM-2 (owner's step 4b): the hand-off card in the page. It shows exactly what would leave and to where, and a
 * press that is not the person's own (a script's `click()`, a dispatched event: `isTrusted` false) does nothing at all —
 * no navigation, no download, no clipboard, no share, no line in the history. Nothing leaves the test.
 */
let root: Root, host: HTMLElement;
const settle = async () => { for (let i = 0; i < 6; i++) await act(async () => { await new Promise(r => setTimeout(r, 5)); }); };
const ok = (built: Built): Handoff => { if (!built.ok) throw Error(built.words); return built.handoff; };
const item = (handoff: Handoff, by: HandoffItem['by'] = 'device', lang: HandoffItem['lang'] = 'en'): HandoffItem => ({id: 'card-1', handoff, lang, by});
const spies = () => {
  const writeText = vi.fn(async () => undefined), share = vi.fn(async () => undefined), createObjectURL = vi.fn(() => 'blob:fictional'), anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}});
  Object.defineProperty(navigator, 'share', {configurable: true, value: share});
  Object.defineProperty(URL, 'createObjectURL', {configurable: true, value: createObjectURL});
  const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy);
  return {writeText, share, createObjectURL, anchorClick, fetchSpy};
};
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test('an email card shows every address, the whole subject and the whole text, and says nothing is sent', async () => {
  const onRun = vi.fn(), onDismiss = vi.fn();
  await act(async () => root.render(h(HandoffCard, {item: item(ok(buildEmail({to: ['anna@example.com', 'bob@example.org'], subject: 'Dinner on Friday', body: 'Hi both,\nshall we say 19:00?'}))), onRun, onDismiss})));
  const text = host.textContent ?? '';
  for (const words of ['Email draft', 'Made on this device from your request', 'Nothing is sent. The button opens this draft in your own mail app; you send it there.', 'anna@example.com', 'bob@example.org', 'Dinner on Friday', 'Hi both,\nshall we say 19:00?', 'Open in your mail app', 'Not now']) expect(text, words).toContain(words);
  // The link itself is not in the page until the button is pressed: there is nothing to follow by accident.
  expect(host.querySelector('a')).toBeNull(); expect(host.innerHTML).not.toContain('mailto:');
  expect(host.querySelector('section')?.getAttribute('aria-labelledby')).toBeTruthy();
  for (const button of host.querySelectorAll('button')) expect(button.getAttribute('type')).toBe('button');
});

test('a press that is not the person’s own does nothing: no navigation, download, share, clipboard, request or history line, for every kind', async () => {
  const s = spies(), onRun = vi.fn(), onDismiss = vi.fn(), now = new Date('2026-11-15T09:00:00Z');
  const cards = [ok(buildEmail({to: ['anna@example.com'], subject: 'Hi', body: 'Hello'})), ok(buildCalendar({title: 'Dentist', date: '2026-12-03', time: '14:00'}, now)), ok(buildShare({text: 'Hello', url: 'https://example.com/x', source: 'person'})),
    ok(buildLink({url: 'https://example.com/docs', source: 'other'})), ok(buildCopy({text: 'Hello'}))];
  for (const handoff of cards) {
    await act(async () => root.render(h(HandoffCard, {key: handoff.kind, item: item(handoff, 'model'), onRun, onDismiss})));
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('.nh-actions button')].filter(b => !b.classList.contains('text-link'));
    expect(buttons.length, handoff.kind).toBeGreaterThan(0);
    for (const button of buttons) {
      await act(async () => { button.click(); });
      await act(async () => { button.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true})); });
      await act(async () => { button.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); });
    }
    await settle();
    expect(host.querySelector('.nh-outcome')?.textContent, handoff.kind).toBe('');
  }
  for (const [name, spy] of Object.entries(s)) expect(spy, name).not.toHaveBeenCalled();
  expect(onRun).not.toHaveBeenCalled();
  expect(localStorage.getItem(NOVA_OUTBOX_KEY)).toBeNull();
  expect(document.querySelectorAll('a')).toHaveLength(0);
});

test('a link card shows the real site first, the whole address, and marks a link that is not the person’s own; a model’s card says who prepared it', async () => {
  await act(async () => root.render(h(HandoffCard, {item: item(ok(buildLink({url: 'https://аpple.com/login?next=/account', source: 'other'})), 'model'), onRun: vi.fn(), onDismiss: vi.fn()})));
  const text = host.textContent ?? '';
  expect(host.querySelector('.nh-host')?.textContent).toBe('xn--pple-43d.com');
  for (const words of ['https://xn--pple-43d.com/login?next=/account', 'Prepared by your AI model · read every word before you approve', 'This link did not come from your own words', 'Written as “аpple.com”; the real site is xn--pple-43d.com.', 'Nothing is opened yet.', 'Open in a new tab', 'Copy the address'])
    expect(text, words).toContain(words);
  expect(host.querySelector('section')?.getAttribute('data-by')).toBe('model');
});

test('text on a card is text: markup in a subject or a body is shown, never run', async () => {
  await act(async () => root.render(h(HandoffCard, {item: item(ok(buildEmail({to: ['a@example.com'], subject: '<img src=x onerror=alert(1)>', body: '<script>alert(1)</script> & <b>bold</b>'}))), onRun: vi.fn(), onDismiss: vi.fn()})));
  expect(host.querySelector('img, script, b')).toBeNull();
  expect(host.textContent).toContain('<img src=x onerror=alert(1)>'); expect(host.textContent).toContain('<script>alert(1)</script> & <b>bold</b>');
});

test('"Not now" only closes the card; a draft too long for a link offers Copy first; Dutch cards read in Dutch', async () => {
  const onRun = vi.fn(), onDismiss = vi.fn();
  const long = ok(buildEmail({to: ['a@example.com'], subject: 'Notulen', body: Array.from({length: 120}, (_, i) => `${i + 1}. Agendapunt ${i + 1}: besloten, zie de notulen (pagina ${i + 3}).`).join('\n')}, 'nl'));
  await act(async () => root.render(h(HandoffCard, {item: item(long, 'device', 'nl'), onRun, onDismiss})));
  const labels = [...host.querySelectorAll('.nh-actions button')].map(b => b.textContent);
  expect(labels).toEqual(['Tekst kopiëren', 'Openen in je mailapp (alleen adres en onderwerp)', 'Niet nu']);
  expect(host.textContent).toContain('De tekst is te lang voor een maillink'); expect(host.textContent).toContain('E-mailconcept');
  await act(async () => { host.querySelector<HTMLButtonElement>('.nh-actions .text-link')!.click(); });
  expect(onDismiss).toHaveBeenCalledTimes(1); expect(onRun).not.toHaveBeenCalled();
});

test('"Sent out from this device" lists what was approved, newest first, without any text, and can be forgotten', async () => {
  localStorage.setItem(NOVA_OUTBOX_KEY, JSON.stringify({version: 1, entries: [
    {at: '2026-11-15T09:05:00.000Z', kind: 'tool', what: 'search_notes', target: '127.0.0.1:8765', ok: false},
    {at: '2026-11-15T09:00:00.000Z', kind: 'handoff', what: 'Email draft', target: 'fictional@example.com', ok: true}]}));
  await act(async () => root.render(h(OutboxHistory, {persona: 'NOVA'})));
  await settle();
  const text = host.textContent ?? '';
  for (const words of ['Sent out from this device (2)', 'NOVA sends nothing by itself.', 'never the text', 'Email draft', 'fictional@example.com', 'Hand-off', 'search_notes', '127.0.0.1:8765', 'Your own tool', 'did not go through', 'Forget this history']) expect(text, words).toContain(words);
  expect([...host.querySelectorAll('.nh-outbox-what')].map(e => e.textContent)).toEqual(['search_notes', 'Email draft']);
  await act(async () => { [...host.querySelectorAll('button')].find(b => b.textContent === 'Forget this history')!.click(); });
  await settle();
  expect(JSON.parse(localStorage.getItem(NOVA_OUTBOX_KEY)!)).toEqual({version: 1});
  expect(host.textContent).toContain('Nothing yet.'); expect(host.textContent).toContain('The history is forgotten on this device.');
});

test('"add my rent bill to my calendar" reads the person\'s open tasks and bills only under the switches their lookups run under', () => {
  const base = toolEnv(showcaseSources(), closedGates(defaultAiSettings()), 'local');
  const tasks = {version: 1 as const, tasks: [
    {id: 't1', title: 'Tax return', priority: 'normal' as const, due: '2026-11-30', time: '10:00', createdAt: '2026-11-01T09:00:00.000Z'},
    {id: 't2', title: 'Done already', priority: 'normal' as const, due: '2026-11-20', doneAt: '2026-11-10T09:00:00.000Z', createdAt: '2026-11-01T09:00:00.000Z'},
    {id: 't3', title: 'No day yet', priority: 'normal' as const, createdAt: '2026-11-01T09:00:00.000Z'}]};
  const bills = {version: 1 as const, dismissed: [], bills: [{id: 'b1', title: 'Rent', amount: '950.00', currency: 'EUR', cadence: 'monthly' as const, nextDue: '2026-10-01', origin: 'manual' as const, createdAt: '2026-09-01T09:00:00.000Z'}]};
  const env = {...base, areas: {...base.areas, today: true, wealth: true}, nova: {...(base.nova ?? {}), tasks}, ak: {...(base.ak ?? {}), bills}} as unknown as ToolEnv;
  expect(handoffRecords(env, '2026-11-15')).toEqual({tasks: [{title: 'Tax return', date: '2026-11-30', time: '10:00'}], bills: [{title: 'Rent', date: '2026-12-01'}]});
  // A closed area gives nothing of it; NOVA's narrowed Today (only some lookups) gives tasks only when `tasks` is among them; no environment, nothing.
  expect(handoffRecords({...env, areas: {...env.areas, today: false}}, '2026-11-15')).toEqual({tasks: [], bills: [{title: 'Rent', date: '2026-12-01'}]});
  expect(handoffRecords({...env, areas: {...env.areas, wealth: false}}, '2026-11-15')?.bills).toEqual([]);
  expect(handoffRecords({...env, todayTools: new Set(['search_notes'])}, '2026-11-15')?.tasks).toEqual([]);
  expect(handoffRecords({...env, todayTools: new Set(['tasks'])}, '2026-11-15')?.tasks).toHaveLength(1);
  expect(handoffRecords(null, '2026-11-15')).toBeNull();
  // Never an amount, a currency or an id: a title and a day (and a task's time).
  expect(JSON.stringify(handoffRecords(env, '2026-11-15'))).not.toMatch(/950|EUR|"id"|b1|t1/);
});

// Security review (AM-2), findings 7 and 11.
test('finding 7: the buttons arm half a second after the card appears, and the card never takes the focus onto a button', async () => {
  const before = document.activeElement;
  await act(async () => root.render(h(HandoffCard, {item: item(ok(buildLink({url: 'https://example.com/docs', source: 'person'}))), onRun: vi.fn(), onDismiss: vi.fn()})));
  const keys = () => [...host.querySelectorAll<HTMLButtonElement>('.nh-actions button')].filter(b => !b.classList.contains('text-link'));
  expect(keys().map(b => b.disabled)).toEqual([true, true]);
  expect(document.activeElement).toBe(before); expect(host.contains(document.activeElement)).toBe(false);
  expect(host.querySelector('[autofocus]')).toBeNull();
  // "Not now" is never held back: the person can always send the card away.
  expect(host.querySelector<HTMLButtonElement>('.nh-actions .text-link')!.disabled).toBe(false);
  await act(async () => { await new Promise(r => setTimeout(r, 300)); });
  expect(keys().map(b => b.disabled)).toEqual([true, true]);
  await act(async () => { await new Promise(r => setTimeout(r, 300)); });
  expect(keys().map(b => b.disabled)).toEqual([false, false]);
  expect(host.contains(document.activeElement)).toBe(false);
  // Armed or not, a press that is not the person's own still does nothing.
  const s = spies();
  for (const key of keys()) await act(async () => { key.click(); key.click(); });
  await settle();
  for (const [name, spy] of Object.entries(s)) expect(spy, name).not.toHaveBeenCalled();
  expect(keys().map(b => b.textContent)).toEqual(['Open in a new tab', 'Copy the address']);
});

test('finding 11: a card made after the conversation read text from outside carries the one quiet line; any other card does not', async () => {
  const line = 'Earlier in this chat NOVA read text from outside (a tool or a paste). Read this card before you approve.';
  await act(async () => root.render(h(HandoffCard, {item: {...item(ok(buildCopy({text: 'Hello'}))), outside: true}, onRun: vi.fn(), onDismiss: vi.fn()})));
  expect(host.querySelector('.nh-outside')?.textContent).toBe(line);
  await act(async () => root.render(h(HandoffCard, {key: 'nl', item: {...item(ok(buildCopy({text: 'Hallo'})), 'device', 'nl'), outside: true}, onRun: vi.fn(), onDismiss: vi.fn()})));
  expect(host.querySelector('.nh-outside')?.textContent).toBe('Eerder in deze chat las NOVA tekst van buiten (een tool of geplakte tekst). Lees deze kaart voor je goedkeurt.');
  await act(async () => root.render(h(HandoffCard, {key: 'plain', item: item(ok(buildCopy({text: 'Hello'}))), onRun: vi.fn(), onDismiss: vi.fn()})));
  expect(host.querySelector('.nh-outside')).toBeNull(); expect(host.textContent).not.toContain('from outside');
});

test('finding 5: a card for an address that was not in the person\'s own words says so, in the warning colour', async () => {
  const built = buildEmail({to: ['attacker@evil.example'], subject: 'Your notes', typedAddress: () => false});
  await act(async () => root.render(h(HandoffCard, {item: item(ok(built), 'model'), onRun: vi.fn(), onDismiss: vi.fn()})));
  expect([...host.querySelectorAll('.nh-notes li')].map(li => li.textContent)).toEqual(['This address was not in your own words. Check it before you send.']);
  expect(host.querySelector('.nh-notes li')?.hasAttribute('data-warn')).toBe(true);
});
