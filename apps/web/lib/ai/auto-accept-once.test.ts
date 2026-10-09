// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {ProposalList} from '../../components/ai/proposal-list';
import {useAutoAccept} from '../../components/ai/use-auto-accept';
import type {ProposalRunner} from '../../components/ai/use-proposals';
import {parseReply} from './actions/parse';
import type {Plan, Stores} from './actions/plan';
import {AI_OPTIONS_KEY} from './store/keys';
import {AUTO_ACCEPT_REASONS} from './actions/auto-accept';
import {localDate} from '../local-date';

/**
 * Session Y Part 4 (docs/verification/y-cloud/SECURITY_REVIEW_Y.md, F1 and F2): ZIGi adds a reply's switched-on cards
 * once, when the reply has just arrived in this session. The same reply shown again (History and back, another view, an
 * older chat, a reload) waits for the person. Each write first takes its slot under today's cap from the stored count,
 * so replies that show at the same moment never pass the cap together.
 */
const written: string[] = [];
const stores = {} as Stores;
const runner: ProposalRunner = {
  ready: true, stores,
  plan: action => ({ok: true, plan: {target: 'health', card: {kind: action.kind, title: `Water ${'millilitres' in action ? action.millilitres : ''}`, lines: [], where: 'Health', day: null, estimate: false}, write: () => ({}), undo: null} as Plan}),
  apply: async (plan: Plan, auto?: boolean) => { written.push(`${plan.card.title}${auto ? ' (auto)' : ''}`); return stores; },
  applyAll: async () => ({after: [], error: null}), undo: async () => null, openForm: () => false,
};
const reply = (ml: number) => parseReply('Logged.\n\n```zigoals-action\n[{"kind":"log-water","millilitres":' + ml + '},{"kind":"log-water","millilitres":' + (ml + 1) + '}]\n```');
/** The chat session's bookkeeping (use-chat-session `claimFresh`): a reply is fresh once, from when it arrived. */
const fresh = new Set<string>();
function Chat({turns, replaced = []}: {turns: number[]; replaced?: number[]}) {
  const autoAccept = useAutoAccept(true);
  return h('div', null, turns.map(ml => { const p = reply(ml); return h(ProposalList, {key: ml, proposals: p.proposals, rejected: p.rejected, handles: [], runner, autoAccept, replaced: replaced.includes(ml), claimAuto: () => fresh.delete(`t${ml}`)}); }));
}
let root: Root | null = null, element: HTMLDivElement;
const mount = async (turns: number[], replaced: number[] = []) => { element = document.createElement('div'); document.body.append(element); root = createRoot(element); await act(async () => { root!.render(h(Chat, {turns, replaced})); }); for (let i = 0; i < 6; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const unmount = async () => { await act(async () => { root!.unmount(); }); root = null; element.remove(); };
const count = () => JSON.parse(localStorage.getItem(AI_OPTIONS_KEY)!).autoAccept.days?.[localDate()] ?? 0;
const options = (cap: number) => localStorage.setItem(AI_OPTIONS_KEY, JSON.stringify({version: 1, autoAccept: {kinds: {'log-water': true}, dailyCap: cap}}));
beforeEach(() => { (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (root) await unmount(); written.length = 0; fresh.clear(); localStorage.clear(); vi.restoreAllMocks(); });

test('F1: a reply that just arrived is added once; shown again it waits for the person', async () => {
  options(20); fresh.add('t250');
  await mount([250]);
  expect(written).toEqual(['Water 250 (auto)', 'Water 251 (auto)']);expect(count()).toBe(2);
  await unmount();
  await mount([250]);
  expect(written).toHaveLength(2);expect(count()).toBe(2);
  expect(element.textContent).not.toContain('Added by ZIGi');
});
test('F1: a reply from History, after a reload or already replaced is never added by ZIGi', async () => {
  options(20); fresh.add('t300');
  await mount([100, 200, 300], [300]);
  expect(written).toEqual([]);expect(localStorage.getItem(AI_OPTIONS_KEY)).not.toContain('"days"');
});
test('F2: replies shown at the same moment share today\'s cap: two slots, two writes', async () => {
  options(2); for (const ml of [100, 200, 300]) fresh.add(`t${ml}`);
  await mount([100, 200, 300]);
  expect(written).toHaveLength(2);expect(count()).toBe(2);
  expect(element.textContent).toContain(AUTO_ACCEPT_REASONS.cap);
});
