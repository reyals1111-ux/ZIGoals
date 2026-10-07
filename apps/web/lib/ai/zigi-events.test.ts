import {describe, expect, it} from 'vitest';
import {restState, SLEEPY_AFTER_MS, TRANSIENT_MS, stateForEvent, transition, type ZigiEvent} from '../../components/zigi/events';
import {localEvent} from './zigi-reactions';
import {streakMilestone, STREAK_MILESTONES} from './actions/milestone';
import type {Plan} from './actions/plan';
import {createHabit, emptyHabitData, logHabitValue, type HabitData} from '../habits';
import manifest from '../../components/zigi/manifest.json';

const open = {open: true, greetedToday: true}, firstOpen = {open: true, greetedToday: false}, closed = {open: false, greetedToday: true};
describe('ZIGi state machine (ADR-012 follow-up part E)', () => {
  it('greets on the first open of the day only, and every state it reaches exists in the manifest', () => {
    expect(transition('idle', 'open', firstOpen)).toBe('greeting');
    expect(transition('idle', 'open', open)).toBe('idle');
    const events: ZigiEvent[] = ['open', 'close', 'reply-pending', 'reply-streaming', 'reply-done', 'reply-with-proposals', 'action-applied', 'error', 'listening', 'speaking', 'idle', 'sleepy',
      'tool-call', 'writing-proposal', 'local-answer', 'ambiguity', 'not-understood', 'streak-milestone', 'careful', 'encourage', 'offline', 'online', 'reminder-due', 'model-loading', 'model-ready', 'success', 'surprise'];
    for (const event of events) for (const from of Object.keys(manifest.states) as (keyof typeof manifest.states)[]) {
      const next = transition(from, event, firstOpen); if (next) expect(Object.keys(manifest.states), `${from} + ${event}`).toContain(next);
    }
  });
  it('listens while the microphone records, thinks until the first token, speaks while streaming', () => {
    expect(transition('idle', 'listening', open)).toBe('listening');
    expect(transition('listening', 'idle', open)).toBe('idle');
    expect(transition('idle', 'reply-pending', open)).toBe('thinking');
    expect(transition('thinking', 'reply-streaming', open)).toBe('speaking');
    expect(transition('speaking', 'reply-done', open)).toBe('insight');
    expect(transition('speaking', 'reply-with-proposals', open)).toBe('presenting');
  });
  it('celebrates only after the app applied an action, never on a reply that merely claims it', () => {
    expect(transition('presenting', 'action-applied', open)).toBe('celebrate');
    for (const event of ['reply-done', 'reply-with-proposals', 'reply-streaming'] as const) expect(transition('idle', event, open)).not.toBe('celebrate');
    expect(TRANSIENT_MS.celebrate).toBeGreaterThan(0);
  });
  it('shows error on failures, waves goodbye on close, and gets sleepy only while idle with the panel open', () => {
    expect(transition('speaking', 'error', open)).toBe('error');
    // Session V Part 12 (assertion changed, the plan's "close" trigger): a one-shot wave, then ZIGi rests (idle).
    expect(transition('error', 'close', open)).toBe('wave-goodbye');
    expect(TRANSIENT_MS['wave-goodbye']).toBeGreaterThan(0); expect(restState(closed)).toBe('idle');
    expect(transition('idle', 'sleepy', open)).toBe('sleepy');
    expect(transition('idle', 'sleepy', closed)).toBeNull();
    expect(transition('thinking', 'sleepy', open)).toBeNull();
    expect(transition('sleepy', 'idle', open)).toBe('idle');
    expect(transition('sleepy', 'reply-pending', open)).toBe('thinking');
    expect(SLEEPY_AFTER_MS).toBeGreaterThanOrEqual(60_000);
  });
  it('an idle event while already idle changes nothing (no flicker)', () => {
    expect(transition('idle', 'idle', open)).toBeNull();
    expect(stateForEvent('idle')).toBe('idle');
  });
  // Session V Part 12: one test per new transition, each from a real trigger.
  it('reads the records while a tool runs, and writes while a proposal block streams in', () => {
    expect(transition('thinking', 'tool-call', open)).toBe('reading-your-data');
    expect(transition('reading-your-data', 'reply-streaming', open)).toBe('speaking');
    expect(transition('speaking', 'writing-proposal', open)).toBe('writing-proposal');
    expect(transition('writing-proposal', 'reply-with-proposals', open)).toBe('presenting');
  });
  it('after a local answer: pleased, curious about a choice, puzzled by a question it cannot answer, gentle after a careful topic', () => {
    expect(transition('idle', 'local-answer', open)).toBe('success');
    expect(transition('idle', 'ambiguity', open)).toBe('curious');
    expect(transition('idle', 'not-understood', open)).toBe('confused');
    expect(transition('thinking', 'careful', open)).toBe('empathetic');
    const calls = [{tool: 'habit_stats', args: {}, label: 'x'}];
    expect(localEvent({kind: 'answer', text: 'x', calls}, 'How many push-ups this week?')).toBe('local-answer');
    expect(localEvent({kind: 'choices', text: 'x', choices: [], calls}, 'How is my fund?')).toBe('ambiguity');
    expect(localEvent({kind: 'examples', text: 'x', examples: [], calls: []}, 'Write me a poem')).toBe('not-understood');
    expect(localEvent({kind: 'refusal', text: 'x', calls}, 'How much water did I drink?')).toBe('reply-done');
    expect(localEvent({kind: 'examples', text: 'x', examples: [], calls: []}, 'How can I lose 10 kg in 2 weeks?')).toBe('careful');
  });
  it('proud only on a streak milestone the habit engine counted; encouraging over the week; a celebration for any other write', () => {
    expect(transition('presenting', 'streak-milestone', open)).toBe('proud');
    expect(transition('idle', 'encourage', open)).toBe('encouraging');
    expect(STREAK_MILESTONES).toContain(7);
    const id = '59a35604-3696-4a78-b455-4015acb66885', start = createHabit(emptyHabitData(), {title: 'Stretch', category: 'Movement', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), id);
    const data = (dates: string[]): HabitData => dates.reduce((d, date) => logHabitValue(d, id, date, 1, {}, new Date(`${date}T20:00:00Z`)), {...start, timeZone: 'UTC'} as HabitData);
    const six = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19'];
    const plan = {card: {kind: 'check-in'}, activity: {id: `habit:${id}:2026-09-20`, title: 'Check-in: Stretch'}} as unknown as Plan;
    const now = new Date('2026-09-20T12:00:00Z');
    expect(streakMilestone(plan, data(six), data([...six, '2026-09-20']), now)).toBe(7);
    expect(streakMilestone(plan, data(six.slice(1)), data([...six.slice(1), '2026-09-20']), now)).toBeNull();
    expect(streakMilestone({...plan, card: {kind: 'skip'}} as unknown as Plan, data(six), data([...six, '2026-09-20']), now)).toBeNull();
    expect(streakMilestone(plan, data([...six, '2026-09-20']), data([...six, '2026-09-20']), now)).toBeNull();
  });
  it('offline holds while the device is offline and ends when it is back; idle rests there meanwhile', () => {
    const away = {...open, offline: true};
    expect(transition('idle', 'offline', away)).toBe('offline');
    expect(transition('speaking', 'offline', away)).toBeNull();
    expect(transition('offline', 'online', open)).toBe('idle');
    expect(transition('idle', 'online', open)).toBeNull();
    expect(transition('idle', 'open', away)).toBe('offline');
    expect(transition('sleepy', 'idle', away)).toBe('offline');
  });
  // Session X-Local Part 4: a small success (an accepted card, a logged entry; D5) and a surprise the AI hinted at.
  it('a small success and a surprise: one-shots from any state', () => {
    expect(transition('idle', 'success', open)).toBe('success'); expect(transition('presenting', 'success', open)).toBe('success');
    expect(transition('idle', 'surprise', open)).toBe('surprised');
    expect(TRANSIENT_MS.success).toBeGreaterThan(0); expect(TRANSIENT_MS.surprised).toBeGreaterThan(0);
  });
  it('a reminder knocks; a model that loads shows it until it is ready', () => {
    expect(transition('idle', 'reminder-due', open)).toBe('reminder');
    expect(transition('idle', 'model-loading', open)).toBe('loading-model');
    expect(transition('loading-model', 'model-ready', open)).toBe('idle');
    expect(transition('thinking', 'model-ready', open)).toBeNull();
  });
});
