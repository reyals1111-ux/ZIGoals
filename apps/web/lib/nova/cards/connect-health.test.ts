import {describe, expect, it} from 'vitest';
import {addLocalDays} from '../../local-date';
import {emptyMoodTags, moodTagsSchema} from '../../mood-tags/schema';
import {goodDayTags} from '../../mood-tags/tags';
import {emptySymptoms} from '../../symptoms/schema';
import {addItem, itemCounts, setLevel} from '../../symptoms/symptoms';
import {emptyWorkouts} from '../../workouts/schema';
import {showcaseWorkouts} from '../../workouts/showcase';
import {emptySplits, splitsRecordSchema} from '../../workouts/splits-schema';
import {moodTagsCard, moodTagsRows, runSplitsCard, runSplitsRows, symptomsCard, symptomsRows} from './health-insights';

/**
 * Session AM-2 (step 3, "NOVA connected"): the three Health widgets of what Session AP added. Their records are
 * health-type: the widgets exist only under the Health gate (lib/nova/stage/am-security.test.ts pins that); here the
 * figures are checked against the Health page's own engines. Unknown is never "none"; counts, never causes.
 */
const DAY = '2026-11-11';

describe('run splits: the latest run with a pace from an imported file', () => {
  const workouts = showcaseWorkouts(DAY); // fictional: an easy run two days ago (showcase-workout-2) and one nine days ago (showcase-workout-9)
  const splits = splitsRecordSchema.parse({version: 1, workouts: {
    'showcase-workout-2': {source: 'gpx', paceSecondsPerKm: 340, splits: [{km: 1, meters: 1000, seconds: 350}, {km: 2, meters: 1000, seconds: 330}, {km: 3, meters: 1000, seconds: 345}, {km: 4, meters: 400, seconds: 132}]},
    'showcase-workout-9': {source: 'tcx', paceSecondsPerKm: 336, splits: []},
    'not-on-this-device': {source: 'gpx', paceSecondsPerKm: 300, splits: []},
  }});
  it('the newest run leads: its pace, each kilometre, the fastest and slowest whole kilometre', () => {
    const c = runSplitsCard(workouts, splits, DAY), run = c.run!;
    expect([c.state, c.runs, run.id, run.name, run.paceText, run.distanceText]).toEqual(['live', 2, 'showcase-workout-2', 'Easy run', '5:40 /km', '3.4 km']);
    expect(run.splits.map(s => [s.km, s.paceText, s.short])).toEqual([[1, '5:50 /km', false], [2, '5:30 /km', false], [3, '5:45 /km', false], [4, '5:30 /km', true]]);
    expect([run.fastest?.km, run.slowest?.km]).toEqual([2, 1]); // the short last split is never the fastest
    expect(run.splits[1]!.speed).toBeCloseTo(3600 / 330);
    expect(c.earlier).toEqual([expect.objectContaining({id: 'showcase-workout-9', paceText: '5:36 /km'})]);
    expect(runSplitsRows(c)[0]).toEqual([`Easy run, ${run.dateText}`, 'Average pace 5:40 /km over 3.4 km']);
  });
  it('a run without kept splits says its pace only, never a distance of zero', () => {
    const c = runSplitsCard(workouts, splitsRecordSchema.parse({version: 1, workouts: {'showcase-workout-9': {source: 'tcx', paceSecondsPerKm: 336, splits: []}}}), DAY);
    expect([c.run!.meters, c.run!.distanceText, c.run!.fastest]).toEqual([null, null, null]);
    expect(runSplitsRows(c)[0]![1]).toBe('Average pace 5:36 /km');
  });
  it('no run with a pace teaches; a workout after the day is not read', () => {
    expect(runSplitsCard(workouts, emptySplits(), DAY)).toEqual({state: 'empty', run: null, earlier: [], runs: 0});
    expect(runSplitsCard(emptyWorkouts(), splits, DAY).state).toBe('empty');
    expect(runSplitsCard(workouts, splits, addLocalDays(DAY, -5)).run?.id).toBe('showcase-workout-9');
  });
});

