import {expect, test} from 'vitest';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {parseReply} from '../actions/parse';
import {emptyHabitData, type HabitData} from '../../habits';
import {createEmptyHealth, healthSchema} from '../../health';
import {emptyPlatform} from '../../positions';
import {emptyReminders} from '../../reminders/schema';
import {presetSettings} from '../../dashboard-settings';
import {emptyWeeklyReview} from '../../weekly-review/schema';
import {planAction, type Env, type Stores} from '../actions/plan';
import {actionSchema} from '../actions/schema';
import {localAnswer} from './engine';
import {markNovaEnv} from './nova-env';
import {EXAMPLES_INTRO} from './examples';
import {EXAMPLES_INTRO_NL, capabilitiesReply, noModelReply, savingGoalName} from './no-model';

/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-2): with no model, a newcomer's first questions get a way
 * forward. "Help me save for a holiday" offers the goal form with the name filled in; "What can you do?" says in two lines
 * what works now and what a brain adds; the examples' introduction never says "without any AI".
 */
const env = () => toolEnv(showcaseSources(), gatesFor(true), 'local');
const textOf = (r: ReturnType<typeof noModelReply>) => 'text' in r ? r.text : '';

test('a saving intent offers the goal form, the name taken from the words (English and Dutch)', () => {
  const cases: [string, string | undefined][] = [
    ['Help me save for a holiday', 'Holiday'],
    ['I want to save up for a new bike next year', 'Bike'],
    ['help me put money aside for my wedding', 'Wedding'],
    ['Start a fund for our kitchen.', 'Kitchen'],
    ['Ik wil sparen voor een vakantie', 'Vakantie'],
    ['Help me save for 900 euros of things', undefined],
  ];
  for (const [q, name] of cases) {
    expect(localAnswer(q, env()).kind, q).toBe('none');
    const r = noModelReply(q, env());
    expect(r.kind, q).toBe('answer');
    expect(textOf(r), q).not.toMatch(/without any AI/i);
    const parsed = parseReply(textOf(r));
    expect(parsed.proposals, q).toEqual([{kind: 'open-page', page: 'goals', view: 'new-goal', ...(name ? {name} : {})}]);
    expect(parsed.rejected, q).toEqual([]);
  }
  expect(savingGoalName('a holiday in Japan')).toBe('Holiday');
  expect(savingGoalName('')).toBeUndefined();
  // A goal named in the question keeps the pinned how-to; a lookup is never a new goal.
  expect(textOf(noModelReply('Make a goal for a new bike, 900 euros', env()))).toContain('Goals → Create a goal');
  expect(noModelReply('How much did I save for my holiday?', env()).kind).not.toBe('answer');
});

test('the card opens the goal form with the name filled in; a name anywhere else is refused', () => {
  const stores = (): Stores => ({habits: {...emptyHabitData(), timeZone: 'UTC'} as HabitData, health: healthSchema.parse({...createEmptyHealth(), schemaVersion: 4}), platform: emptyPlatform(), fasting: {version: 1, sessions: []}, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: emptyWeeklyReview(), memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true}});
  const planEnv: Env = {stores: stores(), handles: [], now: new Date('2026-11-01T09:00:00Z'), habitDay: '2026-11-01', healthDay: '2026-11-01', timeZone: 'UTC'};
  const r = planAction(actionSchema.parse({kind: 'open-page', page: 'goals', view: 'new-goal', name: 'Holiday'}), planEnv);
  expect(r.ok).toBe(true);
  if (r.ok) { expect(r.plan.navigate).toEqual({href: '/app/goals/new?from=ask&name=Holiday', label: 'Goals → New goal “Holiday”'}); expect(r.plan.card.lines).toContain('The name “Holiday” is filled in; you add the rest'); }
  expect(planAction(actionSchema.parse({kind: 'open-page', page: 'habits', name: 'Holiday'}), planEnv).ok).toBe(false);
  const setup = planAction(actionSchema.parse({kind: 'open-page', page: 'nova', view: 'setup'}), planEnv);
  expect(setup.ok && setup.plan.navigate).toEqual({href: '/app/nova/setup', label: 'Build NOVA\'s brain'});
  expect(planAction(actionSchema.parse({kind: 'open-page', page: 'goals', view: 'setup'}), planEnv).ok).toBe(false);
});

test('"What can you do?" says what works now and what a brain adds, with one tap to set the brain up', () => {
  for (const q of ['What can you do?', 'Who are you?', 'hi NOVA, what can you do for me?', 'How can you help?']) {
    expect(localAnswer(q, env()).kind, q).toBe('none');
    const r = noModelReply(q, env());
    expect(r.kind, q).toBe('answer');
    expect(textOf(r), q).toContain('Right now I answer from your own records, on this device');
    expect(textOf(r), q).toContain('With a brain of your own');
    expect(parseReply(textOf(r)).proposals, q).toEqual([{kind: 'open-page', page: 'settings', view: 'zigi'}]);
  }
  expect(textOf(noModelReply('Wat kun je?', env()))).toContain('Nu beantwoord ik vragen uit je eigen gegevens');
  // On NOVA's environment, the tap is NOVA's own guide.
  const novaReply = capabilitiesReply('What can you do?', 'en', markNovaEnv(env(), {healthScope: false, healthGate: false}));
  expect(novaReply && 'text' in novaReply ? parseReply(novaReply.text).proposals : null).toEqual([{kind: 'open-page', page: 'nova', view: 'setup'}]);
  expect(capabilitiesReply('What can you do about my sleep schedule?', 'en', env())).toBeNull();
});

test('the examples\' introduction never contradicts "Private intelligence"', () => {
  for (const intro of [EXAMPLES_INTRO, EXAMPLES_INTRO_NL]) expect(intro).not.toMatch(/without any AI|zonder AI/i);
  // Session AL fifth pass (L7-5b; Lisbon N-LA-01, deliberate): an unmatched English ask now says first what the device
  // answers and prepares, then the same introduction; the whole text is still pinned, word for word.
  expect(noModelReply('Tell me a joke', env())).toMatchObject({kind: 'examples', text: 'That isn’t something I can answer from your records here. Without a brain I answer about your habits, Checklist, tasks, goals, Health (once you share it) and money, and I prepare cards you confirm for check-offs, tasks and new habits.\nUntil you give me a brain, I answer from your own records on this device. For example:'});
});
