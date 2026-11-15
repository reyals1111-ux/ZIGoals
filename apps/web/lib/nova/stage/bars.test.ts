// @vitest-environment jsdom
import {act, createElement, useRef, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {NovaLeft, type LeftPage} from '../../../components/nova/nova-left';
import {StageChoices, StageList, StageRequests} from '../../../components/nova/stage/right-stage';
import type {StageApi} from '../../../components/nova/stage/use-stage';
import type {DeviceRecordState} from '../../../components/ai/use-device-record';
import {hideToast, shownToasts} from '../../../components/ui/undo-toast';
import {NOVA_HANDOFF_EVENT, clearNovaHandoff} from '../bridge';
import {RIGHT_SECTIONS, foldSection, novaRecordSchema, panelsOf} from '../store';
import {STAGE_AGAIN_EVENT} from './events';
import {asksOf, emptyStage, keepsMade, proactiveOn, recordAsk, type NovaStage, type StageWidget} from './record';

/**
 * Session AM (ADR-038 A1, D3, D16, D19, A5): NOVA's side bars as a person meets them — the left bar's sections, switches
 * and "go to", and the right bar's Requests, On the stage and Your choices. Rendered for real (jsdom), no browser.
 */
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
  vi.stubGlobal('requestAnimationFrame', (run: () => void) => { run(); return 0; });
  localStorage.clear(); clearNovaHandoff(); hideToast();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const flush = () => act(async () => { for (let i = 0; i < 6; i++) await new Promise(r => setTimeout(r, 0)); });
const type = async (input: HTMLInputElement, value: string) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', {bubbles: true}));
});
const key = (el: Element, k: string) => act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true, cancelable: true})); });
const click = (el: Element | null | undefined) => act(async () => { (el as HTMLElement).click(); });
const button = (name: string) => [...host.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') ?? b.textContent) === name);
const hrefs = () => [...host.querySelectorAll('a')].map(a => a.getAttribute('href'));

type LeftProps = Parameters<typeof NovaLeft>[0];
const CONSUMER: readonly LeftPage[] = ['today', 'goals', 'habits', 'health', 'wealth', 'activity'];
const left = (more: Partial<LeftProps> = {}) => createElement(NovaLeft, {
  state: 'open', onCycle() {}, you: 'Sam', brain: {kind: 'none', words: 'on-device answers'} as never, counts: {goals: 0, habitsLeft: 3, notesInbox: 2, tasksDue: null, focusWeek: null} as never,
  pages: (id: LeftPage) => CONSUMER.includes(id), earn: false, chess: false, persona: 'NOVA', onNova() {}, onZigi() {}, zigiStatus: 'on', hermes: null, ...more,
});

describe('NOVA left bar: everything in the app, in sections that fold', () => {
  it('shows Today, the six sections and every page that is switched on; Money and More start folded', async () => {
    await act(async () => root.render(left())); await flush();
    expect(host.querySelector('a.nova-left-life')!.getAttribute('href')).toBe('/app/today');
    expect(host.querySelector('a.nova-left-life')!.getAttribute('aria-label')).toBe('Your life: all four pillars on Today');
    const folds = [...host.querySelectorAll<HTMLButtonElement>('.nb-fold')];
    expect(folds.map(b => b.querySelector('span')!.textContent)).toEqual(['Your pillars', 'Your plan', 'Your mind', 'Money', 'More', 'Agents']); // Session AM (deliberate): the group was "Your day", the same name as the top bar's "Your day" button (two buttons with one name)
    expect(folds.map(b => b.getAttribute('aria-expanded'))).toEqual(['true', 'true', 'true', 'false', 'false', 'true']);
    for (const b of folds) expect(host.querySelector(`[id="${b.getAttribute('aria-controls')}"]`)).toBeTruthy();
    const more = folds[4]!, list = host.querySelector<HTMLElement>(`[id="${more.getAttribute('aria-controls')}"]`)!;
    expect(list.hidden).toBe(true);
    await click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(list.hidden).toBe(false);
    expect([...list.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual(['/app/journey', '/app/stories', '/app/timeline', '/app/activity', '/app/plans', '/app/help', '/app/settings']);
    await click(folds[0]);
    expect(folds[0]!.getAttribute('aria-expanded')).toBe('false');
    // The counts stay in each row's name; a zero shows no badge (ND-14).
    expect(host.querySelector('a[href="/app/goals"]')!.getAttribute('aria-label')).toBe('Goals, 0 active');
    expect(host.querySelector('a[href="/app/habits"]')!.getAttribute('aria-label')).toBe('Habits, 3 left today');
    expect([...host.querySelectorAll('.nova-left-count')].map(c => c.textContent)).toEqual(['3', '2']);
    expect(host.querySelector('.nova-left-foot')).toBeTruthy();
  });
  it('nothing of the chain, no Chess and no Music until they are switched on; Governance needs its own switch and Staking', async () => {
    await act(async () => root.render(left())); await flush();
    for (const href of ['/app/markets', '/app/portfolio', '/app/staking', '/app/ecosystem', '/app/earn', '/app/governance', '/app/chess', '/app/music']) expect(hrefs(), href).not.toContain(href);
    expect(hrefs()).toEqual(expect.arrayContaining(['/app/wealth?view=bills', '/app/wealth?view=budgets']));
    const all = () => true;
    await act(async () => root.render(left({pages: all, earn: true, chess: true, chain: true}))); await flush();
    expect(hrefs()).toEqual(expect.arrayContaining(['/app/markets', '/app/portfolio', '/app/staking', '/app/ecosystem', '/app/earn', '/app/chess', '/app/music']));
    expect(hrefs()).not.toContain('/app/governance');
    await act(async () => root.render(left({pages: all, earn: true, chess: true, chain: true, governance: true}))); await flush();
    expect(hrefs()).toContain('/app/governance');
    await act(async () => root.render(left({pages: (id: LeftPage) => id !== 'staking', governance: true}))); await flush();
    expect(hrefs()).not.toContain('/app/governance');
  });
  it('an app switched off on this device is left out', async () => {
    localStorage.setItem('zigoals:apps:v1', JSON.stringify({version: 1, hidden: ['tasks', 'journal']}));
    await act(async () => root.render(left())); await flush();
    expect(hrefs()).not.toContain('/app/tasks');
    expect(hrefs()).not.toContain('/app/journal');
    expect(hrefs()).toEqual(expect.arrayContaining(['/app/agenda', '/app/notes', '/app/checklist']));
  });
  it('the rail shows every page as a named icon, with no field and no headings', async () => {
    await act(async () => root.render(left({state: 'rail'}))); await flush();
    expect(host.querySelector('input')).toBeNull();
    expect(host.querySelector('.nb-fold')).toBeNull();
    const rows = [...host.querySelectorAll('.nova-left-nav .nova-left-row')];
    expect(rows.length).toBeGreaterThan(18);
    for (const r of rows) { expect(r.getAttribute('aria-label')).toBeTruthy(); expect(r.getAttribute('title')).toBe(r.getAttribute('aria-label')); }
    expect(host.querySelector('a[href="/app/settings"]')).toBeTruthy(); // a folded section still shows in the rail
    expect(button('Hide the left panel')).toBeTruthy();
  });
});

describe('NOVA left bar: the field is a "go to"', () => {
  it('finds a place inside a page by an English or a Dutch word; Enter opens the first; the arrows walk the list', async () => {
    await act(async () => root.render(left())); await flush();
    const input = host.querySelector('input')!;
    await type(input, 'slaap');
    const first = host.querySelector<HTMLAnchorElement>('.nb-results a')!;
    expect(first.getAttribute('href')).toBe('/app/health?view=sleep');
    expect(first.getAttribute('aria-label')).toBe('Sleep, in Health');
    expect(host.querySelector('[role="status"]')!.textContent).toBe('1 found. Enter opens Sleep.');
    expect(host.querySelector('.nb-fold')).toBeNull(); // the sections give way to what was found
    let opened = 0;
    first.addEventListener('click', e => { opened++; e.preventDefault(); });
    await key(input, 'Enter');
    expect(opened).toBe(1);
    await type(input, 'we');
    const list = [...host.querySelectorAll<HTMLElement>('.nb-results a')];
    expect(list.length).toBeGreaterThan(2);
    expect(list[0]!.getAttribute('href')).toBe('/app/wealth');
    input.focus();
    await key(input, 'ArrowDown');
    expect(document.activeElement).toBe(list[0]);
    await key(list[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(list[1]);
    await key(list[1]!, 'End');
    expect(document.activeElement).toBe(list.at(-1));
    await key(list.at(-1)!, 'Home');
    await key(list[0]!, 'ArrowUp');
    expect(document.activeElement).toBe(input);
    // Escape empties the field and is not passed on (NOVA's own Escape leaves the page).
    const escape = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
    await act(async () => { input.dispatchEvent(escape); });
    expect(escape.defaultPrevented).toBe(true);
    expect(input.value).toBe('');
    expect(host.querySelector('.nb-fold')).toBeTruthy();
  });
  it('a place inside NOVA opens in place; an agent is found by name; a hidden page takes its places with it', async () => {
    let asked = 0;
    await act(async () => root.render(left({persona: 'Atlas', onZigi: () => { asked++; }}))); await flush();
    const input = host.querySelector('input')!;
    await type(input, 'permissions');
    expect(host.querySelector('.nb-results a')!.getAttribute('href')).toBe('#nova-permissions');
    expect(host.querySelector('.nb-results a')!.getAttribute('aria-label')).toBe('Permissions, in Atlas');
    await type(input, 'zigi');
    const zigi = host.querySelector<HTMLButtonElement>('.nb-results button')!;
    expect(zigi.getAttribute('aria-label')).toBe('ZIGi, ready');
    await click(zigi);
    expect(asked).toBe(1);
    expect(input.value).toBe('');
    await act(async () => root.render(left({pages: (id: LeftPage) => id !== 'health'}))); await flush();
    await type(host.querySelector('input')!, 'sleep');
    expect(host.querySelector('.nb-results')).toBeNull();
  });
  it('words that name nothing can be handed to NOVA, as typed', async () => {
    const seen: unknown[] = []; const on = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener(NOVA_HANDOFF_EVENT, on);
    await act(async () => root.render(left())); await flush();
    const input = host.querySelector('input')!;
    await type(input, 'how was my month');
    expect(host.querySelector('.nb-none')!.textContent).toContain('Nothing by that name. Ask NOVA instead.');
    const ask = button('Ask NOVA: how was my month')!;
    expect(ask.textContent).toBe('Ask NOVA');
    await click(ask);
    expect(seen).toEqual([{kind: 'ask', text: 'how was my month'}]);
    expect(input.value).toBe('');
    await type(input, 'and my year');
    await key(input, 'Enter');
    expect(seen.at(-1)).toEqual({kind: 'ask', text: 'and my year'});
    window.removeEventListener(NOVA_HANDOFF_EVENT, on);
  });
});

// ---- The right bar ----
/** The stage record as a component holds it: the person's change is applied, kept and published to `seen.stage`. */
const seen: {stage: NovaStage} = {stage: emptyStage()};
const publish = (next: NovaStage) => { seen.stage = next; };
function Held({start, render}: {start: NovaStage; render: (record: DeviceRecordState<NovaStage>) => ReturnType<typeof createElement>}) {
  const [data, setData] = useState(start), now = useRef(start);
  return render({data, loaded: true, unreadable: false, update: change => { const next = change(now.current); now.current = next; publish(next); setData(next); return next; }, clear() {}});
}
const held = (start: NovaStage, render: (record: DeviceRecordState<NovaStage>) => ReturnType<typeof createElement>) => { publish(start); return createElement(Held, {start, render}); };
const NOW = Date.now(), ago = (ms: number) => new Date(NOW - ms);
function history(): NovaStage {
  let r = emptyStage();
  r = recordAsk(r, {id: 'old', at: ago(3 * 86_400_000), text: 'Show my net worth', widgets: [{id: 'net-worth'}], device: 'phone', by: 'device'});
  r = recordAsk(r, {id: 'chat', at: ago(2000), text: 'How do I sleep better?', device: 'computer', by: 'model'});
  r = recordAsk(r, {id: 'new', at: ago(1000), text: 'Show my habits this week', widgets: [{id: 'habit-week'}], device: 'computer', by: 'device'});
  return r;
}

describe('NOVA right bar: Requests', () => {
  const requests = (start: NovaStage) => held(start, record => createElement(StageRequests, {record, persona: 'NOVA'}));
  it('newest first under Today and Earlier, a phone’s marked, "Show again" only where widgets were made', async () => {
    await act(async () => root.render(requests(history()))); await flush();
    expect([...host.querySelectorAll('.nb-group')].map(h => h.textContent)).toEqual(['Today', 'Earlier']);
    expect([...host.querySelectorAll('.nb-ask-text')].map(p => p.textContent)).toEqual(['“Show my habits this week”', '“How do I sleep better?”', '“Show my net worth”']);
    const rows = [...host.querySelectorAll('.nb-ask')];
    expect(rows.map(r => r.querySelectorAll('time').length)).toEqual([1, 1, 1]);
    expect(rows[2]!.textContent).toContain('from your phone');
    expect(rows[0]!.textContent).not.toContain('from your phone');
    // Session AM (design review AM-D13, deliberate): the widget is titled for what it counts, "Tracked wealth" (was "Net worth").
    expect(rows[2]!.textContent).toContain('made Tracked wealth');
    expect(rows.map(r => !!r.querySelector('button.nova-btn'))).toEqual([true, false, true]);
    const seen: string[] = []; const on = (e: Event) => seen.push((e as CustomEvent<string>).detail);
    window.addEventListener(STAGE_AGAIN_EVENT, on);
    await click(button('Show again: Show my net worth'));
    window.removeEventListener(STAGE_AGAIN_EVENT, on);
    expect(seen).toEqual(['old']);
  });
  it('Forget removes one request and Undo brings it back; Forget all empties the list, with Undo', async () => {
    await act(async () => root.render(requests(history()))); await flush();
    await click(button('Forget: How do I sleep better?'));
    expect(asksOf(seen.stage).map(a => a.id)).toEqual(['new', 'old']);
    expect(shownToasts().at(-1)!.message).toBe('That request is forgotten.');
    await act(async () => { await shownToasts().at(-1)!.undo!(); });
    expect(asksOf(seen.stage).map(a => a.id)).toEqual(['new', 'chat', 'old']);
    await click(button('Forget all requests'));
    expect(asksOf(seen.stage)).toEqual([]);
    expect(host.textContent).toContain('Nothing asked yet.');
    expect(host.querySelector('.nb-ask')).toBeNull();
    expect(shownToasts().at(-1)!.message).toBe('Your requests are forgotten.');
    await act(async () => { await shownToasts().at(-1)!.undo!(); });
    expect(asksOf(seen.stage).map(a => a.id)).toEqual(['new', 'chat', 'old']);
    expect(host.querySelectorAll('.nb-ask')).toHaveLength(3);
  });
  it('a long history shows the newest six until "Show all"; an empty one teaches in one line', async () => {
    let r = emptyStage();
    for (let i = 0; i < 9; i++) r = recordAsk(r, {id: `a${i}`, at: ago((10 - i) * 1000), text: `Ask ${i}`, device: 'computer', by: 'device'});
    await act(async () => root.render(requests(r))); await flush();
    expect(host.querySelectorAll('.nb-ask')).toHaveLength(6);
    await click(button('Show all 9'));
    expect(host.querySelectorAll('.nb-ask')).toHaveLength(9);
    expect(button('Show fewer')!.getAttribute('aria-expanded')).toBe('true');
    await act(async () => root.unmount()); root = createRoot(host);
    await act(async () => root.render(requests(emptyStage()))); await flush();
    expect(host.querySelectorAll('p')).toHaveLength(1);
    expect(host.querySelector('button')).toBeNull();
  });
});

describe('NOVA right bar: On the stage', () => {
  const widget = (id: string, pinned: boolean, slot: number): StageWidget => ({id, size: 'M', slot, pinned, ...(pinned ? {} : {at: new Date(NOW - 60_000).toISOString()})});
  it('names every widget on the stage and in the dock, says which are pinned, and pins, hides, shows and closes', async () => {
    const did: string[] = [], note = (what: string) => (id: string) => { did.push(`${what}:${id}`); };
    const stage = {loaded: true, shown: [widget('net-worth', false, 0), widget('tasks', true, 1)], docked: [widget('weather', false, 2)],
      pin: note('pin'), unpin: note('unpin'), hide: note('hide'), show: note('show'), close: note('close')} as unknown as StageApi;
    await act(async () => root.render(createElement(StageList, {stage, persona: 'NOVA'})));
    const rows = [...host.querySelectorAll('.nb-stage-row')];
    expect(rows.map(r => r.querySelector('.nb-stage-name')!.firstChild!.textContent)).toEqual(['Tracked wealth', 'Tasks', 'Weather']); // AM-D13, deliberate: the new title
    expect(rows[0]!.querySelector('small')!.textContent).toMatch(/^Made /);
    expect(rows[1]!.querySelector('small')!.textContent).toBe('Pinned');
    expect(rows[2]!.querySelector('small')!.textContent).toMatch(/ · in the dock$/);
    for (const name of ['Tracked wealth: pin', 'Tracked wealth: hide in the dock', 'Tracked wealth: close', 'Tasks: unpin', 'Weather: show on the stage', 'Weather: close']) await click(button(name));
    expect(did).toEqual(['pin:net-worth', 'hide:net-worth', 'close:net-worth', 'unpin:tasks', 'show:weather', 'close:weather']);
    await act(async () => root.render(createElement(StageList, {stage: {...stage, shown: [], docked: []} as StageApi, persona: 'NOVA'})));
    expect(host.textContent).toContain('The stage is clear.');
  });
});

describe('NOVA right bar: Your choices', () => {
  const choices = (travels: boolean) => held(emptyStage(), record => createElement(StageChoices, {record, persona: 'NOVA', travels}));
  it('two real switches, both off until the person turns them on, each with its helper line', async () => {
    await act(async () => root.render(choices(false)));
    const switches = [...host.querySelectorAll<HTMLButtonElement>('[role="switch"]')];
    const name = (b: Element) => host.querySelector(`[id="${b.getAttribute('aria-labelledby')}"]`)!.textContent, help = (b: Element) => host.querySelector(`[id="${b.getAttribute('aria-describedby')}"]`)!.textContent;
    expect(switches.map(name)).toEqual(['Keep made widgets until I close them', 'Gentle cards from your briefs']);
    expect(switches.map(s => s.getAttribute('aria-checked'))).toEqual(['false', 'false']);
    expect(help(switches[0]!)).toBe('Off: a widget NOVA makes leaves by itself after 12 hours, unless you pin it.');
    expect(help(switches[1]!)).toBe('While NOVA is open, a card may appear for today’s plan, something due today, a streak at risk or a bill due. Never a notification.');
    await click(switches[0]);
    expect(keepsMade(seen.stage)).toBe(true);
    expect(switches[0]!.getAttribute('aria-checked')).toBe('true');
    await click(switches[1]);
    expect(proactiveOn(seen.stage)).toBe(true);
    await click(switches[1]);
    expect(proactiveOn(seen.stage)).toBe(false);
    expect(seen.stage).toEqual({version: 1, keep: true});
  });
  it('says where this lives, and never claims the account without a sync that carried it', async () => {
    await act(async () => root.render(choices(false)));
    expect(host.querySelector('.nb-lives')!.textContent).toBe('Your requests, pinned widgets and layout stay on this device only.');
    await act(async () => root.render(choices(true)));
    expect(host.querySelector('.nb-lives')!.textContent).toBe('Your requests, pinned widgets and layout travel end-to-end encrypted with your account.');
  });
});

describe('NOVA right bar: the three sections fold like the others', () => {
  it('are remembered beside the six numbered ones; an older build’s folded list still reads', () => {
    expect(RIGHT_SECTIONS).toEqual(['brains', 'voice', 'tools', 'usage', 'memory', 'activity', 'requests', 'stage', 'choices']);
    const older = novaRecordSchema.parse({version: 1, panels: {right: 'open', folded: ['voice', 'memory']}});
    expect(panelsOf(older, 1440).folded).toEqual(['voice', 'memory']);
    let r = older;
    for (const id of RIGHT_SECTIONS) r = foldSection(r, id, true);
    expect(panelsOf(r, 1440).folded).toHaveLength(RIGHT_SECTIONS.length);
    expect(panelsOf(foldSection(r, 'requests', false), 1440).folded).not.toContain('requests');
  });
});
