import {describe, expect, test} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {emptyHabitData, type HabitData} from '../habits';
import {createEmptyHealth, healthSchema} from '../health';
import {emptyPlatform} from '../positions';
import {toolEnv, type ToolSources} from '../ai/tools/env';
import {gatesFor, showcaseSources} from '../ai/tools/fixtures';
import {toneProblem} from '../ai/proactive/calm';
import {ALL_SCOPES, MAX_BRIEFS, NOVA_BRIEFS, NOVA_BRIEFS_KEY, acceptReword, briefNotice, composeBrief, emptyNovaBriefs, forgetBriefs, markAllRead, markRead, novaBriefLines, novaBriefsSchema, rewordRoute, saveBrief, setNovaBriefPrefs, unreadCount, withReword, type NovaBrief} from './briefs';

// Session AK (owner follow-up 2, N6): NOVA's briefs, composed on the device from the fictional Showcase records.
const DAY = '2026-10-05';
const env = (sources: ToolSources = showcaseSources(DAY), health = true) => toolEnv(sources, gatesFor(health), 'local');
const empty = (): ToolSources => showcaseSources(DAY, {habits: {...emptyHabitData(), timeZone: 'UTC'} as HabitData, health: healthSchema.parse({...createEmptyHealth(), schemaVersion: 4}), platform: emptyPlatform(), fasting: {version: 1, sessions: []}, weekly: null, moneyLog: null, journal: null, energy: null, accounts: null, chess: null, checklist: null, notes: null});
const text = (b: NovaBrief | null) => b ? novaBriefLines(b).join('\n') : '';

describe('composeBrief', () => {
  test('the Showcase morning brief and evening recap: ZIGi\'s lines and sections plus the money line, calm words, ids by day', () => {
    const morning = composeBrief('morning', DAY, env())!, evening = composeBrief('evening', DAY, env())!;
    expect(morning.id).toBe(`morning:${DAY}`); expect(evening.id).toBe(`evening:${DAY}`);
    expect(morning.lines.length + (morning.sections?.length ?? 0)).toBeGreaterThan(0);
    expect(evening.sections!.length).toBeGreaterThan(0);
    for (const line of [...novaBriefLines(morning), ...novaBriefLines(evening)]) expect(toneProblem(line), line).toBeNull();
    // NOVA's money line from the Showcase's spending log, never converted between currencies.
    const money = [...(morning.sections ?? []), ...(evening.sections ?? [])].filter(s => s.id === 'money');
    for (const s of money) expect(s.text).toMatch(/^\d+\.\d\d [A-Z]{3} over \d+ (?:entry|entries)/);
    expect(novaBriefsSchema.safeParse({version: 1, briefs: [morning, evening]}).success).toBe(true);
  });
  test('an empty start has nothing to say: null, never an empty brief', () => {
    expect(composeBrief('morning', DAY, env(empty()))).toBeNull();
    expect(composeBrief('evening', DAY, env(empty()))).toBeNull();
  });
  test('a brief is made only for the records\' own today', () => {
    expect(composeBrief('morning', '2026-10-04', env())).toBeNull();
  });
  test('scopes are respected: a closed pillar is not read, Health only with its scope and its gate', () => {
    const all = composeBrief('evening', DAY, env())!;
    const noWealth = composeBrief('evening', DAY, env(), {scopes: {...ALL_SCOPES, wealth: false}});
    expect(text(all)).toMatch(/Spent today|Spent this week/);
    expect(text(noWealth)).not.toMatch(/Spent today|Spent this week|Earning/);
    const noHealth = composeBrief('evening', DAY, env(), {scopes: {...ALL_SCOPES, health: false}});
    expect(noHealth?.sections?.some(s => s.id === 'health') ?? false).toBe(false);
    // The Health gate closed: the scope alone opens nothing.
    const gated = composeBrief('evening', DAY, env(showcaseSources(DAY), false), {scopes: ALL_SCOPES});
    expect(gated?.sections?.some(s => s.id === 'health') ?? false).toBe(false);
    const noHabits = composeBrief('morning', DAY, env(), {scopes: {...ALL_SCOPES, habits: false}});
    expect(noHabits?.lines.some(l => l.startsWith('Still open today')) ?? false).toBe(false);
    const nothing = composeBrief('morning', DAY, env(), {scopes: {today: false, goals: false, habits: false, wealth: false, health: false, notes: false, journal: false, earn: false}});
    expect(nothing).toBeNull();
  });
  test('NOVA\'s default scopes: no Health; Earn closed leaves out the earning line', async () => {
    const {DEFAULT_NOVA_SCOPES} = await import('../ai/context-pack/nova');
    const defaults = composeBrief('evening', DAY, env(), {scopes: DEFAULT_NOVA_SCOPES});
    expect(defaults?.sections?.some(s => s.id === 'health') ?? false).toBe(false);
    const withEarn = composeBrief('morning', DAY, env(), {scopes: ALL_SCOPES}), noEarn = composeBrief('morning', DAY, env(), {scopes: {...ALL_SCOPES, earn: false}});
    expect(withEarn!.sections!.some(s => s.id === 'earning')).toBe(true);
    expect(noEarn!.sections!.some(s => s.id === 'earning')).toBe(false);
  });
});

