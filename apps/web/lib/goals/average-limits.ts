/**
 * Session AL (L4; DV-052a, P-DV-02, P-DVR-02; B-173, T-137): a "Keep an average" goal's target and each day's value are
 * read through the shared limits table, per measure: sleep at most 24 hours a night, steps at most 100,000 a day, water
 * at most 10,000 mL a day (the Health day cap), your own measure within the record's 1,000,000. A target must be above 0;
 * a day may be 0 (a day with no spending is a 0).
 */
import {LIMITS, validateValue} from '../limits/plausibility';
import {parseNumberInput} from '../numbers/parse';
import type {AverageMetric} from '../average-goals/store';

const say = (n: number) => n.toLocaleString('en-GB');

function plain(raw: string, max: number, word: string): {ok: true; value: number} | {ok: false; error: string} {
 const read = parseNumberInput(raw);
 if (!read.ok) return {ok: false, error: read.error};
 if (read.value > max) return {ok: false, error: `Enter at most ${say(max)}${word}.`};
 return {ok: true, value: read.value};
}

/** One value of `metric` (a day's value, or the target when `target` is true): the number, or the sentence for the field. */
export function readAverageValue(metric: AverageMetric, raw: string, target = false): {ok: true; value: number} | {ok: false; error: string} {
 if (!String(raw ?? '').trim()) return {ok: false, error: target ? 'Choose a target above zero.' : 'Write a number, zero or more.'};
 let out: {ok: true; value: number} | {ok: false; error: string};
 if (metric === 'sleep-hours') { const v = validateValue('sleepHours', raw); out = v.ok ? {ok: true, value: v.value} : {ok: false, error: v.error}; }
 else if (metric === 'steps') { const v = validateValue('steps', raw); out = v.ok ? {ok: true, value: v.value} : {ok: false, error: v.error}; }
 else if (metric === 'water-ml') out = plain(raw, LIMITS.waterDayMl, ' mL a day');
 else out = plain(raw, 1_000_000, '');
 if (out.ok && target && !(out.value > 0)) return {ok: false, error: 'Choose a target above zero.'};
 return out;
}
