import {FENCE, repairJson} from './parse';
import {applyQuantityCue} from './quantity-cue';
import {normalizeSpoken} from '../spoken/normalize';

/**
 * Session X-Local Phase 2 round 6 (ADR-017 S69): the day a log is for, read from the person's own message on the device.
 * Told the date, the models still wrote "today" for "gisteren", "the day before yesterday" or a weekday name
 * (gemma4 after rounds 1–5: every such case). The message carries the cue, so when a log card says today (or names no
 * day, which the schema reads as today) and the message carries exactly one relative-day cue, the card takes that day.
 * Two cues, a future day ("tomorrow"), or a kind that is not a log leave the card as the model wrote it. The person
 * still sees the day on the card before adding it.
 */
const LOG_KINDS = new Set(['log-water', 'log-weight', 'log-steps', 'log-food', 'log-sleep', 'log-meditation', 'log-mood', 'log-measurement', 'log-nap', 'check-in', 'skip', 'counter', 'log-activity', 'log-exercise']);
const YESTERDAY = /\b(?:yesterday|gisteren|gister)\b/i;
const TWO_DAYS = /\b(?:the day before yesterday|two days ago|eergisteren)\b/i;
const FUTURE = /\b(?:tomorrow|morgen|next week|volgende week)\b/i;
// Session Z-Local L53: a skip is the one log that looks ahead; "skip my walk tomorrow" (gemma4 wrote "today" for every form) takes tomorrow, "overmorgen" the day after.
const FUTURE_KINDS = new Set(['skip']);
const TOMORROW = /\b(?:tomorrow|morgen)\b/i, TWO_AHEAD = /\b(?:the day after tomorrow|overmorgen)\b/i;
/**
 * Session Z-Local L55: the one clock time the message names, read on the device after the spoken normaliser ("kwart voor
 * acht 's avonds" is 19:45), for a reminder card whose time the model misheard (gemma4 wrote 20:15 for it, three forms of
 * six). A message with no clock or with two ("from 23:30 to 7:00") leaves the card as written; a time the person typed as
 * digits is kept as they typed it.
 */
const CLOCK = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;
const TIME_KINDS = new Set(['create-reminder']);
export function timeCue(spoken: string): string | null {
  const times = [...new Set([...normalizeSpoken(spoken).matchAll(CLOCK)].map(m => `${m[1]!.padStart(2, '0')}:${m[2]}`))];
  return times.length === 1 ? times[0]! : null;
}
export function applyTimeCue(reply: string, message: string): string {
  const cue = timeCue(message); if (!cue) return reply;
  const typed = [...message.matchAll(CLOCK)].map(m => `${m[1]!.padStart(2, '0')}:${m[2]}`);
  return reply.replace(FENCE, (block: string, fence: string, body: string) => {
    let parsed: unknown;
    try { parsed = repairJson(body); } catch { return block; }
    if (parsed === null || typeof parsed !== 'object') return block;
    let changed = false;
    const fix = (item: unknown) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
      const o = item as Record<string, unknown>;
      if (typeof o.kind !== 'string' || !TIME_KINDS.has(o.kind) || typeof o.time !== 'string') return item;
      const current = o.time.trim();
      if (current === cue || typed.includes(current)) return item;
      changed = true; return {...o, time: cue};
    };
    const next = Array.isArray(parsed) ? parsed.map(fix) : fix(parsed);
    return changed ? `${fence}zigoals-action\n${JSON.stringify(next)}\n${fence}` : block;
  });
}
/** The day ahead a skip names, or null. */
export function aheadCue(spoken: string, today: string): string | null {
  const message = normalizeSpoken(spoken);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  if (TWO_AHEAD.test(message)) return dayAt(today, 2);
  if (TOMORROW.test(message) && !/\b(?:next week|volgende week)\b/i.test(message)) return dayAt(today, 1);
  return null;
}
const WEEKDAYS: [RegExp, number][] = [[/\b(?:sunday|zondag)\b/i, 0], [/\b(?:monday|maandag)\b/i, 1], [/\b(?:tuesday|dinsdag)\b/i, 2], [/\b(?:wednesday|woensdag)\b/i, 3], [/\b(?:thursday|donderdag)\b/i, 4], [/\b(?:friday|vrijdag)\b/i, 5], [/\b(?:saturday|zaterdag)\b/i, 6]];
const dayAt = (today: string, offset: number) => { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
/** The most recent such weekday strictly before today. */
const lastWeekday = (today: string, weekday: number) => { const d = new Date(`${today}T12:00:00Z`); let back = (d.getUTCDay() - weekday + 7) % 7; if (back === 0) back = 7; return dayAt(today, -back); };

/** The day the message names for a log, or null when it names none, more than one, or a day still to come. */
export function dayCue(spoken: string, today: string): string | null {
  const message = normalizeSpoken(spoken);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || FUTURE.test(message)) return null;
  const found: string[] = [];
  if (TWO_DAYS.test(message)) found.push(dayAt(today, -2));
  else if (YESTERDAY.test(message)) found.push('yesterday');
  for (const [re, weekday] of WEEKDAYS) if (re.test(message)) found.push(lastWeekday(today, weekday));
  return found.length === 1 ? found[0]! : null;
}

/**
 * The reply with every log card that said today (or named no day) given the message's own day; untouched when there is no
 * cue. Session Z-Local Part 4: the message's spoken quantity is applied first (`applyQuantityCue`), so the app's one call
 * and the harness's one call read both cues.
 */
export function applyDayCue(original: string, message: string, today: string): string {
  const reply = applyTimeCue(applyQuantityCue(original, message), message);
  const past = dayCue(message, today), ahead = past ? null : aheadCue(message, today), day = past ?? ahead;
  if (!day) return reply;
  return reply.replace(FENCE, (block: string, fence: string, body: string) => {
    // The parser's own fence pattern (every variant it reads); a rewritten block keeps the fence it came with.
    let parsed: unknown;
    try { parsed = repairJson(body); } catch { return block; }
    if (parsed === null || typeof parsed !== 'object') return block;
    let changed = false;
    const fix = (item: unknown) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
      const o = item as Record<string, unknown>;
      if (typeof o.kind !== 'string' || !LOG_KINDS.has(o.kind)) return item;
      if (ahead && !FUTURE_KINDS.has(o.kind)) return item;
      const current = typeof o.day === 'string' ? o.day.trim().toLowerCase() : undefined;
      if (current !== undefined && current !== 'today' && current !== 'vandaag' && current !== "aujourd'hui") return item;
      changed = true; return {...o, day};
    };
    const next = Array.isArray(parsed) ? parsed.map(fix) : fix(parsed);
    return changed ? `${fence}zigoals-action\n${JSON.stringify(next)}\n${fence}` : block;
  });
}
