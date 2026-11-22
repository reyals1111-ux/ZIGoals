import type {ToolEnv} from '../tools/env';
import {notePhotoIdsOf, type Notes} from '../../notes/schema';
import {tagTree} from '../../notes/tags';
import {countWords, readMinutes} from '../../notes/table';
import {readableNotes} from '../../notes/lock';
import {novaAreaClosed, novaEnvInfo} from './nova-env';
import {answer, asked, closed, count, isQuestion, journalClosed, list, MIXED, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r4-notes, LEDGER #306, #307, #311–#316, #318–#321; Bear, Journey): NOVA's and ZIGi's on-device
 * answers, in English and Dutch, to round 4's notes features — the tags (nested, and the focus), photos in notes, how
 * many words the notes hold, find and replace, folding a section, callouts, archived notes, the writing view, locking a
 * note, saving a note as HTML, text or Word, the journal as an e-book or Word file, and importing from Evernote or Bear.
 * Notes are read only under NOVA's Notes scope (ZIGi does not read notes), never a locked note (LEDGER #318: NOVA's
 * sources leave them out, and so does this file), and never a note's words; the journal only where it is shared.
 * Called like `avAnswer` in engine.ts (the lead wires it); null when the question is not one of these.
 */
export function av2R4NotesAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of [lockNote, imports, journalBook, saveNote, findReplace, foldSection, callouts, writingView, archived, notePhotos, noteWords, tags]) {
      const r = one(a);
      if (r) return r;
    }
    return null;
  } catch { return null; }
}

const NOTES_CALL = [{tool: 'notes', args: {}, label: 'Notes'}], CALL = [{tool: 'journal', args: {}, label: 'Journal'}];
const NOTE = /\bnotes?\b/, NOTITIE = /\bnotities?\b|\bnotitie\w*\b/;
function notesOf(a: Asked, where: [string, string]): {record: Notes} | {shut: LocalReply} {
  const today = closed(a.env, 'today', 'search_notes'); if (today) return {shut: today};
  const record = a.env.nova?.notes;
  if (record) return {record: {...record, notes: readableNotes(record.notes)}};
  if (record === undefined && novaEnvInfo(a.env)) return {shut: {kind: 'refusal', text: novaAreaClosed('Notes', a.lang), calls: []}};
  if (record === null) return {shut: answer(say(a.lang, 'Your notes can’t be read on this device right now, so I can’t say.', 'Je notities kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'))};
  return {shut: answer(say(a.lang, `ZIGi doesn’t read your notes. Open ${where[0]} to see them; NOVA can answer this with Notes on in NOVA → Permissions.`, `ZIGi leest je notities niet. Open ${where[1]} om ze te zien; NOVA kan dit beantwoorden met Notes aan in NOVA → Permissions.`))};
}
const how = (a: Asked, en: string, nl: string) => answer(say(a.lang, en, nl), NOTES_CALL);

/**
 * LEDGER #306: "which nested tags do my notes have", "wat is mijn focustag". The plain "which tags do my notes have"
 * stays the earlier notes-per-tag answer (av2-journal.ts, in the pinned corpus), which now counts the #tags in the words too.
 */
