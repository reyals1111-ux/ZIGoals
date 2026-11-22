import type {ToolEnv} from '../tools/env';
import type {Journal} from '../../journal/schema';
import {writingStreak} from '../../journal/stats';
import {daysWords, reminderOf} from '../../journal/reminder';
import {answer, asked, count, isQuestion, journalClosed, MIXED, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (journal and notes; LEDGER group 7, #33, the notes parts of #29 and #30): NOVA's and ZIGi's on-device
 * answers to the questions the lane's Journal and Notes features raise, in English and Dutch. Each reads the feature's
 * own pure function (the same figures the Journal and Notes pages show), only where the journal is shared with this
 * answer (av-words.ts journalClosed: NOVA's Journal permission; Today's switch for ZIGi), and never says a word of an
 * entry beyond what the page's own line says. Called like `avAnswer` in engine.ts (the lead wires it); null when the
 * question is not one of these.
 */
export function av2JournalAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of [reminder, streak]) {
      const r = one(a);
      if (r) return r;
    }
    return null;
  } catch { return null; }
}

const CALL = [{tool: 'journal', args: {}, label: 'Journal'}];
const journalOf = (a: Asked): Journal => a.env.journal!;
const NL_DAYS: Record<string, string> = {'every day': 'elke dag', 'on weekdays': 'op werkdagen', 'at weekends': 'in het weekend'};
const NL_SHORT: Record<string, string> = {Mon: 'ma', Tue: 'di', Wed: 'wo', Thu: 'do', Fri: 'vr', Sat: 'za', Sun: 'zo'};
const daysIn = (lang: Lang, days: number) => { const en = daysWords(days); return lang === 'en' ? en : NL_DAYS[en] ?? en.replace(/^on /, 'op ').replace(/\band\b/, 'en').replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g, d => NL_SHORT[d]!); };

/** LEDGER #40: "when is my journal reminder", "do I have a reminder to write" (lib/journal/reminder.ts). */
function reminder(a: Asked): LocalReply | null {
  const en = /\b(?:journal(?:ing)?|writing|diary) reminders?\b|\breminders? (?:to|for) (?:write|journal)\b|\bremind(?:s|ed)? me to (?:write|journal)\b/.test(a.f);
  const nl = /\b(?:dagboek|schrijf)herinnering(?:en)?\b|\bherinnering(?:en)? (?:om te schrijven|voor (?:mijn |het )?dagboek)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const r = reminderOf(journalOf(a)), lang = a.lang;
  if (!r.on) return answer(say(lang, 'No reminder to write is set. Journal → Entries → Reminder to write sets a time and the days; it reaches you through this device’s notifications.', 'Er staat geen herinnering om te schrijven. Journal → Entries → Reminder to write kiest een tijd en de dagen; die komt via de meldingen van dit apparaat.'), CALL);
  return answer(say(lang, `Your reminder to write is at ${r.time}, ${daysIn('en', r.days)}, unless you already wrote that day.`, `Je herinnering om te schrijven staat om ${r.time}, ${daysIn('nl', r.days)}, behalve als je die dag al schreef.`), CALL);
}

/** LEDGER #40: "what is my writing streak", "how many days in a row did I write" (lib/journal/stats.ts writingStreak, as the Journal shows it). */
function streak(a: Asked): LocalReply | null {
  const en = /\b(?:writing|journal(?:ing)?|diary) streak\b|\bstreak\b.*\b(?:journal|writing|diary)\b|\bdays in a row\b.*\b(?:write|wrote|written|journal(?:ed)?)\b|\b(?:write|wrote|written|journal(?:ed)?)\b.*\bdays in a row\b/.test(a.f);
  const nl = /\b(?:schrijf|dagboek)reeks\b|\breeks\b.*\b(?:dagboek|schrijven|geschreven)\b|\bdagen op rij\b.*\b(?:geschreven|schrijven|dagboek)\b|\b(?:geschreven|dagboek)\b.*\bdagen op rij\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const s = writingStreak(journalOf(a).entries, a.today), lang = a.lang;
  if (!journalOf(a).entries.length) return answer(say(lang, 'No journal entry yet, so no writing streak. A few lines in Journal → Write start one.', 'Nog geen dagboekstuk, dus nog geen schrijfreeks. Een paar regels in Journal → Write beginnen er een.'), CALL);
  const run = (n: number, l: Lang) => count(n, l, ['day', 'days'], ['dag', 'dagen']);
  const now = say(lang, s.current ? `Your writing streak: ${run(s.current, 'en')} in a row${s.writtenToday ? ', today included' : '; write today to keep it'}.` : 'No writing streak right now: nothing was written yesterday or today.',
    s.current ? `Je schrijfreeks: ${run(s.current, 'nl')} op rij${s.writtenToday ? ', vandaag meegeteld' : '; schrijf vandaag om hem te houden'}.` : 'Nu geen schrijfreeks: gisteren en vandaag is niets geschreven.');
  return answer(`${now} ${say(lang, `Longest: ${run(s.longest, 'en')}.`, `Langste: ${run(s.longest, 'nl')}.`)}`, CALL);
}
