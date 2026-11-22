import {describe, expect, test} from 'vitest';
import {collectEverything, DEVICE_KEYS} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {readWorkoutFile} from './import-file';
import {miniXmlParser} from './mini-xml';
import {emptyWorkoutHr, hrHistogram, setMaxHr, WORKOUT_HR_KEY, withHr, withoutHr, workoutHrSchema, zoneRanges, zoneSeconds, zoneMinutes} from './hr-zones';
import {emptyRaces, goalWords, raceResult, RACES_KEY, racesSchema, raceYear, readTime, removeRace, restoreRace, saveRace, timeText, weeksBetween, type RaceDraft} from './races';
import {emptyWorkouts, type Workouts} from './schema';

/** Session AV lane 2, round 4 (health; Runna, LEDGER #336, #337): heart-rate zones from your own maximum, races ahead. */
const NOW = '2026-11-20T09:00:00.000Z', TODAY = '2026-11-20';

describe('heart-rate zones (LEDGER #336)', () => {
  test('the seconds at each heart rate from the points, a pause counted at most 30 s', () => {
    const t0 = Date.parse('2026-11-19T07:00:00Z');
    const seg = [{t: t0, hr: 120}, {t: t0 + 10_000, hr: 150}, {t: t0 + 20_000, hr: 150}, {t: t0 + 300_000, hr: null}, {t: t0 + 310_000, hr: 170}];
    expect(hrHistogram([seg])).toEqual({from: 120, seconds: [10, ...Array(29).fill(0), 40]});
    expect(hrHistogram([[{t: t0, hr: null}, {t: t0 + 1000, hr: null}]])).toBeNull();
  });
  test('a GPX import keeps the histogram beside the average; never the route', () => {
    const pts = Array.from({length: 61}, (_, i) => `<trkpt lat="52.0" lon="${(4 + i * 0.0001).toFixed(4)}"><time>2026-11-19T07:${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}Z</time><extensions><hr>${i < 30 ? 130 : 160}</hr></extensions></trkpt>`).join('');
    const gpx = `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Fictional run</name><type>running</type><trkseg>${pts}</trkseg></trk></gpx>`;
    const [s] = readWorkoutFile(gpx, miniXmlParser);
    expect(s!.hrSeconds).toMatchObject({from: 130});
    expect(s!.hrSeconds!.seconds[0]).toBe(900);
    expect(s!.hrSeconds!.seconds.at(-1)).toBe(900);
    expect(JSON.stringify(s!.hrSeconds)).not.toContain('52.0');
  });
  test('five zones from the maximum the person types; below zone 1 counted apart', () => {
    expect(zoneRanges(190).map(z => [z.from, z.to])).toEqual([[95, 113], [114, 132], [133, 151], [152, 170], [171, 190]]);
    const h = {from: 90, seconds: Array.from({length: 101}, (_, i) => (i === 0 ? 60 : i === 40 ? 600 : i === 90 ? 120 : 0))}; // 90, 130 and 180 bpm
    const z = zoneSeconds(h, 190);
    expect(z.below).toBe(60);
    expect(z.zones.map(x => x.seconds)).toEqual([0, 600, 0, 0, 120]);
    expect(z.total).toBe(780);
    expect(zoneMinutes(600)).toBe('10 min'); expect(zoneMinutes(10)).toBe('under 1 min'); expect(zoneMinutes(0)).toBe('0 min');
  });
  test('the maximum is typed, 100–230, never worked out; blank removes it', () => {
    const r = setMaxHr(emptyWorkoutHr(), '186');
    expect(r.ok && r.value.maxHr).toBe(186);
    expect(setMaxHr(emptyWorkoutHr(), '260').ok).toBe(false);
    expect(setMaxHr(emptyWorkoutHr(), 'about 180').ok).toBe(false);
    expect(r.ok && setMaxHr(r.value, ' ').ok && (setMaxHr(r.value, ' ') as {value: {maxHr?: number}}).value.maxHr).toBeUndefined();
  });
  test('an unreadable run is dropped and the others kept; removed with its workout', () => {
    const h = {from: 120, seconds: [30, 40]}, rec = withHr(emptyWorkoutHr(), 'w-1', h);
    expect(workoutHrSchema.parse({...rec, runs: {...rec.runs, 'bad id': h, 'w-2': {from: 5, seconds: []}}, maxHr: 999})).toEqual({version: 1, runs: {'w-1': h}});
    expect(withoutHr(rec, 'w-1').runs).toEqual({});
  });
  const registered = Object.values(DEVICE_KEYS as Record<string, string>).includes(WORKOUT_HR_KEY);
  test.skipIf(!registered)('Export everything → erase → Restore keeps the zones', () => {
    const value = withHr({version: 1, maxHr: 186, runs: {}}, 'w-1', {from: 120, seconds: [30, 40]});
    const part = planParts(JSON.parse(JSON.stringify(collectEverything({[WORKOUT_HR_KEY]: JSON.stringify(value)}, {now: new Date(NOW), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null}).json))).find(p => p.kind === 'device' && p.key === WORKOUT_HR_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back ? back.value : undefined).toEqual(value);
  });
});

