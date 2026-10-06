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
import {localAnswer} from './local-answers/engine';
import {recordsForAi} from './local-answers/more';
import {questionContext} from './context/question';
import {buildContextPack} from './context-pack/build';
import {runWithTools, toolsFor} from './tool-loop';
import type {ChatEvent, ChatRequest} from './types';
import {briefForAi, morningBrief} from './proactive/brief';
import {explainFor} from './proactive/explain';
import {usesHealth, zigiInsights} from './proactive/insights';
import {reviewForAi} from './proactive/review';

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

test('Part 3: local answers stay on the device, and "Ask my AI for more" carries no Health once the gate is closed', () => {
  const s = sources();
  // Answers made on the device with the gate closed read nothing of Health.
  const shut = toolEnv(s, gatesFor(false), 'local');
  for (const q of ['How much water did I drink today?', 'Average steps this week?', 'What did I eat today?', 'How many calories did I eat today?', 'How many minutes did I meditate this month?', 'How many steps did I walk today?']) expect(sentinelsIn(JSON.stringify(localAnswer(q, shut))), q).toEqual([]);
  // An answer made while the gate was open, sent later for more with the gate closed: the records are refused, not sent.
  const opened = toolEnv(s, gatesFor(true), 'local');
  const calls = ['How much water did I drink today?', 'What did I eat today?', 'How many steps did I walk today?'].flatMap(q => { const r = localAnswer(q, opened); return r.kind === 'answer' ? r.calls : []; });
  expect(calls.length).toBe(3);
  // What a chat stores for those answers (tool, arguments, label) carries no Health value either.
  expect(sentinelsIn(JSON.stringify(calls))).toEqual([]);
  const later = recordsForAi(calls, s, gatesFor(false))!;
  expect(sentinelsIn(later.text)).toEqual([]);
  // The control: with the gate open the same records do carry the values.
  expect(sentinelsIn(recordsForAi(calls, s, gatesFor(true))!.text).length).toBeGreaterThan(0);
});

test('Part 4: the records chosen from a question, on every page and in the copied prompt, carry no Health with the gate closed', () => {
  const s = sources();
  const questions = ['How many minutes did I meditate this month?', 'How much water did I drink today?', 'Help me eat more protein this week', 'What did I eat today?', 'Any tips for my steps?', 'How many steps did I walk today?', `How are my ${SENTINEL.counter} going?`, 'What is my weight?', 'When was my last fast?', 'Plan my groceries for this week', 'How far am I on my Japan goal?'];
  for (const [area, pathname] of PAGES) for (const q of questions) {
    const chosen = questionContext(q, s, gatesFor(false, area, pathname));
    expect(sentinelsIn(JSON.stringify(chosen)), `${pathname} ${q}`).toEqual([]);
    const page = buildPageContext(builderInput(s, area, pathname, false));
    // The person's own question is quoted back as typed; everything else in the copy must hold no Health value.
    expect(sentinelsIn(bridgePrompt({context: page, question: q, questionData: chosen?.text ?? ''}).replace(`My question: ${q}`, '')), `${pathname} ${q}`).toEqual([]);
  }
  // The control: the gate open, the same questions reach the values.
  const open = questions.map(q => JSON.stringify(questionContext(q, s, gatesFor(true, 'health', '/app/health')))).join('\n');
  expect(sentinelsIn(open).length).toBeGreaterThan(3);
});

