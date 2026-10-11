// @vitest-environment jsdom
import {afterEach, expect, test} from 'vitest';
import {confirmHref, effectStatus, lookPatched, runnerEffect} from '../components/ai/runner-effects';
import {readConfirmDelete, takeConfirmDelete} from './confirm-delete';

/**
 * Session Z-Cloud Gate B (Z-Local's handoff, Part 5 entries): the runner effects a plan from Z-Local's planner can carry,
 * read structurally. A plan as `main` makes it carries none of them.
 */
const card = {target: 'form', card: {title: 'x', lines: []}};
afterEach(() => { window.history.replaceState(null, '', '/'); });

test('a page to open: only an app path, with its label', () => {
  const navigate = runnerEffect({...card, navigate: {href: '/app/health?view=sleep', label: 'Sleep in Health'}});
  expect(navigate).toEqual({kind: 'navigate', href: '/app/health?view=sleep', label: 'Sleep in Health'});
  expect(effectStatus(navigate!)).toBe('Opened: Sleep in Health');
  expect(runnerEffect({...card, navigate: {href: '/app/wealth#accounts', label: 'Accounts'}})).toMatchObject({href: '/app/wealth#accounts'});
  for (const href of ['https://example.com/app', '//example.com/app', '/apps', '/app/../settings', 'javascript:alert(1)', '/app/health?view=<b>', '', '/app/' + 'a'.repeat(200)])
    expect(runnerEffect({...card, navigate: {href, label: 'x'}}), href).toBeNull();
  expect(runnerEffect({...card, navigate: {href: '/app/health'}})).toBeNull();
  expect(runnerEffect({...card, navigate: {href: '/app/health', label: ''}})).toBeNull();
});

test('a record\'s own delete confirmation: the page and a hash the page reads once; nothing is deleted by the card', () => {
  const confirm = runnerEffect({...card, confirm: {href: '/app/habits', what: 'habit', id: 'h-12', label: 'Walk'}});
  expect(confirm).toEqual({kind: 'confirm', href: '/app/habits', what: 'habit', id: 'h-12', label: 'Walk'});
  expect(effectStatus(confirm!)).toBe('Opened the confirmation on Walk');
  const href = confirmHref(confirm as Extract<typeof confirm, {kind: 'confirm'}>);
  expect(href).toBe('/app/habits#confirm-delete=habit%3Ah-12');
  expect(readConfirmDelete(href.split('#')[1]!)).toEqual({what: 'habit', id: 'h-12'});
  for (const bad of [{what: 'account', id: 'h'}, {what: 'habit', id: 'h 1'}, {what: 'habit', id: ''}, {what: 'habit', id: 'h', href: '/app/habits#x'}, {what: 'habit', id: 'h', href: 'https://example.com'}])
    expect(runnerEffect({...card, confirm: {href: '/app/habits', label: 'Walk', ...bad}}), JSON.stringify(bad)).toBeNull();
  expect(readConfirmDelete('#confirm-delete=habit')).toBeNull();
  expect(readConfirmDelete('#confirm-delete=%E0%A4%A')).toBeNull();
  expect(readConfirmDelete('#other=habit:h')).toBeNull();
});

test('the hash is taken once, by the record it names', () => {
  window.history.replaceState(null, '', '/app/habits?view=list#confirm-delete=habit%3Ah-12');
  expect(takeConfirmDelete('habit', 'h-13')).toBe(false);
  expect(takeConfirmDelete('goal', 'h-12')).toBe(false);
  expect(window.location.hash).toBe('#confirm-delete=habit%3Ah-12');
  expect(takeConfirmDelete('habit', 'h-12')).toBe(true);
  expect(window.location.hash).toBe('');
  expect(window.location.pathname + window.location.search).toBe('/app/habits?view=list');
  expect(takeConfirmDelete('habit', 'h-12')).toBe(false);
});

test('ZIGi\'s look: the look keys only, valid values only, knock merged and never replaced', () => {
  const device = runnerEffect({...card, device: {key: 'zigoals:zigi:v1', patch: {side: 'left', size: 'l', knock: {enabled: true}}}});
  expect(device).toEqual({kind: 'device', patch: {side: 'left', size: 'l', knock: {enabled: true}}});
  expect(effectStatus(device!)).toBe('ZIGi’s look changed');
  const record = {version: 1 as const, skin: 'origami-nebula', knock: {enabled: false, maxPerDay: 4, quietFrom: '21:00'}, greetedOn: '2026-10-10'};
  expect(lookPatched(record, (device as Extract<typeof device, {kind: 'device'}>).patch)).toEqual({version: 1, skin: 'origami-nebula', side: 'left', size: 'l', knock: {enabled: true, maxPerDay: 4, quietFrom: '21:00'}, greetedOn: '2026-10-10'});
  for (const patch of [{animation: 'wild'}, {side: 'top'}, {skin: 'Not A Skin!'}, {chatAreas: {}}, {knock: {enabled: true, maxPerDay: 10}}, {knock: {sound: true}}, {}, {version: 2}])
    expect(runnerEffect({...card, device: {key: 'zigoals:zigi:v1', patch}}), JSON.stringify(patch)).toBeNull();
  expect(runnerEffect({...card, device: {key: 'zigoals:ai-memory:v1', patch: {side: 'left'}}})).toBeNull();
});

test('a plan as main makes it, or anything else, is no effect (the money pre-fills keep their own path)', () => {
  for (const plan of [card, {...card, prefill: {category: 'crypto'}}, null, 'plan', [], {...card, navigate: 'x'}, {...card, confirm: null}, {...card, device: {key: 'zigoals:zigi:v1'}}])
    expect(runnerEffect(plan)).toBeNull();
});
