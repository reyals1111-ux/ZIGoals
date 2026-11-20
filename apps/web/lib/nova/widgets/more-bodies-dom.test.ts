// @vitest-environment jsdom
import {act, createElement, type ComponentType} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {WidgetLocked} from '../../../components/nova/stage/stage-parts';
import {NxLockGhost} from '../../../components/nova/widgets/nx-lock-ghost';
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
const DIALS = ['ready-to-assign', 'age-of-money', 'perfect-days', 'countdowns', 'milestones', 'reviews', 'food-days', 'fasting', 'meditation', 'supplements', 'cycle'] as const;
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
    // Session AU (D8, deliberate): the Showcase's streaming bill gives Spending pace three earlier months, so its "not enough
    // months yet" notice is drawn from the Showcase's money log without those four payments (five weeks, as before).
    const key = 'zigoals:showcase:v1:g1:zigoals:money-log:v1', log = JSON.parse(RECORDS['zigoals:money-log:v1']!) as {entries: {note?: string}[]};
    expect(log.entries.filter(e => e.note === 'Streaming · SHOWCASE DATA')).toHaveLength(4);
    for (const [id, title] of [['bill-changes', 'No price change found'], ['spending-pace', 'Not enough months yet']] as const) {
      // Session AU (ADR-044 D-SHOWCASE, deliberate): Bill changes now counts the found streaming bill too, so its empty notice is
      // drawn from the same log without those four payments, as the pace's is.
      sessionStorage.setItem(key, JSON.stringify({...log, entries: log.entries.filter(e => e.note !== 'Streaming · SHOWCASE DATA')}));
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
  it('Session AM-3 (round 6): the silhouette behind a locked strip is a fixed drawing, hidden from assistive technology, with no words and no figure', async () => {
    const drawn: string[] = [];
    for (const id of ['cycle', 'meditation', 'food-days', 'water', 'weight', 'supplements', 'symptoms', 'not-a-widget']) {
      await act(async () => root.render(createElement(NxLockGhost, {id})));
      const ghost = host.querySelector('.nx-lockghost')!;
      expect(ghost.getAttribute('aria-hidden'), id).toBe('true');
      expect(ghost.textContent, id).toBe(''); // a drawing only: nothing of the person's is read or shown
      expect(ghost.querySelector('svg')!.childElementCount, id).toBeGreaterThan(0);
      expect(host.querySelector('a, button, [tabindex]'), id).toBeNull();
      drawn.push(ghost.innerHTML);
    }
    // The same kind always draws the same picture (it is chosen by the kind, never by data).
    await act(async () => root.render(createElement(NxLockGhost, {id: 'cycle'})));
    expect(host.querySelector('.nx-lockghost')!.innerHTML).toBe(drawn[0]);
  });
  it('Session AM-3 (round 7): a locked widget shows its own instrument, powered down: a fixed drawing per kind, with no words, no figure and nothing to focus', async () => {
    const kinds = new Set<string>();
    for (const id of ['water', 'weight', 'steps', 'food-days', 'supplements', 'symptoms', 'cycle', 'habits-hud', 'goals-hud']) {
      await act(async () => root.render(createElement(WidgetLocked, {id})));
      const notice = host.querySelector('.nc-notice')!, unlit = notice.querySelector('.nx-lockghost > svg.holo-unlit')!;
      expect(host.childElementCount, id).toBe(1); // the notice stays the body's only child
      expect(host.firstElementChild, id).toBe(notice);
      expect(unlit.getAttribute('aria-hidden'), id).toBe('true');
      expect(unlit.textContent, id).toBe(''); // nothing of the person's is read or shown behind a lock
      expect(unlit.querySelector('text, a, button, [tabindex]'), id).toBeNull();
      expect(notice.querySelector('.nc-notice-title')!.textContent, id).toMatch(/ off/);
      expect(notice.querySelector('a.nc-action')!.textContent, id).toContain('Open Permissions');
      kinds.add(unlit.getAttribute('data-kind')!);
    }
    expect(kinds.size).toBeGreaterThanOrEqual(7); // a stage of locked widgets is not one strip seven times
  });
  it('a ring kind is one dial with its words; a wide Large card has one column for its instrument, never two over each other', async () => {
    showcase();
    // Round 4: a ring kind is one thick dial with its figure inside, the words beside it (the figure in words too).
    const ready = await draw('ready-to-assign', 'M');
    expect(ready.querySelectorAll('.nx-dial').length).toBe(1);
    expect(ready.querySelector('.nx-dial-figure b')!.textContent).toMatch(/^\d+%$/);
    expect(ready.querySelector('.nx-head .nx-title')!.textContent).toMatch(/\d/);
    for (const id of DIALS) for (const size of ['S', 'M', 'L'] as const) {
      const el = await draw(id, size);
      if (el.querySelector('.nc-notice')) continue; // a teaching or locked state has no dial
      expect(el.querySelector('.nx-card')!.getAttribute('data-lay'), `${id} ${size}`).toBe('dial');
      expect(el.querySelectorAll('.nx-dial').length, `${id} ${size}`).toBe(1);
      expect(el.querySelector('.nx-dial')!.getAttribute('aria-hidden'), id).toBe('true'); // decoration: the words carry the figure
      expect((el.querySelector('.nx-head .nx-title')!.textContent ?? '').length, `${id} ${size}`).toBeGreaterThan(0);
      expect(el.querySelector('.nc-foot'), `${id} ${size}`).not.toBeNull(); // source and as-of, always
    }
    for (const id of IDS) for (const size of ['M', 'L'] as const) expect((await draw(id, size)).querySelectorAll('.nc-body > .nx-main').length, `${id} ${size}`).toBeLessThanOrEqual(1);
    // This evening and Someday at Medium: one list, each row with its whole name and the list it is on.
    const later = await draw('tasks-later', 'M');
    expect(later.querySelector('.nx-pair')).toBeNull();
    const lists = [...later.querySelectorAll('.nx-row-value')].map(v => v.textContent);
    expect(lists.length).toBeGreaterThan(0); // (this evening's list holds for the day it was made: the clock here is not the Showcase's day)
    for (const list of lists) expect(['This evening', 'Someday']).toContain(list);
  });
});
