// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {hideToast, UndoToastHost} from '../../components/ui/undo-toast';
import {removeWithUndo} from '../../components/ui/remove-with-undo';
import {PATH_REMOVAL_STACK, keepPathPlaces} from './habit-undo';
import {addCustom, addFavourite, orderedItems, removeItem, sectionOfItem, sectionsOf} from './store';
import {emptyChecklist, type Checklist} from './schema';

/** Session AL fix-up (LS-058): an Undo of path removals puts each item back in its place in the path's order, not at the
 *  end of its orbit (the shared Undo restores `items` but not `order`, a list of plain ids). */
vi.mock('next/link', () => ({default: ({href, children, ...rest}: {href: string; children: unknown}) => createElement('a', {href, ...rest}, children as never)}));
let host: HTMLDivElement, root: Root;
beforeEach(async () => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(UndoToastHost)));
});
afterEach(async () => { await act(async () => { hideToast(); hideToast(); root.unmount(); }); host.remove(); vi.unstubAllGlobals(); });
const undo = () => act(async () => { host.querySelector<HTMLButtonElement>('.aa-toast-undo')!.click(); });
const at = (n: number) => ({id: `ck_${n}`, at: new Date(Date.UTC(2026, 0, 1, 0, 0, n))});
/** As Edit path shows it: orbit by orbit, each in the path's order. */
const shown = (r: Checklist) => sectionsOf(r).flatMap(s => orderedItems(r).filter(i => sectionOfItem(r, i) === s.id)).map(i => i.id);
function store() {
  let r = emptyChecklist();
  r = addCustom(r, {label: 'Stretch', section: 'morning'}, at(1));
  r = addFavourite(r, {kind: 'health', input: 'water'}, {...at(2), section: 'morning'});
  r = addCustom(r, {label: 'Push-ups', section: 'afternoon'}, at(3));
  r = addCustom(r, {label: 'Sketch', section: 'evening'}, at(4));
  const s = {record: r};
  const update = (fn: (latest: Checklist) => Checklist) => { s.record = fn(s.record); };
  const take = (id: string) => act(async () => removeWithUndo(keepPathPlaces(update), x => removeItem(x, id), `${id} is off your path.`, 'Back on your path.', {stack: PATH_REMOVAL_STACK}));
  return {s, take};
}

test('three quick removals and one Undo: all three back in their places, the first of Morning first again', async () => {
  const {s, take} = store(), before = shown(s.record);
  expect(before).toEqual(['ck_1', 'ck_2', 'ck_3', 'ck_4']);
  await take('ck_1'); await take('ck_3'); await take('ck_4');
  expect(shown(s.record)).toEqual(['ck_2']);
  await undo();
  expect(shown(s.record)).toEqual(before);
  expect(s.record.order).toEqual(before);
});

test('one removal of the first item and its Undo: back first, not after Water', async () => {
  const {s, take} = store(), before = shown(s.record);
  await take('ck_1');
  await undo();
  expect(shown(s.record)).toEqual(before);
});

test('a removal keeps the order list free of the removed id (unchanged store rule)', async () => {
  const {s, take} = store();
  await take('ck_2');
  expect(s.record.order).toEqual(['ck_1', 'ck_3', 'ck_4']);
});
