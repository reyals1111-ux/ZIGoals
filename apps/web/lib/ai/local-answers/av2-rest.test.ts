import {describe, expect, test} from 'vitest';
import {freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_REST} from '../evals/as/cases-av2-rest';
import {av2RestAnswer} from './av2-rest';
import {av2TasksAnswer} from './av2-tasks';
import type {LocalReply} from './engine';
import {addRepeat, pauseRepeat} from '../../tasks/repeat-projects';
import {BUILT_IN_TEMPLATES, emptyTaskTemplates} from '../../tasks/templates';

/** Session AV lane 2 (rest): the on-device answers to the last remainders, English and Dutch, NOVA and ZIGi. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const reset = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-reset')!;
// The corpus's day is Tuesday 17 November 2026: a weekly repeat from Monday 16 November comes round next on the 23rd.
const templates = pauseRepeat(addRepeat(addRepeat(emptyTaskTemplates(), {name: 'Weekly reset', every: 'week', start: '2026-11-16', items: reset.items}, {id: 'r1', madeFor: '2026-11-16'}),
  {name: 'Fictional garden', every: 'days', days: 10, start: '2026-11-01', items: reset.items}, {id: 'r2'}), 'r2', true);

describe('every corpus question gets an answer of its own, in its language', () => {
  test.each(AV2_REST.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]))('%s: %s', (_id, q, lang) => {
    for (const env of [novaEnv(showcaseAll()), zigiEnv(freshAll())]) {
      const r = av2RestAnswer(q, env);
      expect(r).not.toBeNull();
      const t = text(r);
      expect(t.length).toBeGreaterThan(20);
      if (lang === 'nl') expect(t).not.toMatch(/\b(?:the|your|of)\b/);
    }
    // Tasks' own answers leave these questions to this file.
    expect(av2TasksAnswer(q, novaEnv(showcaseAll()))).toBeNull();
  });
});

describe('answers read the features', () => {
  test('repeating projects: how often, when next, paused (EN and NL)', () => {
    const en = text(av2RestAnswer('which projects repeat', zigiEnv(showcaseAll()), {templates}));
    expect(en).toMatch(/^2 projects repeat:\n• Weekly reset: every week, next .*23.*\n• Fictional garden: every 10 days \(paused\)$/);
    const nl = text(av2RestAnswer('welke projecten herhalen zich', zigiEnv(showcaseAll()), {templates}));
    expect(nl).toMatch(/^2 projecten herhalen zich:\n• Weekly reset: elke week, volgende .*23.*\n• Fictional garden: elke 10 dagen \(gepauzeerd\)$/);
    expect(text(av2RestAnswer('what are my repeating projects', zigiEnv(freshAll())))).toMatch(/^No project repeats yet/);
    expect(text(av2RestAnswer('wat zijn mijn terugkerende projecten', zigiEnv(freshAll())))).toMatch(/^Er herhaalt zich nog geen project/);
  });
  test('Today off: the switch is named', () => {
    const env = zigiEnv(showcaseAll());
    expect(av2RestAnswer('which projects repeat', {...env, areas: {...env.areas, today: false}}, {templates})?.kind).toBe('refusal');
  });
  test('not a question, or another subject: no answer', () => {
    expect(av2RestAnswer('make a repeating project', zigiEnv(showcaseAll()))).toBeNull();
    expect(av2RestAnswer('which habits repeat', zigiEnv(showcaseAll()))).toBeNull();
  });
});