describe('races ahead (LEDGER #337)', () => {
  const draft = (over: Partial<RaceDraft>): RaceDraft => ({name: 'Fictional 10K', date: '2026-12-13', distanceKm: '10', goal: '48:30', priority: 'b', ...over});
  const run = (date: string, km: number, seconds: number): Workouts => ({...emptyWorkouts(), workouts: [{id: `run-${date}`, name: 'Race', date, type: 'cardio', startedAt: `${date}T09:00:00.000Z`, endedAt: new Date(Date.parse(`${date}T09:00:00.000Z`) + seconds * 1000).toISOString(), exercises: [{id: 'e1', exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: 's1', kind: 'normal', distanceKm: km, seconds, done: true}]}]}]} as unknown as Workouts);
  test('times read and written', () => {
    expect(readTime('1:55:00')).toBe(6900); expect(readTime('48:30')).toBe(2910); expect(readTime('fast')).toBeNull();
    expect(timeText(6900)).toBe('1:55:00'); expect(timeText(2910)).toBe('48:30');
    expect(goalWords(-170)).toBe('2:50 under your goal'); expect(goalWords(65)).toBe('1:05 over your goal'); expect(goalWords(0)).toBe('right on your goal');
  });
  test('saves, edits, says which field to fix, removes with Undo', () => {
    const r = saveRace(emptyRaces(), draft({}), 'race-1', NOW);
    expect(r.ok && r.race).toMatchObject({name: 'Fictional 10K', distanceKm: 10, goalSeconds: 2910, priority: 'b'});
    const issue = (d: Partial<RaceDraft>) => { const out = saveRace(emptyRaces(), draft(d), 'x', NOW); return out.ok ? null : out.issue.field; };
    expect(issue({name: ''})).toBe('name'); expect(issue({date: ''})).toBe('date'); expect(issue({distanceKm: '0'})).toBe('distance'); expect(issue({goal: 'soon'})).toBe('goal');
    if (!r.ok) throw new Error('fixture');
    const edited = saveRace(r.value, draft({goal: ''}), 'race-2', NOW, 'race-1');
    expect(edited.ok && edited.value.races).toHaveLength(1);
    expect(edited.ok && edited.race.goalSeconds).toBeUndefined();
    expect(restoreRace(removeRace(r.value, 'race-1'), r.race).races).toEqual(r.value.races);
  });
  test('the year in order with the weeks between, and the matching run as the result beside the goal', () => {
    let rec = emptyRaces();
    for (const [i, d] of [draft({name: 'Fictional half', date: '2027-03-21', distanceKm: '21.0975', goal: '1:55:00', priority: 'main'}), draft({}), draft({name: 'Fictional parkrun', date: '2026-11-14', distanceKm: '5', goal: '25:00'})].entries()) { const out = saveRace(rec, d, `race-${i}`, NOW); if (!out.ok) throw new Error(out.issue.message); rec = out.value; }
    const rows = raceYear(rec, run('2026-11-14', 5.1, 1440), TODAY);
    expect(rows.map(r => r.race.name)).toEqual(['Fictional parkrun', 'Fictional 10K', 'Fictional half']);
    expect(rows[0]).toMatchObject({past: true, result: {km: 5.1, seconds: 1440, vsGoal: -60}});
    expect(rows[1]).toMatchObject({weeksFromToday: 3, weeksAfterPrevious: 4, result: null});
    expect(rows[2]!.weeksAfterPrevious).toBe(weeksBetween('2026-12-13', '2027-03-21'));
    // 5.4 km is more than 5 % from 5 km: not the race's result.
    expect(raceResult(rows[0]!.race, run('2026-11-14', 5.4, 1500))).toBeNull();
    expect(racesSchema.parse({...rec, races: [...rec.races, {id: 'x'}]}).races).toHaveLength(3);
  });
  const registered = Object.values(DEVICE_KEYS as Record<string, string>).includes(RACES_KEY);
  test.skipIf(!registered)('Export everything → erase → Restore keeps the races', () => {
    const out = saveRace(emptyRaces(), draft({}), 'race-1', NOW); if (!out.ok) throw new Error('fixture');
    const part = planParts(JSON.parse(JSON.stringify(collectEverything({[RACES_KEY]: JSON.stringify(out.value)}, {now: new Date(NOW), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null}).json))).find(p => p.kind === 'device' && p.key === RACES_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back ? back.value : undefined).toEqual(out.value);
  });
});
