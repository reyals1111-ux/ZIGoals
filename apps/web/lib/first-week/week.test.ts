import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {TODAY_CARD_IDS, emptyTodayCards, shownCards, toggleCard} from '../today-cards/store';
import {wallClock} from '../zone-time';
import {ALREADY_ACTIVE_DAYS, DAY_SEVEN_LINE, STEPS, STEP_IDS, activeDaysBefore, celebrationId, firstWeekView, hideFirstWeek, lastDayOf, markStep, showFirstWeek, startFirstWeek} from './week';
import {emptyFirstWeek, firstWeekSchema} from './store';
import {showcaseFirstWeek} from './showcase';

const started = startFirstWeek(emptyFirstWeek(), '2026-10-26');

describe('Your first week (Session AK, BUILD list 2 #5)', () => {
  test('seven steps, each a link inside the app, one per day', () => {
    expect(STEPS.map(s => s.id)).toEqual([...STEP_IDS]);
    expect(STEPS).toHaveLength(7);
    for (const s of STEPS) expect(s.href.startsWith('/app/')).toBe(true);
  });
  test('not started: offered, unless the person already has a week of records', () => {
    expect(firstWeekView(emptyFirstWeek(), '2026-10-26')).toEqual({phase: 'not-started', alreadyActive: false});
    const dates = Array.from({length: ALREADY_ACTIVE_DAYS}, (_, i) => `2026-10-0${i + 1}`);
    expect(activeDaysBefore([...dates, ...dates, 'nonsense', '2026-10-26', '2026-10-27'], '2026-10-26')).toBe(ALREADY_ACTIVE_DAYS); // the same day counts once; today and later do not
    expect(firstWeekView(emptyFirstWeek(), '2026-10-26', {activeDays: ALREADY_ACTIVE_DAYS})).toEqual({phase: 'not-started', alreadyActive: true});
    expect(firstWeekView(emptyFirstWeek(), '2026-10-26', {activeDays: ALREADY_ACTIVE_DAYS - 1})).toEqual({phase: 'not-started', alreadyActive: false});
  });
  test('day boundaries: day 1 on the start, day 7 on the seventh day, ended on the eighth', () => {
    const v1 = firstWeekView(started, '2026-10-26');
    expect(v1.phase === 'active' && [v1.day, v1.today?.id, v1.lastDay]).toEqual([1, 'habit', false]);
    const v7 = firstWeekView(started, lastDayOf('2026-10-26'));
    expect(v7.phase === 'active' && [v7.day, v7.today?.id, v7.lastDay]).toEqual([7, 'review', true]);
    expect(firstWeekView(started, '2026-11-02')).toEqual({phase: 'ended', doneCount: 0});
    // Across the clock change (25 Oct in Europe): calendar keys, so still seven days.
    expect(lastDayOf('2026-10-24')).toBe('2026-10-30');
  });
  test('the day follows the journal zone\'s calendar day: one instant, two zones, two day numbers', () => {
    const instant = Date.parse('2026-10-26T23:30:00Z');
    const amsterdam = wallClock(instant, 'Europe/Amsterdam').date, newYork = wallClock(instant, 'America/New_York').date;
    expect([amsterdam, newYork]).toEqual(['2026-10-27', '2026-10-26']);
    const a = firstWeekView(started, amsterdam), n = firstWeekView(started, newYork);
    expect(a.phase === 'active' && a.day).toBe(2); expect(n.phase === 'active' && n.day).toBe(1);
    // A zone moved back across midnight (today before the start) reads as day 1, never day 0.
    const back = firstWeekView(started, '2026-10-25');
    expect(back.phase === 'active' && back.day).toBe(1);
  });
  test('any order: a done step makes way for the first one still open; detected steps count; all done leaves no suggestion', () => {
    let s = markStep(started, 'log', '2026-10-26');
    let v = firstWeekView(s, '2026-10-27');
    expect(v.phase === 'active' && [v.today?.id, v.doneCount]).toEqual(['habit', 1]); // day 2's own step (log) is done
    v = firstWeekView(s, '2026-10-27', {detected: {habit: '2026-10-26'}});
    expect(v.phase === 'active' && [v.today?.id, v.doneCount]).toEqual(['goal', 2]);
    // A detection from before the start does not count.
    v = firstWeekView(s, '2026-10-27', {detected: {habit: '2026-10-01'}});
    expect(v.phase === 'active' && v.done.has('habit')).toBe(false);
    for (const id of STEP_IDS) s = markStep(s, id, '2026-10-28');
    v = firstWeekView(s, '2026-10-28');
    expect(v.phase === 'active' && [v.today, v.doneCount]).toEqual([null, 7]);
    s = markStep(s, 'log', '2026-10-28', false);
    v = firstWeekView(s, '2026-10-28');
    expect(v.phase === 'active' && v.today?.id).toBe('log');
  });
  test('hide ends it; show brings it back; a restart begins again', () => {
    expect(firstWeekView(hideFirstWeek(started), '2026-10-27')).toEqual({phase: 'hidden'});
    expect(firstWeekView(showFirstWeek(hideFirstWeek(started)), '2026-10-27').phase).toBe('active');
    const again = startFirstWeek(markStep(started, 'habit', '2026-10-26'), '2026-11-10');
    expect(again.done).toEqual({}); expect(again.startedOn).toBe('2026-11-10');
  });
  test('no guilt words anywhere in the card\'s words', () => {
    for (const text of [DAY_SEVEN_LINE, ...STEPS.flatMap(s => [s.title, s.line, s.cta])]) expect(text).not.toMatch(/missed|behind|late|fail|should|overdue|don['’]t forget|streak|lazy|!/i);
  });
  test('the record: loose, versioned, bounded; the celebration id names the start', () => {
    expect(firstWeekSchema.safeParse({version: 1, future: true}).success).toBe(true);
    expect(firstWeekSchema.safeParse({version: 1, done: Object.fromEntries(Array.from({length: 17}, (_, i) => [`s${i}`, '2026-10-26']))}).success).toBe(false);
    expect(firstWeekSchema.safeParse({version: 1, startedOn: '26 Oct'}).success).toBe(false);
    expect(celebrationId('2026-10-26')).toBe('first-week:2026-10-26');
  });
  test('the Showcase example: day 4, three steps done, never stored', () => {
    const v = firstWeekView(showcaseFirstWeek('2026-10-31'), '2026-10-31');
    expect(v.phase === 'active' && [v.day, v.doneCount, v.today?.id]).toEqual([4, 3, 'checkin']);
  });
});

describe('registered as a Today card kept on this device', () => {
  test('the id `first-week`, off until chosen, the Daily orbit still last; the card loads lazily, never in the hero', () => {
    expect(TODAY_CARD_IDS).toContain('first-week');
    expect(TODAY_CARD_IDS.at(-1)).toBe('orbit');
    expect(shownCards(emptyTodayCards())).toEqual([]);
    expect(shownCards(toggleCard(emptyTodayCards(), 'first-week'))).toEqual(['first-week']);
    const cards = readFileSync(join(__dirname, '../../components/dashboard/today-device-cards.tsx'), 'utf8');
    expect(cards).toContain("const FirstWeekCard = lazy(() => import('../first-week/first-week-card'));");
    expect(cards).toMatch(/'first-week': \{label: 'Your first week'/);
    const hero = readFileSync(join(__dirname, '../../components/dashboard/today-dashboard.tsx'), 'utf8');
    expect(hero).not.toContain('first-week');
  });
});
