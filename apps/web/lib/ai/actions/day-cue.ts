import {FENCE, repairJson} from './parse';

/**
 * Session X-Local Phase 2 round 6 (ADR-017 S69): the day a log is for, read from the person's own message on the device.
 * Told the date, the models still wrote "today" for "gisteren", "hier", "the day before yesterday" or a weekday name
 * (gemma4 after rounds 1–5: every such case). The message carries the cue, so when a log card says today (or names no
 * day, which the schema reads as today) and the message carries exactly one relative-day cue, the card takes that day.
 * Two cues, a future day ("tomorrow"), or a kind that is not a log leave the card as the model wrote it. The person
 * still sees the day on the card before adding it.
 */
const LOG_KINDS = new Set(['log-water', 'log-weight', 'log-steps', 'log-food', 'log-sleep', 'log-meditation', 'log-mood', 'log-measurement', 'log-nap', 'check-in', 'skip', 'counter', 'log-activity', 'log-exercise']);
const YESTERDAY = /\b(?:yesterday|gisteren|gister)\b/i, HIER = /\bhier\b/i, FRENCH = /\b(?:j'ai|ai|bu|verres?|pas|heures?|dormi|mangé|couru|médité|marché|soir|matin)\b/i;
const TWO_DAYS = /\b(?:the day before yesterday|two days ago|eergisteren|avant-hier)\b/i;
const FUTURE = /\b(?:tomorrow|morgen|demain|next week|volgende week|la semaine prochaine)\b/i;
const WEEKDAYS: [RegExp, number][] = [[/\b(?:sunday|zondag|dimanche)\b/i, 0], [/\b(?:monday|maandag|lundi)\b/i, 1], [/\b(?:tuesday|dinsdag|mardi)\b/i, 2], [/\b(?:wednesday|woensdag|mercredi)\b/i, 3], [/\b(?:thursday|donderdag|jeudi)\b/i, 4], [/\b(?:friday|vrijdag|vendredi)\b/i, 5], [/\b(?:saturday|zaterdag|samedi)\b/i, 6]];
const dayAt = (today: string, offset: number) => { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
/** The most recent such weekday strictly before today. */
const lastWeekday = (today: string, weekday: number) => { const d = new Date(`${today}T12:00:00Z`); let back = (d.getUTCDay() - weekday + 7) % 7; if (back === 0) back = 7; return dayAt(today, -back); };

/** The day the message names for a log, or null when it names none, more than one, or a day still to come. */
export function dayCue(message: string, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || FUTURE.test(message)) return null;
  const found: string[] = [];
  if (TWO_DAYS.test(message)) found.push(dayAt(today, -2));
  else if (YESTERDAY.test(message) || (HIER.test(message) && FRENCH.test(message))) found.push('yesterday');
  for (const [re, weekday] of WEEKDAYS) if (re.test(message)) found.push(lastWeekday(today, weekday));
  return found.length === 1 ? found[0]! : null;
}

/** The reply with every log card that said today (or named no day) given the message's own day; untouched when there is no cue. */
export function applyDayCue(reply: string, message: string, today: string): string {
  const day = dayCue(message, today);
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
      const current = typeof o.day === 'string' ? o.day.trim().toLowerCase() : undefined;
      if (current !== undefined && current !== 'today' && current !== 'vandaag' && current !== "aujourd'hui") return item;
      changed = true; return {...o, day};
    };
    const next = Array.isArray(parsed) ? parsed.map(fix) : fix(parsed);
    return changed ? `${fence}zigoals-action\n${JSON.stringify(next)}\n${fence}` : block;
  });
}
