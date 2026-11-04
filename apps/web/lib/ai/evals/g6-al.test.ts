import {describe, expect, test} from 'vitest';
import {parseReply} from '../actions/parse';
import {quickAddOffered} from '../actions/decline';
import {localAnswer} from '../local-answers/engine';
import {noModelReply} from '../local-answers/no-model';
import {detectRisk} from '../safety';
import {guardMessage} from '../safety-guard';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {G6_AL} from './g6-al';

/**
 * Session AL (lane L7): the AL regression cases on every build, decided on the device with no model (mock eval). The guard
 * cases are answered before anything else; the fact cases are what ZIGi's no-model path says (lookups first, as the panel
 * asks them); the Quick add cases are the rule under a no-AI answer. 100 % is held here.
 */
const env = toolEnv(showcaseSources(), gatesFor(true), 'local');
const textOf = (r: ReturnType<typeof noModelReply>) => 'text' in r ? r.text : '';
describe('the AL regression set', () => {
  test('ids are unique and every case names the findings it covers', () => {
    const ids = G6_AL.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of G6_AL) expect(c.ids.length, c.id).toBeGreaterThan(2);
  });
  for (const c of G6_AL) test(`${c.id} (${c.ids}): ${c.ask}`, () => {
    const e = c.expect, guard = guardMessage(c.ask);
    if ('guard' in e) {
      expect(guard?.topic).toBe(e.guard);
      expect(guard?.lang).toBe(c.lang);
      for (const w of e.mustContain ?? []) expect(guard!.text).toContain(w);
      return;
    }
    expect(guard, 'not guarded').toBeNull();
    if ('answer' in e) {
      const local = localAnswer(c.ask, env), reply = local.kind === 'none' ? noModelReply(c.ask, env) : local, text = textOf(reply);
      expect(['answer', 'refusal']).toContain(reply.kind);
      for (const w of e.mustContain ?? []) expect(text).toContain(w);
      for (const w of e.mustNot ?? []) expect(text).not.toContain(w);
      if (e.noCard) expect(parseReply(text).proposals).toEqual([]);
      return;
    }
    expect(quickAddOffered(c.ask, {guarded: !!guard, careful: !!detectRisk(c.ask)})).toBe('quickAdd' in e);
  });
});
import {otherLanguage} from '../local-answers/no-model';
test('TK-054/ZP-28: French and Spanish questions are told the device answers in English (and Dutch) for now', () => {
  expect(otherLanguage('Combien d\'eau j\'ai bu aujourd\'hui ?')).toBe('fr');
  expect(otherLanguage('¿Cuánta agua bebí hoy?')).toBe('es');
  expect(otherLanguage('How much water did I drink?')).toBeNull();
  const r = noModelReply('Quels sont mes objectifs aujourd\'hui ?', env);
  expect('text' in r ? r.text : '').toMatch(/^Pour l’instant, je réponds en anglais/);
});
test('P-NB-70: "is BTC a buy?" gets the no-advice line on the device, never the examples list', () => {
  for (const q of ['is BTC a buy?', 'Is ZIG a good investment?', 'is it worth buying ETH now']) {
    const local = localAnswer(q, env), r = local.kind === 'none' ? noModelReply(q, env) : local;
    expect(textOf(r), q).toContain('I can’t advise');
  }
});
