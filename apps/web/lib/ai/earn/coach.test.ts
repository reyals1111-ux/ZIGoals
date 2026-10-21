import {describe, expect, test} from 'vitest';
import {earnSnapshot, recordEarnSnapshot, resetEarnSnapshot, subscribeEarnSnapshot} from '../../earn/snapshot';
import {recordedSnapshot} from '../evals/fixtures-af';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {runTool} from '../tools/registry';
import {earnCoachAnswer, SIGN_REFUSAL} from './coach';
import {GLOSSARY, glossaryAnswer, glossaryTerm, NOT_ADVICE} from './glossary';

// Session AF (L4, P8.5; ADR-028 H69): the Earn coach states a figure only from the Earn snapshot, with its source and "as of".
const snapshot = recordedSnapshot();
describe('the Earn snapshot (lib/earn/snapshot.ts): what the Earn page read, as the page states it', () => {
  test('every family read becomes figures with a source and an "as of"; an unavailable family keeps its reason in plain words', () => {
    expect(snapshot.figures.length).toBeGreaterThan(10);
    for (const f of snapshot.figures) { expect(f.source.length, f.id).toBeGreaterThan(3); expect(Date.parse(f.asOf), f.id).not.toBeNaN(); expect(f.value, f.id).not.toBe(''); }
    const ids = snapshot.figures.map(f => f.id);
    for (const id of ['native-apr-before-commission', 'native-unbonding', 'native-apr-measured', 'native-apr-issuance-at-measured', 'valdora-fee']) expect(ids, id).toContain(id);
    expect(snapshot.figures.find(f => f.id === 'native-unbonding')!.value).toBe('21 days');
    expect(snapshot.validators.length).toBeGreaterThan(5);
    const down = recordedSnapshot({unavailable: ['measured']});
    expect(down.families.measured).toMatchObject({status: 'unavailable', reason: 'UPSTREAM_DOWN', words: 'the source did not answer just now'});
    expect(down.figures.some(f => f.id === 'native-apr-measured')).toBe(false);
  });
  test('memory only: written by the live hook, read by ZIGi, reset to empty; listeners hear each change', () => {
    resetEarnSnapshot(); expect(earnSnapshot().figures).toEqual([]); expect(earnSnapshot().updatedAt).toBeNull();
    let heard = 0; const off = subscribeEarnSnapshot(() => heard++);
    recordEarnSnapshot('chain', {phase: 'loading'}); expect(heard).toBe(0);
    recordEarnSnapshot('chain', {phase: 'unavailable', reason: 'TIMEOUT'}); expect(heard).toBe(1);
    expect(earnSnapshot().families.chain).toMatchObject({status: 'unavailable', words: 'the source took too long to answer'});
    off(); resetEarnSnapshot();
  });
});
describe('the glossary, English and Dutch, plain words; numbers only from the snapshot', () => {
  test('definition questions find their term; advice and lookups are not definitions', () => {
    const cases: [string, string, 'en' | 'nl'][] = [['What is APR?', 'apr', 'en'], ['what\'s APY', 'apy', 'en'], ['What is unbonding?', 'unbonding', 'en'], ['explain impermanent loss', 'impermanent-loss', 'en'], ['What is liquid staking?', 'liquid-staking', 'en'], ['what does slippage mean', 'slippage', 'en'],
      ['Wat is unbonding?', 'unbonding', 'nl'], ['wat is APR', 'apr', 'nl'], ['leg impermanent loss uit', 'impermanent-loss', 'nl'], ['Wat betekent slippage?', 'slippage', 'nl'], ['wat is een validator', 'validator', 'nl'], ['Wat is liquid staking?', 'liquid-staking', 'nl'], ['What is a validator\'s commission?', 'commission', 'en'], ['Is my ZIG real?', 'decoy', 'en']];
    for (const [q, id, lang] of cases) expect(glossaryTerm(q), q).toMatchObject({term: {id}, lang});
    for (const q of ['Should I stake my ZIG?', 'How much have I staked?', 'Stake 50 ZIG for me', 'What is my staking balance?', 'Which validator is best?', 'Moet ik staken?', 'How many minutes did I meditate?']) expect(glossaryTerm(q), q).toBeNull();
  });
  test('without a snapshot no answer carries a digit; it says where the current figure is; every answer says "not advice"', () => {
    for (const term of GLOSSARY) for (const lang of ['en', 'nl'] as const) {
      const text = glossaryAnswer(term, lang, null);
      expect(text, `${term.id} ${lang}`).not.toMatch(/\d/);
      expect(text.endsWith(NOT_ADVICE[lang]), `${term.id} ${lang}`).toBe(true);
    }
    expect(glossaryAnswer(GLOSSARY.find(t => t.id === 'unbonding')!, 'en', null)).toContain('The current figure is on the Earn page, with its source; ZIGi has not read it in this visit.');
  });
  test('with the snapshot: the figure, its source and its "as of" — both APR figures side by side (H97), never one ZIGi made', () => {
    const unbonding = earnCoachAnswer('What is unbonding?', snapshot)!.text;
    expect(unbonding).toMatch(/Unbonding time on ZIGChain \(how long unstaked ZIG stays locked\): 21 days \(source: ZIGChain mainnet LCD \(official\), as of 2026-10-18 \d\d:\d\d UTC\)\./);
    const apr = earnCoachAnswer('What is APR?', snapshot)!.text;
    expect(apr).toMatch(/the issuance figure at the same \d+\s% commission \(APR\): \d+\.\d\d\s%/); expect(apr).toMatch(/the measured figure, what .+’s own stake earned/);
    // Every percentage said is the snapshot's own (a figure's value, or the commission in its label): none is ZIGi's.
    const quoted = new Set(snapshot.figures.flatMap(f => `${f.value} ${f.label}`.match(/\d+(?:[.,]\d+)?\s%/g) ?? []));
    for (const text of [unbonding, apr, earnCoachAnswer('wat is APR', snapshot)!.text]) for (const pct of text.match(/\d+(?:[.,]\d+)?\s%/g) ?? []) expect(quoted.has(pct), pct).toBe(true);
    expect(earnCoachAnswer('Wat is unbonding?', snapshot)!.text).toMatch(/\(bron: ZIGChain mainnet LCD \(official\), stand 2026-10-18 \d\d:\d\d UTC\)\.\n\nMeer in Earn → Academy: “Unbonding: the way out”\.\n\nUitgelegd door ZIGoals · geen advies$/);
  });
  test('the ways to earn in the Earn page\'s order with a risk each (never ranked by rate); Start here; a signing request refused', () => {
    const ways = earnCoachAnswer('What are the ways to earn?', snapshot)!;
    expect(ways.kind).toBe('answer'); expect(ways.text).toMatch(/never ranked by rate/);
    expect(ways.text.split('\n').filter(l => l.startsWith('•')).map(l => l.slice(2, 22))).toEqual(['Native staking: put ', 'Liquid staking (Vald', 'Pools (OroSwap): ear', 'USDC vaults (Valdora', 'Governance and Goal ']);
    for (const line of ways.text.split('\n').filter(l => l.startsWith('•') && !l.startsWith('• Governance'))) expect(line, line).toMatch(/Risk: /);
    expect(ways.text).toContain('```zigoals-action\n{"kind":"open-page","page":"earn"}\n```');
    expect(earnCoachAnswer('Walk me through start here', null)!.text).toMatch(/^Start here, on the Earn page: from no wallet to a first stake, in six steps\.[\s\S]*\n1\. Get a wallet: your own keys\n[\s\S]*"view":"start-here"/);
    expect(earnCoachAnswer('waar begin ik met staken', null)!.text).toMatch(/^Start hier, op de Earn-pagina/);
    for (const ask of ['Sign this transaction for me', 'Can you sign it?', 'Please broadcast the transaction', 'Approve the transaction in my wallet', 'Onderteken de transactie'])
      expect(earnCoachAnswer(ask, snapshot), ask).toEqual({kind: 'refusal', text: SIGN_REFUSAL[/onderteken/i.test(ask) ? 'nl' : 'en']});
    for (const ask of ['Sign me up for a 10k', 'Send 50 USDC to my brother', 'Stake 50 ZIG for me', 'Claim my staking rewards']) expect(earnCoachAnswer(ask, snapshot), ask).toBeNull();
  });
  test('earn_rates: the snapshot\'s figures as {value, source, asOf}; none read yet says so and states no figure', () => {
    const base = showcaseSources(), open = (s = base) => toolEnv(s, gatesFor(true), 'provider');
    const none = runTool('earn_rates', {}, open());
    expect(none.ok).toBe(true); expect(JSON.stringify(none)).not.toMatch(/\d+(?:\.\d+)?(?:\s|\\u00a0)%/);
    expect((none as unknown as {data: {unavailable: string}}).data.unavailable).toMatch(/^Not read yet in this visit/);
    const read = runTool('earn_rates', {option: 'native-staking'}, open({...base, earn: snapshot}));
    const figures = (read as unknown as {data: {figures: {value: string; source: string; asOf: string}[]}}).data.figures;
    expect(figures.length).toBeGreaterThan(3);
    for (const f of figures) { expect(f.source).toBeTruthy(); expect(f.asOf).toMatch(/^2026-10-18T/); }
    expect((read as unknown as {data: {rule: string}}).data.rule).toMatch(/not ZIGoals' and not advice/);
  });
});
