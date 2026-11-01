import {expect, test} from 'vitest';
import {Handles} from '../handles';
import {recordsForAi, recordsIn} from '../local-answers/more';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources, withG1} from '../tools/fixtures';
import {availableTools, runTool, TODAY_CLOSED_FOR_NOVA} from '../tools/registry';
import {NOVA_SCOPES, novaToolEnv, type NovaScopes} from './nova';

/**
 * Release review 2 (lane RA): NOVA's Today permission decides Today's own tools on NOVA's pack and tools path, also when
 * the Notes or Journal permission keeps the Today area open for those two; and "Ask my AI for more" recomputes NOVA's
 * records under NOVA → Permissions. ZIGi's environments carry no such list and run exactly as before.
 */
const ALL = Object.fromEntries(NOVA_SCOPES.map(s => [s, true])) as NovaScopes;
const sources = () => withG1(showcaseSources());
const TODAY_OWN = ['agenda', 'tasks', 'focus_sessions', 'calendar_events', 'today_summary', 'weekly_review', 'chess_ratings', 'links_count', 'recent_activity', 'zigi_plans', 'page_view', 'your_scales'];
test('Today off, Notes and Journal on: only the notes and the journal run in the Today area', () => {
  const env = novaToolEnv(sources(), gatesFor(true), {...ALL, today: false}, true);
  expect(env.areas.today).toBe(true);
  for (const tool of TODAY_OWN) expect(runTool(tool, {}, env), tool).toMatchObject({ok: false, refusal: TODAY_CLOSED_FOR_NOVA});
  expect(runTool('search_notes', {}, env).ok).toBe(true); expect(runTool('journal', {}, env).ok).toBe(true);
  const offered = availableTools(env).map(t => t.name);
  for (const tool of TODAY_OWN) expect(offered, tool).not.toContain(tool);
  expect(offered).toEqual(expect.arrayContaining(['search_notes', 'journal']));
  // Journal alone: the notes tool waits too.
  const journalOnly = novaToolEnv(sources(), gatesFor(true), {...ALL, today: false, notes: false}, true);
  expect(runTool('search_notes', {}, journalOnly)).toMatchObject({ok: false, refusal: TODAY_CLOSED_FOR_NOVA}); expect(runTool('journal', {}, journalOnly).ok).toBe(true);
  // All three off: the Today area itself is closed, as before.
  expect(novaToolEnv(sources(), gatesFor(true), {...ALL, today: false, notes: false, journal: false}, true).areas.today).toBe(false);
});
test('Today on (NOVA) and ZIGi\'s own environment: every Today tool runs as before, with no list', () => {
  const nova = novaToolEnv(sources(), gatesFor(true), ALL, true), zigi = toolEnv(sources(), gatesFor(true), 'provider');
  expect(nova.todayTools).toBeUndefined(); expect(zigi.todayTools).toBeUndefined();
  for (const env of [nova, zigi]) for (const tool of ['agenda', 'tasks', 'today_summary']) expect(runTool(tool, {}, env).ok, tool).toBe(true);
});
test('"Ask my AI for more": NOVA\'s records follow NOVA → Permissions; ZIGi\'s are the same text as before', () => {
  const calls = [{tool: 'agenda', args: {}, label: 'Agenda · 7 days'}, {tool: 'tasks', args: {}, label: 'Tasks'}];
  const zigi = recordsForAi(calls, sources(), gatesFor(true), []);
  const same = new Handles(), again = recordsIn(calls, toolEnv(sources(), gatesFor(true), 'provider', same), same);
  expect(again).toEqual(zigi); expect(zigi!.text).toContain('Book the dentist');
  const handles = new Handles(), nova = recordsIn(calls, novaToolEnv(sources(), gatesFor(true), {...ALL, today: false}, true, handles), handles)!;
  expect(nova.text).toContain(TODAY_CLOSED_FOR_NOVA); expect(nova.text).not.toContain('Book the dentist');
  // Health stays out unless NOVA's Health permission is on, even with ZIGi's Health gate open.
  const sleep = [{tool: 'sleep_summary', args: {}, label: 'Sleep summary'}], h = new Handles();
  expect(recordsIn(sleep, novaToolEnv(sources(), gatesFor(true), {...ALL, health: false}, true, h), h)!.text).not.toContain('averageAsleep');
  const open = new Handles(); expect(recordsIn(sleep, novaToolEnv(sources(), gatesFor(true), ALL, true, open), open)!.text).toContain('averageAsleep');
  expect(recordsIn([], toolEnv(sources(), gatesFor(true), 'provider'), new Handles())).toBeNull();
});
