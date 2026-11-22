// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test} from 'vitest';
import {act, createElement as h, type ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {WholeRows, WholeRowsGroup} from '../../../components/nova/cards/whole-rows';
import {moreWords} from './whole-rows';

/**
 * Session AM-2 (whole rows only): the list in a panel, on a pretend layout. jsdom lays nothing out, so the panel's body
 * here answers `clientHeight` (its fixed height) and `scrollHeight` (what its shown rows and "+N more" lines add up to:
 * a row is 44 px, a line 23 px), which is exactly what the component reads in a browser.
 */
const ROW = 44, LINE = 23;
let root: Root, host: HTMLElement, height = 0, reads = 0;
/** Session AV lane 2 (ADR-045 D36): when set, a shown last line with no words is only its padding (3 px), as in a browser. */
let emptyLine: number | null = null;
const lineHeight = (el: Element) => emptyLine !== null && !el.textContent ? emptyLine : LINE;
const shownIn = (el: Element) => { for (let e: Element | null = el; e && e !== host; e = e.parentElement) if ((e as HTMLElement).hidden) return false; return true; };
const panel = (children: ReactNode, holo = true) => h('article', {className: 'nova-widget', 'data-holo': holo ? '' : undefined}, h('div', {className: 'nova-widget-body'}, children));
/** The pretend layout: only a panel's body has a height; everything else reads 0, as in jsdom. */
const isBody = (el: HTMLElement) => el.classList.contains('nova-widget-body');
const LAYOUT = {
  clientHeight: {configurable: true, get(this: HTMLElement) { return isBody(this) ? height : 0; }},
  scrollHeight: {configurable: true, get(this: HTMLElement) {
    if (isBody(this)) reads += 1;
    return isBody(this) ? Math.max(height, [...this.querySelectorAll('li')].filter(shownIn).length * ROW + [...this.querySelectorAll('.wr-more')].filter(shownIn).reduce((n, el) => n + lineHeight(el), 0)
      + [...this.querySelectorAll<HTMLElement>('[data-px]')].reduce((n, el) => n + Number(el.dataset.px), 0)) : 0;
  }},
};
const list = (n: number, props: Record<string, unknown> = {}) => h(WholeRows, {'aria-label': 'Rows', more: (hidden: number, shown: number) => moreWords(hidden, {shown, where: 'the Tasks page'}), ...props, children: Array.from({length: n}, (_, i) => h('li', {key: i}, h('a', {href: '#'}, `Row ${i + 1}`)))});
// Session AM-3 (round 6, deliberate): after a later render the list is checked at the next animation frame (the browser lays
// the page out there anyway; whole-rows.tsx, "Round 6"), so a render here lets that one frame pass. Every assertion below is
// unchanged: what is shown after a render, how often the panel is read for it (once), and that nothing is written.
const frame = () => new Promise<void>(done => requestAnimationFrame(() => done()));
const render = async (node: ReactNode) => { await act(async () => { root.render(node); }); await act(async () => { await frame(); }); };
// Session AM-3 (round 7, deliberate): a change of content with no render is fitted at the next animation frame too (it was
// at once); a change made here lets that frame pass. The assertions on what is then shown are unchanged.
const change = async (make: () => void) => { await act(async () => { make(); }); await act(async () => { await frame(); }); };
const rows = (label = 'Rows') => [...host.querySelectorAll<HTMLElement>(`[aria-label="${label}"] > li`)];
const line = (at = 0) => host.querySelectorAll<HTMLElement>('.wr-more')[at]!;
const body = () => host.querySelector<HTMLElement>('.nova-widget-body')!;

beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperties(HTMLElement.prototype, LAYOUT);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); emptyLine = null;
  for (const key of Object.keys(LAYOUT)) delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
});

test('shows exactly the rows that fit, hides the rest from everyone, and says how many are not shown', async () => {
  height = 130; // two rows (88) and the line (23) fit; three rows and the line (155) do not
  await render(panel(list(4)));
  expect(rows().map(r => r.hidden)).toEqual([false, false, true, true]);
  expect(line().hidden).toBe(false);
  expect(line().textContent).toBe('+2 more on the Tasks page');
  // A row that is not shown is `hidden`: out of the accessibility tree, and its link cannot take the focus.
  expect(rows()[2]!.hasAttribute('hidden')).toBe(true);
  // Nothing runs past the panel.
  const body = host.querySelector<HTMLElement>('.nova-widget-body')!;
  expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight);
});

