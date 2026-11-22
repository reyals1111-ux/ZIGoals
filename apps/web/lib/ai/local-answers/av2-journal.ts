import type {ToolEnv} from '../tools/env';
import type {Journal} from '../../journal/schema';
import {writingStreak} from '../../journal/stats';
import {daysWords, reminderOf} from '../../journal/reminder';
import {bookCounts} from '../../journal/books';
import {dateQuery} from '../../journal/search';
import {PROMPT_PACKS, packsOn, questionWithPacks} from '../../journal-prompts/packs';
import {templateById} from '../../journal-prompts/templates';
import {everyWords, periodStart, schedulesOf, scheduleTitle} from '../../notes/schedules';
import type {Notes} from '../../notes/schema';
import {notesPerTag} from '../../notes/table';
import {novaAreaClosed, novaEnvInfo} from './nova-env';
import {answer, asked, closed, count, dayIn, isQuestion, journalClosed, list, MIXED, say, type Asked, type Lang} from './av-words';
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
    for (const one of [reminder, streak, journals, onDay, packs, packQuestion, defaultTemplate, media, imported, repeatingNotes, noteVersions, notesPerTagAnswer, journalInReport, changedEntries]) {
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

/** LEDGER #43: "which journals do I have", "how many journals do I have" (lib/journal/books.ts, as Your journals lists them). */
function journals(a: Asked): LocalReply | null {
  const en = /\b(?:which|what|how many) journals\b|\bmy journals\b/.test(a.f), nl = /\b(?:welke|hoeveel) dagboeken\b|\bmijn dagboeken\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const counts = bookCounts(journalOf(a)), lang = a.lang;
  const line = (c: (typeof counts)[number]) => `${c.id === null ? say(lang, 'Journal (the main one)', 'Journal (het hoofddagboek)') : c.name}: ${count(c.count, lang, ['entry', 'entries'], ['stuk', 'stukken'])}`;
  if (counts.length === 1) return answer(say(lang, `One journal, the main one, with ${count(counts[0]!.count, 'en', ['entry', 'entries'], ['', ''])}. Journal → Your journals makes another (Travel, Dreams…) with a colour of its own.`, `Eén dagboek, het hoofddagboek, met ${count(counts[0]!.count, 'nl', ['', ''], ['stuk', 'stukken'])}. Journal → Your journals maakt er nog een (Reizen, Dromen…) met een eigen kleur.`), CALL);
  return answer(say(lang, `${counts.length} journals: ${list(counts.map(line), 'en')}.`, `${counts.length} dagboeken: ${list(counts.map(line), 'nl')}.`), CALL);
}

const ON_DAY_EN = /\b(?:what|which|did) (?:did i write|have i written|i write|entries|journal entries|i wrote)\b.*\b(?:on|in) (.+)$|\bjournal (?:entries )?(?:on|from|for) (.+)$/;
const ON_DAY_NL = /\bwat (?:heb ik|schreef ik)\b.*?\b(?:op|in) (.+?)(?: (?:geschreven|in mijn dagboek))*$|\bdagboek(?:stukken)? (?:van|op) (.+)$/;
/** LEDGER #43: "what did I write on 3 nov", "wat heb ik op 3 november geschreven" (lib/journal/search.ts dateQuery): the days and how many entries; the words stay on the Journal page. */
function onDay(a: Asked): LocalReply | null {
  // Read on the typed words (lower case), not the folded ones: folding drops the hyphens of "2026-11-14".
  const typedLine = a.raw.toLowerCase().replace(/[?!.]+$/, '').replace(/\s+/g, ' ').trim(), m = ON_DAY_EN.exec(typedLine) ?? ON_DAY_NL.exec(typedLine);
  const raw = m ? (m[1] ?? m[2] ?? '').replace(/\b(?:in my journal|in mijn dagboek|geschreven)\b/g, '').trim() : '';
  const typed = raw === 'yesterday' || raw === 'gisteren' ? {from: addDay(a.today, -1), to: addDay(a.today, -1)} : raw === 'today' || raw === 'vandaag' ? {from: a.today, to: a.today} : raw ? dateQuery(raw, a.today) : null;
  if (!typed) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const hits = journalOf(a).entries.filter(e => e.date >= typed.from && e.date <= typed.to), lang = a.lang, one = typed.from === typed.to;
  const when = one ? dayIn(lang, typed.from, a.today) : `${dayIn(lang, typed.from, a.today)} – ${dayIn(lang, typed.to, a.today)}`;
  const where = one ? `/app/journal?day=${typed.from}` : 'Journal → Search by date';
  if (!hits.length) return answer(say(lang, `No journal entry on ${when}. The calendar under Journal → Search by date marks the days you wrote.`, `Geen dagboekstuk op ${when}. De kalender onder Journal → Search by date toont de dagen waarop je schreef.`), CALL);
  const days = new Set(hits.map(e => e.date)).size;
  return answer(say(lang, `${count(hits.length, 'en', ['journal entry', 'journal entries'], ['', ''])} on ${when}${!one && days > 1 ? ` (${count(days, 'en', ['day', 'days'], ['', ''])})` : ''}. Their words stay on the Journal page: ${where}.`, `${count(hits.length, 'nl', ['', ''], ['dagboekstuk', 'dagboekstukken'])} op ${when}${!one && days > 1 ? ` (${count(days, 'nl', ['', ''], ['dag', 'dagen'])})` : ''}. De woorden blijven op de Journal-pagina: ${where}.`), CALL);
}
const addDay = (day: string, by: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + by); return d.toISOString().slice(0, 10); };

