import {expect, test} from 'vitest';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {parseReply} from '../actions/parse';
import {localAnswer} from './engine';
import {EXAMPLES_INTRO} from './examples';
import {EXAMPLES_INTRO_NL, howToReply, noModelReply, questionLanguage} from './no-model';

// Session AB-Cloud Part 9 (ADR-023 C30): what ZIGi says with no model after the device's own answers had none.
const env = () => toolEnv(showcaseSources(), gatesFor(true), 'local');
const textOf = (r: ReturnType<typeof noModelReply>) => 'text' in r ? r.text : '';

test('a Dutch question gets its introduction in Dutch; the examples stay the English questions the device answers', () => {
  for (const q of ['Hoeveel minuten heb ik deze maand gemediteerd?', 'Welke gewoontes zijn vandaag nog open?', 'Hoe gaat het met mijn doelen?']) {
    expect(localAnswer(q, env()).kind, q).toBe('none'); // the golden pins (nl-question, x-nl-whole) are untouched
    expect(questionLanguage(q), q).toBe('nl');
    const r = noModelReply(q, env());
    expect(r).toMatchObject({kind: 'examples', text: EXAMPLES_INTRO_NL});
    for (const example of 'examples' in r ? r.examples : []) expect(localAnswer(example, env()).kind, example).not.toBe('none');
  }
  for (const q of ['Tell me a joke', 'What should I do today?', 'Is de app klaar?']) expect(noModelReply(q, env())).toMatchObject({kind: 'examples', text: EXAMPLES_INTRO});
});

test('create a food, log a meal plan and plan a goal get their steps and a button to the right page, in English or Dutch', () => {
  const cases: [string, string, Record<string, string>][] = [
    ['Create a food called protein shake', 'Health → Foods & recipes → New food', {page: 'health'}],
    ['add a new food please', 'New food', {page: 'health'}],
    ['Maak een nieuw voedingsmiddel aan', 'Typ de naam', {page: 'health'}],
    ['Log my meal plan for tomorrow', 'Health → Planner', {page: 'health', view: 'planner'}],
    ['Plan my meals for the week', 'plan a recipe or a food', {page: 'health', view: 'planner'}],
    ['Maak een maaltijdplan voor deze week', 'Kies een dag', {page: 'health', view: 'planner'}],
    ['Make a goal for a new bike, 900 euros', 'Goals → Create a goal', {page: 'goals', view: 'new-goal'}],
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
  // Not a how-to: "Plan my week" and a lookup keep their own paths.
  expect(howToReply('Plan my week', 'en')).toBeNull();
  expect(howToReply('How far am I on my goals?', 'en')).toBeNull();
});
