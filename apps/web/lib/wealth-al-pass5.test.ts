// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, createElement as h, StrictMode, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {buildShowcase} from './showcase-data';
import {platformSchema, positionSchema, type Platform} from './positions';
import {archiveAsset} from './asset-management';
import {recordGoalChanges} from './goal-intelligence';
import {privateGoalSummary} from './goal-summary';
import {archivedReleaseLabel, releasedByArchive} from './goals/released';
import {assetQuantity, metalUnitShown, perUnitCents, unitWord} from '../components/platform/asset-quantity';
import {useBackCloses} from '../components/use-back-closes';

/** Session AL, lane L1 fifth pass (GROK53_REPLAY_L1_2.md): unit checks per id. */
const showcase = (): Platform => platformSchema.parse(JSON.parse(buildShowcase('2026-11-05', 'Europe/Brussels').records['zigoals:platform:v1']!));

describe('TK-196 / W24: the Showcase archive of USD Coin flags Emergency fund (the replay\'s exact data)', () => {
  it('writes the release line, and the goal card counts one released asset until it is reviewed', () => {
    const before = showcase(), at = Date.parse('2026-11-05T09:30:00Z');
    expect(before.allocations.some(a => a.goalId === '9201' && a.positionId === 'showcase-usdc')).toBe(true);
    const saved = platformSchema.parse(recordGoalChanges(before, archiveAsset(before, 'showcase-usdc', true, at), at + 5));
    expect(saved.goalHistory.filter(h => h.goalId === '9201' && h.kind === 'allocation').map(h => 'label' in h ? h.label : '')).toContain(archivedReleaseLabel('USD Coin'));
    expect(releasedByArchive(saved, '9201').map(r => r.name)).toEqual(['USD Coin']);
    const summary = privateGoalSummary(saved, saved.goals.find(g => g.id === '9201')!);
    expect([summary.released, summary.requiresReview]).toEqual([1, true]);
    // The other goals lost nothing to this archive and say nothing.
    for (const g of saved.goals.filter(g => g.id !== '9201')) expect(releasedByArchive(saved, g.id)).toEqual([]);
  });
});

describe('N-MO-17: a metal linked to its market counts in its weight unit', () => {
  const gold = () => showcase().positions.find(p => p.id === 'showcase-gold')!;
  it('reads the unit from "Gold · troy ounces" when the code is GOLD', () => {
    expect(gold().asset).toBe('GOLD');
    expect(metalUnitShown(gold())).toEqual({metal: 'Gold', unit: 'troy ounces'});
    expect(assetQuantity('10', gold())).toBe('10 troy ounces of Gold');
    expect(assetQuantity('1', gold())).toBe('1 troy ounce of Gold');
    expect(unitWord(gold())).toBe('troy ounce');
  });
  it('leaves other assets as they were', () => {
    const btc = showcase().positions.find(p => p.id === 'showcase-btc')!, camera = showcase().positions.find(p => p.id === 'showcase-custom')!;
    expect([metalUnitShown(btc), unitWord(btc), assetQuantity('0.45', btc)]).toEqual([null, 'BTC', '0.45 BTC']);
    expect([unitWord(camera), assetQuantity('1', camera)]).toEqual(['item', '1 item']);
    // A metal whose name says no unit keeps its code.
    const plain = positionSchema.parse({...gold(), providerId: 'Gold bar'});
    expect([metalUnitShown(plain), assetQuantity('2', plain)]).toEqual([null, '2 GOLD']);
  });
  it('one troy ounce at the holding\'s own value, in whole cents', () => {
    expect(perUnitCents(4_400_000n, '10', 0)).toBe(440_000n);
    expect(perUnitCents(100n, '3', 0)).toBe(33n); // 0.333… rounds to 0.33
    expect(perUnitCents(200n, '3', 0)).toBe(67n); // 0.666… rounds to 0.67
    expect(perUnitCents(1_000n, '250', 2)).toBe(400n); // 10.00 for 2.50 units
    expect(perUnitCents(1_000n, '0', 0)).toBeNull();
  });
});

describe('dev check (L1 fifth pass): a dialog opened under React Strict Mode stays open', () => {
  let element: HTMLDivElement, root: Root;
  beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); window.history.replaceState({}, '', '/app/wealth'); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
  afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  const wait = async (ms: number) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
  // Chrome's order (traced under `next dev`): the Back sent by Strict Mode's cleanup arrives after the second run's
  // pushState and lands on the page's own entry. jsdom drops a Back queued before a pushState, so it is played as Chrome does.
  const personBack = () => { window.history.replaceState({}, ''); window.dispatchEvent(new PopStateEvent('popstate', {state: {}})); };
  function Dialog() { const [open, setOpen] = useState(true); useBackCloses(open, () => setOpen(false)); return h('p', null, open ? 'open' : 'closed'); }
  it('the Back its own first run sends is passed over; a person\'s Back still closes it', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => { setTimeout(personBack, 0); });
    await act(async () => root.render(h(StrictMode, null, h(Dialog))));
    await wait(30);
    expect(back).toHaveBeenCalledTimes(1);
    expect(element.textContent).toBe('open');
    await act(async () => { personBack(); });
    expect(element.textContent).toBe('closed');
  });
});
