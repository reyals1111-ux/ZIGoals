import {readFileSync, writeFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {toolEnv} from '../tools/env';
import {gatesFor, sentinelsIn, showcaseSources, withHandHealth, withPortfolios, withSentinels} from '../tools/fixtures';
import {runTool} from '../tools/registry';
import {localAnswer} from '../local-answers/engine';
import {CORPUS, type ModelCase} from './corpus';
import {SPOKEN} from './corpus-spoken';
import {goldenSources} from './run';
import {factNumbers, score, type Call} from './score';

/**
 * Session Z-Local Part 6: a run file re-scored with the scorer and the corpus as they are NOW, from the replies and tool
 * calls the model gave then (no model is called). A fix to the scorer or an oracle correction is judged on every run
 * already made, before any paid re-run. Only with ZIGI_RESCORE=<run.json>[,<run.json>…]; writes <file>.rescored.json
 * beside each and prints the delta. Facts are re-run on the fictional Showcase (deterministic); local-first turns are
 * re-answered on the device.
 */
const FILES = (process.env.ZIGI_RESCORE ?? '').split(',').map(f => f.trim()).filter(Boolean);
const sourcesFor = (c: ModelCase) => { let s = withPortfolios(withHandHealth(showcaseSources())); if (c.sentinels) s = withSentinels(s); return goldenSources(s); };
describe.skipIf(!FILES.length)('rescore (owner machines only)', () => {
  test('every run file re-scored with the current scorer and corpus', () => {
    for (const file of FILES) {
      const d = JSON.parse(readFileSync(file, 'utf8')) as {summary: Record<string, unknown>; runs: Record<string, unknown>[]};
      const spoken = d.summary.set === 'spoken' || d.runs.some(r => String(r.id).startsWith('sp-'));
      const cases = new Map((spoken ? SPOKEN : CORPUS).map(c => [c.id, c] as const));
      let was = 0, now = 0, missing = 0; const flips: string[] = [];
      const out = d.runs.map(r => {
        const c = cases.get(String(r.id)); if (!c) { missing++; return r; }
        const turn = Number(r.turn ?? 0), spec = turn === 0 ? {ask: c.ask, expect: c.expect} : c.turns?.[turn - 1];
        if (!spec) { missing++; return r; }
        const sources = sourcesFor(c), gates = gatesFor(c.health !== 'closed', c.page), local = toolEnv(sources, gates, 'local');
        const reply = String(r.reply ?? ''), calls = (r.calls ?? []) as Call[];
        const facts = (spec.expect.facts ?? []).map(fact => { const res = runTool(fact.tool, fact.args ?? {}, local); return {fact, numbers: factNumbers(res).slice(0, fact.pick === 'first' ? 1 : 6), text: JSON.stringify(res)}; });
        const localReply = spec.expect.localFirst ? localAnswer(spec.ask, local) : null;
        const observed = spec.expect.localFirst
          ? {text: localReply && localReply.kind !== 'none' ? localReply.text : '', calls: [] as Call[], local: {answered: !!localReply && localReply.kind !== 'none'}, sentinelsSeen: c.sentinels ? sentinelsIn(localReply && localReply.kind !== 'none' ? localReply.text : '') : undefined}
          : {text: reply, calls, facts, local: {answered: localAnswer(spec.ask, local).kind !== 'none'}, sentinelsSeen: c.sentinels ? sentinelsIn(reply + JSON.stringify(calls)) : undefined};
        const {tools: _t, toolsNot: _tn, ...withoutTools} = spec.expect; void _t; void _tn;
        const s = score(d.summary.mode === 'attach' ? withoutTools : spec.expect, observed);
        const pass = s.pass && !r.error;
        if (r.pass) was++; if (pass) now++;
        if (pass !== r.pass) flips.push(`${pass ? '+' : '-'}${r.id}${turn ? `/t${turn}` : ''}`);
        return {...r, pass, checks: r.error ? [...s.checks, {name: 'error', pass: false, detail: r.error}] : s.checks, cards: s.cards, rejected: s.rejected, hint: s.hint, refused: s.refused, rescored: true};
      });
      writeFileSync(`${file}.rescored.json`, JSON.stringify({summary: {...d.summary, rescoredAt: new Date().toISOString(), passed: now, rate: out.length ? now / out.length : 0}, runs: out}, null, 1));
      console.info(`rescore ${file.split('/').pop()}: ${was}/${d.runs.length} → ${now}/${d.runs.length}${missing ? ` (${missing} turn(s) no longer in the corpus)` : ''}${flips.length ? `; flips: ${flips.slice(0, 40).join(' ')}${flips.length > 40 ? ' …' : ''}` : ''}`);
    }
    expect(FILES.length).toBeGreaterThan(0);
  }, 3_600_000); // Session Z-Local Part 6: a re-score of a 2,500-turn run takes minutes; vitest's 5 s default marked a finished loop as failed.
});
