import {beforeAll, describe, expect, test} from 'vitest';
import {MAX_HOURS, MAX_TARGET_HOURS, startFast, runningSession} from '../../fasting/engine';
import * as fastingSchemaModule from '../../fasting/schema';
import {presetSettings} from '../../dashboard-settings';
import {emptyHabitData, type HabitData} from '../../habits';
import {createEmptyHealth, healthSchema} from '../../health';
import {emptyPlatform} from '../../positions';
import {emptyReminders} from '../../reminders/schema';
import {emptyWeeklyReview} from '../../weekly-review/schema';
import {localAnswer} from '../local-answers/engine';
import {noModelReply} from '../local-answers/no-model';
import {fastTooLong, quickCommand} from '../quick-commands/commands';
import {SPECIALISTS, ACTION_PROTOCOL} from '../context/specialists';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {AUTO_ACCEPT_NEVER} from './auto-accept';
import {applyEdits} from './edit';
import {parseReply} from './parse';
import {applyPlan, HE6_NOTE, loadAaPlanner, planAction, type Env, type Stores} from './plan';
import {actionSchema, type Action} from './schema';
beforeAll(() => loadAaPlanner());

/**
 * Session AM-2 (ADR-039 D6; owner report "ZIGi's fasting cards stop at 18 h while Health allows 24 h"): ZIGi's and NOVA's
 * fasting card takes exactly the range Health's own form takes, from the one constant Health reads
 * (lib/fasting/schema.ts MAX_TARGET_HOURS, the 24 h automatic stop). A longer fast is refused as Health refuses it.
 */
const sources = showcaseSources(), tools = toolEnv(sources, gatesFor(true), 'local');
const NOW = new Date('2026-09-20T19:00:00Z');
const stores: Stores = {habits: {...emptyHabitData(), timeZone: 'UTC'} as HabitData, health: healthSchema.parse({...createEmptyHealth(), schemaVersion: 4}), platform: emptyPlatform(), fasting: {version: 1, sessions: []}, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: emptyWeeklyReview(), memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true}};
const env: Env = {stores, handles: [], now: NOW, habitDay: '2026-09-20', healthDay: '2026-09-20', timeZone: 'UTC'};
const fence = (hours: number) => `\`\`\`zigoals-action\n{"kind":"start-fast","targetHours":${hours}}\n\`\`\``;
const healthTakes = (hours: number) => { try { startFast({version: 1, sessions: []}, {id: 'fast_x', now: NOW, targetHours: hours, timeZone: 'UTC'}); return true; } catch { return false; } };
const textOf = (r: {text?: string}) => r.text ?? '';
const cardsOf = (r: {text?: string} | null) => r ? parseReply(textOf(r)) : null;

describe('one range, one constant: the card and Health\'s form', () => {
  test('the card\'s ceiling is Health\'s own constant, and the old separate ceiling is gone', () => {
    expect(MAX_TARGET_HOURS).toBe(24); expect(MAX_TARGET_HOURS).toBe(MAX_HOURS);
    expect(Object.keys(fastingSchemaModule)).not.toContain('MAX_CUSTOM_HOURS');
  });
  test('every whole hour from 0 to 30: the card is accepted exactly when Health\'s own startFast takes it', () => {
    for (let hours = 0; hours <= 30; hours++) expect(actionSchema.safeParse({kind: 'start-fast', targetHours: hours}).success, `${hours} h`).toBe(healthTakes(hours));
    expect(actionSchema.safeParse({kind: 'start-fast', targetHours: 20.5}).success).toBe(false); expect(healthTakes(20.5)).toBe(false);
  });
  test('20 h and 24 h make a card; 25 h is refused and nothing is proposed; the old cases still hold', () => {
    for (const hours of [1, 12, 16, 18, 20, 24]) expect(parseReply(fence(hours)), `${hours} h`).toMatchObject({proposals: [{kind: 'start-fast', targetHours: hours}], rejected: []});
    for (const hours of [0, 25, 36, 72]) { const parsed = parseReply(fence(hours)); expect(parsed.proposals, `${hours} h`).toEqual([]); expect(parsed.rejected, `${hours} h`).toHaveLength(1); }
  });
});

describe('the planner and the card', () => {
  const plan = (hours: number) => { const r = planAction(actionSchema.parse({kind: 'start-fast', targetHours: hours}) as Action, env); if (!r.ok) throw Error(r.message); return r.plan; };
  test.each([20, 24])('a %i h fast is a card with the HE6 note, and confirming it starts Health\'s own fast with that target', hours => {
    const p = plan(hours);
    expect(p.card).toMatchObject({kind: 'start-fast', title: 'Start a fast', where: 'Health · Fasting timer', safety: HE6_NOTE});
    expect(p.card.lines).toEqual([`Target ${hours} h (custom, up to 24 h)`, 'Stops by itself at 24 h; stop it any time from Health']);
    const after = applyPlan(p, stores);
    expect(runningSession(after.fasting)).toMatchObject({targetHours: hours, timeZone: 'UTC', endedAt: null});
    expect(fastingSchemaModule.fastingSchema.safeParse(after.fasting).success).toBe(true);
    expect(runningSession({...after, ...p.undo!.write(after)}.fasting)).toBeUndefined(); // Undo discards it, as before
  });
  test('the presets keep their own words', () => {
    expect(plan(16).card.lines[0]).toBe('Target 16 h (16:8)'); expect(plan(12).card.lines[0]).toBe('Target 12 h (12:12)'); expect(plan(18).card.lines[0]).toBe('Target 18 h (custom, up to 24 h)');
  });
  test('editing a card: 24 is taken, 25 is not', () => {
    const card = actionSchema.parse({kind: 'start-fast', targetHours: 16}) as Action;
    expect(applyEdits(card, {targetHours: '20'})).toMatchObject({ok: true, action: {targetHours: 20}});
    expect(applyEdits(card, {targetHours: '24'})).toMatchObject({ok: true, action: {targetHours: 24}});
    expect(applyEdits(card, {targetHours: '25'})).toMatchObject({ok: false});
  });
  test('a fast is still never automatic, whatever its length', () => { expect(AUTO_ACCEPT_NEVER).toContain('start-fast'); expect(AUTO_ACCEPT_NEVER).toContain('stop-fast'); });
});