test('measures again when it renders again: more room shows every row and no line; less room drops whole rows', async () => {
  height = 130;
  await render(panel(list(4)));
  height = 400;
  await render(panel(list(4)));
  expect(rows().map(r => r.hidden)).toEqual([false, false, false, false]);
  expect(line().hidden).toBe(true);
  height = 80; // one row and the line
  await render(panel(list(4)));
  expect(rows().map(r => r.hidden)).toEqual([false, true, true, true]);
  expect(line().textContent).toBe('+3 more on the Tasks page');
  // Rows added later are measured too.
  height = 130;
  await render(panel(list(6)));
  expect(rows().filter(r => !r.hidden)).toHaveLength(2);
  expect(line().textContent).toBe('+4 more on the Tasks page');
});

test('rows the widget holds beyond the rendered ones count in the line; exactly fitting rows need no line', async () => {
  height = 4 * ROW;
  await render(panel(list(4)));
  expect(rows().every(r => !r.hidden)).toBe(true);
  expect(line().hidden).toBe(true);
  height = 400;
  await render(panel(list(4, {extra: 3})));
  expect(rows().every(r => !r.hidden)).toBe(true);
  expect(line().textContent).toBe('+3 more on the Tasks page');
});

test('never fewer than its minimum: when even that and the line do not fit, the row stays whole and the line gives way', async () => {
  height = 50; // a row (44) fits, a row and the line (67) do not
  await render(panel(list(3, {min: 1})));
  expect(rows().map(r => r.hidden)).toEqual([false, true, true]);
  expect(line().hidden).toBe(true);
});

test('something else in the panel is too tall by itself: the rows are not blamed for it, and never go under their minimum', async () => {
  height = 100;
  // A 120 px block already runs 20 px past the panel. One row is the list's minimum: it stays, whole.
  await render(panel([h('div', {key: 'block', 'data-px': 120}), h('div', {key: 'list'}, list(3, {min: 1}))]));
  expect(rows().map(r => r.hidden)).toEqual([false, true, true]);
  // With no minimum the list steps aside whole, line and all: what still runs past the panel is the block's.
  await render(panel([h('div', {key: 'block', 'data-px': 120}), h('div', {key: 'list'}, list(3))]));
  expect(rows().every(r => r.hidden)).toBe(true);
  expect(line().hidden).toBe(true);
});

test('a calendar keeps its latest rows', async () => {
  height = 130;
  await render(panel(list(5, {keep: 'last', more: (hidden: number) => moreWords(hidden, {what: ['earlier week', 'earlier weeks']})})));
  expect(rows().map(r => r.hidden)).toEqual([true, true, true, false, false]);
  expect(line().textContent).toBe('+3 earlier weeks');
});

test('two lists of one widget: the first keeps its rows longest; a list that may leave whole does', async () => {
  const two = (second: Record<string, unknown>) => panel(h(WholeRowsGroup, {className: 'lists', children: [
    h('div', {key: 'a'}, list(4, {'aria-label': 'Today', min: 1})),
    h('div', {key: 'b'}, list(3, {'aria-label': 'Next', ...second})),
  ]}));
  height = 4 * ROW + ROW + LINE; // the first list whole, one row of the second and its line
  await render(two({min: 1}));
  expect(rows('Today').filter(r => !r.hidden)).toHaveLength(4);
  expect(rows('Next').filter(r => !r.hidden)).toHaveLength(1);
  expect(line(1).textContent).toBe('+2 more on the Tasks page');
  height = 3 * ROW + LINE; // three rows of the first and its line: the second leaves whole
  await render(two({collapse: true}));
  expect(rows('Today').filter(r => !r.hidden)).toHaveLength(3);
  expect(host.querySelectorAll<HTMLElement>('.wr')[1]!.hidden).toBe(true);
});

test('with no fitted panel around it (a phone, the Classic cards) every row shows', async () => {
  height = 60;
  await render(panel(list(4), false));
  expect(rows().every(r => !r.hidden)).toBe(true);
  expect(line().hidden).toBe(true);
});

test('the very first render shows the size\'s default count; the rest join before the first paint', async () => {
  height = 400;
  const {renderToString} = await import('react-dom/server');
  const html = renderToString(panel(list(5, {initial: 2})));
  expect(html.match(/<li>/g)).toHaveLength(2);
  expect(html).toContain('+3 more on the Tasks page');
  await render(panel(list(5, {initial: 2})));
  expect(rows()).toHaveLength(5);
  expect(rows().every(r => !r.hidden)).toBe(true);
});