/** LEDGER #38: "which prompt packs are on" (lib/journal-prompts/packs.ts, as Journal → Prompt packs shows them). */
function packs(a: Asked): LocalReply | null {
  if (!/\b(?:prompt|question|journal) packs?\b|\b(?:vragen|vraag|schrijf)pakket(?:ten)?\b|\bpakket(?:ten)? (?:met )?vragen\b/.test(a.f)) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const lang = a.lang, on = packsOn(journalOf(a).packs).map(p => p.title[lang]), all = PROMPT_PACKS.map(p => p.title[lang]);
  if (!on.length) return answer(say(lang, `No prompt pack is on. Journal → Write → Prompt packs has ${list(all, 'en')}; a pack you switch on takes turns with the everyday question.`, `Er staat geen vragenpakket aan. Journal → Write → Prompt packs heeft ${list(all, 'nl')}; een pakket dat je aanzet wisselt af met de gewone vraag.`), CALL);
  return answer(say(lang, `${count(on.length, 'en', ['prompt pack is', 'prompt packs are'], ['', ''])} on: ${list(on, 'en')}. Their questions take turns with the everyday one as today’s question.`, `${count(on.length, 'nl', ['', ''], ['vragenpakket staat', 'vragenpakketten staan'])} aan: ${list(on, 'nl')}. Hun vragen wisselen af met de gewone vraag van de dag.`), CALL);
}
/** LEDGER #38: "what is today's journal question" while a pack is on (the question the Journal shows; with no pack on, av-life.ts answers). */
function packQuestion(a: Asked): LocalReply | null {
  if (!/\b(?:todays|today s|daily|days) (?:journal |journaling |writing )?(?:question|prompt)\b|\bjournal (?:question|prompt)\b.*\btoday\b|\bquestion of the day\b|\bdagboekvraag\b|\bvraag van (?:de dag|vandaag)\b|\bschrijfvraag\b/.test(a.f)) return null;
  if (!a.env.journal || !packsOn(a.env.journal.packs).length) return null;
  const q = questionWithPacks(a.today, 0, a.lang, a.env.journal.packs);
  return answer(say(a.lang, `Today’s journal question${q.pack ? ` (${q.pack.title.en} pack)` : ''}: “${q.question}” Journal → Another question shows the next one.`, `De dagboekvraag van vandaag${q.pack ? ` (pakket ${q.pack.title.nl})` : ''}: “${q.question}” Journal → Another question toont de volgende.`), CALL);
}

