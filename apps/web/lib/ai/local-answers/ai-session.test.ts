import {describe, expect, test} from 'vitest';
import {parseReply} from '../actions/parse';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources, withHandHealth, withPortfolios} from '../tools/fixtures';
import {goldenSources} from '../evals/run';
import {localAnswer} from './engine';
import {noModelReply} from './no-model';

/** Session AI (ZI2, ZI11, ZI12, ZI13, G11): natural questions answered on the device, never the canned list. */
const env = toolEnv(goldenSources(withPortfolios(withHandHealth(showcaseSources()))), gatesFor(true, 'today'), 'local');
const closed = toolEnv(goldenSources(withPortfolios(withHandHealth(showcaseSources()))), gatesFor(false, 'today'), 'local');
const ask = (q: string, e = env) => localAnswer(q, e);
const textOf = (r: ReturnType<typeof ask>) => 'text' in r ? r.text : '';
describe('natural questions (ZI2)', () => {
  test.each(['Did I sleep enough?', 'did i get enough sleep'])('"%s" is answered from the sleep records', q => {
    const r = ask(q);
    expect(r.kind).toBe('answer');
    expect(textOf(r)).toMatch(/6 h 44 min/);
    expect(textOf(r)).toMatch(/not medical advice/);
  });
  test('Dutch', () => expect(textOf(ask('Heb ik genoeg geslapen?'))).toMatch(/gemiddeld 6 h 44 min.*geen medisch advies/s));
  test('with Health closed, no Health figure', () => {
    const r = ask('Did I sleep enough?', closed);
    expect(r.kind).toBe('refusal');
    expect(textOf(r)).not.toMatch(/6 h 44/);
  });
  test('on track for a named goal', () => {
    const t = textOf(ask('Am I on track for my Emergency fund?'));
    expect(t).toMatch(/Emergency fund: 45%/);
    expect(t).toMatch(/ahead by 250 USD/);
  });
  test('a goal that does not exist is named, with the goals there are', () => {
    const t = textOf(ask('am I on track for my €5k fund?'));
    expect(t).toMatch(/could not find a goal called “€5k fund”/);
    expect(t).toMatch(/Emergency fund/);
  });
  test('Dutch on track', () => expect(textOf(ask('Lig ik op schema voor mijn Emergency fund?'))).toMatch(/Ten opzichte van je plan: voor met 250 USD/));
  test('the habit with the lowest completion, in neutral words', () => {
    const t = textOf(ask('Which habit am I worst at?'));
    expect(t).toMatch(/lowest completion/);
    expect(t).not.toMatch(/\b(?:fail|lazy|bad)\b/i);
  });
  test('summarise my day gives the brief or the recap', () => expect(ask('Summarise my day').kind).toBe('answer'));
});
describe('prices and staking (ZI12), why it changed (G11), what ZIGi sees (ZI13)', () => {
  test('a price as the pages show it, with its source', () => {
    const t = textOf(ask('What is the price of BTC?'));
    expect(t).toMatch(/Portfolio “Long-term coins”: 62,000 USD \(CoinGecko/);
    expect(t).toMatch(/not advice/);
  });
  test('an asset not tracked anywhere says so', () => expect(textOf(ask('What is the price of SOL?'))).toMatch(/not tracked/));
  test('why net worth changed comes from the recorded history', () => {
    const r = ask('Why did my net worth change this week?');
    expect(r.kind).toBe('answer');
    expect(textOf(r)).toMatch(/Wealth chart/);
  });
  test('what ZIGi sees is said plainly, Health state included', () => {
    expect(textOf(ask('What can you see of my data?'))).toMatch(/Health is shared now/);
    expect(textOf(ask('What can you see of my data?', closed))).toMatch(/Health is not shared now/);
  });
});
describe('simple commands with no AI (ZI11)', () => {
  test('with an AI connected the AI keeps them (the device stays out of the way)', () => expect(ask('Create a habit called Yoga').kind).toBe('none'));
  test.each([['Create a habit called Yoga', 'Yoga'], ['add a new habit named Cold shower', 'Cold shower'], ['Maak een gewoonte Yoga aan', 'Yoga']])('"%s" proposes a habit card', (q, title) => {
    const r = noModelReply(q, env);
    expect(r.kind).toBe('answer');
    expect(parseReply(textOf(r)).proposals).toMatchObject([{kind: 'create-habit', title}]);
  });
  test('"add a habit" alone, or one with a schedule to work out, is not a device card', () => {
    for (const q of ['add a habit', 'Create a habit to stretch every morning']) expect(parseReply(textOf(noModelReply(q, env))).proposals).toEqual([]);
  });
});
describe('advice asks with no AI (ZI10, G8)', () => {
  test.each(['Should I sell my ETH now?', 'Is it a good time to buy BTC?', 'Moet ik mijn ETH verkopen?'])('"%s" gets the money guardrail', q => expect(textOf(noModelReply(q, env))).toMatch(/advise|advies/));
  test.each(['Should I take sleeping pills?', 'Is it safe to fast for three days?', 'Moet ik stoppen met mijn medicijnen?'])('"%s" is not medical advice, said plainly', q => expect(textOf(noModelReply(q, env))).toMatch(/not medical advice|geen medisch advies/));
  test('with an AI connected these still go to the AI', () => expect(ask('Should I sell my ETH now?').kind).toBe('none'));
});
describe('money questions and the weekly money recap (feature 5)', () => {
  test('what was spent this month, biggest categories, from the log', () => {
    const t = textOf(ask('What did I spend this month?'));
    expect(t).toMatch(/You spent [\d.]+ EUR this month/);
    expect(t).toMatch(/Biggest: Groceries/);
  });
  test('one category', () => expect(textOf(ask('How much did I spend on groceries this month?'))).toMatch(/on groceries this month/));
  test('the weekly recap with the room to spend', () => expect(textOf(ask('How much room to spend do I have?'))).toMatch(/Room to spend: [\d.]+ EUR left of 200.00 EUR/));
  test('Dutch', () => expect(textOf(ask('Hoeveel heb ik deze week uitgegeven?'))).toMatch(/Je gaf deze week/));
});
describe('the journal and the energy (feature 6)', () => {
  test('patterns from the journal, on the device', () => expect(textOf(ask('What patterns do you see in my journal?'))).toMatch(/You wrote about sleep and tiredness in \d+ of your last 10 entries/));
  test('energy, the last 7 days', () => expect(textOf(ask('How was my energy this week?'))).toMatch(/Your energy, the last 7 days: [\d.]+ of 5/));
  test('energy with Health not shared is not read', () => expect(ask('How was my energy this week?', closed).kind).toBe('refusal'));
  test('"energy ratings" is the daily rating, never food kcal (found by the feature cases)', () => { for (const q of ['What is the average of my energy ratings?', 'How have my energy ratings averaged this week?', 'Wat is mijn energiescore deze week?']) expect(textOf(ask(q)), q).not.toMatch(/kcal/); expect(textOf(ask('What is the average of my energy ratings?'))).toMatch(/of 5/); });
});