test('a render that changed nothing reads the panel once and writes nothing (Session AM-2, regressions: NOVA renders every second)', async () => {
  height = 130;
  await render(panel(list(6)));
  expect(rows().map(r => r.hidden)).toEqual([false, false, true, true, true, true]);
  const writes: string[] = [], watch = new MutationObserver(records => { for (const r of records) writes.push(`${r.type} ${r.attributeName ?? ''}`); });
  watch.observe(host, {subtree: true, childList: true, attributes: true, characterData: true});
  for (let i = 0; i < 5; i++) { const before = reads; await render(panel(list(6))); expect(reads - before).toBe(1); }
  watch.takeRecords().forEach(r => writes.push(`${r.type} ${r.attributeName ?? ''}`)); watch.disconnect();
  expect(writes).toEqual([]);
  expect(rows().map(r => r.hidden)).toEqual([false, false, true, true, true, true]);
  expect(line().textContent).toBe('+4 more on the Tasks page');
});

test('a change of content with no render of the list is measured: something added beside it, and something that only changed its size', async () => {
  height = 4 * ROW;
  await render(panel([h('div', {key: 'list'}, list(4)), h('div', {key: 'block', 'data-px': 0})]));
  expect(rows().every(r => !r.hidden)).toBe(true);
  const body = host.querySelector<HTMLElement>('.nova-widget-body')!, block = host.querySelector<HTMLElement>('[data-px]')!;
  // The block grows (an attribute, nothing added): two rows and the line (111) fit beside its 50 px, three (155) do not.
  await change(() => { block.dataset.px = '50'; });
  expect(rows().map(r => r.hidden)).toEqual([false, false, true, true]);
  expect(line().textContent).toBe('+2 more on the Tasks page');
  // A status line is added to the panel (44 px more): one row and the line are left.
  await change(() => { const note = document.createElement('p'); note.dataset.px = '44'; body.append(note); });
  expect(rows().map(r => r.hidden)).toEqual([false, true, true, true]);
  expect(line().textContent).toBe('+3 more on the Tasks page');
  // And it leaves again, with the block back to nothing: every row is back, and the line is gone.
  await change(() => { body.querySelector('p[data-px]')!.remove(); block.dataset.px = '0'; });
  expect(rows().every(r => !r.hidden)).toBe(true);
  expect(line().hidden).toBe(true);
});

test('Session AV (ADR-045 D36): a field\'s name written and taken away again is not a change of content (one read, as for a render)', async () => {
  height = 130;
  await render(panel([h('div', {key: 'list'}, list(6)), h('input', {key: 'box', type: 'checkbox', 'aria-label': 'Done'})]));
  expect(rows().map(r => r.hidden)).toEqual([false, false, true, true, true, true]);
  const box = host.querySelector<HTMLInputElement>('input')!;
  for (let i = 0; i < 4; i++) {
    const before = reads;
    // What React does to a task's checkbox on a render: an empty name written, then taken away.
    await change(() => { box.setAttribute('name', ''); box.removeAttribute('name'); });
    expect(reads - before).toBe(0);
  }
  // A real change of content right after still measures.
  const before = reads;
  await change(() => { const note = document.createElement('p'); note.dataset.px = '44'; host.querySelector('.nova-widget-body')!.append(note); });
  expect(reads - before).toBeGreaterThan(0);
  expect(rows().map(r => r.hidden)).toEqual([false, true, true, true, true, true]);
});

test('Session AV lane 2 (ADR-045 D36): the first measure reads the last line with its words, so the next frame does not search again', async () => {
  emptyLine = 3;
  height = 150; // three rows (132) fit alone and with an empty line (135), not with the words (155): two rows and the line (111)
  await act(async () => { root.render(panel(list(4))); });
  // Before any frame, the answer is already the one painted: the line was measured with its words.
  expect(rows().map(r => r.hidden)).toEqual([false, false, true, true]);
  expect(line().hidden).toBe(false);
  expect(line().textContent).toBe('+2 more on the Tasks page');
  const before = reads;
  await act(async () => { await frame(); });
  // The frame's check reads the panel once and finds nothing changed (it used to search the whole list again).
  expect(reads - before).toBe(1);
  expect(rows().map(r => r.hidden)).toEqual([false, false, true, true]);
  expect(line().textContent).toBe('+2 more on the Tasks page');
  expect(body().scrollHeight).toBeLessThanOrEqual(body().clientHeight);
});

test('Session AV lane 2 (ADR-045 D36): one measure asks each count once (each question is a layout of the whole page in a browser)', async () => {
  height = 150; // four rows: two rows and the line fit
  const before = reads;
  await act(async () => { root.render(panel(list(4))); });
  // Every row (does not fit), then 3, 0, 1 and 2 rows (the halving), then the sizes it keeps: six reads. Asked again were
  // "every row" twice (by the search, and by its giving back) and the answer itself once more after the search: nine.
  expect(reads - before).toBe(6);
  expect(rows().map(r => r.hidden)).toEqual([false, false, true, true]);
  expect(line().textContent).toBe('+2 more on the Tasks page');
});
