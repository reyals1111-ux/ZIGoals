// @vitest-environment jsdom
import {act, createElement, type ComponentType} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {WidgetLocked} from '../../../components/nova/stage/stage-parts';
import {buildShowcase} from '../../showcase-data';
import {SHOWCASE_MARKER} from '../../showcase-storage';

/**
 * Session AM-2 (step 3, round 3): no widget hangs on "Reading…". Each of the thirty bodies of rounds 1 and 2 is drawn
 * here at Small, Medium and Large, on the Showcase's fictional records and on a profile with nothing stored, and must
 * leave its reading state as soon as its stores have answered: a figure, a teaching notice or the locked notice, never
 * the reading line and never an empty panel. (An absent record is the teaching state, not a wait.)
 */
const IDS = ['net-worth-history', 'ready-to-assign', 'age-of-money', 'spending-pace', 'bill-changes', 'money-tags', 'perfect-days', 'day-rules', 'tasks-later', 'countdowns', 'journal-numbers', 'templates', 'run-splits', 'mood-tags', 'symptoms',
  'priority-matrix', 'hour-grid', 'reviews', 'milestones', 'cash-flow', 'accounts', 'debt-plan', 'savings-challenges', 'price-alerts', 'health-trends', 'food-days', 'fasting', 'meditation', 'supplements', 'cycle'] as const;
const DAY = '2026-11-11', RECORDS = buildShowcase(DAY, 'UTC').records;
type Body = ComponentType<{size: 'S' | 'M' | 'L'}>;
const bodies = import.meta.glob<{default: Body}>('../../../components/nova/widgets/*.tsx');
const load = async (id: string) => (await bodies[`../../../components/nova/widgets/${id}.tsx`]!()).default;

let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}}));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  localStorage.clear(); sessionStorage.clear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const flush = () => act(async () => { for (let i = 0; i < 12; i++) await new Promise(r => setTimeout(r, 0)); });
function showcase() {
  sessionStorage.setItem(SHOWCASE_MARKER, JSON.stringify({version: 1, generation: 'g1', day: DAY}));
  for (const [key, value] of Object.entries(RECORDS)) sessionStorage.setItem(`zigoals:showcase:v1:g1:${key}`, value);
}
/** A teaching, off or locked notice is the body's only content (the frame then hugs it), never a cell of a card's grid. */
const soleNotice = (el: HTMLElement, id: string) => { if (el.querySelector('.nc-notice')) { expect(el.childElementCount, id).toBe(1); expect(el.firstElementChild!.matches('.nc-notice'), id).toBe(true); } };
async function draw(id: string, size: 'S' | 'M' | 'L') {
  const Widget = await load(id);
  await act(async () => root.render(createElement(Widget, {size})));
  await flush();
  return host;
}

describe('every body leaves "Reading…" once its stores have answered', () => {
  it('covers the thirty widgets of rounds 1 and 2', () => { for (const id of IDS) expect(bodies[`../../../components/nova/widgets/${id}.tsx`], id).toBeTypeOf('function'); });
  for (const id of IDS) for (const size of ['S', 'M', 'L'] as const) {
    it(`${id} at ${size}: the Showcase’s fictional records`, async () => {
      showcase();
      const el = await draw(id, size);
      expect(el.querySelector('.nova-reading'), el.textContent ?? '').toBeNull();
      expect((el.textContent ?? '').trim().length, id).toBeGreaterThan(8);
      soleNotice(el, id);
    });
    it(`${id} at ${size}: nothing stored`, async () => {
      const el = await draw(id, size);
      expect(el.querySelector('.nova-reading'), el.textContent ?? '').toBeNull();
      expect((el.textContent ?? '').trim().length, id).toBeGreaterThan(8);
      soleNotice(el, id);
    });
  }
});

describe('round 3: what the captures at 2560 × 1440 showed', () => {
  it('the Showcase’s "no price change found" and "not enough months yet" are notices of their own, with their key', async () => {
    showcase();
    for (const [id, title] of [['bill-changes', 'No price change found'], ['spending-pace', 'Not enough months yet']] as const) {
      const el = await draw(id, 'M');
      expect(el.childElementCount, id).toBe(1);
      expect(el.firstElementChild!.matches('.nc-notice[data-kind=empty]'), id).toBe(true);
      expect(el.querySelector('.nc-notice-title')!.textContent, id).toBe(title);
      expect(el.querySelector('a.nc-action'), id).not.toBeNull();
      expect(el.querySelector('.nc-notice-ghost'), id).not.toBeNull(); // the unlit instrument, in its own column
    }
  });
  it('a locked widget’s notice has no lone ghost ring beside its words', async () => {
    await act(async () => root.render(createElement(WidgetLocked, {id: 'cycle'})));
    const notice = host.querySelector('.nc-notice')!;
    expect(notice.getAttribute('data-kind')).toBe('locked');
    expect(notice.hasAttribute('data-bare')).toBe(true);
    expect(notice.querySelector('.nc-notice-ghost')).toBeNull();
    expect(notice.querySelector('.nc-notice-glyph')).not.toBeNull(); // the lock's own dial stays
    expect(notice.textContent).toContain('Health is off for NOVA');
  });
  it('Medium labels are short; a wide Large card has one column for its instrument, never two over each other', async () => {
    showcase();
    expect((await draw('ready-to-assign', 'M')).querySelector('.nc-hero-label')!.textContent).toBe('Ready to assign');
    expect((await draw('perfect-days', 'M')).querySelector('.nc-hero-label')!.textContent).toBe('Perfect days');
    expect((await draw('age-of-money', 'M')).querySelector('.nc-hero-label')!.textContent).toBe('Age of money');
    for (const id of IDS) for (const size of ['M', 'L'] as const) expect((await draw(id, size)).querySelectorAll('.nc-body > .nx-main').length, `${id} ${size}`).toBeLessThanOrEqual(1);
    // This evening and Someday at Medium: one list, each row with its whole name and the list it is on.
    const later = await draw('tasks-later', 'M');
    expect(later.querySelector('.nx-pair')).toBeNull();
    const lists = [...later.querySelectorAll('.nx-row-value')].map(v => v.textContent);
    expect(lists.length).toBeGreaterThan(0); // (this evening's list holds for the day it was made: the clock here is not the Showcase's day)
    for (const list of lists) expect(['This evening', 'Someday']).toContain(list);
  });
});
