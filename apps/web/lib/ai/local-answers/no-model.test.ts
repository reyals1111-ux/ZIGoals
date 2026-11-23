import {expect, test} from 'vitest';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {parseReply} from '../actions/parse';
import {localAnswer} from './engine';
import {EXAMPLES_INTRO} from './examples';
import {UNMATCHED_EN} from './al-fifth';
import {EXAMPLES_INTRO_NL, howToReply, noModelReply, questionLanguage} from './no-model';

// Session AB-Cloud Part 9 (ADR-023 C30): what ZIGi says with no model after the device's own answers had none.
const env = () => toolEnv(showcaseSources(), gatesFor(true), 'local');
const textOf = (r: ReturnType<typeof noModelReply>) => 'text' in r ? r.text : '';

test('a Dutch question gets its introduction in Dutch; the examples are Dutch questions the device answers (fr-answers, FR-S-5; deliberate title)', () => {
  // Session AS (ADR-042 A1, deliberate): with no model, a Dutch question is now answered in Dutch from the records: by
  // NOVA's own overview answers in ZIGi's words where they exist, else by the exact layer (it was the Dutch introduction and English examples). `localAnswer` itself still says none for
  // these (the golden pins nl-question and x-nl-whole are untouched: with a model connected they go to the model, which
  // now gets the same facts). A Dutch question the device cannot answer keeps the Dutch introduction and the examples.
  const answered: [string, RegExp][] = [
    ['Hoeveel minuten heb ik deze maand gemediteerd?', /^Meditate: [\d,]+ minutes deze maand \(.+\), [\d,]+ minutes per dag op \d+ dagen/],
    ['Welke gewoontes zijn vandaag nog open?', /^\d+ gewoontes? nog open vandaag:\n• .+/],
    ['Hoe gaat het met mijn doelen?', /^\d+ actieve doelen, uit je eigen gegevens:\n• .+/],
  ];
  for (const [q, words] of answered) {
    expect(localAnswer(q, env()).kind, q).toBe('none'); // the golden pins (nl-question, x-nl-whole) are untouched
    expect(questionLanguage(q), q).toBe('nl');
    const r = noModelReply(q, env());
    expect(r.kind, q).toBe('answer');
    expect(textOf(r), q).toMatch(words);
    expect('calls' in r ? r.calls.length : 0, q).toBeGreaterThan(0);
  }
  for (const q of ['Wat is het weer morgen?', 'Kun je een gedicht voor mij schrijven?']) {
    expect(localAnswer(q, env()).kind, q).toBe('none');
    const r = noModelReply(q, env());
    expect(r, q).toMatchObject({kind: 'examples', text: EXAMPLES_INTRO_NL});
    expect('examples' in r ? r.examples.length : 0, q).toBeGreaterThan(0);
    // Session AV lane 2 (fr-answers; FR-S-5, deliberate): the examples are Dutch questions now; a tapped one is asked as the
    // chat asks it with no model (the device's lookups, then the no-model reply), and must get an answer, never the list again.
    for (const example of 'examples' in r ? r.examples : []) { const own = localAnswer(example, env()), reply = own.kind === 'none' ? noModelReply(example, env()) : own; expect(['answer', 'choices'], example).toContain(reply.kind); }
  }
  // Session AL fifth pass (L7-5b; Lisbon N-LA-01, deliberate): an ask nothing matched that is not read as Dutch ("Is de app
  // klaar?" has one Dutch word) leads with what the device does (UNMATCHED_EN), then the same introduction; a whole Dutch
  // question keeps the Dutch introduction alone (pinned above).
  for (const q of ['Tell me a joke', 'What should I do today?', 'Is de app klaar?']) expect(noModelReply(q, env())).toMatchObject({kind: 'examples', text: `${UNMATCHED_EN}\n${EXAMPLES_INTRO}`});
});

test('create a food, log a meal plan and plan a goal get their steps and a button to the right page, in English or Dutch', () => {
  const cases: [string, string, Record<string, string>][] = [
    ['Create a food called protein shake', 'Health → Foods & recipes → New food', {page: 'health'}],
    ['add a new food please', 'New food', {page: 'health'}],
    ['Maak een nieuw voedingsmiddel aan', 'Typ de naam', {page: 'health'}],
    ['Log my meal plan for tomorrow', 'Health → Planner', {page: 'health', view: 'planner'}],
    ['Plan my meals for the week', 'plan a recipe or a food', {page: 'health', view: 'planner'}],
    ['Maak een maaltijdplan voor deze week', 'Kies een dag', {page: 'health', view: 'planner'}],
    ['Plan a savings goal for Japan', 'the plan step suggests', {page: 'goals', view: 'new-goal'}],
    ['Maak een doel voor een nieuwe fiets', 'Geef het een naam', {page: 'goals', view: 'new-goal'}],
  ];
  for (const [q, words, page] of cases) {
    expect(localAnswer(q, env()).kind, q).toBe('none'); // with a model connected these still go to it (it drafts the cards)
    const r = noModelReply(q, env());
    expect(r.kind, q).toBe('answer');
    expect(textOf(r), q).toContain(words);
    const parsed = parseReply(textOf(r));
    expect(parsed.proposals, q).toEqual([{kind: 'open-page', ...page}]); expect(parsed.rejected, q).toEqual([]);
  }
  // Session AL (N-DV-08, deliberate): a goal the words name is the Goal wizard filled in (Quick add's parser), not an empty
  // form: the same steps, then a goal-draft card with the name, the target and the currency.
  const bike = noModelReply('Make a goal for a new bike, 900 euros', env());
  expect(textOf(bike)).toContain('Goals → Create a goal');
  const drafted = parseReply(textOf(bike));
  expect(drafted.rejected).toEqual([]);
  expect(drafted.proposals).toHaveLength(1);
  expect(drafted.proposals[0]).toMatchObject({kind: 'goal-draft', target: 900, currency: 'EUR'});
  expect(String((drafted.proposals[0] as {name?: string}).name)).toMatch(/bike/i);
  // Not a how-to: "Plan my week" and a lookup keep their own paths.
  expect(howToReply('Plan my week', 'en')).toBeNull();
  expect(howToReply('How far am I on my goals?', 'en')).toBeNull();
});
