// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {useBackCloses} from '../../components/use-back-closes';

/**
 * Session AK Q1 (WIRING_AUDIT 6.1): a goal bundle confirmed in Today's Quick add sheet opens the goal form. The sheet
 * takes its Back entry out when it closes (useBackCloses → history.back()); closing it before the goal form's address
 * was in place undid the navigation and left the person on Today. The sheet now closes once the address has changed, so
 * nothing takes the navigation back. The router is a stand-in that changes the address a moment later, as Next's does.
 */
const pushed: string[] = [];
vi.mock('next/navigation', () => ({useRouter: () => ({push: (href: string) => { pushed.push(href); setTimeout(() => window.history.pushState({}, '', href), 30); }})}));
vi.mock('../../components/habits/use-habits', () => ({useHabits: () => ({loaded: true, error: null, data: {habits: []}, create: async () => undefined})}));
vi.mock('../../components/ai/use-device-record', () => ({useDeviceRecord: () => ({loaded: true, unreadable: false, data: {version: 1, rules: []}, update: () => undefined})}));
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); window.history.replaceState({}, '', '/app'); pushed.length = 0; element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
const wait = async (ms: number) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };

test('confirming a bundle with a goal lands on the goal form, and closing the sheet does not take that navigation back', async () => {
  const {default: QuickAddBundle} = await import('../../components/quick-add-bundle');
  const closedAt: string[] = [];
  function Sheet() {
    const [open, setOpen] = useState(true);
    useBackCloses(open, () => setOpen(false));
    return open ? h(QuickAddBundle, {line: 'save €5,000 for a trip by June and walk 8k steps most days', today: '2026-11-04', several: true, close: () => { closedAt.push(window.location.pathname); setOpen(false); }, otherwise: h('p', null, 'no bundle')}) : h('p', null, 'closed');
  }
  await act(async () => root.render(h(Sheet)));
  await wait(0);
  const back = vi.spyOn(window.history, 'back');
  const create = [...element.querySelectorAll('button')].find(b => /^Create \d parts?$/.test(b.textContent ?? ''));
  expect(create, element.textContent ?? '').toBeDefined();
  await act(async () => { create!.click(); });
  for (let i = 0; i < 40 && !closedAt.length; i++) await wait(20);
  expect(pushed).toEqual(['/app/goals/new']);
  expect(closedAt).toEqual(['/app/goals/new']); // closed only once the goal form's address was in place
  await wait(50);
  expect(back).not.toHaveBeenCalled();
  expect(window.location.pathname).toBe('/app/goals/new');
  expect(element.textContent).toBe('closed');
});
