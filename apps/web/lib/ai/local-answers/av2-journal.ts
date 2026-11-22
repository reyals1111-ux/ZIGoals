import type {ToolEnv} from '../tools/env';
import type {Journal} from '../../journal/schema';
import {writingStreak} from '../../journal/stats';
import {daysWords, reminderOf} from '../../journal/reminder';
import {bookCounts} from '../../journal/books';
import {dateQuery} from '../../journal/search';
import {PROMPT_PACKS, packsOn, questionWithPacks} from '../../journal-prompts/packs';
import {templateById} from '../../journal-prompts/templates';
import {answer, asked, count, dayIn, isQuestion, journalClosed, list, MIXED, say, type Asked, type Lang} from './av-words';
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
    for (const one of [reminder, streak, journals, onDay, packs, packQuestion, defaultTemplate, changedEntries, media]) {
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
