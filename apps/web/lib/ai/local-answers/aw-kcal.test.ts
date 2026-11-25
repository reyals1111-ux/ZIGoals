import {describe, expect, test} from 'vitest';
import {HEALTH_CLOSED} from '../tools/format';
import {DAY, ask as askAll, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AW_KCAL} from '../evals/as/cases-aw-kcal';
import {awKcalAnswer, claims, spanOf} from './aw-kcal';
import {localAnswer, type LocalReply} from './engine';
import type {ToolSources} from '../tools/env';
import {createEmptyHealth, saveActivity} from '../../health';
import {withHealthGroup} from '../../vault/w-homes';
import {vitalDaySchema} from '../../vitals/schema';
import {emptyActivityExtras, withActivityExtra} from '../../aw-kcal/activity-extras';
import {fold} from './exact/text';

/**
 * Session AW (kcal; owner decision 1a and amendment 4): "how many calories did I burn" answered on the device from what
 * was typed ("you entered") or imported ("from your file"), with the source, or honestly: ZIGoals does not work it out.
 * Never an estimate; never the calories eaten (which these questions used to get).
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const ask = (q: string, s: ToolSources = showcaseAll(), health = true) => awKcalAnswer(q, zigiEnv(s, health));
const withAk = (more: Record<string, unknown>, base: ToolSources = showcaseAll()): ToolSources => ({...base, ak: {...base.ak, ...more} as typeof base.ak});
const AT = `${DAY}T08:00:00.000Z`;

describe('every corpus phrasing is answered, in its own language, through the engine too', () => {
  for (const c of AW_KCAL) for (const [lang, qs] of [['en', c.en], ['nl', c.nl]] as const) for (const q of qs) test(`${c.id} (${lang}): ${q}`, () => {
    for (const s of [showcaseAll(), freshAll()]) {
      const r = ask(q, s);
      expect(r?.kind, q).toBe('answer');
      for (const n of c.never ?? []) expect(text(r).toLowerCase(), q).not.toContain(n.toLowerCase());
      for (const env of [zigiEnv(s), novaEnv(s)]) { const all = askAll(q, env); expect(all.kind, q).toBe('answer'); expect(all.text, q).not.toMatch(/diary entries|food logged|eten gelogd|estimate/i); }
    }
    if (lang === 'nl') expect(text(ask(q))).not.toMatch(/\b(?:the|your|today|this week)\b/);
  });
  test('Health closed: the Health refusal, never the data', () => {
    for (const c of AW_KCAL) { const r = ask(c.en[0]!, showcaseAll(), false); expect(r?.kind, c.id).toBe('refusal'); expect(text(r)).toBe(HEALTH_CLOSED); }
  });
  test('other questions are not claimed: food calories, fat, advice, a log line, an action', () => {
    for (const q of ['how many calories did I eat today', 'is fasting burning fat', 'how many calories should I burn to lose weight', 'I burned 300 calories on my run', 'how many calories did I burn and log a walk', 'what is my energy expenditure estimate', 'how much energy did I use today', 'hoeveel calorieën heb ik gegeten'])
      expect(ask(q), q).toBeNull();
    for (const q of ['how many calories did I burn', 'calories burned yesterday', 'how much active energy did I burn this week', 'wat is mijn calorieverbruik vandaag', 'hoeveel kcal verbrandde ik gisteren']) expect(claims(fold(q)), q).toBe(true);
  });
});

describe('the answer says what was typed or imported, with its source', () => {
  test('the Showcase: today’s walk with 180 kcal you entered', () => {
    expect(text(ask('how many calories did I burn today'))).toBe('Calories burned today (Tue, Nov 17), from your own records: 180 kcal you entered on 1 activity (“Showcase walk”). ZIGoals doesn’t work out calories burned: these are only figures you typed or imported.');
    expect(text(ask('hoeveel calorieën heb ik vandaag verbrand'))).toBe('Verbrande calorieën vandaag (di 17 nov), uit je eigen gegevens: 180 kcal door jou ingevuld bij 1 activiteit (“Showcase walk”). ZIGoals rekent geen verbrande calorieën uit: dit zijn alleen cijfers die je zelf invulde of importeerde.');
  });
  test('nothing recorded: the honest line and where to type them', () => {
    expect(text(ask('how many calories did I burn this week', freshAll()))).toBe('No calories burned are recorded this week (Mon, Nov 16 to Tue, Nov 17). ZIGoals doesn’t work out calories burned from your movement. You can type them on an activity in Health → Activity (“Calories (you entered)”), or bring them in with a file from your watch or phone (Settings → Switch to ZIGoals).');
    expect(text(ask('hoeveel calorieën heb ik verbrand', freshAll()))).toMatch(/^Er zijn geen verbrande calorieën vastgelegd vandaag \(di 17 nov\)\. ZIGoals rekent geen verbrande calorieën uit je beweging uit\./);
    // A logged walk with nothing typed is still nothing: no figure is worked out from its minutes or a weight.
    const h = saveActivity(createEmptyHealth(), {id: 'health_walk-aw-0002', date: DAY, name: 'Walk', steps: 0, minutes: 60}, AT);
    expect(text(ask('how many calories did I burn today', {...freshAll(), health: h}))).toMatch(/^No calories burned are recorded today/);
  });
  test('typed and imported, each summed with its source and never added together', () => {
    let h = saveActivity(createEmptyHealth(), {id: 'health_run-aw-0001', date: DAY, name: 'Run', steps: 0, minutes: 30}, AT);
    h = saveActivity(h, {id: 'health_swim-aw-0002', date: '2026-11-16', name: 'Swimming', steps: 0, minutes: 30}, AT);
    h = withHealthGroup(h, 'vitals', {version: 1, days: [vitalDaySchema.parse({id: `health_vital-apple-health-${DAY}`, date: DAY, source: 'apple-health', activeKcal: 450, updatedAt: AT})]}, false);
    const extras = withActivityExtra(withActivityExtra(emptyActivityExtras(), 'health_run-aw-0001', {kcal: 320}), 'health_swim-aw-0002', {kcal: 200});
    const s = withAk({activityExtras: extras}, {...freshAll(), health: h});
    expect(text(ask('how many calories did I burn this week', s))).toBe('Calories burned this week (Mon, Nov 16 to Tue, Nov 17), from your own records: 520 kcal you entered on 2 activities (“Run” and “Swimming”); 450 kcal of active energy from your file (Apple Health), on 1 day. The two are kept apart, as they can count the same movement. ZIGoals doesn’t work out calories burned: these are only figures you typed or imported.');
    const fileOnly = withAk({activityExtras: emptyActivityExtras()}, {...freshAll(), health: h});
    expect(text(ask('calories burned today', fileOnly))).toBe('Calories burned today (Tue, Nov 17), from your own records: 450 kcal of active energy from your file (Apple Health), on 1 day. ZIGoals doesn’t work out calories burned; you can type them on an activity in Health → Activity.');
    expect(text(ask('hoeveel calorieën heb ik vandaag verbrand', fileOnly))).toContain('450 kcal actieve energie uit je bestand (Apple Health), op 1 dag');
    // The engine routes it here for ZIGi and NOVA alike.
    expect(text(localAnswer('how many calories did I burn today', zigiEnv(fileOnly)))).toContain('from your file');
    expect(text(localAnswer('how many calories did I burn today', novaEnv(fileOnly)))).toContain('from your file');
  });
  test('the span: today, yesterday, this and last week, the last 7 days, this month', () => {
    expect(spanOf('calories burned', DAY)).toMatchObject({from: DAY, to: DAY});
    expect(spanOf('calories burned yesterday', DAY)).toMatchObject({from: '2026-11-16', to: '2026-11-16'});
    expect(spanOf('calories burned this week', DAY)).toMatchObject({from: '2026-11-16', to: DAY});
    expect(spanOf('calories burned last week', DAY)).toMatchObject({from: '2026-11-09', to: '2026-11-15'});
    expect(spanOf('calories burned in the last 7 days', DAY)).toMatchObject({from: '2026-11-11', to: DAY});
    expect(spanOf('calorieen verbrand deze maand', DAY)).toMatchObject({from: '2026-11-01', to: DAY});
  });
});
