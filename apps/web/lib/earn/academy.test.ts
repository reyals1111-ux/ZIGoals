import {describe, expect, it} from 'vitest';
import {pathProblems, pathProgress} from '../path/model';
import {xpSummary, type GameStores} from '../game/xp';
import {ACADEMY_LESSONS, ACADEMY_LESSON_IDS, academyModel, academyProgress, lessonState, scoreQuiz} from './academy';
import {recordLesson, earnAcademySchema} from './records';
import {DECOY_ZIG_DENOM} from './options';

/**
 * Session AF chunk 2 (P1.27): the Earn Academy. Eight lessons, three questions each, every answer reachable and explained;
 * a pass is three right, recorded once; XP is derived by the game layer once per passed lesson (only while the game layer
 * is on: use-game derives nothing when it is off), never stored.
 */
const empty = {version: 1 as const};
const stores = (earnAcademy: GameStores['earnAcademy']): GameStores => ({habits: {version: 1, habits: []} as unknown as GameStores['habits'], health: {diary: [], weights: [], activity: []} as unknown as GameStores['health'], earnAcademy});

describe('the Earn Academy', () => {
  it('eight lessons in the path order, each with three questions of three answers, a right answer and a reason', () => {
    expect(ACADEMY_LESSONS.map(l => l.id)).toEqual([...ACADEMY_LESSON_IDS]);
    expect(ACADEMY_LESSON_IDS).toEqual(['staking', 'apr-apy', 'unbonding', 'liquid-staking', 'pools', 'custody', 'scams', 'fees']);
    for (const l of ACADEMY_LESSONS) {
      expect(l.quiz).toHaveLength(3);
      expect(l.body.length).toBeGreaterThanOrEqual(3);
      for (const q of l.quiz) { expect(q.options).toHaveLength(3); expect([0, 1, 2]).toContain(q.answer); expect(q.why.length).toBeGreaterThan(10); expect(new Set(q.options).size).toBe(3); }
    }
    // The right answer is not always in the same place.
    expect(new Set(ACADEMY_LESSONS.flatMap(l => l.quiz.map(q => q.answer)))).toEqual(new Set([0, 1, 2]));
  });
  it('plain, neutral words: no promise of returns, no recommendation, the decoy denom in full, custody told through Zignaly’s closure', () => {
    const all = ACADEMY_LESSONS.flatMap(l => [l.title, ...l.body, ...l.quiz.flatMap(q => [q.q, ...q.options, q.why])]).join(' ');
    expect(all).not.toMatch(/partners?\b|guaranteed return|we recommend|you should/i);
    expect(ACADEMY_LESSONS.find(l => l.id === 'scams')!.body.join(' ')).toContain(DECOY_ZIG_DENOM);
    const custody = ACADEMY_LESSONS.find(l => l.id === 'custody')!.body.join(' ');
    expect(custody).toContain('Zignaly');
    expect(custody).toMatch(/1 December 2026/);
    expect(custody).toMatch(/as its own notice states it/);
  });
  it('scores answers; unanswered is wrong; three right passes once, and later tries keep the first pass', () => {
    const lesson = ACADEMY_LESSONS[0]!, right = lesson.quiz.map(q => q.answer);
    expect(scoreQuiz(lesson, right)).toBe(3);
    expect(scoreQuiz(lesson, [right[0]!, null, right[2]!])).toBe(2);
    expect(scoreQuiz(lesson, [null, null, null])).toBe(0);
    let r = recordLesson(empty, 'staking', {read: true}, '2026-10-19T08:00:00.000Z');
    expect(lessonState(r, 'staking')).toEqual({passed: false, read: true, best: undefined});
    r = recordLesson(r, 'staking', {score: 2}, '2026-10-19T08:01:00.000Z');
    expect(lessonState(r, 'staking')).toEqual({passed: false, read: true, best: 2});
    r = recordLesson(r, 'staking', {score: 3}, '2026-10-19T08:02:00.000Z');
    r = recordLesson(r, 'staking', {score: 1}, '2026-10-20T08:00:00.000Z');
    expect(r.lessons!.staking).toMatchObject({passedAt: '2026-10-19T08:02:00.000Z', attempts: 3});
    expect(lessonState(r, 'staking').passed).toBe(true);
    expect(earnAcademySchema.safeParse(r).success).toBe(true);
    expect(academyProgress(r)).toEqual({passed: 1, total: 8});
  });
  it('the mini path: two orbits of four, a read lesson half lit, a passed one done', () => {
    const r = recordLesson(recordLesson(empty, 'staking', {score: 3}), 'pools', {read: true});
    const model = academyModel(r);
    expect(pathProblems(model)).toEqual([]);
    expect(model.sections.map(s => s.steps.length)).toEqual([4, 4]);
    expect(pathProgress(model)).toEqual({done: 1, total: 8, fraction: 1 / 8});
    const pools = model.sections[1]!.steps[0]!;
    expect(pools).toMatchObject({id: 'lesson-pools', state: 'undone', partial: .5, note: 'Read'});
    expect(model.sections[0]!.steps[0]).toMatchObject({state: 'done', note: 'Passed'});
  });
  it('XP: 15 per passed lesson, once, on the day it was first passed; unknown lesson ids and scores without a pass earn nothing', () => {
    let r = recordLesson(empty, 'staking', {score: 3}, '2026-10-18T09:00:00.000Z');
    r = recordLesson(r, 'fees', {score: 3}, '2026-10-19T09:00:00.000Z');
    r = recordLesson(r, 'pools', {score: 2}, '2026-10-19T09:00:00.000Z');
    r = {...r, lessons: {...r.lessons, 'a-future-lesson': {passedAt: '2026-10-19T09:00:00.000Z', score: 3}}};
    const summary = xpSummary(stores(r), '2026-10-19');
    expect(summary.byKind.earn).toBe(30);
    expect(summary.events.filter(e => e.kind === 'earn').map(e => [e.id, e.day])).toEqual([['earn-lesson:staking', '2026-10-18'], ['earn-lesson:fees', '2026-10-19']]);
    expect(xpSummary(stores(null), '2026-10-19').byKind.earn).toBe(0);
    // A pass dated after "today" is not counted yet.
    expect(xpSummary(stores(r), '2026-10-18').byKind.earn).toBe(15);
  });
});
