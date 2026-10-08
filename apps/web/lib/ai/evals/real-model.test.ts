import {mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {streamChat} from '../chat';
import {parseReply} from '../actions/parse';
import {fenceStructured, needsRepair, repairPrompt, structuredFormat} from '../actions/repair';
import {applyDayCue} from '../actions/day-cue';
import {reviseEdits} from '../actions/revise';
import {detectIntent, refusedBlocksMayRepair, wantsCard} from '../intent';
import {buildSystemPrompt} from '../context/specialists';
import {questionContext} from '../context/question';
import {Handles} from '../handles';
import {localAnswer} from '../local-answers/engine';
import {runWithTools} from '../tool-loop';
import {toolEnv, type ToolSources} from '../tools/env';
import {DAY, gatesFor, sentinelsIn, settingsWith, showcaseSources, withHandHealth, withPortfolios, withSentinels} from '../tools/fixtures';
import {runTool} from '../tools/registry';
import type {ChatMessage} from '../types';
import {CORPUS, IMPORTANT, type ModelCase} from './corpus';
import {goldenSources} from './run';
import {factNumbers, score, type Call, type Observed, type Score} from './score';

/**
 * The real-model harness (Session X-Local Part 6c): the corpus through the app's own pipeline (the system prompt with
 * the page's specialist, the question-aware context, the read-only tool loop, the whitelist parser) against a real
 * local model over the Ollama wire, scored by `score.ts`. It never runs by itself: only with ZIGI_REAL_MODEL=1 and a
 * base URL and model name in the environment, from the owner's machines, on fictional records only. Results are
 * written as JSON (and the Markdown summary is built from them) under ZIGI_OUT.
 *
 *   ZIGI_REAL_MODEL=1 ZIGI_MODEL_BASE=http://127.0.0.1:11435 ZIGI_MODEL=gemma4:12b ZIGI_HOST="RTX 5090" \
 *   ZIGI_CASES=all|important|<id regex> ZIGI_REPEAT=1 ZIGI_DATA_MODE=tools|attach ZIGI_OUT=<the runs worktree's real-model folder> \
 *   pnpm exec vitest run apps/web/lib/ai/evals/real-model.test.ts
 */
const env = process.env, enabled = env.ZIGI_REAL_MODEL === '1';
const BASE = env.ZIGI_MODEL_BASE ?? 'http://127.0.0.1:11435', MODEL = env.ZIGI_MODEL ?? '', HOST = env.ZIGI_HOST ?? 'unknown host', REPEAT = Math.max(1, Number(env.ZIGI_REPEAT ?? '1'));
const MODE = env.ZIGI_DATA_MODE === 'attach' ? 'attach' : 'tools', OUT = env.ZIGI_OUT ?? join(tmpdir(), 'zigoals-real-model'), FILTER = env.ZIGI_CASES ?? 'important';
const TIMEOUT_MS = Number(env.ZIGI_CASE_TIMEOUT_MS ?? '180000'), THINK = env.ZIGI_THINK === '1';
const selected = (): ModelCase[] => FILTER === 'all' ? [...CORPUS] : FILTER === 'important' ? [...IMPORTANT] : CORPUS.filter(c => new RegExp(FILTER).test(c.id));
export type CaseRun = {id: string; repeat: number; kind: string; area: string; lang: string; turn: number; pass: boolean; checks: Score['checks']; cards: number; rejected: number; hint: string | null; refused: boolean; firstTokenMs: number | null; totalMs: number; tokens: {input: number | null; output: number | null}; calls: Call[]; repaired?: boolean; reply: string; error: string | null};
function sourcesFor(c: ModelCase): ToolSources {
  let s = withPortfolios(withHandHealth(showcaseSources()));
  if (c.sentinels) s = withSentinels(s);
  return goldenSources(s);
}
async function runTurn(c: ModelCase, ask: string, history: ChatMessage[], sources: ToolSources): Promise<{observed: Observed; reply: string; repaired: boolean; firstTokenMs: number | null; totalMs: number; tokens: {input: number | null; output: number | null}; error: string | null}> {
  const health = c.health !== 'closed', gates = gatesFor(health, c.page, `/app/${c.page === 'today' ? '' : c.page}`, {settings: settingsWith(health)});
  const toolHandles = new Handles([]), provider = toolEnv(sources, gates, 'provider', toolHandles), local = toolEnv(sources, gates, 'local');
  const context = questionContext(ask, sources, gates, []);
  // Session X-Local Phase 2 (P2.2a): tools mode carries the question-chosen records too, exactly as the app does
  // (`use-chat-session` passes the page context with `tools: true`); the router's own pre-run calls count as calls, since
  // the device made them for this question. Before this the harness measured a configuration the app never uses (tools
  // and no records), and punished every lookup the app would have answered from its pre-run records.
  const contextText = context?.text ?? null;
  const prerun: Call[] = MODE === 'tools' ? (context?.sources ?? []).filter(src => src.call.tool !== 'about_me').map(src => ({name: src.call.tool, args: (src.call.args ?? null) as Record<string, unknown> | null, accepted: true})) : [];
  const system = buildSystemPrompt({area: c.page, context: contextText, customInstructions: '', providerName: 'Ollama', tools: MODE === 'tools', today: DAY});
  const messages: ChatMessage[] = [...history, {role: 'user', content: ask}];
  const calls: Call[] = [...prerun], started = Date.now(); let first: number | null = null, reply = '', tokens = {input: null as number | null, output: null as number | null}, error: string | null = null;
  // ZIGI_THINK=1 lets a thinking model think (the app's "Think deeper"); the default is the app's quick reply (think off).
  const request = {provider: 'local' as const, localServer: 'ollama' as const, model: MODEL, system, messages, maxOutputTokens: 1024, key: null, baseUrl: BASE, signal: AbortSignal.timeout(TIMEOUT_MS), think: THINK};
  try {
    if (MODE === 'tools') {
      for await (const event of runWithTools({...request, env: provider, stream: streamChat})) {
        if (event.type === 'text') { if (first === null) first = Date.now() - started; reply += event.delta; }
        else if (event.type === 'usage') tokens = {input: event.input, output: event.output};
        else if (event.type === 'tool-result') calls.push({name: event.call.name, args: event.args, accepted: !('error' in event.result && event.result.error)});
      }
    } else {
      for await (const event of streamChat(request)) {
        if (event.type === 'text') { if (first === null) first = Date.now() - started; reply += event.delta; }
        else if (event.type === 'usage') tokens = {input: event.input, output: event.output};
      }
    }
  } catch (e) { error = e instanceof Error ? e.message : String(e); }
  // Session X-Local Phase 2 (P2.2b): the app's one bounded repair round, here too, so the harness measures what the app
  // does: a card asked for and none given (or every block refused) gets one more ask, with Ollama's structured output.
  let repaired = false;
  if (!error && reply.trim()) {
    const first = parseReply(reply), intent = detectIntent(ask);
    if (needsRepair(first, {askedForCard: wantsCard(intent, reply), refusedMayRepair: refusedBlocksMayRepair(intent, reply)})) {
      const again: ChatMessage[] = [...messages, {role: 'assistant', content: reply}, {role: 'user', content: repairPrompt(first)}];
      let second = '';
      try { for await (const event of streamChat({...request, messages: again, format: structuredFormat()})) { if (event.type === 'text') second += event.delta; else if (event.type === 'usage') tokens = {input: (tokens.input ?? 0) + (event.input ?? 0), output: (tokens.output ?? 0) + (event.output ?? 0)}; } } catch { second = ''; }
      if (second.trim()) { reply = fenceStructured(second); repaired = true; }
    }
    // Round 6 (ADR-017 S69), as the app does: the message's own day for a log card that said today.
    reply = applyDayCue(reply, ask, DAY);
    // Round 8 (ADR-017 S74), as the app does: a correction of a card that was only proposed becomes that card again, corrected.
    reply = reviseEdits(reply, [...history].reverse().find(m => m.role === 'assistant')?.content ?? null, [...(context?.handles ?? []), ...toolHandles.list]);
  }
  const totalMs = Date.now() - started;
  // Facts from the device's own tools, for the same question; the local-first answer from the lookup engine.
  const facts = (c.expect.facts ?? []).map(fact => { const result = runTool(fact.tool, fact.args ?? {}, local); return {fact, numbers: factNumbers(result).slice(0, fact.pick === 'first' ? 1 : 6), text: JSON.stringify(result)}; });
  const localReply = localAnswer(ask, local), sentinelsSeen = c.sentinels ? sentinelsIn(system + JSON.stringify(messages) + reply + JSON.stringify(calls)) : undefined;
  return {observed: {text: reply, calls, facts, local: {answered: localReply.kind !== 'none'}, sentinelsSeen}, reply, repaired, firstTokenMs: first, totalMs, tokens, error};
}
describe.skipIf(!enabled || !MODEL)('ZIGi against a real local model (owner machines only)', () => {
  const cases = selected();
  test(`${cases.length} cases × ${REPEAT} on ${MODEL} (${HOST}, ${MODE})`, async () => {
    const runs: CaseRun[] = [], startedAt = new Date().toISOString();
    for (const c of cases) for (let repeat = 1; repeat <= REPEAT; repeat++) {
      const sources = sourcesFor(c), history: ChatMessage[] = [];
      const turns = [{ask: c.ask, expect: c.expect}, ...(c.turns ?? [])];
      for (let t = 0; t < turns.length; t++) {
        const turn = turns[t]!;
        // A local-first case is scored on the device alone: the model is never called for it.
        if (turn.expect.localFirst) {
          const local = toolEnv(sources, gatesFor(c.health !== 'closed', c.page), 'local'), reply = localAnswer(turn.ask, local);
          const s = score(turn.expect, {text: reply.kind === 'none' ? '' : reply.text, calls: [], local: {answered: reply.kind !== 'none'}, sentinelsSeen: c.sentinels ? sentinelsIn(reply.kind === 'none' ? '' : reply.text) : undefined});
          runs.push({id: c.id, repeat, kind: c.kind, area: c.area, lang: c.lang, turn: t, pass: s.pass, checks: s.checks, cards: s.cards, rejected: s.rejected, hint: s.hint, refused: s.refused, firstTokenMs: 0, totalMs: 0, tokens: {input: 0, output: 0}, calls: [], reply: reply.kind === 'none' ? '' : reply.text, error: null});
          continue;
        }
        const r = await runTurn(c, turn.ask, history, sources);
        // Attach mode has no tools to call: the expected-tool checks do not apply there (the records are in the prompt).
        const {tools: _tools, toolsNot: _toolsNot, ...withoutTools} = turn.expect; void _tools; void _toolsNot;
        const s = score(MODE === 'attach' ? withoutTools : turn.expect, r.observed);
        runs.push({id: c.id, repeat, kind: c.kind, area: c.area, lang: c.lang, turn: t, pass: s.pass && !r.error, checks: r.error ? [...s.checks, {name: 'error', pass: false, detail: r.error}] : s.checks, cards: s.cards, rejected: s.rejected, hint: s.hint, refused: s.refused, firstTokenMs: r.firstTokenMs, totalMs: r.totalMs, tokens: r.tokens, calls: [...r.observed.calls], reply: r.reply.slice(0, 4000), repaired: r.repaired, error: r.error});
        history.push({role: 'user', content: turn.ask}, {role: 'assistant', content: r.reply});
        console.info(`${s.pass && !r.error ? 'PASS' : 'FAIL'} ${c.id}${t ? `/t${t}` : ''}${REPEAT > 1 ? ` #${repeat}` : ''} ${r.totalMs} ms${r.error ? ` ERROR ${r.error.slice(0, 80)}` : ''}${s.pass ? '' : ` [${s.checks.filter(x => !x.pass).map(x => `${x.name}${x.detail ? `: ${x.detail.slice(0, 60)}` : ''}`).join('; ')}]`}`);
      }
    }
    const passed = runs.filter(r => r.pass).length, byKind: Record<string, {passed: number; total: number}> = {};
    for (const r of runs) { byKind[r.kind] ??= {passed: 0, total: 0}; byKind[r.kind]!.total++; if (r.pass) byKind[r.kind]!.passed++; }
    const timed = runs.filter(r => r.totalMs > 0), median = (xs: number[]) => xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]! : null;
    const summary = {model: MODEL, host: HOST, mode: MODE, think: THINK, base: 'redacted', startedAt, finishedAt: new Date().toISOString(), cases: cases.length, repeat: REPEAT, runs: runs.length, passed, rate: runs.length ? passed / runs.length : 0, byKind,
      latency: {firstTokenMedianMs: median(timed.map(r => r.firstTokenMs ?? 0)), totalMedianMs: median(timed.map(r => r.totalMs))}, tokens: {input: timed.reduce((s, r) => s + (r.tokens.input ?? 0), 0), output: timed.reduce((s, r) => s + (r.tokens.output ?? 0), 0)}};
    mkdirSync(OUT, {recursive: true});
    const stamp = startedAt.replace(/[:.]/g, '-'), file = join(OUT, `${HOST.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${MODEL.replace(/[^a-z0-9.]+/gi, '-')}-${MODE}${THINK ? '-think' : ''}-${FILTER === 'all' ? 'all' : FILTER === 'important' ? 'important' : 'subset'}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({summary, runs}, null, 1));
    console.info(`ZIGi real model: ${passed}/${runs.length} (${(summary.rate * 100).toFixed(1)}%) on ${MODEL} @ ${HOST}; first token median ${summary.latency.firstTokenMedianMs} ms, total median ${summary.latency.totalMedianMs} ms; written to ${file}`);
    expect(runs.length).toBeGreaterThan(0);
  }, 24 * 60 * 60 * 1000);
});
