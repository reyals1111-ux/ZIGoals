import {describe, expect, test} from 'vitest';
import type {Handle} from '../handles';
import {parseReply} from './parse';
import {reviseEdits} from './revise';

const H = (handle: string, kind: Handle['kind'], label: string): Handle => ({handle, kind, id: `id-${handle}`, label});
const block = (json: string) => `\`\`\`zigoals-action\n${json}\n\`\`\``;
const HANDLES = [H('h1', 'habit', 'Exercise'), H('h2', 'habit', 'Meditate'), H('g1', 'goal', 'Emergency fund')];
const PREV_HABIT = `Here is the habit.\n\n${block('{"kind":"create-habit","title":"Stretch","type":"build","measurement":"minutes","target":10,"schedule":"daily","timeOfDay":"morning"}')}`;
const PREV_GOAL = `Here is the goal.\n\n${block('{"kind":"create-goal","name":"New laptop","type":"VALUE","target":1200,"currency":"EUR","targetDate":"2027-06-30"}')}`;
const PREV_NOTE = `Added.\n\n${block('{"kind":"add-goal-note","goal":"g1","note":"reviewed the budget"}')}`;

describe('reviseEdits (ADR-017 S74): a correction of a card that was only proposed', () => {
  test('an edit-habit for an invented handle after a proposed create-habit becomes that habit again, corrected, with revise', () => {
    const out = reviseEdits(`Updated.\n\n${block('{"kind":"edit-habit","habit":"h7","target":15}')}`, PREV_HABIT, HANDLES), parsed = parseReply(out);
    expect(parsed.revise).toBe(true);
    expect(parsed.proposals).toHaveLength(1);
    expect(parsed.proposals[0]).toMatchObject({kind: 'create-habit', title: 'Stretch', measurement: 'minutes', target: 15, schedule: 'daily', timeOfDay: 'morning'});
    expect(parsed.rejected).toEqual([]);
    expect(parsed.text).toBe('Updated.');
  });
  test('a changed title and a changed time win over the proposal; the kind alias is read', () => {
    const out = reviseEdits(block('{"kind":"update_habit","habit":"habit-42","title":"Morning stretch","timeOfDay":"evening"}'), PREV_HABIT, HANDLES), parsed = parseReply(out);
    expect(parsed.revise).toBe(true);
    expect(parsed.proposals[0]).toMatchObject({kind: 'create-habit', title: 'Morning stretch', target: 10, timeOfDay: 'evening'});
  });
  test('an edit of a habit the context lists stays as it came, byte for byte', () => {
    const reply = `Changed.\n\n${block('{"kind":"edit-habit","habit":"h1","target":15}')}`;
    expect(reviseEdits(reply, PREV_HABIT, HANDLES)).toBe(reply);
    expect(reviseEdits(`${block('{"kind":"edit-habit","habit":"Exercise","target":15}')}`, PREV_HABIT, HANDLES)).toBe(block('{"kind":"edit-habit","habit":"Exercise","target":15}'));
  });
  test('when the proposed habit was accepted meanwhile, the edit keeps its kind and takes the record\'s handle', () => {
    const out = reviseEdits(block('{"kind":"edit-habit","habit":"h9","target":15}'), PREV_HABIT, [...HANDLES, H('h7', 'habit', 'Stretch')]), parsed = parseReply(out);
    expect(parsed.revise).toBeUndefined();
    expect(parsed.proposals).toEqual([{kind: 'edit-habit', habit: 'h7', target: 15}]);
  });
  test('an edit-goal after a proposed create-goal becomes the goal again; "targetDate": null drops the date', () => {
    const out = reviseEdits(block('{"kind":"edit-goal","goal":"g4","target":1500,"targetDate":null}'), PREV_GOAL, HANDLES), parsed = parseReply(out);
    expect(parsed.revise).toBe(true);
    expect(parsed.proposals).toHaveLength(1);
    expect(parsed.proposals[0]).toMatchObject({kind: 'create-goal', name: 'New laptop', target: 1500, currency: 'EUR'});
    expect((parsed.proposals[0] as {targetDate?: string}).targetDate).toBeUndefined();
  });
  test('an edit-goal of a listed goal stays an edit even after a proposed goal', () => {
    const reply = block('{"kind":"edit-goal","goal":"g1","target":1500}');
    expect(reviseEdits(reply, PREV_GOAL, HANDLES)).toBe(reply);
  });
  test('an edit-goal that changes only the notes of the goal whose note was proposed becomes that note again', () => {
    const out = reviseEdits(`Sure.\n\n${block('{"kind":"edit-goal","goal":"g1","notes":"budget reviewed on Sunday"}')}`, PREV_NOTE, HANDLES), parsed = parseReply(out);
    expect(parsed.revise).toBe(true);
    expect(parsed.proposals).toEqual([{kind: 'add-goal-note', goal: 'g1', note: 'budget reviewed on Sunday'}]);
    const byTitle = parseReply(reviseEdits(block('{"kind":"edit-goal","goal":"Emergency fund","notes":"budget reviewed on Sunday"}'), PREV_NOTE, HANDLES));
    expect(byTitle.proposals).toEqual([{kind: 'add-goal-note', goal: 'g1', note: 'budget reviewed on Sunday'}]);
  });
  test('an edit-goal with more than the notes, or of another goal, is not a note', () => {
    const two = block('{"kind":"edit-goal","goal":"g1","name":"Rainy day fund","notes":"budget reviewed on Sunday"}');
    expect(reviseEdits(two, PREV_NOTE, HANDLES)).toBe(two);
    const other = block('{"kind":"edit-goal","goal":"g2","notes":"budget reviewed on Sunday"}');
    expect(reviseEdits(other, PREV_NOTE, [...HANDLES, H('g2', 'goal', 'Lisbon')])).toBe(other);
  });
  test('nothing to revise: no previous reply, a previous reply without such a proposal, or a reply without an edit', () => {
    const edit = block('{"kind":"edit-habit","habit":"h7","target":15}');
    expect(reviseEdits(edit, null, HANDLES)).toBe(edit);
    expect(reviseEdits(edit, `Logged.\n\n${block('{"kind":"log-water","glasses":2}')}`, HANDLES)).toBe(edit);
    const water = `Logged.\n\n${block('{"kind":"log-water","glasses":3}')}`;
    expect(reviseEdits(water, PREV_HABIT, HANDLES)).toBe(water);
  });
  test('the prose and the other blocks of the reply stay; the revise flag sits on the first item', () => {
    const out = reviseEdits(`Sure, and the water too.\n\n${block('[{"kind":"edit-habit","habit":"h7","target":15},{"kind":"log-water","glasses":2}]')}\n\nAnything else?`, PREV_HABIT, HANDLES), parsed = parseReply(out);
    expect(parsed.revise).toBe(true);
    expect(parsed.proposals.map(p => p.kind)).toEqual(['create-habit', 'log-water']);
    expect(parsed.text).toBe('Sure, and the water too.\n\nAnything else?');
  });
  test('a block that is not JSON is left alone', () => {
    const broken = `Hm.\n\n${block('{"kind":"edit-habit", nope')}`;
    expect(reviseEdits(broken, PREV_HABIT, HANDLES)).toBe(broken);
  });
});
