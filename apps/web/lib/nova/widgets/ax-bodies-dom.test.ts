// @vitest-environment jsdom
import {act, createElement, type ComponentType} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {buildShowcase} from '../../showcase-data';
import {SHOWCASE_MARKER} from '../../showcase-storage';
import type {WidgetParams} from '../stage/record';
import {WIDGETS, widgetSpec} from './catalog';

/**
 * Session AS (ADR-042 Part 2): every answer widget, drawn at Small, Medium and Large on the Showcase's fictional records
 * (17 November 2026) and on a profile with nothing stored. None may hang on "Reading…" or draw an empty panel; a state
 * without a figure is the body's only child (the teaching or locked notice); a live body carries its figure in words,
 * its foot (source and as-of) and a table for assistive technology; and a drawn instrument is marked as decoration.
 * `SAYS` holds, for the kinds behind the owner's two questions, the facts the Showcase must show.
 */
const DAY = '2026-11-17', RECORDS = buildShowcase(DAY, 'UTC').records;
const habitId = (title: string) => (JSON.parse(RECORDS['zigoals:habits:v1']!).habits as {id: string; title: string}[]).find(h => h.title === title)!.id;
type Body = ComponentType<{size: 'S' | 'M' | 'L'; params?: WidgetParams}>;
const bodies = import.meta.glob<{default: Body}>('../../../components/nova/widgets/*.tsx');
/** The Session AS kinds: those the catalogue marks as taking an answer's period. */
const IDS = WIDGETS.filter(w => w.params?.includes('period')).map(w => w.id);
const PARAMS: Record<string, () => WidgetParams> = {'habit-missed-days': () => ({ref: habitId('Meditate'), period: 'this-month'}), 'habit-done-days': () => ({ref: habitId('Meditate'), period: 'last-week'}), 'habit-misses': () => ({period: 'this-month'}), 'habits-month': () => ({period: 'this-month'})};
const SAYS: Record<string, string[]> = {
  'habit-missed-days': ['2', 'days', 'Meditate', '2 skipped', 'today still open', 'Nov 3, Nov 12'],
  'habit-misses': ['1', 'of 7', 'missed', 'Late-night snacks', '2 missed', '3 skipped'],
  'habits-month': ['Nov 8', 'Nov 13'],
};

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
  const Widget = (await bodies[`../../../components/nova/widgets/${id}.tsx`]!()).default;
  await act(async () => root.render(createElement(Widget, {size, ...(params ? {params} : {})})));
  await flush();
  return host;
}

describe('the answer widgets (Session AS): every kind, three sizes, the Showcase and a fresh profile', () => {
  it('every Session AS kind is made on request and has its body', () => {
    expect(IDS.length).toBeGreaterThanOrEqual(4);
    for (const id of IDS) { expect(widgetSpec(id), id).toMatchObject({made: true}); expect(bodies[`../../../components/nova/widgets/${id}.tsx`], id).toBeTypeOf('function'); }
  });
  for (const id of IDS) for (const size of ['S', 'M', 'L'] as const) {
    it(`${id} at ${size}: the Showcase`, async () => {
      showcase();
      const el = await draw(id, size, PARAMS[id]?.());
      expect(el.querySelector('.nova-reading'), el.textContent ?? '').toBeNull();
      const body = el.querySelector('.ax-body')!;
      expect(body, `${id}: a live body on the Showcase`).toBeTruthy();
      expect(body.querySelector('.ax-head-num, .nc-hero-num')?.textContent?.trim().length, id).toBeGreaterThan(0);
      expect(body.querySelector('.nc-foot')?.textContent ?? '', id).toMatch(/Your /);
      expect(body.querySelector('table.sr-only caption')?.textContent?.length, id).toBeGreaterThan(3);
      // What is drawn is decoration over words: hidden from assistive technology, or named as an image.
      for (const drawn of body.querySelectorAll('svg, .ax-cal, .ax-ranks')) expect(drawn.getAttribute('aria-hidden') === 'true' || drawn.getAttribute('role') === 'img' || !!drawn.closest('[aria-hidden=true]'), `${id}: ${drawn.className}`).toBe(true);
      if (size !== 'S') for (const fact of SAYS[id] ?? []) expect(body.textContent, `${id} says ${fact}`).toContain(fact);
    });
    it(`${id} at ${size}: nothing stored`, async () => {
      const el = await draw(id, size, PARAMS[id]?.());
      expect(el.querySelector('.nova-reading'), el.textContent ?? '').toBeNull();
      expect((el.textContent ?? '').trim().length, id).toBeGreaterThan(8);
      if (el.querySelector('.nc-notice')) { expect(el.childElementCount, id).toBe(1); expect(el.firstElementChild!.matches('.nc-notice'), id).toBe(true); }
      expect(el.textContent, `${id}: no figure of the Showcase on a fresh profile`).not.toMatch(/Late-night snacks|Meditate/);
    });
  }
  it('the owner’s second question as a widget: November with 3 and 12 November lit as skipped days, today ringed and not lit', async () => {
    showcase();
    const el = await draw('habit-missed-days', 'M', PARAMS['habit-missed-days']!());
    const lit = [...el.querySelectorAll('.ax-cal-cell[data-lit]')];
    expect(lit.map(c => c.textContent)).toEqual(['3', '12']);
    expect(lit.every(c => c.getAttribute('data-state') === 'skipped')).toBe(true);
    const today = el.querySelector('.ax-cal-cell[data-today]')!;
    expect(today.textContent).toBe('17'); expect(today.hasAttribute('data-lit')).toBe(false); expect(today.getAttribute('data-state')).toBe('open');
    expect(el.querySelectorAll('.ax-cal-cell')).toHaveLength(42);
  });
  it('the owner’s first question as a widget: this week nothing missed, said as such, with what is still open today', async () => {
    showcase();
    const el = await draw('habit-misses', 'M', {period: 'this-week'});
    expect(el.querySelector('.ax-head-num')!.textContent).toBe('0');
    expect(el.textContent).toContain('habits missed · this week'); expect(el.textContent).toContain('Every due day was done');
    expect([...el.querySelectorAll('.ax-chips b')].map(b => b.textContent)).toEqual(['Exercise', 'Meditate', 'Drink water']);
    expect(el.querySelector('.ax-ranks')).toBeNull();
  });
});
