import {describe, expect, test} from 'vitest';
import {localAnswer, type LocalReply} from './engine';
import {aiLocalAnswer} from './ai-session';
import {DEFAULT_NOVA_SCOPES} from '../context-pack/nova';
import {DAY, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';

/**
 * Session AV lane 2 (review b1 #12): "what did I write in my journal yesterday", "wat heb ik gisteren in mijn dagboek
 * geschreven" and a weekday ("last tuesday", "afgelopen dinsdag") get the journal's search-by-date answer — through the
 * whole engine, ZIGi and NOVA — and NOVA with its Journal permission off is told so, never "your journal is empty".
 * The Showcase's day is Tue 17 Nov 2026.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
describe('the journal by day, with no "on"', () => {
  test('yesterday, in English and Dutch, from ZIGi and NOVA', () => {
    expect(DAY).toBe('2026-11-17');
    for (const env of [zigiEnv(showcaseAll()), novaEnv(showcaseAll())]) {
      expect(text(localAnswer('what did I write in my journal yesterday', env))).toBe('1 journal entry on Mon, Nov 16. Their words stay on the Journal page: /app/journal?day=2026-11-16.');
      expect(text(localAnswer('wat heb ik gisteren in mijn dagboek geschreven', env))).toMatch(/^1 dagboekstuk op ma 16 nov\. De woorden blijven op de Journal-pagina: \/app\/journal\?day=2026-11-16\.$/);
      expect(text(localAnswer('what did I write yesterday', env))).toContain('/app/journal?day=2026-11-16');
    }
  });
  test('a weekday: the last one (today included), or with "last" the one before today', () => {
    const env = zigiEnv(showcaseAll());
    expect(text(localAnswer('what did I write last tuesday', env))).toMatch(/ on Tue, Nov 10\b/);
    expect(text(localAnswer('what did I write on monday', env))).toMatch(/ on Mon, Nov 16\b/);
    expect(text(localAnswer('wat heb ik afgelopen dinsdag geschreven', env))).toMatch(/ op di 10 nov\b/);
    // Words that are not a day are left to the other answers.
    expect(text(localAnswer('what did I write about running', env))).not.toMatch(/Their words stay on the Journal page/);
  });
});
describe('NOVA with its Journal permission off', () => {
  test('says Journal is off for NOVA, not that the journal is empty', () => {
    const shut = novaEnv(showcaseAll(), {...DEFAULT_NOVA_SCOPES, health: true, journal: false, notes: true});
    const r = aiLocalAnswer('what patterns do you see in my journal', shut);
    expect(r?.kind).toBe('refusal');
    expect(text(r)).toBe('Journal is off for NOVA, so it is not read here. Turn it on in NOVA → Permissions.');
    expect(text(aiLocalAnswer('what patterns do you see in my journal', novaEnv(showcaseAll())))).not.toContain('empty');
  });
});
