import {describe, expect, test} from 'vitest';
import {NOVA_SCOPES, type NovaScopes} from '../context-pack/nova';
import {novaLocalEnv} from '../../nova/local-env';
import {parseReply} from '../actions/parse';
import {quickAddOffered} from '../actions/decline';
import {localAnswer} from '../local-answers/engine';
import {noModelReply} from '../local-answers/no-model';
import {ADVICE_REPLIES, adviceTopic, doWithAsk, GUARD_REPLIES, guardMessage, isMoneyThing, safetyFirst} from '../safety-guard';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {G6_AL_FIFTH} from './g6-al-fifth';

/**
 * Session AL fifth pass (lane L7-5a): the replay's round-2 safety rows (GROK53_REPLAY_L7_2.md) on every build, with no
 * model, through ZIGi's environment (Health shared and not) and NOVA's (every NOVA → Permissions scope on): the guard
 * first, then the lookups (`localAnswer` reads nothing), then the no-model reply (the guard's, care or no-advice text
 * exactly, never the examples list, never a card), then the Quick add rule. The near misses stay ordinary. 100 % is held.
 */
const ALL_NOVA_SCOPES_FOR_TESTS = Object.fromEntries(NOVA_SCOPES.map(s => [s, true])) as NovaScopes;
const ENVS = {
  'ZIGi, Health shared': () => toolEnv(showcaseSources(), gatesFor(true), 'local'),
  'ZIGi, Health off': () => toolEnv(showcaseSources(), gatesFor(false), 'local'),
  'NOVA': () => novaLocalEnv({sources: showcaseSources(), gates: gatesFor(true), scopes: ALL_NOVA_SCOPES_FOR_TESTS, chainChosen: true})!,
};
const textOf = (r: ReturnType<typeof noModelReply>) => 'text' in r ? r.text : '';

describe('the fifth-pass safety set (replay round 2)', () => {
  test('ids are unique, every replay id is in, the bot texts are marked, EN and NL both, near misses included', () => {
    const ids = G6_AL_FIFTH.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const named = G6_AL_FIFTH.map(c => c.ids).join(' ');
    for (const id of ['LA-002', '#190', 'C-LA-10', 'C-DV-20', '#270', '#271', 'N102', 'Z102', 'C-DVG-100', 'DVR:D-061', '#031', 'Z-030', 'N-030']) expect(named, id).toContain(id);
    expect(G6_AL_FIFTH.filter(c => c.bot).length).toBeGreaterThanOrEqual(10);
    expect(G6_AL_FIFTH.filter(c => c.lang === 'nl' && !('ordinary' in c.expect)).length).toBeGreaterThan(30);
    expect(G6_AL_FIFTH.filter(c => 'ordinary' in c.expect).length).toBeGreaterThan(20);
  });
  for (const c of G6_AL_FIFTH) test(`${c.id} (${c.ids}): ${c.ask}`, () => {
    const e = c.expect, hit = safetyFirst(c.ask);
    if ('ordinary' in e) { expect(hit, 'stays ordinary').toBeNull(); expect(guardMessage(c.ask)).toBeNull(); return; }
    expect(hit).not.toBeNull();
    expect(hit!.lang).toBe(c.lang);
    if ('guard' in e) {
      expect(hit!.kind).toBe('guard'); expect(hit!.topic).toBe(e.guard);
      expect(guardMessage(c.ask)?.topic).toBe(e.guard); // the chat's pre-model check (`guarded`) answers it: no model ever sees it
      expect(hit!.text).toBe(GUARD_REPLIES[e.guard][c.lang]); // the app's existing copy, in the message's own language
    } else if ('advice' in e) {
      expect(hit!.kind).toBe('advice'); expect(hit!.topic).toBe(e.advice);
      expect(guardMessage(c.ask)).toBeNull(); // with an AI connected the question still goes to it (its prompt can't advise)
      expect(hit!.text).toBe(ADVICE_REPLIES[e.advice][c.lang]);
    } else {
      expect(hit!.kind).toBe('care'); expect(hit!.topic).toBe(e.care);
    }
    for (const w of e.mustContain ?? []) expect(hit!.text).toContain(w);
    expect(hit!.text).not.toMatch(/```|Until you give me a brain|Tap an example|Tik op een voorbeeld|Checklist vandaag|I keep no notes/);
    for (const [name, make] of Object.entries(ENVS)) {
      const env = make();
      expect(localAnswer(c.ask, env).kind, `${name}: the lookups read nothing (no Checklist counter, no memory answer)`).toBe('none');
      const reply = noModelReply(c.ask, env);
      expect(reply.kind, name).toBe('answer');
      expect(textOf(reply), name).toBe(hit!.text);
      expect(parseReply(textOf(reply)).proposals, `${name}: no card`).toEqual([]);
    }
    expect(noModelReply(c.ask, null).kind, 'fresh, no records: the same answer').toBe('answer');
    expect(quickAddOffered(c.ask), 'no Quick add line').toBe(false);
  });
});

describe('advice is answered on the device first, but is not the pre-model guard', () => {
  test('the no-advice copy is the device advice answer\'s own words (lib/ai/local-answers/ai-session.ts)', async () => {
    const {readFileSync} = await import('node:fs');
    const src = readFileSync(new URL('../local-answers/ai-session.ts', import.meta.url), 'utf8');
    for (const lang of ['en', 'nl'] as const) for (const t of ['money', 'health'] as const) expect(src, `${t}/${lang}`).toContain(ADVICE_REPLIES[t][lang]);
  });
  test('adviceTopic reads EN and NL alike', () => {
    expect(adviceTopic('Should I sell my ETH now?')).toBe('money');
    expect(adviceTopic('Moet ik mijn ETH nu verkopen?')).toBe('money');
    expect(adviceTopic('Should I stop taking my pills?')).toBe('health');
    expect(adviceTopic('Moet ik stoppen met mijn pillen?')).toBe('health');
    expect(adviceTopic('What is the price of BTC?')).toBeNull();
    expect(adviceTopic('Wat is de prijs van BTC?')).toBeNull();
  });
});

describe('DVR:D-061: "what should I do with my <goal>" (helper for the goal answer, lib/ai/local-answers/al-fourth.ts)', () => {
  test('doWithAsk names the thing in EN and NL, in both Dutch word orders', () => {
    expect(doWithAsk('What should I do with my Emergency fund?')).toEqual({said: 'Emergency fund', lang: 'en'});
    expect(doWithAsk('Wat moet ik met mijn noodfonds doen?')).toEqual({said: 'noodfonds', lang: 'nl'});
    expect(doWithAsk('Wat moet ik doen met mijn noodfonds?')).toEqual({said: 'noodfonds', lang: 'nl'});
    expect(doWithAsk('Wat moet ik vandaag doen?')).toBeNull();
    expect(doWithAsk('What should I do today?')).toBeNull();
  });
  test('isMoneyThing: money, never a habit or a task', () => {
    for (const s of ['noodfonds', 'mijn spaargeld', 'savings', 'my money', 'Emergency fund', 'ZIG', 'crypto']) expect(isMoneyThing(s), s).toBe(true);
    for (const s of ['evening walk', 'mijn taken', 'Drink water', 'the checklist']) expect(isMoneyThing(s), s).toBe(false);
  });
  test('the bare "do with" form is left to the goal answer (its figures under the no-advice line), never pre-empted', () => {
    expect(safetyFirst('What should I do with my Emergency fund?')).toBeNull();
  });
});