describe('the briefs record', () => {
  const brief = () => composeBrief('morning', DAY, env())!;
  test('saving the same words changes nothing; new words replace that day\'s brief and keep its read state; at most 30', () => {
    let record = emptyNovaBriefs();
    const first = saveBrief(record, brief()); expect(first.changed).toBe(true); record = first.record;
    expect(saveBrief(record, {...brief(), at: '2026-10-05T20:00:00.000Z'}).changed).toBe(false);
    record = markRead(record, `morning:${DAY}`, new Date('2026-10-05T09:00:00Z'));
    record = withReword(record, `morning:${DAY}`, {text: 'Warm words.', by: 'local', model: 'llama'}, new Date('2026-10-05T09:01:00Z'));
    const changed = saveBrief(record, {...brief(), lines: ['A new line.']});
    expect(changed.changed).toBe(true);
    expect(changed.record.briefs![0]!.readAt).toBe('2026-10-05T09:00:00.000Z');
    expect(changed.record.briefs![0]!.polished).toBeUndefined();
    for (let i = 0; i < 40; i++) {
      const day = new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10);
      record = saveBrief(record, {...brief(), id: `morning:${day}`, day}).record;
    }
    expect(record.briefs).toHaveLength(MAX_BRIEFS);
    expect(record.briefs![0]!.day >= record.briefs!.at(-1)!.day).toBe(true);
  });
  test('unread counts today and yesterday only; mark read and mark all read', () => {
    let record = saveBrief(emptyNovaBriefs(), brief()).record;
    record = saveBrief(record, {...brief(), id: 'evening:2026-10-04', kind: 'evening', day: '2026-10-04'}).record;
    record = saveBrief(record, {...brief(), id: 'morning:2026-09-20', day: '2026-09-20'}).record;
    expect(unreadCount(record, DAY)).toBe(2);
    expect(unreadCount(markRead(record, `morning:${DAY}`, new Date()), DAY)).toBe(1);
    expect(unreadCount(markAllRead(record, new Date()), DAY)).toBe(0);
    expect(unreadCount(emptyNovaBriefs(), DAY)).toBe(0);
    expect(forgetBriefs(setNovaBriefPrefs(record, {notify: true}))).toEqual({version: 1, prefs: {notify: true}});
  });
  test('the stored record reads back; unknown fields are kept; unreadable bytes read as empty and say so', () => {
    const record = saveBrief(emptyNovaBriefs(), brief()).record;
    const map = new Map([[NOVA_BRIEFS_KEY, JSON.stringify({...record, later: {x: 1}})]]);
    const read = readDeviceRecord({getItem: k => map.get(k) ?? null}, NOVA_BRIEFS);
    expect(read.unreadable).toBe(false); expect((read.data as Record<string, unknown>).later).toEqual({x: 1});
    expect(readDeviceRecord({getItem: () => '{nope'}, NOVA_BRIEFS)).toEqual({data: {version: 1}, unreadable: true});
  });
});

describe('rewording and notifications', () => {
  test('a local model may always reword; a cloud model only in Guarded or Relaxed; no model, none', () => {
    expect(rewordRoute('local', 'strict')).toBe('local');
    expect(rewordRoute('anthropic', 'strict')).toBeNull();
    expect(rewordRoute('openai', 'guarded')).toBe('cloud'); expect(rewordRoute('gemini', 'relaxed')).toBe('cloud');
    expect(rewordRoute(null, 'relaxed')).toBeNull();
  });
  test('a rewording that adds, drops or changes a number is refused', () => {
    const b = {lines: ['Still open today: Walk, Read.', 'From yesterday: 1.5 L of water logged.'], sections: [{id: 'checklist', label: 'Checklist', text: '2 of 4 dots done.'}]};
    expect(acceptReword(b, 'Good morning. Walk and Read are still open, and you logged 1.5 L of water yesterday. 2 of 4 dots are done.')).toMatch(/^Good morning/);
    expect(acceptReword(b, 'You logged 2 L of water. 2 of 4 dots are done.')).toBeNull();
    expect(acceptReword(b, 'Walk and Read are open.')).toBeNull();
    expect(acceptReword(b, '')).toBeNull();
    expect(acceptReword(b, 'x'.repeat(2000))).toBeNull();
  });
  test('the notice: only with notifications already on, that type on and the person\'s choice; it names nothing', () => {
    const on = setNovaBriefPrefs(emptyNovaBriefs(), {notify: true});
    expect(briefNotice(emptyNovaBriefs(), 'morning', {here: true, typeOn: true})).toBeNull();
    expect(briefNotice(on, 'morning', {here: false, typeOn: true})).toBeNull();
    expect(briefNotice(on, 'evening', {here: true, typeOn: false})).toBeNull();
    expect(briefNotice(on, 'morning', {here: true, typeOn: true})).toEqual({kind: 'morning', href: '/app/nova#briefs', title: 'Your morning brief', line: 'Your morning brief is ready on NOVA.'});
  });
});
