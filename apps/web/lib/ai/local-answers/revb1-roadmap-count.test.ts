import {describe, expect, test} from 'vitest';
import {av2RoadmapAnswer} from './av2-roadmap';
import {localAnswer, type LocalReply} from './engine';
import {freshAll, showcaseAll, zigiEnv} from '../evals/as/harness';

/**
 * Session AV lane 2 (review b1 #17): "how many photos are on my tasks" with no count at hand (the engine does not read
 * the task attachment store) says it cannot count them here and where to see them — never only how to add one. With a
 * count (when the lead passes one) the count stands, as before.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
describe('counting the photos and voice notes on tasks', () => {
  test('no count at hand: says so, in English and Dutch, through the engine', () => {
    expect(text(localAnswer('how many photos are on my tasks', zigiEnv(showcaseAll())))).toMatch(/^I can’t count them from here: a task’s photos and voice notes stay in this browser’s own store, which I don’t read\. Open a task/);
    expect(text(localAnswer('hoeveel foto’s staan er bij mijn taken', zigiEnv(showcaseAll())))).toMatch(/^Ik kan ze hier niet tellen: /);
  });
  test('a "can I" question is still how-to; a count passed in is still said', () => {
    expect(text(av2RoadmapAnswer('can I add a photo to a task', zigiEnv(freshAll())))).toMatch(/^Open a task and use Photos and voice notes/);
    expect(text(av2RoadmapAnswer('how many photos are on my tasks', zigiEnv(freshAll()), {attachments: {photos: 3, voice: 1, tasks: 2}}))).toMatch(/^3 photos and 1 voice note on 2 tasks, in this browser\./);
  });
});
