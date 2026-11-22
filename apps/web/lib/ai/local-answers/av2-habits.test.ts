import {describe, expect, test} from 'vitest';
import type {ToolEnv, ToolSources} from '../tools/env';
import {showcaseAll, zigiEnv, novaEnv} from '../evals/as/harness';
import {AV2_HABITS} from '../evals/as/cases-av2-habits';
import {withHabitOptions} from '../../habit-options/rule';
import {av2HabitsAnswer} from './av2-habits';
import type {LocalReply} from './engine';

/** Session AV lane 2 (habits pillar): the new features' on-device answers, English and Dutch, under the Habits switch. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const withOptions = (patch: (extras: object, ids: string[]) => object): ToolSources => {
  const s = showcaseAll(), ids = s.habits!.habits.map(h => h.id);
  return {...s, ak: {...s.ak, habitExtras: patch((s.ak?.habitExtras as object | null) ?? {version: 1}, ids)}};
};
const zigi = (q: string, s: ToolSources = showcaseAll()) => av2HabitsAnswer(q, zigiEnv(s));
const closedHabits = (env: ToolEnv): ToolEnv => ({...env, areas: {...env.areas, habits: false}});

describe('habit options', () => {
  test('every corpus phrasing is answered (EN and NL), never with what it must not say', () => {
    for (const intent of AV2_HABITS) for (const q of [...intent.en, ...intent.nl]) {
      const t = text(zigi(q));
      expect(t, q).not.toBe('');
      for (const bad of intent.never ?? []) expect(t, q).not.toContain(bad);
    }
  });
  test('with nothing set, each answer teaches where the option is', () => {
    expect(text(zigi('which habits have no schedule'))).toContain('No habit is set to Whenever');
    expect(text(zigi('welke gewoontes hebben geen vaste dagen'))).toContain('Geen gewoonte staat op Whenever');
    expect(text(zigi('which habits have never miss twice on'))).toContain('Details → Habit options → “Never miss twice”');
    expect(text(zigi('how much xp does a hard habit give'))).toContain('Hard 20');
  });
  test('the chosen options are named, per habit', () => {
    const s = withOptions((x, ids) => withHabitOptions(withHabitOptions(withHabitOptions(x, ids[0]!, {whenever: true}), ids[1]!, {twoDay: true, difficulty: 'hard'}), ids[2]!, {unloggedSkip: true}));
    const [a, b, c] = s.habits!.habits;
    expect(text(zigi('which habits have no schedule', s))).toContain(a!.title);
    expect(text(zigi('welke gewoontes hebben geen schema', s))).toMatch(/1 gewoonte heeft geen vaste dagen/);
    expect(text(zigi('which habits keep my streak through a missed day', s))).toContain(b!.title);
    expect(text(zigi('bij welke gewoontes staat nooit twee keer missen aan', s))).toContain(`Nooit twee keer missen staat aan voor ${b!.title}`);
    expect(text(zigi('which habits count an unlogged day as skipped', s))).toContain(c!.title);
    expect(text(zigi('what difficulty are my habits', s))).toContain(`${b!.title} hard (20 XP)`);
    expect(text(zigi('hoeveel xp geeft een zware gewoonte', s))).toContain(`${b!.title} zwaar (20 XP)`);
    expect(text(zigi(`what are the options of my habit ${b!.title.toLowerCase()}`, s))).toContain('never miss twice and Hard (20 XP a done day)');
  });
  test('the Habits switch off: the tools\' refusal; other questions are left to the rest', () => {
    const r = av2HabitsAnswer('which habits have no schedule', closedHabits(zigiEnv(showcaseAll())));
    expect(r?.kind).toBe('refusal');
    expect(av2HabitsAnswer('how much xp did I earn this week', zigiEnv(showcaseAll()))).toBeNull();
    expect(av2HabitsAnswer('which habits are due today', zigiEnv(showcaseAll()))).toBeNull();
    expect(av2HabitsAnswer('which habits have no schedule and log one', zigiEnv(showcaseAll()))).toBeNull();
    expect(text(av2HabitsAnswer('which habits have no schedule', novaEnv(showcaseAll())))).toContain('Whenever');
  });
});
