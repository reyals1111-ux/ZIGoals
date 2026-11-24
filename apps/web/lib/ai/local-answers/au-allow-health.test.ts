import {expect, test} from 'vitest';
import {buildShowcase} from '../../showcase-data';
import {checklistSchema, emptyChecklistDays} from '../../checklist/schema';
import {habitDataSchema, type HabitData} from '../../habits';
import {healthSchema, type HealthData} from '../../health';
import {platformSchema, type Platform} from '../../positions';
import {homeRecordsIn} from '../../sync-homes-store';
import {emptyReminders} from '../../reminders/schema';
import {presetSettings} from '../../dashboard-settings';
import {parseReply} from '../actions/parse';
import {AUTO_ACCEPT_NEVER} from '../actions/auto-accept';
import {planAction, type Env, type Stores} from '../actions/plan';
import {ask, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {DEFAULT_NOVA_SCOPES} from '../context-pack/nova';
import {HEALTH_CLOSED, HEALTH_CLOSED_NL} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {afLocalAnswer} from './af';
import {alMoreAnswer} from './al-more';
import {checklistAnswer} from './al-fourth';
import type {LocalReply} from './engine';

/**
 * Session AU (D-ALLOW-HEALTH): a reply that says Health is not shared carries exactly one button to where the person allows
 * it — the existing open-page card to Settings → ZIGi (there is no NOVA → Permissions view in PAGE_VIEWS) — and nothing
 * is written: the card is navigation only, never applied by itself, and the person turns the switch on there. The privacy
 * gate (lib/ai/gates.ts healthGate) is unchanged: no Health record is read while it is closed.
 */
const DAY = '2026-11-17', {records} = buildShowcase(DAY, 'UTC');
const stores = (): Stores => ({
  habits: {...habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)), timeZone: 'UTC'} as HabitData,
  health: healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)) as HealthData,
  platform: platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!)) as Platform,
  fasting: homeRecordsIn(records).fasting, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: homeRecordsIn(records).weeklyReview, memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true},
});
const planEnv = (s: Stores): Env => ({stores: s, handles: [], now: new Date(`${DAY}T19:00:00Z`), habitDay: DAY, healthDay: DAY, timeZone: 'UTC'});
const shut = (): ToolEnv => zigiEnv(showcaseAll(), false);
const textOf = (reply: LocalReply | null) => reply && 'text' in reply ? reply.text : '';
/** The reply's cards: exactly one, the open-page card to Settings → ZIGi; planned, it navigates and writes nothing. */
function allowsHealthOnce(reply: LocalReply | null) {
  const parsed = parseReply(textOf(reply));
  expect(parsed.rejected).toEqual([]);
  expect(parsed.proposals).toEqual([{kind: 'open-page', page: 'settings', view: 'zigi'}]);
  expect(AUTO_ACCEPT_NEVER).toContain('open-page');
  const s = stores(), before = JSON.stringify(s), planned = planAction(parsed.proposals[0]!, planEnv(s));
  expect(planned.ok).toBe(true);
  if (!planned.ok) return;
  expect(planned.plan.navigate?.href).toBe('/app/settings#your-ai');
  expect(planned.plan.write(s)).toEqual({});
  expect(planned.plan.undo).toBeNull();
  expect(JSON.stringify(s)).toBe(before);
}