function tags(a: Asked): LocalReply | null {
  const en = /\b(?:nested|sub ?tags?|focus(?:ed)? tag|tag focus|focus)\b/.test(a.f) && /\btags?\b/.test(a.f) && (NOTE.test(a.f) || /\bfocus tag\b/.test(a.f));
  const nl = (/\b(?:genest\w*|subtags?|focus\w*)\b/.test(a.f) && /\btags?\b|\bfocustag\b/.test(a.f)) || /\bfocustag\b/.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a, ['Notes → Notes → Tags', 'Notes → Notes → Tags']); if ('shut' in got) return got.shut;
  const tree = tagTree(got.record.notes), lang = a.lang, focus = got.record.focusTag;
  const focusLine = focus ? say(lang, ` Notes is focused on #${focus} now.`, ` Notes staat nu gefocust op #${focus}.`) : '';
  if (!tree.length) return how(a, 'No note has a tag yet. Write #travel anywhere in a note, or type it in its Tags field; a / nests one (#work/meetings).', 'Nog geen notitie heeft een tag. Schrijf #reizen ergens in een notitie, of typ het in het veld Tags; een / nest er een (#werk/overleg).');
  const tops = tree.filter(t => !t.depth), lines = tree.slice(0, 12).map(t => `• ${'  '.repeat(Math.min(t.depth, 3))}#${t.tag} (${count(t.count, lang, ['note', 'notes'], ['notitie', 'notities'])})`);
  return answer([say(lang, `Your notes use ${count(tops.length, 'en', ['tag', 'tags'], ['', ''])}${tree.length > tops.length ? `, with ${tree.length - tops.length} nested under them` : ''}:`, `Je notities gebruiken ${count(tops.length, 'nl', ['', ''], ['tag', 'tags'])}${tree.length > tops.length ? `, met ${tree.length - tops.length} eronder genest` : ''}:`), ...lines, say(lang, `Notes → Notes → Tags focuses Notes on one.${focusLine}`, `Notes → Notes → Tags zet de focus op één tag.${focusLine}`)].join('\n'), NOTES_CALL);
}
/** LEDGER #307: "which notes have photos", "welke notities hebben foto's". */
function notePhotos(a: Asked): LocalReply | null {
  const en = /\b(?:photos?|pictures?|images?)\b/.test(a.f) && NOTE.test(a.f) && !/\bjournal\b/.test(a.f), nl = /\b(?:fotos?|afbeeldingen?|plaatjes?)\b/.test(a.f) && NOTITIE.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a, ['a note', 'een notitie']); if ('shut' in got) return got.shut;
  const withPhotos = got.record.notes.filter(n => notePhotoIdsOf(n).length), lang = a.lang, total = withPhotos.reduce((s, n) => s + notePhotoIdsOf(n).length, 0);
  if (!withPhotos.length) return how(a, 'No note has a photo yet. Open a note and press Add a photo; a note holds up to eight, each placed in the words where you add it.', 'Nog geen notitie heeft een foto. Open een notitie en druk op Add a photo; een notitie houdt er tot acht, elk op de plek in de tekst waar je hem toevoegt.');
  const name = (n: Notes['notes'][number]) => n.kind === 'daily' && n.day ? n.day : `“${n.title.trim() || n.body.split('\n')[0]!.slice(0, 40)}”`;
  return answer(say(lang, `${count(total, 'en', ['photo', 'photos'], ['', ''])} in ${count(withPhotos.length, 'en', ['note', 'notes'], ['', ''])}: ${list(withPhotos.slice(0, 6).map(n => `${name(n)} (${notePhotoIdsOf(n).length})`), 'en')}. A note holds up to eight; they stay on this device.`,
    `${count(total, 'nl', ['', ''], ['foto', 'foto’s'])} in ${count(withPhotos.length, 'nl', ['', ''], ['notitie', 'notities'])}: ${list(withPhotos.slice(0, 6).map(n => `${name(n)} (${notePhotoIdsOf(n).length})`), 'nl')}. Een notitie houdt er tot acht; ze blijven op dit apparaat.`), NOTES_CALL);
}
/** LEDGER #311: "how many words are in my notes", "hoeveel woorden staan in mijn notities". */
function noteWords(a: Asked): LocalReply | null {
  const en = /\bwords?\b/.test(a.f) && NOTE.test(a.f) && /\bhow (?:many|much|long)\b|\bcount\b|\blongest\b/.test(a.f), nl = /\bwoorden\b/.test(a.f) && NOTITIE.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a, ['a note’s Note info', 'Note info bij een notitie']); if ('shut' in got) return got.shut;
  const rows = got.record.notes.map(n => ({n, w: countWords(n.body)})).filter(r => r.w > 0).sort((x, y) => y.w - x.w), lang = a.lang;
  if (!rows.length) return how(a, 'Your notes hold no words yet. An open note’s Note info says its words, characters and minutes to read.', 'Je notities hebben nog geen woorden. Note info bij een open notitie zegt de woorden, tekens en leesminuten.');
  const total = rows.reduce((s, r) => s + r.w, 0), top = rows[0]!, name = top.n.kind === 'daily' && top.n.day ? top.n.day : `“${top.n.title.trim() || 'Untitled note'}”`;
  return answer(say(lang, `Your notes hold ${count(total, 'en', ['word', 'words'], ['', ''])} in ${count(rows.length, 'en', ['note', 'notes'], ['', ''])}, about ${readMinutes(total)} min to read (an estimate at 230 words a minute). The longest is ${name} (${count(top.w, 'en', ['word', 'words'], ['', ''])}). An open note’s Note info says its own.`,
    `Je notities hebben ${count(total, 'nl', ['', ''], ['woord', 'woorden'])} in ${count(rows.length, 'nl', ['', ''], ['notitie', 'notities'])}, ongeveer ${readMinutes(total)} min lezen (een schatting bij 230 woorden per minuut). De langste is ${name} (${count(top.w, 'nl', ['', ''], ['woord', 'woorden'])}). Note info bij een open notitie zegt het per notitie.`), NOTES_CALL);
}
/** LEDGER #312: "how do I find and replace in a note", "hoe zoek en vervang ik in een notitie". */
function findReplace(a: Asked): LocalReply | null {
  if (!(/\breplace\b/.test(a.f) && NOTE.test(a.f)) && !(/\bvervang\w*\b/.test(a.f) && NOTITIE.test(a.f))) return null;
  return how(a, 'Open the note, press Edit, then Find and replace: type the words, step through each match with Next (Enter) and Previous, and press Replace or Replace all. Save keeps the earlier words under Earlier versions.',
    'Open de notitie, druk op Edit en dan op Find and replace: typ de woorden, loop door elke vondst met Next (Enter) en Previous, en druk op Replace of Replace all. Save bewaart de eerdere woorden onder Earlier versions.');
}
/** LEDGER #313: "how do I fold a section in a note", "hoe vouw ik een kop in een notitie in". */
function foldSection(a: Asked): LocalReply | null {
  if (!(/\b(?:fold|collapse)\w*\b/.test(a.f) && (NOTE.test(a.f) || /\bheadings?\b|\bsections?\b/.test(a.f))) && !(/\b(?:vouw|invouwen|inklappen|klap)\w*\b/.test(a.f) && (NOTITIE.test(a.f) || /\bkop(?:pen)?\b/.test(a.f)))) return null;
  return how(a, 'When you read a note, each heading has a fold button before it: it folds the words under it, up to the next heading of its level. Fold all and Open all do every heading at once. Folds last for this visit; nothing changes in the note.',
    'Als je een notitie leest, staat er voor elke kop een vouwknop: die vouwt de woorden eronder in, tot de volgende kop van zijn niveau. Fold all en Open all doen alle koppen tegelijk. Het vouwen geldt voor dit bezoek; de notitie verandert niet.');
}
/** LEDGER #314: "how do I add a callout to a note", "hoe maak ik een callout in een notitie". */
function callouts(a: Asked): LocalReply | null {
  if (!/\bcallouts?\b|\bkaders?\b|\bwaarschuwingsblok\w*\b/.test(a.f) || !(NOTE.test(a.f) || NOTITIE.test(a.f) || /\bcallouts?\b/.test(a.f))) return null;
  return how(a, 'Start a quote with a marker: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING] or > [!CAUTION], with words after it on the next > lines. Notes draws it as a calm box with its word. The Markdown export keeps it as written, so Obsidian and GitHub show it too.',
    'Begin een citaat met een teken: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING] of > [!CAUTION], met woorden op de volgende > regels. Notes tekent het als een rustig kader met zijn woord. De Markdown-export houdt het zoals geschreven, dus Obsidian en GitHub tonen het ook.');
}
/** LEDGER #316: "how do I write in full screen", "hoe schrijf ik in volledig scherm". */
function writingView(a: Asked): LocalReply | null {
  if (!/\bfull ?screen\b|\btypewriter\b|\bdistraction ?free\b|\bfocus(?:ed)? (?:writing|mode)\b/.test(a.f) && !/\bvolledig scherm\b|\bschrijfmachine\w*\b|\bzonder afleiding\b/.test(a.f)) return null;
  return how(a, 'Open a note, press Edit, then Write in full screen: only the note shows until Esc or Done, and your words go back to the note. Typewriter keeps the line you write in the middle of the screen; the choice stays on this device.',
    'Open een notitie, druk op Edit en dan op Write in full screen: alleen de notitie staat er tot Esc of Done, en je woorden gaan terug naar de notitie. Typewriter houdt de regel waarin je schrijft midden in beeld; die keuze blijft op dit apparaat.');
}
/** LEDGER #315: "which notes are archived", "welke notities zijn gearchiveerd". */
function archived(a: Asked): LocalReply | null {
  const en = /\barchiv\w*\b/.test(a.f) && NOTE.test(a.f), nl = /\b(?:gearchiveerd\w*|archief|archiveer\w*)\b/.test(a.f) && NOTITIE.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a, ['Notes → Notes → Archived', 'Notes → Notes → Archived']); if ('shut' in got) return got.shut;
  const list2 = got.record.notes.filter(n => n.archived), lang = a.lang, name = (n: Notes['notes'][number]) => n.kind === 'daily' && n.day ? n.day : `“${n.title.trim() || 'Untitled note'}”`;
  if (!list2.length) return how(a, 'No note is archived. Archive (on an open note) takes a note out of the list and the graph; it stays in Search and the export, and Back to the list brings it back.', 'Geen notitie is gearchiveerd. Archive (bij een open notitie) haalt een notitie uit de lijst en de grafiek; ze blijft in Search en de export, en Back to the list zet haar terug.');
  return answer(say(lang, `${count(list2.length, 'en', ['note is', 'notes are'], ['', ''])} archived: ${list(list2.slice(0, 8).map(name), 'en')}. They are under Notes → Notes → Archived and still in Search.`,
    `${count(list2.length, 'nl', ['', ''], ['notitie is', 'notities zijn'])} gearchiveerd: ${list(list2.slice(0, 8).map(name), 'nl')}. Ze staan onder Notes → Notes → Archived en nog in Search.`), NOTES_CALL);
}
/** LEDGER #318: "how do I lock a note", "hoe vergrendel ik een notitie" (how only: a locked note is never read here). */
function lockNote(a: Asked): LocalReply | null {
  if (!(/\b(?:lock|locked|locking|password|passcode|pin)\b/.test(a.f) && NOTE.test(a.f)) && !(/\b(?:vergrendel\w*|op slot|slot|wachtwoord|pincode)\b/.test(a.f) && NOTITIE.test(a.f))) return null;
  return how(a, 'Open the note and press Lock this note. It then shows only after this device’s screen-cover PIN (Settings → Account & devices), and stays out of Search, the Graph, NOVA and the Markdown export — so I never read a locked note. Its words are hidden, not encrypted: they stay in this browser and in Export everything.',
    'Open de notitie en druk op Lock this note. Ze toont dan pas na de pincode van de schermafdekking van dit apparaat (Settings → Account & devices), en blijft uit Search, de grafiek, NOVA en de Markdown-export — ik lees een vergrendelde notitie dus nooit. De woorden zijn verborgen, niet versleuteld: ze blijven in deze browser en in Export everything.');
}
/** LEDGER #319: "can I export a note as word", "kan ik een notitie als word opslaan". */
function saveNote(a: Asked): LocalReply | null {
  const en = /\b(?:word|docx|html|web page|plain text|txt|text file)\b/.test(a.f) && NOTE.test(a.f) && /\b(?:export|save|download|share|file)\w*\b/.test(a.f) && !/\bhow many words\b/.test(a.f);
  const nl = /\b(?:word|docx|html|webpagina|platte tekst|txt|tekstbestand)\b/.test(a.f) && NOTITIE.test(a.f) && /\b(?:exporte\w*|opslaan|bewaren|downloaden|delen|bestand)\b/.test(a.f);
  if (!en && !nl) return null;
  return how(a, 'Yes. Open the note and press Save this note as…: an HTML page (its photos inside), plain text, or a Word file (.docx). Each is made on this device and saved where you choose.',
    'Ja. Open de notitie en druk op Save this note as…: een HTML-pagina (met de foto’s erin), platte tekst of een Word-bestand (.docx). Elk wordt op dit apparaat gemaakt en bewaard waar jij kiest.');
}
/** LEDGER #320: "can I export my journal as an ebook", "kan ik mijn dagboek als e-book exporteren". */
function journalBook(a: Asked): LocalReply | null {
  const en = /\b(?:e ?book|epub|word|docx|kindle|book)\b/.test(a.f) && /\b(?:journal|diary|entries)\b/.test(a.f) && /\b(?:export|save|make|turn|download|print)\w*\b|\bas an?\b/.test(a.f);
  const nl = /\b(?:e ?book|epub|word|docx|boek)\b/.test(a.f) && /\bdagboek\w*\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const n = a.env.journal!.entries.length, lang = a.lang;
  return answer(say(lang, `Yes. Journal → Import and export → E-book and Word: choose a journal and the days from and to, then Save as e-book (.epub, a chapter per month with a contents page and your photos) or Save as Word (.docx). Letters that have not opened yet stay out. You have ${count(n, 'en', ['entry', 'entries'], ['', ''])}.`,
    `Ja. Journal → Import and export → E-book and Word: kies een dagboek en de dagen van en tot, dan Save as e-book (.epub, een hoofdstuk per maand met een inhoud en je foto’s) of Save as Word (.docx). Brieven die nog niet open zijn blijven eruit. Je hebt ${count(n, 'nl', ['', ''], ['stuk', 'stukken'])}.`), CALL);
}
/** LEDGER #321: "can I import my notes from evernote", "kan ik mijn notities uit bear importeren". */
function imports(a: Asked): LocalReply | null {
  const app = /\b(?:evernote|enex|textbundle|bear2bk)\b/.test(a.f) || (/\bbear\b/.test(a.f) && (NOTE.test(a.f) || NOTITIE.test(a.f)));
  if (!app || !/\b(?:import|move|bring|switch|from|importe\w*|overzetten|over|uit|van)\b/.test(a.f)) return null;
  return how(a, 'Yes. Notes → Files → Choose files to import takes Evernote’s export (.enex) and Bear’s (.bear2bk backups, .textbundle and .textpack): titles, days, tags, the words with their lists and to-dos, and up to eight photos a note. You see what would come in before anything is saved, and Undo takes it back.',
    'Ja. Notes → Files → Choose files to import neemt de export van Evernote (.enex) en van Bear (.bear2bk-back-ups, .textbundle en .textpack): titels, dagen, tags, de woorden met lijsten en taken, en tot acht foto’s per notitie. Je ziet eerst wat er binnenkomt, en Undo draait het terug.');
}
