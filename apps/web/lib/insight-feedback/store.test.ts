import {describe, expect, it} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {periodNote} from '../insight-notes/notes';
import {emptyInsightFeedback, INSIGHT_FEEDBACK, INSIGHT_FEEDBACK_KEY, markInsight, MAX_INSIGHT_MARKS, notForMe, unmarkInsight} from './store';

const AT = '2026-11-01T09:00:00.000Z';
const mem = (raw: string | null) => ({getItem: (k: string) => k === INSIGHT_FEEDBACK_KEY ? raw : null});
const week = {period: 'week' as const, days: 7, counts: {habitCheckIns: 9, healthDays: 5, contributions: 1}, trends: [{label: 'Steps a day', now: '7,900', before: '7,100'}], streak: {title: 'Read', streak: 12, unit: 'days'}, pairing: 'on days with a walk, sleep was logged longer.'};

describe('insight feedback (BUILD list 2 #21)', () => {
  it('keeps at most 200 marks, the newest, and drops an unreadable mark, never the record', () => {
    let r = emptyInsightFeedback();
    for (let i = 0; i < MAX_INSIGHT_MARKS + 25; i++) r = markInsight(r, i % 2 ? 'trend' : 'pairing', 'useful', AT);
    expect(r.marks).toHaveLength(MAX_INSIGHT_MARKS);
    const read = readDeviceRecord(mem(JSON.stringify({version: 1, marks: [{kind: 'pairing', verdict: 'not-for-me', at: AT}, {kind: 'mood', verdict: 'useful', at: AT}], later: true})), INSIGHT_FEEDBACK);
    expect(read.unreadable).toBe(false);
    expect(read.data.marks).toEqual([{kind: 'pairing', verdict: 'not-for-me', at: AT}]);
  });
  it('the latest mark of a kind decides; Undo takes back the newest mark of that kind', () => {
    let r = markInsight(emptyInsightFeedback(), 'pairing', 'not-for-me', AT);
    expect([...notForMe(r)]).toEqual(['pairing']);
    r = markInsight(r, 'pairing', 'useful', AT);
    expect([...notForMe(r)]).toEqual([]);
    r = unmarkInsight(r, 'pairing');
    expect([...notForMe(r)]).toEqual(['pairing']);
  });
  it('the ordering effect: a kind marked "Not for me" leaves the note; the next kind leads instead', () => {
    const plain = periodNote(week);
    expect(plain.lead).toBe('pairing');
    expect(plain.lines.at(-1)).toMatch(/^Seen together, not a cause/);
    const noPairing = periodNote({...week, skip: notForMe(markInsight(emptyInsightFeedback(), 'pairing', 'not-for-me', AT))});
    expect(noPairing.lines.join(' ')).not.toMatch(/Seen together/);
    expect(noPairing.lead).toBe('streak');
    expect(noPairing.lines.at(-1)).toBe('Your longest running streak: Read, 12 days.');
    const onlyCounts = periodNote({...week, skip: new Set(['pairing', 'streak', 'trend'] as const)});
    expect(onlyCounts.lines).toEqual(['This week: 9 habit check-ins, Health records on 5 of 7 days and 1 goal contribution.']);
    expect(onlyCounts.lead).toBeUndefined();
  });
});