/** LEDGER #39: "which template do my journal entries start from" (the default template, Journal → Start from a prompt). */
function defaultTemplate(a: Asked): LocalReply | null {
  const en = /\bdefault (?:journal )?template\b|\btemplate\b.*\b(?:new )?entries start\b|\bentries start from\b/.test(a.f), nl = /\bstandaard ?sjabloon\b|\bsjabloon\b.*\bnieuwe (?:stukken|dagboekstukken)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const j = journalOf(a), id = j.defaultTemplate, lang = a.lang;
  const name = id ? (j.templates ?? []).find(t => t.id === id)?.title ?? templateById(id)?.title[lang] ?? null : null;
  if (!name) return answer(say(lang, 'New journal entries start empty. Under Journal → Start from a prompt, “Start new entries here” on a template makes it the one they start from.', 'Nieuwe dagboekstukken beginnen leeg. Onder Journal → Start from a prompt maakt “Start new entries here” bij een sjabloon dat het beginpunt.'), CALL);
  return answer(say(lang, `New journal entries start from “${name}”. Journal → Start from a prompt changes it.`, `Nieuwe dagboekstukken beginnen met “${name}”. Journal → Start from a prompt verandert dat.`), CALL);
}
/** LEDGER #33: "which journal entries have I changed", "earlier versions" (lib/journal/versions.ts, as each entry's More lists them). */
function changedEntries(a: Asked): LocalReply | null {
  const en = /\b(?:changed|edited)\b.*\b(?:journal )?entr(?:y|ies)\b|\bentr(?:y|ies)\b.*\b(?:changed|edited)\b|\b(?:earlier|older|previous) versions?\b|\bversion history\b/.test(a.f) && /\b(?:journal|entry|entries|diary|versions?)\b/.test(a.f);
  const nl = /\b(?:veranderd|gewijzigd|aangepast|bewerkt)\b.*\b(?:dagboek\w*|stukken)\b|\b(?:dagboek\w*|stukken)\b.*\b(?:veranderd|gewijzigd|aangepast|bewerkt)\b|\b(?:eerdere|oudere|vorige) versies\b|\bversiegeschiedenis\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const j = journalOf(a), changed = j.entries.filter(e => e.updatedAt), versions = j.versions ?? [], lang = a.lang;
  if (!changed.length && !versions.length) return answer(say(lang, 'No journal entry has been changed, so there are no earlier versions. An entry’s More → Edit the words keeps the words it had, up to ten versions.', 'Geen dagboekstuk is veranderd, dus er zijn geen eerdere versies. More → Edit the words bij een stuk bewaart de woorden die het had, tot tien versies.'), CALL);
  const days = [...new Set(changed.map(e => e.date))].sort().slice(-5).map(d => dayIn(lang, d, a.today));
  return answer(say(lang, `${count(changed.length, 'en', ['journal entry has', 'journal entries have'], ['', ''])} been changed (${list(days, 'en')}), with ${count(versions.length, 'en', ['earlier version', 'earlier versions'], ['', ''])} kept on this device. Each entry’s More lists them, to read or restore.`, `${count(changed.length, 'nl', ['', ''], ['dagboekstuk is', 'dagboekstukken zijn'])} veranderd (${list(days, 'nl')}), met ${count(versions.length, 'nl', ['', ''], ['eerdere versie', 'eerdere versies'])} bewaard op dit apparaat. More bij elk stuk toont ze, om te lezen of terug te zetten.`), CALL);
}
// ── Notes ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const NOTES_CALL = [{tool: 'search_notes', args: {}, label: 'Notes'}];
/** The notes record where it is shared with this answer (NOVA: its Notes scope), else why not. */
function notesOf(a: Asked): {record: Notes} | {shut: LocalReply} {
  const today = closed(a.env, 'today', 'search_notes'); if (today) return {shut: today};
  const record = a.env.nova?.notes;
  if (record) return {record};
  return {shut: record === undefined && novaEnvInfo(a.env) ? {kind: 'refusal', text: novaAreaClosed('Notes', a.lang), calls: []} : answer(say(a.lang, 'Your notes can’t be read on this device right now, so I can’t say.', 'Je notities kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'))};
}
/** LEDGER #32: "which repeating notes do I have", "what is my daily note template" (lib/notes/schedules.ts). */
function repeatingNotes(a: Asked): LocalReply | null {
  const en = /\b(?:repeating|recurring|scheduled) notes?\b|\bnote templates?\b|\bdaily note template\b/.test(a.f), nl = /\b(?:terugkerende|herhalende) notitie s?\b|\b(?:terugkerende|herhalende) notities\b|\bnotitiesjablo(?:on|nen)\b|\bsjabloon\b.*\bdag(?:elijkse)? ?notitie\b/.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a); if ('shut' in got) return got.shut;
  const list0 = schedulesOf(got.record), lang = a.lang, daily = got.record.dailyTemplate?.trim();
  const dailyLine = daily ? say(lang, ' A new daily note starts from your daily note template.', ' Een nieuwe dagnotitie begint met je sjabloon voor dagnotities.') : say(lang, ' Daily notes start empty (Notes → Days → Daily note template).', ' Dagnotities beginnen leeg (Notes → Days → Daily note template).');
  if (!list0.length) return answer(say(lang, `No repeating note yet. Notes → Notes → Repeating notes makes a note every day, week or month from your words.${dailyLine}`, `Nog geen terugkerende notitie. Notes → Notes → Repeating notes maakt elke dag, week of maand een notitie van je eigen woorden.${dailyLine}`), NOTES_CALL);
  const lines = list0.map(s => `${s.title} (${lang === 'nl' ? nlEvery(s) : everyWords(s)}${s.paused ? say(lang, ', paused', ', gepauzeerd') : s.lastMade === periodStart(s, a.today) ? say(lang, `, made “${scheduleTitle(s, periodStart(s, a.today))}”`, `, gemaakt: “${scheduleTitle(s, periodStart(s, a.today))}”`) : ''})`);
  return answer(`${say(lang, `${count(list0.length, 'en', ['repeating note', 'repeating notes'], ['', ''])}: ${list(lines, 'en')}.`, `${count(list0.length, 'nl', ['', ''], ['terugkerende notitie', 'terugkerende notities'])}: ${list(lines, 'nl')}.`)}${dailyLine}`, NOTES_CALL);
}
/** LEDGER #33: "which notes have earlier versions", "version history of my notes" (lib/notes/versions.ts, as each note's Earlier versions lists them). */
function noteVersions(a: Asked): LocalReply | null {
  const en = /\bnotes?\b/.test(a.f) && /\b(?:earlier|older|previous) versions?\b|\bversion history\b.*\bnotes?\b|\bnotes?\b.*\bversion history\b/.test(a.f) && !/\bjournal|entries|entry\b/.test(a.f);
  const nl = /\bnotitie s?\b|\bnotities\b/.test(a.f) && /\b(?:eerdere|oudere|vorige) versies\b|\bversiegeschiedenis\b/.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a); if ('shut' in got) return got.shut;
  const versions = got.record.versions ?? [], lang = a.lang, ids = [...new Set(versions.map(v => v.noteId))];
  const names = ids.flatMap(id => { const n = got.record.notes.find(x => x.id === id); return n ? [n.kind === 'daily' && n.day ? dayIn(lang, n.day, a.today) : (n.title.trim() || say(lang, 'an untitled note', 'een notitie zonder titel'))] : []; });
  if (!names.length) return answer(say(lang, 'No note has an earlier version yet. Each save that changes a note keeps the words it had, under its Earlier versions.', 'Nog geen notitie heeft een eerdere versie. Elke keer dat je een notitie verandert en bewaart, blijven de oude woorden onder Earlier versions.'), NOTES_CALL);
  return answer(say(lang, `${count(versions.length, 'en', ['earlier version', 'earlier versions'], ['', ''])} of ${count(names.length, 'en', ['note', 'notes'], ['', ''])}: ${list(names.slice(0, 6), 'en')}. Each note’s Earlier versions shows them, to read or restore.`, `${count(versions.length, 'nl', ['', ''], ['eerdere versie', 'eerdere versies'])} van ${count(names.length, 'nl', ['', ''], ['notitie', 'notities'])}: ${list(names.slice(0, 6), 'nl')}. Earlier versions bij elke notitie toont ze, om te lezen of terug te zetten.`), NOTES_CALL);
}
/** LEDGER #30: "how many notes per tag", "which tags do my notes have" (lib/notes/table.ts, as Notes → Chart draws them). */
function notesPerTagAnswer(a: Asked): LocalReply | null {
  const en = /\bnotes?\b/.test(a.f) && /\b(?:per|by|each) tag\b|\btags?\b.*\bnotes\b|\bnotes\b.*\btags?\b/.test(a.f) && !/\b(?:journal|entries|entry)\b/.test(a.f);
  const nl = /\bnotities\b/.test(a.f) && /\b(?:per|op) (?:tag|label)\b|\b(?:tags|labels)\b/.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a); if ('shut' in got) return got.shut;
  const per = notesPerTag(got.record.notes), lang = a.lang;
  if (!per.tags.length) return answer(say(lang, 'No note has a tag yet. Notes imported with tags (Notes → Files → Import) show under Notes → Chart.', 'Nog geen notitie heeft een tag. Notities die met tags zijn geïmporteerd (Notes → Files → Import) staan onder Notes → Chart.'), NOTES_CALL);
  const lines = per.tags.slice(0, 8).map(t => `#${t.tag} ${t.count}`);
  return answer(say(lang, `Notes per tag: ${list(lines, 'en')}${per.untagged ? `; ${count(per.untagged, 'en', ['note has', 'notes have'], ['', ''])} no tag` : ''}. Notes → Chart draws them.`, `Notities per tag: ${list(lines, 'nl')}${per.untagged ? `; ${count(per.untagged, 'nl', ['', ''], ['notitie heeft', 'notities hebben'])} geen tag` : ''}. Notes → Chart tekent ze.`), NOTES_CALL);
}
const NL_WEEKDAY = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const nlEvery = (s: {every: 'day' | 'week' | 'month'; weekday?: number; monthDay?: number}) => s.every === 'day' ? 'elke dag' : s.every === 'week' ? `elke ${NL_WEEKDAY[s.weekday ?? 1]}` : `op de ${s.monthDay ?? 1}e van elke maand`;

