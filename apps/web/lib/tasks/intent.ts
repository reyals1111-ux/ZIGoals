import {parseTaskLine, type ParsedTask} from './parse';

/**
 * Session AL (Part 8, P-LS-04, LS-004; for ZIGi/NOVA P-LA-12, lane L7): does a typed line ask for a to-do rather than a
 * log? "call mum tomorrow at 5pm", "task: buy milk", "remind me to floss at 21:00", "todo pay rent" are to-dos; "drank
 * 2 glasses of water", "ran 5k in 28 min", "a banana" are not. Pure and deterministic.
 * - `sure`: a to-do word leads the line (task, todo, to do, remind me to, add a task, reminder), or a to-do verb leads
 *   it (call, buy, pay, email, book, renew…) — a food log never starts with these;
 * - `maybe`: the line plans ahead (a future day or a clock time, "every …") and names no log word (ate, drank, ran,
 *   slept, weighed…), so the caller offers the task beside its own reading;
 * - null: a log or anything else.
 * Session AV (1c, q1 #2; Todoist NL): the Dutch ones too — "taak: …", "todo …", "herinner me (eraan) om/te …", "niet
 * vergeten: …", "vergeet niet …", "voeg een taak toe: …", "nieuwe taak …", and a Dutch to-do verb in front (bel, koop,
 * betaal, mail, haal, boek, bestel, stuur…). "Plan my day" / "plan mijn dag" asks for a plan, never a task of that name.
 */
export type TaskIntent = {confidence: 'sure' | 'maybe'; parsed: ParsedTask; line: string};
const PREFIX = /^\s*(?:(?:please\s+)?(?:add|create|make|new)\s+(?:a\s+|an\s+)?(?:task|to-?do|todo|reminder)(?:\s+to)?|task|to-?do|todo|to do|reminder|remind me(?:\s+to)?|remember to|don['’]t forget(?:\s+to)?|i need to|i have to|i must|need to|have to|(?:graag\s+)?voeg\s+(?:een\s+)?(?:taak|to-?do|herinnering)\s+toe(?:\s+(?:om|te))?|(?:maak\s+)?(?:een\s+)?nieuwe\s+(?:taak|to-?do)|maak\s+(?:een\s+)?(?:taak|to-?do)(?:\s+aan)?|taak|herinnering|herinner\s+me(?:\s+eraan)?(?:\s+(?:om|te|aan))?|niet\s+vergeten(?:\s+(?:om|te))?|vergeet\s+niet(?:\s+(?:om|te))?)\b\s*[:\-–—]?\s*/i;
export const VERBS = new Set(['call', 'phone', 'ring', 'text', 'email', 'e-mail', 'mail', 'message', 'buy', 'pay', 'renew', 'book', 'schedule', 'reschedule', 'cancel', 'order', 'return', 'pick', 'collect', 'send', 'post', 'submit', 'file', 'sign', 'fix', 'repair', 'clean', 'tidy', 'wash', 'finish', 'write', 'draft', 'prepare', 'plan', 'visit', 'meet', 'contact', 'ask', 'check', 'review', 'print', 'upload', 'download', 'install', 'update', 'backup', 'organise', 'organize', 'sort', 'pack', 'unpack', 'move', 'apply', 'register', 'water', 'feed', 'vacuum', 'mow', 'iron', 'shop', 'get', 'fetch', 'bring', 'take', 'drop', 'invite', 'thank', 'congratulate', 'research', 'compare', 'call-back', 'follow', 'reply', 'respond', 'confirm', 'remind',
  // Session AV (1c, q1 #2): Dutch to-do verbs, as a line starts with them ("Bel mama", "Koop melk vandaag").
  'bel', 'koop', 'betaal', 'mail', 'haal', 'boek', 'bestel', 'stuur', 'verstuur', 'regel', 'vernieuw', 'verleng', 'annuleer', 'repareer', 'ruim', 'breng', 'lever', 'app', 'sms', 'print', 'teken', 'onderteken', 'bezoek', 'controleer', 'schrijf', 'poets', 'stofzuig', 'strijk', 'maai', 'reserveer', 'plan', 'meld', 'beantwoord', 'bevestig']);
/** Words that make a line a log of something done or eaten, never a to-do on their own. */
const LOG_WORDS = /\b(?:ate|eaten|eat|had|drank|drink|drunk|ran|run|walked|cycled|swam|slept|weighed|weigh|weight|meditated|breakfast|lunch|dinner|snack|glass(?:es)?|ml|kg|lbs?|kcal|calories|steps|km|miles?|gegeten|gedronken|dronk|gelopen|liep|gefietst|gezwommen|geslapen|sliep|gewogen|ontbijt|avondeten|glazen|glas|stappen|calorieën)\b/i;
/** "plan my day", "plan mijn dag", "plan de week": a request for a plan (the answers read it), not a to-do. */
const PLAN_ASK = /^\s*(?:please\s+|help\s+me\s+)?plan\s+(?:my|mijn|the|de|today'?s?|vandaag)\s*(?:day|dag|week|today|vandaag)?\s*[.!?]?\s*$/i;
/** "water the plants" is a to-do, "water 2 glasses" is not: a to-do verb followed by a number or a unit is a log. */
const NUMBER_NEXT = /^\s*\S+\s+(?:\d|a\s+glass|one|two|three)/i;

export function taskIntent(input: string, today: string): TaskIntent | null {
  const line = input.trim();
  if (!line || line.length > 300 || PLAN_ASK.test(line)) return null;
  const prefix = PREFIX.exec(line);
  if (prefix && prefix[0].trim()) {
    const rest = line.slice(prefix[0].length).trim();
    if (!rest) return null;
    const parsed = parseTaskLine(rest, today);
    return parsed.title ? {confidence: 'sure', parsed, line: rest} : null;
  }
  const first = line.split(/\s+/)[0]!.toLowerCase().replace(/[^a-z-]/g, '');
  const parsed = parseTaskLine(line, today);
  if (!parsed.title) return null;
  // A question ("haal ik mijn doel?") is never a to-do from its first word.
  if (VERBS.has(first) && !line.endsWith('?') && !(first === 'water' && NUMBER_NEXT.test(line)) && !(first === 'get' && LOG_WORDS.test(line))) return {confidence: 'sure', parsed, line};
  const plans = parsed.spans.some(s => s.kind === 'recur' || s.kind === 'project' || s.kind === 'label' || s.kind === 'priority' || (s.kind === 'date' && !!parsed.due && parsed.due > today) || s.kind === 'time');
  if (plans && !LOG_WORDS.test(line)) return {confidence: 'maybe', parsed, line};
  return null;
}
