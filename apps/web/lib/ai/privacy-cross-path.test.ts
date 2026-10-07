import {expect, test} from 'vitest';
import {emptyWeeklyReview} from '../weekly-review/schema';
import {healthGroupIn} from '../vault/w-homes';
import {bridgePrompt} from './bridge';
import {buildPageContext, type BuilderInput} from './context/builders';
import {consent} from './context/consent';
import {buildSystemPrompt} from './context/specialists';
import {aiGates, healthGate} from './gates';
import {Handles} from './handles';
import type {PageArea} from './settings';
import {toolEnv, type ToolSources} from './tools/env';
import {DAY, gatesFor, SENTINEL, sentinelsIn, settingsWith, showcaseSources, withHandHealth, withPortfolios, withSentinels} from './tools/fixtures';
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
import {continuePrompt} from './continue';
import {storedChat, type Chat, type ChatTurn} from './chats';
import {CHAT_SYSTEM, onDevicePrompts, REWRITE_SYSTEM} from './on-device-chat';
import {hostedSettings} from './hosted';
import {openAiBody} from './adapters/openai-compatible';
import {agentRunner, parseAgentActions, proposalAnswer, proposeTool, readTools, type AgentCall} from './webmcp';

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
test('Session W Part 4: the sentinel night is in the Health journal the paths read, so the closed-gate checks above cover sleep', () => {
  // Sleep reaches ZIGi only under the Health gate (W7); its own tools and their open-gate control come with Part 21.
  const health = sources().health;
  expect(health.schemaVersion).toBe(4);
  expect(JSON.stringify(health)).toContain(SENTINEL.sleepNote);
  expect(JSON.stringify(health)).toContain(SENTINEL.sleepTag);
  const shut = everythingSent(false);
  for (const {path, text} of shut) { expect(text, path).not.toContain(SENTINEL.sleepNote); expect(text, path).not.toContain(SENTINEL.sleepTag); }
});
test('Session W Part 5: the sentinel meditation session is in the journal too, and never leaves with the gate closed', () => {
  // Meditation reaches ZIGi only under the Health gate (W7); its tools and their open-gate control come with Part 21.
  expect(JSON.stringify(sources().health)).toContain(SENTINEL.meditationNote);
  for (const {path, text} of everythingSent(false)) expect(text, path).not.toContain(SENTINEL.meditationNote);
});
test('Session W Part 7: records an import added (a day\'s steps, a day\'s vitals) are Health like the rest, and never leave with the gate closed', () => {
  const health = sources().health;
  expect(JSON.stringify(health)).toContain(String(SENTINEL.importSteps));
  expect(JSON.stringify(health)).toContain(String(SENTINEL.importKcal));
  for (const {path, text} of everythingSent(false)) { expect(text, path).not.toContain(String(SENTINEL.importSteps)); expect(text, path).not.toContain(String(SENTINEL.importKcal)); }
});
test('Session W Part 8: a linked service\'s record and a meditation\'s heart-rate summary are Health like the rest, and never leave with the gate closed', () => {
  const health = sources().health, {avg, min, max} = SENTINEL.heartRate, heart = new RegExp(`\\b(?:${avg}|${min}|${max})\\b`);
  expect(health.activity.find(a => a.name === SENTINEL.linkedWorkout)?.id).toMatch(/^health_imp-strava-link-[0-9a-f]{16}$/);
  expect(healthGroupIn(health, 'meditation')?.sessions.find(m => m.id === 'health_med-sentinel-0001')?.heartRate).toEqual({avg, min, max});
  for (const {path, text} of everythingSent(false)) { expect(text, path).not.toContain(SENTINEL.linkedWorkout); expect(text, path).not.toMatch(heart); }
  expect(everythingSent(true).some(s => s.text.includes(SENTINEL.linkedWorkout))).toBe(true);
});
test('Session W Part 9: quick logging\'s own group (a pinned food, the water buttons) is Health, and never leaves with the gate closed', () => {
  const health = sources().health, size = new RegExp(`\\b${SENTINEL.quickWaterMl}\\b`);
  expect(healthGroupIn(health, 'quick')).toMatchObject({waterSizesMl: [250, SENTINEL.quickWaterMl], pinned: [{sourceId: 'health_food-sentinel-1', sourceKind: 'food'}]});
  for (const {path, text} of everythingSent(false)) expect(text, path).not.toMatch(size);
});
test('Session W Part 13: the evening wrap-up\'s mood is Health, in the journal the paths read, and never leaves with the gate closed', () => {
  const health = sources().health;
  expect(healthGroupIn(health, 'moods')?.days[DAY]).toMatchObject({mood: 2, note: SENTINEL.moodNote});
  for (const {path, text} of everythingSent(false)) expect(text, path).not.toContain(SENTINEL.moodNote);
});
test('Session W Part 21: with the gate open, the new Health tools carry their sentinels (sleep tag and note, the meditation note and heart rate, imported energy), so the closed-gate checks above can see them', () => {
  const open = everythingSent(true), text = (tool: string) => open.find(s => s.path === `tool ${tool} on /app/health`)!.text, {avg, min, max} = SENTINEL.heartRate;
  expect(text('sleep_nights')).toContain(SENTINEL.sleepTag);
  expect(text('sleep_nights')).toContain(SENTINEL.sleepNote);
  expect(text('meditation_sessions')).toContain(SENTINEL.meditationNote);
  expect(text('meditation_sessions')).toMatch(new RegExp(`\\b${avg}\\b[\\s\\S]*\\b${min}\\b[\\s\\S]*\\b${max}\\b`));
  expect(text('vitals')).toContain(String(SENTINEL.importKcal));
  expect(text('devices')).toMatch(/Strava \(linked\)/);
  // The same tools refuse with the gate closed, on every page, before reading anything.
  for (const {path, text: shut} of everythingSent(false).filter(s => /^tool (sleep_nights|sleep_summary|meditation_sessions|meditation_summary|vitals|devices) on /.test(s.path))) expect(JSON.parse(shut).refused, path).toBeTruthy();
  // Moods (the wrap-up) and the quick-logging buttons have no tool: nothing reads them for ZIGi.
  for (const {path, text: any} of open.filter(s => s.path.startsWith('tool '))) { expect(any, path).not.toContain(SENTINEL.moodNote); expect(any, path).not.toMatch(new RegExp(`\\b${SENTINEL.quickWaterMl}\\b`)); }
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
  // Session W Part 21: ZIGi has more tools than one exchange may call (4 rounds of 8), so they go in exchanges of at most
  // 32, and every tool is called (checked below).
  const exchange = async (health: boolean, area: PageArea, pathname: string, tools: readonly (typeof TOOLS)[number][]) => {
    const requests: ChatRequest[] = [], batches = Array.from({length: Math.ceil(tools.length / 8)}, (_, i) => tools.slice(i * 8, i * 8 + 8));
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
  const sent = async (health: boolean, area: PageArea, pathname: string) => {
    const parts = Array.from({length: Math.ceil(TOOLS.length / 32)}, (_, i) => TOOLS.slice(i * 32, i * 32 + 32)), runs = [];
    for (const part of parts) runs.push(await exchange(health, area, pathname, part));
    const requests = runs.flatMap(r => r.requests), called = new Set(requests.flatMap(r => r.messages.flatMap(m => m.role === 'tool' ? [m.name] : [])));
    return {requests, offered: runs[0]!.offered, called};
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
  // Every one of ZIGi's tools was asked for and answered (Session W Part 21's tools included).
  expect([...open.called].sort()).toEqual(TOOLS.map(t => t.name).sort());
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
test('Part 10: "Continue in my AI" and a chat read back from History carry no Health with the gate closed', () => {
  const s = sources(), at = '2026-10-05T10:00:00.000Z';
  // An answer made on this device is never part of what goes to an AI, whatever it holds.
  const turns: ChatTurn[] = [
    {id: 't1', role: 'user', text: 'How much water did I drink?', at, source: 'local'},
    {id: 't2', role: 'assistant', text: `You drank ${SENTINEL.waterMl} mL.`, at, provider: null, model: null, usage: null, source: 'local'},
    {id: 't3', role: 'user', text: 'Plan my week', at},
    {id: 't4', role: 'assistant', text: 'MOCK plan', at, provider: 'openai', model: 'mock', usage: null},
  ];
  for (const [area, pathname] of PAGES) {
    const context = buildPageContext(builderInput(s, area, pathname, false), new Handles());
    expect(sentinelsIn(continuePrompt({turns, context})), `continue ${pathname}`).toEqual([]);
  }
  expect(continuePrompt({turns, context: null})).toContain('Me: Plan my week');
  // History keeps the lookup (tool, arguments, label), never its result; read back with the gate closed it is refused.
  const open = toolEnv(s, gatesFor(true, 'health', '/app/health'), 'provider'), looked = runTool('water', {range: 'today'}, open);
  expect(sentinelsIn(toolText(looked, open)).length).toBeGreaterThan(0);
  const chat: Chat = {version: 1, id: 'c1', scope: 'local', title: 'Water', provider: 'openai', model: 'mock', createdAt: at, updatedAt: at, turns: [turns[2]!, {...turns[3]!, tools: [{tool: 'water', args: {range: 'today'}, label: looked.label}]}]};
  expect(sentinelsIn(JSON.stringify(storedChat(chat)))).toEqual([]);
  const closed = toolEnv(s, gatesFor(false, 'health', '/app/health'), 'provider'), replay = runTool('water', {range: 'today'}, closed);
  expect(replay.ok).toBe(false); expect(sentinelsIn(toolText(replay, closed))).toEqual([]);
  // The control: on Health with the gate open, the page's records in "Continue in my AI" do carry the sentinels.
  expect(sentinelsIn(continuePrompt({turns, context: buildPageContext(builderInput(s, 'health', '/app/health', true), new Handles())})).length).toBeGreaterThan(0);
});
test('Part 15: Chrome\'s on-device model gets its fixed instructions and the person\'s own words, never a record', () => {
  // The question names a habit and a Health measure; the records behind them stay out (the sentinels are on the device).
  void withSentinels(withHandHealth(showcaseSources()));
  const question = 'How much water did I drink this week, and did I meditate?';
  const prompts = onDevicePrompts(question);
  expect(prompts.rewrite).toEqual({system: REWRITE_SYSTEM, input: question});
  expect(prompts.chat).toEqual({system: CHAT_SYSTEM, input: question});
  for (const p of [prompts.rewrite, prompts.chat]) expect(sentinelsIn(`${p.system}\n${p.input}`)).toEqual([]);
});

test('Part 16: browser AI agents (WebMCP): no Health tool offered, every result and the person\'s notice free of Health with the gate closed', async () => {
  const s = sources(), seen: AgentCall[] = [];
  for (const [area, pathname] of PAGES) {
    const handles = new Handles(), env = toolEnv(s, gatesFor(false, area, pathname), 'provider', handles);
    const offered = readTools(availableTools(env), agentRunner(() => env, call => seen.push(call)));
    expect(offered.some(t => /water|steps|weight|nutrient|diary|fasting|counters|recipes|meal_plan|groceries|search_foods|body_measurements|sleep|meditation|vitals|devices/.test(t.name)), pathname).toBe(false);
    expect(sentinelsIn(JSON.stringify(offered.map(t => [t.name, t.title, t.description, t.inputSchema]))), pathname).toEqual([]);
    // Every tool, offered or not, called the way an agent would: the gate refuses the Health ones without reading.
    const all = readTools(TOOLS, agentRunner(() => env, call => seen.push(call)));
    for (const tool of all) {
      const name = tool.name.slice('zigoals_'.length);
      const input = name === 'habit_stats' || name === 'habit_checkins' ? {habit: 'Walk', range: 'today'} : name === 'search_foods' ? {query: SENTINEL.food} : name === 'counters' ? {counter: SENTINEL.counter} : {};
      expect(sentinelsIn(await tool.execute(JSON.stringify(input))), `${tool.name} on ${pathname}`).toEqual([]);
    }
    // The proposal tool only answers with its own words; a Health proposal is a card for the person, nothing comes back.
    const answer = await proposeTool(actions => proposalAnswer(parseAgentActions(actions, handles.list))).execute({actions: [{kind: 'log-water', millilitres: 250}]});
    expect(sentinelsIn(answer), pathname).toEqual([]);
  }
  expect(seen.length).toBeGreaterThan(100);
  for (const call of seen) expect(sentinelsIn(JSON.stringify(call))).toEqual([]);
  // With the gate open the same calls do carry Health, which proves the checks can see it.
  const open = toolEnv(s, gatesFor(true, 'health', '/app/health'), 'provider');
  const water = readTools(availableTools(open).filter(t => t.name === 'water'), agentRunner(() => open, () => undefined));
  expect(sentinelsIn(await water[0]!.execute({range: 'today'}))).toContain(String(SENTINEL.waterMl));
});

test('Part 17: the hosted relay\'s request carries no Health unless the hosted consent ticked it, even with the three-part gate open', () => {
  const s = sources(), open = settingsWith(true);
  const relayBody = (consentHealth: boolean) => {
    const settings = hostedSettings(open, {version: 1, route: 'hosted', hostedConsent: {at: '2026-10-06T10:00:00.000Z', health: consentHealth}});
    const out: string[] = [];
    for (const [area, pathname] of PAGES) {
      const gates = aiGates({settings, area, pathname, layoutHasHealth: true, accountActive: false, accountHealthPermitted: null, sensitive: false});
      const context = buildPageContext({...builderInput(s, area, pathname, settings.includeHealth), consent: gates.page}, new Handles());
      const env = toolEnv(s, gates, 'provider');
      const tools = toolsFor(env);
      out.push(JSON.stringify(openAiBody('openai', {model: 'relay', system: buildSystemPrompt({area, context: context.text, customInstructions: '', providerName: 'OpenAI via ZIGoals hosted', tools: true}), messages: [{role: 'user', content: 'How was my week?'}], maxOutputTokens: 1024, tools})));
      for (const tool of TOOLS) out.push(toolText(runTool(tool.name, tool.name === 'search_foods' ? {query: SENTINEL.food} : {}, env), env));
    }
    return out;
  };
  for (const text of relayBody(false)) expect(sentinelsIn(text)).toEqual([]);
  expect(relayBody(true).some(text => sentinelsIn(text).length > 0)).toBe(true);
});

test('Session X-Local Part 4: the semantic layer carries only an event name, never a value; the AI\'s hint marker is stripped from every path and can carry nothing out', async () => {
  const {validateSemanticEvent, SEMANTIC_EVENTS} = await import('../../components/zigi/semantic');
  const {extractHint} = await import('./emotion-hint');
  // A signal with anything beside its type is refused without being echoed (a Health value inside it never crosses).
  let thrown = '';
  try { validateSemanticEvent({type: 'health_log_recorded', kcal: SENTINEL.kcal, note: SENTINEL.sleepNote}); } catch (e) { thrown = String(e); }
  expect(thrown).toBe('TypeError: INVALID_EVENT');
  expect(sentinelsIn(SEMANTIC_EVENTS.join(' '))).toEqual([]);
  // A marker the AI wrote around a Health value is dropped whole: the shown text, the stored turn and the history are clean.
  const reply = `Your night was logged. ⟦zigi: ${SENTINEL.sleepNote}⟧ ⟦zigi: encouraging⟧`;
  const {text, hint} = extractHint(reply);
  expect(hint).toBe('encouraging'); expect(sentinelsIn(text)).toEqual([]);
  const turn: ChatTurn = {id: 't1', role: 'assistant', text: reply, at: new Date().toISOString(), provider: 'openai', model: 'm', usage: null};
  const history = continuePrompt({turns: [{id: 't0', role: 'user', text: 'Log my night', at: new Date().toISOString()}, turn], context: null});
  expect(history).not.toContain('⟦'); expect(sentinelsIn(history)).toEqual([]);
});
