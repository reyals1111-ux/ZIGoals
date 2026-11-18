// @vitest-environment jsdom
import {act, createElement, type ComponentType} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {writeFileSync} from 'node:fs';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {buildShowcase} from '../../../showcase-data';
import {SHOWCASE_MARKER} from '../../../showcase-storage';
import type {WidgetParams} from '../../stage/record';
import {AS_MONEY} from '../../widgets/catalog-as-money';

vi.mock('../../../../components/goal-provider', () => ({useGoals: () => ({goals: [], metadata: {goals: {}}, loaded: true, mode: 'local', chain: 'c', owner: 'o'})}));
const DAY = '2026-11-17', RECORDS = buildShowcase(DAY, 'UTC').records;
type Body = ComponentType<{size: 'S' | 'M' | 'L'; params?: WidgetParams}>;
const bodies = import.meta.glob<{default: Body}>('../../../../components/nova/widgets/*.tsx');
const PARAMS: Record<string, WidgetParams> = {'goal-gauge': {ref: '9203'}, 'spending-compare': {ref: 'spending', period: 'last-30-days'}, 'spending-radar': {period: 'last-30-days'}};
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({toFake: ['Date'], now: new Date(`${DAY}T19:00:00Z`)});
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}}));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  localStorage.clear(); sessionStorage.clear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const flush = () => act(async () => { for (let i = 0; i < 12; i++) await new Promise(r => setTimeout(r, 0)); });
function showcase() {
  sessionStorage.setItem(SHOWCASE_MARKER, JSON.stringify({version: 1, generation: 'g1', day: DAY}));
  for (const [key, value] of Object.entries(RECORDS)) sessionStorage.setItem(`zigoals:showcase:v1:g1:${key}`, value);
}
async function draw(id: string, size: 'S' | 'M' | 'L', params?: WidgetParams) {
  const Widget = (await bodies[`../../../../components/nova/widgets/${id}.tsx`]!()).default;
  await act(async () => root.render(createElement(Widget, {size, ...(params ? {params} : {})})));
  await flush();
  return host;
}
let out = '';
for (const w of AS_MONEY) for (const size of ['S', 'M', 'L'] as const) {
  it(`${w.id} ${size} showcase`, async () => {
    showcase();
    const el = await draw(w.id, size, PARAMS[w.id]);
    const body = el.querySelector('.ax-body');
    expect(body, w.id + ': ' + el.textContent).toBeTruthy();
    expect(el.querySelector('.nova-reading')).toBeNull();
    expect(body!.querySelector('.ax-head-num')?.textContent?.trim().length).toBeGreaterThan(0);
    expect(body!.querySelector('.nc-foot')?.textContent ?? '').toMatch(/Your /);
    expect(body!.querySelector('table.sr-only caption')?.textContent?.length).toBeGreaterThan(3);
    for (const drawn of body!.querySelectorAll('svg, .ax-cal, .ax-ranks, .axm-inst')) expect(drawn.getAttribute('aria-hidden') === 'true' || !!drawn.closest('[aria-hidden=true]'), w.id + ' ' + drawn.getAttribute('class')).toBe(true);
    if (size === 'S') expect(body!.querySelector('.axm-inst, .ax-ranks, .ax-cal, .ax-twins, .axm-dialrow')).toBeNull();
    const visible = (body!.cloneNode(true) as HTMLElement); visible.querySelectorAll('table').forEach(t => t.remove());
    const rows = [...body!.querySelectorAll('table tr')].map(tr => '    ' + tr.querySelector('th')!.textContent + ' => ' + tr.querySelector('td')!.textContent).join('\n');
    out += '## ' + w.id + ' ' + size + '\n  SEEN: ' + [...visible.querySelectorAll('*')].filter(n => n.children.length === 0 && n.textContent!.trim()).map(n => n.textContent!.trim()).join(' | ') + (size === 'M' ? '\n  TABLE: ' + body!.querySelector('caption')!.textContent + '\n' + rows : '') + '\n';
    writeFileSync('/tmp/claude-0/-home-user-ZIGoals/edc528d8-2243-59be-af88-bb92886e5b4d/scratchpad/dom.txt', out);
  });
  it(`${w.id} ${size} empty`, async () => {
    const el = await draw(w.id, size, PARAMS[w.id]);
    expect(el.querySelector('.nova-reading')).toBeNull();
    expect((el.textContent ?? '').trim().length).toBeGreaterThan(8);
    expect(el.childElementCount, w.id + el.innerHTML.slice(0, 200)).toBe(1); expect(el.firstElementChild!.matches('.nc-notice'), w.id).toBe(true);
  });
}