describe('mood tags: what goes with your good days, as counts', () => {
  const days = Array.from({length: 14}, (_, i) => addLocalDays(DAY, -i));
  // Walks on six days, five of them Good or Great; of the other eight days with a mood, two were.
  const moods = Object.fromEntries(days.map((d, i) => [d, {mood: i < 5 ? 4 : i === 6 || i === 7 ? 5 : 2}]));
  const tags = moodTagsSchema.parse({version: 1, entries: {...Object.fromEntries(days.slice(0, 6).map(d => [d, ['walk']])), [days[9]!]: ['late screen']}});
  it('a finding is the Health page’s own: the counts, the share and "Goes with, not a cause."', () => {
    const c = moodTagsCard(moods, tags, DAY), page = goodDayTags(moods, tags, DAY);
    expect([c.state, c.tags, c.moodDays, c.note]).toEqual(['live', 2, 14, 'Goes with, not a cause.']);
    expect(c.rows).toEqual([{tag: 'walk', days: 6, good: 5, share: 5 / 6, otherDays: 8, otherGood: 2, sentence: page.ready[0]!.sentence}]);
    expect(c.pending).toEqual([{tag: 'late screen', days: 1, need: 5}]);
    expect(moodTagsRows(c).at(-1)![1]).toMatch(/^Goes with, not a cause\./);
    expect(JSON.stringify(c)).not.toMatch(/because|causes|makes you/i);
  });
  it('too few days is "waiting", never a finding; no tag teaches; a tag on a day without a mood does not count', () => {
    const few = moodTagsCard(moods, moodTagsSchema.parse({version: 1, entries: {[days[0]!]: ['walk']}}), DAY);
    expect([few.state, few.rows, few.pending]).toEqual(['waiting', [], [{tag: 'walk', days: 1, need: 5}]]);
    expect(moodTagsCard(moods, emptyMoodTags(), DAY).state).toBe('empty');
    expect(moodTagsCard({}, tags, DAY)).toMatchObject({state: 'empty', tags: 0, moodDays: 0});
  });
});

describe('symptoms: the days answered, never a guess for the days that were not', () => {
  const at = '2026-11-01T08:00:00.000Z';
  function record() {
    let r = addItem(addItem(addItem(emptySymptoms(), 'Headache', 'symptom', at), 'Pollen', 'factor', at), 'Stiff back', 'symptom', at);
    for (const [offset, level] of [[0, 3], [-1, 1], [-2, 0], [-3, 0], [-40, 3]] as const) r = setLevel(r, addLocalDays(DAY, offset), 'headache', level);
    return setLevel(r, addLocalDays(DAY, -1), 'pollen', 2);
  }
  it('the Health page’s own counts over 30 days; an item with no answer is unknown, not "none"', () => {
    const r = record(), c = symptomsCard(r, DAY), page = itemCounts(r, DAY);
    expect([c.state, c.days, c.answeredDays, c.lastDay]).toEqual(['live', 30, 4, DAY]);
    expect(c.rows.map(x => [x.name, x.kind, x.answered, x.noted, x.strong, x.share])).toEqual([['Headache', 'symptom', 4, 2, 1, 0.5], ['Pollen', 'factor', 1, 1, 0, 1], ['Stiff back', 'symptom', 0, 0, 0, null]]);
    expect(c.rows.map(x => [x.answered, x.noted, x.strong]).sort()).toEqual(page.map(x => [x.answered, x.noted, x.strong]).sort());
    expect(c.rows[0]!.words).toBe('there on 2 of 4 days answered, strong on 1');
    expect(c.rows[2]!.words).toBe('no answer in this range');
    expect(c.mostNoted?.name).toBe('Headache');
    expect(symptomsRows(c, 2).map(x => x[0])).toEqual(['Days answered in the last 30', 'Headache (symptom)', 'Pollen (factor)', 'More', 'How to read this']);
  });
  it('nothing followed teaches; items with no answer yet have nothing "most noted"', () => {
    expect(symptomsCard(emptySymptoms(), DAY)).toMatchObject({state: 'empty', rows: [], mostNoted: null});
    const c = symptomsCard(addItem(emptySymptoms(), 'Headache', 'symptom', at), DAY);
    expect([c.state, c.answeredDays, c.lastDay, c.mostNoted]).toEqual(['live', 0, null, null]);
  });
});