test('the gate is closed in these environments: Health is not read', () => {
  expect(shut().health).toBeNull();
});
test('"Can you see my health?" with Health not shared: says so, and one button to Settings → ZIGi (EN and NL)', () => {
  for (const [q, lang, says] of [['can you see my health', 'en', 'Health is not shared with me now'], ['do you have access to my health data', 'en', 'Settings → ZIGi → Include Health'], ['can you see my health', 'nl', 'Health is nu niet met mij gedeeld']] as const) {
    const reply = alMoreAnswer(q, shut(), lang);
    expect(textOf(reply), q).toContain(says);
    allowsHealthOnce(reply);
  }
  // Asked the way ZIGi's panel asks with no model (the device's answer, then the no-model reply).
  allowsHealthOnce(ask('can you see my health', shut()).reply);
});
test('the week, with Health not shared: its Health line says so, with the Life review card and one button to allow Health', () => {
  const reply = ask('how was my week', shut()).reply, parsed = parseReply(textOf(reply));
  expect(textOf(reply)).toContain('Health: not shared with ZIGi here');
  expect(parsed.proposals.filter(a => a.kind === 'open-page')).toEqual([{kind: 'open-page', page: 'settings', view: 'zigi'}]);
  expect(parsed.proposals.map(a => a.kind).sort()).toEqual(['open-page', 'open-review']);
  // Health shared: no such button.
  expect(parseReply(ask('how was my week', zigiEnv(showcaseAll())).text).proposals.map(a => a.kind)).toEqual(['open-review']);
});
test('"What am I looking at" with a Health card not shared: says so, and one button to allow Health', () => {
  const view = {route: '/app', area: 'today' as const, page: 'Today', cards: [{id: 'today:habits', label: 'Habits', inView: true, health: false}], healthHidden: 1, focused: null};
  const reply = afLocalAnswer('what am I looking at', {...shut(), pageView: view} as ToolEnv);
  expect(textOf(reply)).toContain('One Health card is not shared with ZIGi.');
  allowsHealthOnce(reply);
  // Nothing hidden: no button.
  expect(parseReply(textOf(afLocalAnswer('what am I looking at', {...shut(), pageView: {...view, healthHidden: 0}} as ToolEnv))).proposals).toEqual([]);
});
test('the Checklist with Health dots not shared: says so, and one button to allow Health', () => {
  const record = checklistSchema.parse({version: 1, items: [{id: 'ck_floss', kind: 'custom', label: 'Floss teeth', section: 'morning', addedAt: '2026-11-01T08:00:00.000Z'}],
    healthItems: [{id: 'ck_water', kind: 'health', input: 'water', section: 'morning', addedAt: '2026-11-01T08:00:00.000Z'}], order: ['ck_floss', 'ck_water']});
  const env = {...shut(), checklist: {record, days: emptyChecklistDays(), date: DAY, unreadable: false}} as ToolEnv;
  // (al-fourth.ts's Checklist answer; the quick command "what's on my checklist" keeps its own words, golden-af.ts.)
  const reply = checklistAnswer('how many checklist items are done', env, 'en');
  expect(textOf(reply)).toContain('1 Health dot not shared with ZIGi.');
  allowsHealthOnce(reply);
});

const NOVA_NO_HEALTH = () => novaEnv(showcaseAll(), {...DEFAULT_NOVA_SCOPES, health: false, journal: true, notes: true});
test('ZIGi’s Health-closed reply follows the question’s language, with one button to Settings → ZIGi (both switches are there)', () => {
  for (const q of ['How much water did I drink yesterday?', 'how did I sleep last night']) {
    const a = ask(q, shut());
    expect(a.kind, q).toBe('refusal');
    expect(parseReply(a.text).text, q).toBe(HEALTH_CLOSED);
    allowsHealthOnce(a.reply);
  }
  // Session AU (R-12, deliberate): "Welke dag heb ik mijn water gemist?" names the habit "Drink water" by its own word, so it is
  // the habit's days from the Habits journal (REHEARSAL.md R-12), not Health's; the same Health refusal is held for the water
  // log's own target, asked the same way ("mijn waterdoel"), and the habit's answer is held to read nothing of Health.
  for (const q of ['Hoeveel water moet ik per dag drinken?', 'Welke dag heb ik mijn waterdoel gemist?', 'hoe heb ik vannacht geslapen']) {
    const a = ask(q, shut());
    expect(a.kind, q).toBe('refusal');
    expect(parseReply(a.text).text, q).toBe(HEALTH_CLOSED_NL);
    allowsHealthOnce(a.reply);
  }
  const habit = ask('Welke dag heb ik mijn water gemist?', shut());
  expect(habit.kind).toBe('answer');
  // Session AV lane 2 (Dutch dates, deliberate): the Dutch answer writes its days the Dutch way (was "(Sun, Nov 1 t/m Tue, Nov 17) … Sun, Nov 1 en Tue, Nov 10").
  expect(habit.text).toBe('Drink water: geen gemiste dag deze maand (zo 1 nov t/m di 17 nov). Overgeslagen (telt niet als gemist): zo 1 nov en di 10 nov. Vandaag staat nog open.');
  expect(habit.text).not.toMatch(/\bml\b|\bmL\b|Health/);
  expect(HEALTH_CLOSED_NL).toContain('Settings → ZIGi · your companion → Privacy & data: “Health page data” en “Include Health”');
});
test('NOVA: the same replies name NOVA → Permissions (its chat makes that the one button) and carry no card of their own', () => {
  // Session AU (R-12, deliberate): the water log's own target ("mijn waterdoel") for the habit's own word, as above.
  // Session AV lane 2 (fr-answers; deliberate, FR-TJ-1): the reply names the one button, Allow Health, in the same place, as strictly.
  for (const [q, says] of [['Welke dag heb ik mijn waterdoel gemist?', 'Tik op Allow Health in NOVA → Permissions: één tik opent Health (de knop'], ['How much water did I drink yesterday?', 'Tap Allow Health in NOVA → Permissions: one tap opens Health (the button'], ['can you see my health', 'Tap Allow Health in NOVA → Permissions: one tap opens Health (the button'], ['how was my week', 'Health is allowed in NOVA → Permissions.']] as const) {
    const a = ask(q, NOVA_NO_HEALTH()), parsed = parseReply(a.text);
    expect(a.text, q).toContain(says);
    expect(parsed.proposals.filter(p => p.kind === 'open-page'), q).toEqual([]);
  }
});
