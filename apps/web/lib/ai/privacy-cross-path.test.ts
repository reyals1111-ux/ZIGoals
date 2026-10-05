import {expect, test} from 'vitest';
import {emptyWeeklyReview} from '../weekly-review/schema';
import {bridgePrompt} from './bridge';
import {buildPageContext, type BuilderInput} from './context/builders';
import {consent} from './context/consent';
import {buildSystemPrompt} from './context/specialists';
import {aiGates, healthGate} from './gates';
import {Handles} from './handles';
import type {PageArea} from './settings';
import {toolEnv, type ToolSources} from './tools/env';
import {gatesFor, SENTINEL, sentinelsIn, settingsWith, showcaseSources, withHandHealth, withPortfolios, withSentinels} from './tools/fixtures';
import {availableTools, runTool, TOOLS, toolText} from './tools/registry';

/**
 * The cross-path privacy test (Session V Part 2, ADR-014): with sentinel Health records on the device and the Health
 * gate closed, nothing that can leave the device carries any of them, on any path. Each later part adds its paths here
 * (question context, context pack, local answers, explain-number attachments, the brief, "Continue in my AI", history
 * replay, the relay body, WebMCP results, on-device prompts). The same sentinels appear when the gate is open, which
 * proves the checks can see them.
 */
const PAGES: [PageArea, string][] = [['today', '/app'], ['habits', '/app/habits'], ['goals', '/app/goals'], ['health', '/app/health'], ['wealth', '/app/wealth'], ['wealth', '/app/portfolio'], ['wealth', '/app/staking'], ['help', '/app/help']];
const sources = (): ToolSources => withPortfolios(withHandHealth(withSentinels(showcaseSources())));
function builderInput(s: ToolSources, area: PageArea, pathname: string, health: boolean): BuilderInput {
  const gate = consent({settings: settingsWith(health), area, pathname, layoutHasHealth: true, accountActive: false, accountHealthPermitted: null});
  return {area, pathname, consent: gate, now: s.now, habitDay: s.habitDay, healthDay: s.healthDay, habits: s.habits, health: s.health, fasting: s.fasting, platform: s.platform, localGoals: s.localGoals, metadata: s.metadata, quotes: s.quotes,
    portfolio: s.portfolio ? {data: s.portfolio.data, priceOf: coin => s.portfolio!.priceOf(coin, 'USD')?.price} : null, week: area === 'today' ? {weekStart: '2026-09-29', weekEnd: s.habitDay, review: s.weekly ?? emptyWeeklyReview()} : null};
}
/** Everything one page would send or copy with a question, plus every tool's text, for a gate state. */
function everythingSent(health: boolean): {path: string; text: string}[] {
  const s = sources(), out: {path: string; text: string}[] = [];
  for (const [area, pathname] of PAGES) {
    const handles = new Handles(), context = buildPageContext(builderInput(s, area, pathname, health), handles);
    out.push({path: `page context ${pathname}`, text: context.text});
    out.push({path: `system prompt ${pathname}`, text: buildSystemPrompt({area, context: context.text, customInstructions: '', providerName: 'Mock'})});
    out.push({path: `bridge copy ${pathname}`, text: bridgePrompt({context, question: 'How was my week?'})});
    const env = toolEnv(s, gatesFor(health, area, pathname), 'provider', handles);
    for (const tool of TOOLS) {
      const args = tool.name === 'habit_stats' || tool.name === 'habit_checkins' ? {habit: 'Walk', range: 'today'} : tool.name === 'search_foods' ? {query: SENTINEL.food} : tool.name === 'goal_progress' ? {goal: 'Japan'} : tool.name === 'counters' ? {counter: SENTINEL.counter} : {};
      out.push({path: `tool ${tool.name} on ${pathname}`, text: toolText(runTool(tool.name, args, env), env)});
    }
    out.push({path: `tool list on ${pathname}`, text: JSON.stringify(availableTools(env).map(t => [t.name, t.description]))});
  }
  return out;
}

test('with the Health gate closed, no sentinel Health value leaves the device on any path', () => {
  const sent = everythingSent(false);
  expect(sent.length).toBeGreaterThan(200);
  for (const {path, text} of sent) expect(sentinelsIn(text), path).toEqual([]);
});
test('the checks can see the sentinels: with the gate open they appear on the Health paths', () => {
  const sent = everythingSent(true), found = new Set(sent.flatMap(s => sentinelsIn(s.text)));
  for (const value of [SENTINEL.food, SENTINEL.recipe, SENTINEL.counter, SENTINEL.activity, SENTINEL.grocery, String(SENTINEL.kcal), String(SENTINEL.steps), String(SENTINEL.waterMl), String(SENTINEL.habitValue)]) expect(found, value).toContain(value);
  expect(sent.find(s => s.path === 'page context /app/health')!.text).toContain(SENTINEL.food);
});
test('the three-part gate: each missing part closes Health for every tool, the notes and the environment', () => {
  const s = sources(), base = {area: 'today' as const, pathname: '/app', layoutHasHealth: true, accountActive: false, accountHealthPermitted: null, sensitive: false};
  const variants = {
    'Health switch off': {...base, settings: settingsWith(true, {pageShare: {...settingsWith(true).pageShare, health: false}})},
    '"Include Health" off': {...base, settings: settingsWith(true, {includeHealth: false})},
    'Health not on Today': {...base, settings: settingsWith(true), layoutHasHealth: false},
    'account permission unknown': {...base, settings: settingsWith(true), accountActive: true, accountHealthPermitted: null},
    'account permission off': {...base, settings: settingsWith(true), accountActive: true, accountHealthPermitted: false},
    'sensitive screen': {...base, settings: settingsWith(true), sensitive: true},
    'not connected (local answers still need the gate)': {...base, settings: settingsWith(true, {enabled: false, includeHealth: false})},
  };
  for (const [name, input] of Object.entries(variants)) {
    const gates = aiGates(input);
    expect(gates.health, name).toBe(false); expect(gates.areas.health, name).toBe(false); expect(gates.localHealth, name).toBe(false);
    for (const purpose of ['provider', 'local'] as const) {
      const env = toolEnv(s, gates, purpose);
      expect(env.health, `${name} ${purpose}`).toBeNull(); expect(env.fasting, `${name} ${purpose}`).toBeNull();
      expect(env.notes?.some(n => n.category === 'health') ?? false, `${name} ${purpose}`).toBe(false);
      for (const tool of TOOLS.filter(t => t.area === 'health')) expect(runTool(tool.name, tool.name === 'search_foods' ? {query: 'oats'} : {}, env).ok, `${name} ${purpose} ${tool.name}`).toBe(false);
    }
  }
  expect(healthGate({settings: settingsWith(true), layoutHasHealth: true, accountActive: true, accountHealthPermitted: true})).toBe(true);
  expect(aiGates({...base, settings: settingsWith(true)}).health).toBe(true);
});
test('Settings and sensitive screens read nothing at all, whatever the switches say', () => {
  const s = sources();
  for (const gates of [gatesFor(true, 'help', '/app/settings'), gatesFor(true, 'today', '/app', {sensitive: true})]) {
    const env = toolEnv(s, gates, 'provider');
    expect(availableTools(env)).toEqual([]);
    for (const tool of TOOLS) { const result = runTool(tool.name, {}, env); expect(result.ok, tool.name).toBe(false); expect(sentinelsIn(JSON.stringify(result)), tool.name).toEqual([]); }
  }
});