describe('the phrasing, English and Dutch, typed and spoken', () => {
  const EN: [string, number][] = [['start a 20 hour fast', 20], ['Start a 20h fast', 20], ['start a 24 hour fast', 24], ['begin a 24-hour fast', 24], ['start a twenty hour fast', 20], ['start a twenty-four hour fast', 24], ['start a 16 hour fast', 16], ['start a sixteen hour fast', 16]];
  const NL: [string, number][] = [['start een vasten van 20 uur', 20], ['start een vasten van 24 uur', 24], ['start een 20-uurs vasten', 20], ['start een vasten van twintig uur', 20], ['start een vasten van vierentwintig uur', 24], ['start een vasten van 16 uur', 16], ['start een vasten van zestien uur', 16]];
  test.each([...EN, ...NL])('"%s" is one card of %i h', (ask, hours) => {
    const reply = localAnswer(ask, tools);
    expect(reply.kind).toBe('answer');
    expect(cardsOf(reply)).toMatchObject({proposals: [{kind: 'start-fast', targetHours: hours}], rejected: []});
  });
  test('the titles say the hours, in each language', () => {
    expect(textOf(quickCommand('start a 20 hour fast', tools)!)).toMatch(/^Start a fast · 20 h\. /);
    expect(textOf(quickCommand('start een vasten van 24 uur', tools)!)).toMatch(/^Een vasten starten · 24 h\. /);
  });
  test('the no-model path: "do a 20 hour fast" and "20:4" are the card too', () => {
    for (const [ask, hours] of [['start a 20 hour fast', 20], ['I want to start a 24 hour fast', 24], ['do a 20 hour fast', 20], ['start a 20:4 fast', 20], ['start a 16:8 fast', 16]] as const)
      expect(cardsOf(noModelReply(ask, tools)), ask).toMatchObject({proposals: [{kind: 'start-fast', targetHours: hours}], rejected: []});
  });
  test('25 h is refused in Health\'s own words, with no card and no line that promises one', () => {
    expect(fastTooLong(25, 'en')).toBe('Choose a target from 1 to 24 hours. The fasting timer stops itself at 24 h, so there is no card for a 25 h fast.');
    expect(fastTooLong(25, 'nl')).toBe('Kies een doel van 1 tot 24 uur. De vastentimer stopt zelf na 24 uur, dus er komt geen kaart voor een vasten van 25 uur.');
    expect(() => startFast({version: 1, sessions: []}, {id: 'fast_x', now: NOW, targetHours: 25, timeZone: 'UTC'})).toThrow('Choose a target from 1 to 24 hours.'); // Health's sentence
    for (const [ask, lang] of [['start a 25 hour fast', 'en'], ['start a twenty-five hour fast', 'en'], ['start a 30 hour fast', 'en'], ['start een vasten van 25 uur', 'nl'], ['start een vasten van vijfentwintig uur', 'nl']] as const) {
      const reply = localAnswer(ask, tools), hours = ask.includes('30') ? 30 : 25;
      expect(reply.kind, ask).toBe('refusal'); expect(textOf(reply), ask).toBe(fastTooLong(hours, lang));
      expect(cardsOf(reply), ask).toMatchObject({proposals: [], rejected: []});
    }
    for (const ask of ['start a 25 hour fast', 'do a 25 hour fast', 'I want to start a 30 hour fast']) {
      const reply = noModelReply(ask, tools);
      expect(reply.kind, ask).toBe('refusal'); expect(textOf(reply), ask).toMatch(/^Choose a target from 1 to 24 hours\. /);
      expect(cardsOf(reply), ask).toMatchObject({proposals: [], rejected: []});
    }
  });
  test('Health not shared: still no Health card, whatever the hours', () => {
    const closed = toolEnv(sources, gatesFor(false), 'local');
    for (const ask of ['start a 20 hour fast', 'start a 25 hour fast']) { const reply = quickCommand(ask, closed)!; expect(reply.kind, ask).toBe('refusal'); expect(reply.text, ask).toMatch(/^Health isn’t shared here/); }
  });
});

test('what the person\'s AI is told: the same range, the same stop, the same note', () => {
  expect(ACTION_PROTOCOL).toContain('{"kind":"start-fast","targetHours":16} (up to 24; a fast asked for a later hour today is this card now');
  expect(ACTION_PROTOCOL).toContain('for anything longer say the timer cannot be set that long and propose nothing');
  expect(SPECIALISTS.health.prompt).toContain('keep to the app\'s limits (up to 24 hours, stopped automatically at 24)');
  expect(SPECIALISTS.health.prompt).toContain('talk to a doctor first');
  expect(`${ACTION_PROTOCOL}${SPECIALISTS.health.prompt}`).not.toMatch(/12 to 18/);
});