/** LEDGER #177: "can I put my journal in the report", "is my journal in the visit report" (lib/journal/report.ts). */
function journalInReport(a: Asked): LocalReply | null {
  const en = /\b(?:journal|diary)\b/.test(a.f) && /\b(?:report|pdf|print|printable)\b/.test(a.f), nl = /\b(?:dagboek\w*)\b/.test(a.f) && /\b(?:rapport|verslag|pdf|afdrukken|printen)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const from = addDay(a.today, -29), n = journalOf(a).entries.filter(e => e.date >= from && e.date <= a.today).length, lang = a.lang;
  return answer(say(lang, `Your journal is in a report only when you choose it: Settings → Your data → Make a report → Private → “Journal entries, as written” (off each time you open it). The last 30 days hold ${count(n, 'en', ['entry', 'entries'], ['', ''])}.`, `Je dagboek staat alleen in een rapport als je dat kiest: Settings → Your data → Make a report → Private → “Journal entries, as written” (elke keer uit als je het opent). De laatste 30 dagen bevatten ${count(n, 'nl', ['', ''], ['stuk', 'stukken'])}.`), CALL);
}
/** LEDGER #44: "how many journal entries did I import" (each imported entry is marked with where it came from). */
function imported(a: Asked): LocalReply | null {
  const en = /\bimport(?:ed)?\b/.test(a.f) && /\b(?:journal|entries|entry|day one|diary)\b/.test(a.f), nl = /\b(?:geimporteerd|ingelezen|importeerde|importeren)\b/.test(a.f) && /\b(?:dagboek\w*|stukken|day one)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const list0 = journalOf(a).entries.filter(e => e.imported), lang = a.lang;
  if (!list0.length) return answer(say(lang, 'No journal entry was imported yet. Journal → Import and export reads a Day One export, Markdown or text files, or an Apple Journal export, and shows what it found first.', 'Er is nog geen dagboekstuk geïmporteerd. Journal → Import and export leest een Day One-export, Markdown- of tekstbestanden, of een Apple Journal-export, en toont eerst wat erin staat.'), CALL);
  const days = list0.map(e => e.date).sort(), from = dayIn(lang, days[0]!, a.today), to = dayIn(lang, days.at(-1)!, a.today);
  return answer(say(lang, `${count(list0.length, 'en', ['journal entry was', 'journal entries were'], ['', ''])} imported, from ${from}${from !== to ? ` to ${to}` : ''}.`, `${count(list0.length, 'nl', ['', ''], ['dagboekstuk is', 'dagboekstukken zijn'])} geïmporteerd, van ${from}${from !== to ? ` tot ${to}` : ''}.`), CALL);
}
/** LEDGER #35, #42: "how many photos are in my journal", "do I have voice notes in my journal" (the entries' own media ids). */
function media(a: Asked): LocalReply | null {
  const en = /\b(?:photos?|pictures?|voice notes?|audio(?: notes?)?|recordings?)\b/.test(a.f) && /\b(?:journal|diary|entries)\b/.test(a.f);
  const nl = /\b(?:foto s?|fotos|foto|spraakmemo s?|spraakmemos|spraakberichten|opnames?|geluidsopnames?)\b/.test(a.f) && /\b(?:dagboek\w*|stukken)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const entries = journalOf(a).entries, photos = entries.reduce((n, e) => n + (e.photos?.length ?? 0), 0), voice = entries.reduce((n, e) => n + (e.audio?.length ?? 0), 0);
  const seconds = entries.reduce((n, e) => n + (e.audio ?? []).reduce((m, x) => m + x.seconds, 0), 0), withMedia = entries.filter(e => e.photos?.length || e.audio?.length), lang = a.lang;
  if (!photos && !voice) return answer(say(lang, 'No photo or voice note in your journal yet. Under Write, “Photos and a voice note” adds them; they stay on this device.', 'Nog geen foto of spraakmemo in je dagboek. Onder Write voegt “Photos and a voice note” ze toe; ze blijven op dit apparaat.'), CALL);
  const minutes = Math.round(seconds / 60);
  return answer(say(lang, `${count(photos, 'en', ['photo', 'photos'], ['', ''])} and ${count(voice, 'en', ['voice note', 'voice notes'], ['', ''])}${voice ? ` (about ${count(minutes, 'en', ['minute', 'minutes'], ['', ''])})` : ''} in ${count(withMedia.length, 'en', ['entry', 'entries'], ['', ''])}, kept on this device only.`, `${count(photos, 'nl', ['', ''], ['foto', 'foto’s'])} en ${count(voice, 'nl', ['', ''], ['spraakmemo', 'spraakmemo’s'])}${voice ? ` (ongeveer ${count(minutes, 'nl', ['', ''], ['minuut', 'minuten'])})` : ''} in ${count(withMedia.length, 'nl', ['', ''], ['stuk', 'stukken'])}, alleen op dit apparaat bewaard.`), CALL);
}
