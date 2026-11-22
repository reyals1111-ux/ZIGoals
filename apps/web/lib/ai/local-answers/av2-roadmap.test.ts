import {describe, expect, test} from 'vitest';
import {freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_ROADMAP} from '../evals/as/cases-av2-roadmap';
import {av2RoadmapAnswer} from './av2-roadmap';
import type {LocalReply} from './engine';
import {emptyChessComputer, recordComputerResult, saveComputerGame} from '../../chess/computer-record';

/** Session AV lane 2 (roadmap): the on-device answers to the roadmap builder's features, English and Dutch, NOVA and ZIGi. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const AT = '2026-11-17T09:00:00.000Z';
const played = recordComputerResult(recordComputerResult(recordComputerResult(emptyChessComputer(), 'easy', 'won'), 'easy', 'won'), 'hard', 'lost');
const waiting = saveComputerGame(played, {side: 'b', level: 'medium', moves: ['e2e4', 'c7c5', 'g1f3'], startedAt: AT});

describe('every corpus question gets an answer of its own, in its language', () => {
  test.each(AV2_ROADMAP.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]))('%s: %s', (_id, q, lang) => {
    for (const env of [novaEnv(showcaseAll()), zigiEnv(showcaseAll())]) {
      const r = av2RoadmapAnswer(q, env, {chess: waiting});
      expect(r).not.toBeNull();
      const t = text(r);
      expect(t.length).toBeGreaterThan(20);
      if (lang === 'nl') expect(t).not.toMatch(/\b(?:the|your|of|you)\b/);
    }
  });
});
describe('answers read the features', () => {
  test('results against the engine, by level', () => {
    expect(text(av2RoadmapAnswer('how many chess games have I won against the computer', zigiEnv(showcaseAll()), {chess: played}))).toBe('Against the computer: 2 won, 1 lost, 0 drawn.\n• Easy: 2 won, 0 lost, 0 drawn\n• Hard: 0 won, 1 lost, 0 drawn');
    expect(text(av2RoadmapAnswer('hoeveel schaakpartijen heb ik gewonnen tegen de computer', zigiEnv(showcaseAll()), {chess: played}))).toBe('Tegen de computer: 2 gewonnen, 1 verloren, 0 remise.\n• Easy: 2 gewonnen, 0 verloren, 0 remise\n• Hard: 0 gewonnen, 1 verloren, 0 remise');
    expect(text(av2RoadmapAnswer('what are my results against the chess engine', zigiEnv(freshAll())))).toContain('No finished games against the computer yet');
  });
  test('a game waiting to be continued', () => {
    expect(text(av2RoadmapAnswer('do I have a chess game in progress', zigiEnv(showcaseAll()), {chess: waiting}))).toBe('Yes: you play Black against Medium, 2 moves in. Continue it in Chess → Play.');
    expect(text(av2RoadmapAnswer('heb ik nog een schaakpartij open', zigiEnv(showcaseAll()), {chess: waiting}))).toBe('Ja: je speelt zwart tegen Medium, 2 zetten ver. Ga verder in Chess → Play.');
    expect(text(av2RoadmapAnswer('do I have a chess game in progress', zigiEnv(showcaseAll()), {chess: played}))).toContain('No game against the computer is waiting');
  });
  test('photos and voice notes on tasks: where they are, and how many when known', () => {
    expect(text(av2RoadmapAnswer('can I add a photo to a task', zigiEnv(freshAll())))).toMatch(/^Open a task and use Photos and voice notes/);
    expect(text(av2RoadmapAnswer('can I add a photo to a task', zigiEnv(freshAll()), {attachments: {photos: 3, voice: 1, tasks: 2}}))).toMatch(/^3 photos and 1 voice note on 2 tasks, in this browser\./);
    expect(text(av2RoadmapAnswer('kan ik een foto aan een taak toevoegen', zigiEnv(freshAll()), {attachments: {photos: 1, voice: 2, tasks: 1}}))).toMatch(/^1 foto en 2 spraakmemo's bij 1 taak, in deze browser\./);
  });
  test('the Today switch off refuses; other questions are left to the rest of the engine', () => {
    const env = zigiEnv(showcaseAll());
    expect(av2RoadmapAnswer('how many chess games have I won against the computer', {...env, areas: {...env.areas, today: false}}, {chess: played})!.kind).toBe('refusal');
    expect(av2RoadmapAnswer('can I add a photo to a task', {...env, areas: {...env.areas, today: false}})!.kind).toBe('refusal');
    expect(av2RoadmapAnswer('what is my chess rating', env)).toBeNull();
    expect(av2RoadmapAnswer('add a task to call the fictional bank', env)).toBeNull();
  });
});
