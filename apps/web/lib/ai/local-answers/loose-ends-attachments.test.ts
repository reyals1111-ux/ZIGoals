import {afterEach, describe, expect, test, vi} from 'vitest';
import {localAnswer, type LocalReply} from './engine';
import {novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {TASK_ATTACHMENTS_CHANGE, attachmentCounts} from '../../tasks/attachments';

/**
 * Session AV lane 2 (loose ends; review b1 #17): "how many photos are on my tasks" says the count. The app reads the
 * counts from the attachment store before the question (components/ai/use-ai-context.ts) and puts them on the tool
 * sources (`taskAttachments`); the engine passes them to the roadmap answer. Through the engine, ZIGi's and NOVA's
 * environments, in English and Dutch.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const withCounts = (counts: {photos: number; voice: number; tasks: number} | null) => ({...showcaseAll(), taskAttachments: counts});
afterEach(() => vi.restoreAllMocks());

describe('the tasks’ photos and voice notes, counted', () => {
  test('a count read before the question is said, in English and Dutch, by ZIGi and NOVA', () => {
    const counts = {photos: 3, voice: 1, tasks: 2};
    expect(text(localAnswer('how many photos are on my tasks', zigiEnv(withCounts(counts))))).toMatch(/^3 photos and 1 voice note on 2 tasks, in this browser\. Open a task/);
    expect(text(localAnswer('how many photos are on my tasks', novaEnv(withCounts(counts))))).toMatch(/^3 photos and 1 voice note on 2 tasks, in this browser\./);
    expect(text(localAnswer('hoeveel foto’s staan er bij mijn taken', zigiEnv(withCounts(counts))))).toMatch(/^3 foto's en 1 spraakmemo bij 2 taken, in deze browser\. Open een taak/);
    expect(text(localAnswer('how many voice notes are on my tasks', zigiEnv(withCounts({photos: 1, voice: 0, tasks: 1}))))).toMatch(/^1 photo and 0 voice notes on 1 task, in this browser\./);
  });
  test('a count read and empty says none; a count not read says it cannot count (as review b1 #17 left it)', () => {
    expect(text(localAnswer('how many photos are on my tasks', zigiEnv(withCounts({photos: 0, voice: 0, tasks: 0}))))).toMatch(/^No photo or voice note is on your tasks in this browser yet\. Open a task/);
    expect(text(localAnswer('hoeveel foto’s staan er bij mijn taken', zigiEnv(withCounts({photos: 0, voice: 0, tasks: 0}))))).toMatch(/^Er staat in deze browser nog geen foto of spraakmemo bij je taken\. Open een taak/);
    expect(text(localAnswer('how many photos are on my tasks', zigiEnv(withCounts(null))))).toMatch(/^I can’t count them from here: /);
    expect(text(localAnswer('how many photos are on my tasks', zigiEnv(showcaseAll())))).toMatch(/^I can’t count them from here: /);
    // A how-to question stays how-to, with or without a count.
    expect(text(localAnswer('can I add a photo to a task', zigiEnv(withCounts({photos: 0, voice: 0, tasks: 0}))))).toMatch(/^Open a task and use Photos and voice notes/);
  });
  test('the count: photos and voice notes apart, the tasks that carry them; an orphan (its task removed) is not counted', () => {
    expect(attachmentCounts([])).toEqual({photos: 0, voice: 0, tasks: 0});
    expect(attachmentCounts([{taskId: 'a', kind: 'photo'}, {taskId: 'a', kind: 'voice'}, {taskId: 'b', kind: 'photo'}, {taskId: 'c', kind: 'photo', orphanSince: '2026-11-01T10:00:00.000Z'}])).toEqual({photos: 2, voice: 1, tasks: 2});
    expect(TASK_ATTACHMENTS_CHANGE).toBe('zigoals:task-attachments-change');
  });
});