test('Part 5: the context pack carries no Health unless the gate is open AND its own box is ticked', () => {
  const s = {...sources(), notes: [{text: SENTINEL.note, category: 'health'}, {text: 'Saving for Japan', category: 'goals'}]};
  const all = {habits: true, goals: true, health: true, wealth: true, notes: true, days: 365 as const};
  for (const [area, pathname] of PAGES) {
    for (const pack of [buildContextPack({sources: s, gates: gatesFor(false, area, pathname), scope: all}), buildContextPack({sources: s, gates: gatesFor(true, area, pathname), scope: {...all, health: false}})]) {
      expect(sentinelsIn(pack.markdown), pathname).toEqual([]); expect(sentinelsIn(JSON.stringify(pack.json)), pathname).toEqual([]);
    }
  }
  expect(sentinelsIn(buildContextPack({sources: s, gates: gatesFor(true), scope: all}).markdown).length).toBeGreaterThan(3);
});
test('Part 6: native tool calls carry no Health with the gate closed: no Health tool offered, every call refused, in every request', async () => {
  // The model's own words go back to it in the conversation, so its arguments name no sentinel: only what the device
  // returns is checked (a broad search finds the sentinel food when Health is readable).
  const argsFor = (name: string): Record<string, unknown> => name === 'habit_stats' || name === 'habit_checkins' ? {habit: 'Walk', range: 'today'} : name === 'search_foods' ? {query: 'SENTINEL'} : name === 'goal_progress' ? {goal: 'Japan'} : {};
  // A MOCK model that asks for every one of ZIGi's tools, eight per round, then answers.
  const sent = async (health: boolean, area: PageArea, pathname: string) => {
    const requests: ChatRequest[] = [], batches = [TOOLS.slice(0, 8), TOOLS.slice(8, 16), TOOLS.slice(16, 24), TOOLS.slice(24)];
    const stream = async function* (request: ChatRequest): AsyncGenerator<ChatEvent> {
      requests.push(request);
      const batch = batches[requests.length - 1] ?? [];
      for (const [i, tool] of batch.entries()) yield {type: 'tool-call', call: {id: `call_${requests.length}_${i}`, name: tool.name, arguments: JSON.stringify(argsFor(tool.name))}};
      if (!batch.length) yield {type: 'text', delta: 'MOCK answer'};
      yield {type: 'done', reason: batch.length ? 'tool_calls' : 'stop'};
    };
    const env = toolEnv(sources(), gatesFor(health, area, pathname), 'provider');
    const system = buildSystemPrompt({area, context: null, customInstructions: '', providerName: 'Mock', tools: true});
    for await (const event of runWithTools({provider: 'openai', model: 'mock', system, messages: [{role: 'user', content: 'Tell me everything'}], maxOutputTokens: 256, key: null, env, stream, answerChars: 1_000_000})) void event;
    return {requests, offered: toolsFor(env).map(t => t.name)};
  };
  for (const [area, pathname] of PAGES) {
    const {requests, offered} = await sent(false, area, pathname);
    expect(offered.filter(name => TOOLS.find(t => t.name === name)?.area === 'health'), pathname).toEqual([]);
    expect(requests.length, pathname).toBeGreaterThan(0);
    expect(sentinelsIn(JSON.stringify(requests)), pathname).toEqual([]);
    expect(JSON.stringify(requests), pathname).not.toContain(String(SENTINEL.habitValue));
  }
  // The control: with the gate open on Health, the same exchange carries the sentinels.
  const open = await sent(true, 'health', '/app/health');
  expect(sentinelsIn(JSON.stringify(open.requests)).length).toBeGreaterThan(3);
});
test('Part 8: the person\'s notes: a health or diet note never leaves with the gate closed, and no note leaves while "Use my notes" is off', () => {
  // The sources carry a health-tagged sentinel note and an ordinary one (fixtures.ts).
  const s = sources(), off = {...s, notes: null}, ordinary = 'Prefers short answers in the morning';
  expect(s.notes!.map(n => n.text)).toEqual([SENTINEL.note, ordinary]);
  for (const [area, pathname] of PAGES) for (const q of ['Hi', 'How many minutes did I meditate this month?', 'What do you know about me?']) {
    const chosen = questionContext(q, s, gatesFor(false, area, pathname));
    expect(sentinelsIn(JSON.stringify(chosen)), `${pathname} ${q}`).toEqual([]);
    expect(sentinelsIn(bridgePrompt({context: buildPageContext(builderInput(s, area, pathname, false)), question: q, questionData: chosen?.text ?? ''}).replace(`My question: ${q}`, '')), `${pathname} ${q}`).toEqual([]);
    // "Use my notes" off: not even the ordinary note goes, gate open or not.
    for (const health of [false, true]) expect(JSON.stringify(questionContext(q, off, gatesFor(health, area, pathname))), `${pathname} ${q}`).not.toContain(ordinary);
    const env = toolEnv(s, gatesFor(false, area, pathname), 'provider');
    for (const args of [{}, {category: 'health'}, {category: 'diet'}]) expect(sentinelsIn(toolText(runTool('about_me', args, env), env)), `${pathname} about_me`).toEqual([]);
  }
  // The controls: the ordinary note does go with the gate closed, and the health note once the gate is open.
  expect(questionContext('Hi', s, gatesFor(false))!.text).toContain(ordinary);
  expect(questionContext('Hi', s, gatesFor(true))!.text).toContain(SENTINEL.note);
});
test('Part 9: the brief ("Say it nicer"), the review reflection, insight requests and "Ask ZIGi about this" chips carry no Health with the gate closed', () => {
  const s = sources();
  const numbers: [string, string, string?][] = [['health', 'kcal'], ['health', 'macros'], ['health', 'water'], ['health', 'weight'], ['health', 'steps'], ['health', 'history'], ['meal', 'kcal'], ['exercise', 'counts'], ['habit', 'streak', 'Walk'], ['goals', 'overview'], ['wealth', 'USD'], ['habit-history', 'days']];
  for (const [area, pathname] of PAGES) {
    const env = toolEnv(s, gatesFor(false, area, pathname), 'provider'), brief = morningBrief(env);
    expect(sentinelsIn(brief ? briefForAi(brief) : ''), `brief ${pathname}`).toEqual([]);
    expect(sentinelsIn(reviewForAi(env) ?? ''), `review ${pathname}`).toEqual([]);
    expect(zigiInsights(env).some(usesHealth), `insights ${pathname}`).toBe(false); expect(sentinelsIn(JSON.stringify(zigiInsights(env))), `insights ${pathname}`).toEqual([]);
    for (const [kind, metric, name] of numbers) {
      const explain = explainFor(kind, metric, name);
      if (!explain) continue;
      expect(sentinelsIn(JSON.stringify(questionContext(explain.question, s, gatesFor(false, area, pathname), [], new Set(), [explain.about]))), `${kind}/${metric} on ${pathname}`).toEqual([]);
    }
  }
  // The control: with the gate open on Health, the same chips reach the sentinel values.
  const open = numbers.map(([kind, metric, name]) => { const e = explainFor(kind, metric, name); return e ? JSON.stringify(questionContext(e.question, s, gatesFor(true, 'health', '/app/health'), [], new Set(), [e.about])) : ''; }).join('\n');
  expect(sentinelsIn(open).length).toBeGreaterThan(2);
});
