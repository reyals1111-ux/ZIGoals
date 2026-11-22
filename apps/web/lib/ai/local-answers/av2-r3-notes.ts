import type {ToolEnv} from '../tools/env';
import type {Journal} from '../../journal/schema';
import type {Notes} from '../../notes/schema';
import {openTicks} from '../../notes/ticks';
import {parseBlocks, plainText, type NoteInline} from '../safe-render';
import {propNames, choiceValues} from '../../notes/props';
import {canvasesOf} from '../../notes/canvas';
import {promptsUsed} from '../../journal/prompt-answers';
import {periodWords, periodsWritten} from '../../journal/periods';
import {quoteOfTheDay, quoteSource} from '../../journal/quotes';
import {dreamNights, dreamsBook} from '../../journal/dreams';
import {lettersAhead, lettersOpen} from '../../journal/letters';
import {novaAreaClosed, novaEnvInfo} from './nova-env';
import {answer, asked, closed, count, dayIn, isQuestion, journalClosed, list, MIXED, monthIn, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r3-notes, LEDGER #264–#273, #277–#279; Obsidian, Grid Diary, Stoic): NOVA's and ZIGi's on-device
 * answers, in English and Dutch, to what round 3's notes and journal features hold — the open tick boxes across notes,
 * highlights, printing a note, a note's own properties and the board by them, the canvas boards, the prompts written
 * from, the Mandala grid, week / month / year entries, the journal as Markdown, today's Stoic quote, dreams from the
 * sleep log, and letters to open later. Each reads the feature's own pure function, notes only under NOVA's Notes scope
 * (ZIGi does not read notes) and the journal only where it is shared (av-words.ts journalClosed). A letter's words are
 * never said; a dream's or an entry's words are never quoted. Called like `avAnswer` in engine.ts (the lead wires it);
 * null when the question is not one of these.
 */
export function av2R3NotesAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of [openTickBoxes, highlights, printNote, noteProps, canvases, promptsWritten, mandala, periodEntries, journalMarkdown, stoicQuote, dreams, letters]) {
      const r = one(a);
      if (r) return r;
    }
    return null;
  } catch { return null; }
}

const NOTES_CALL = [{tool: 'notes', args: {}, label: 'Notes'}], CALL = [{tool: 'journal', args: {}, label: 'Journal'}];
const journalOf = (a: Asked): Journal => a.env.journal!;
type Where = [string, string];
function notesOf(a: Asked, where: Where): {record: Notes} | {shut: LocalReply} {
  const today = closed(a.env, 'today', 'search_notes'); if (today) return {shut: today};
  const record = a.env.nova?.notes;
  if (record) return {record};
  if (record === undefined && novaEnvInfo(a.env)) return {shut: {kind: 'refusal', text: novaAreaClosed('Notes', a.lang), calls: []}};
  if (record === null) return {shut: answer(say(a.lang, 'Your notes can’t be read on this device right now, so I can’t say.', 'Je notities kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'))};
  return {shut: answer(say(a.lang, `ZIGi doesn’t read your notes. Open ${where[0]} to see them; NOVA can answer this with Notes on in NOVA → Permissions.`, `ZIGi leest je notities niet. Open ${where[1]} om ze te zien; NOVA kan dit beantwoorden met Notes aan in NOVA → Permissions.`))};
}
const noteWord = (lang: Lang, n: {kind: string; day?: string; name: string}, today: string) => n.kind === 'daily' && n.day ? dayIn(lang, n.day, today) : `“${n.name}”`;
const short = (s: string, max = 60) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t; };

/** LEDGER #264: "which tick boxes are open in my notes", "welke vinkjes staan nog open in mijn notities". */
function openTickBoxes(a: Asked): LocalReply | null {
  const en = /\b(?:tick ?box(?:es)?|check ?box(?:es)?|checklists?|to ?dos?)\b/.test(a.f) && /\bnotes?\b/.test(a.f) && !/\btasks?\b/.test(a.f);
  const nl = /\b(?:vinkjes?|aanvinkvak(?:jes|ken)?|selectievak(?:jes|ken)?)\b/.test(a.f) && /\bnotities?\b/.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a, ['Notes → Notes → Open tick boxes', 'Notes → Notes → Open tick boxes']); if ('shut' in got) return got.shut;
  const open = openTicks(got.record.notes), lang = a.lang;
  if (!open.length) return answer(say(lang, 'No open tick box in your notes. A line that starts with - [ ] is one; Notes → Notes → Open tick boxes gathers them.', 'Geen open vinkje in je notities. Een regel die begint met - [ ] is er een; Notes → Notes → Open tick boxes verzamelt ze.'), NOTES_CALL);
  const lines = open.slice(0, 8).map(t => `• ${short(plainText(parseBlocks(t.text, {notes: true})))} (${noteWord(lang, t, a.today)})`);
  return answer([say(lang, `${count(open.length, 'en', ['open tick box', 'open tick boxes'], ['', ''])} in your notes${open.length > 8 ? ', the most recent first' : ''}:`, `${count(open.length, 'nl', ['', ''], ['open vinkje', 'open vinkjes'])} in je notities${open.length > 8 ? ', de nieuwste eerst' : ''}:`), ...lines].join('\n'), NOTES_CALL);
}
/** LEDGER #267: "what did I highlight in my notes", "wat heb ik gemarkeerd in mijn notities". */
function highlights(a: Asked): LocalReply | null {
  const en = /\bhighlight(?:s|ed)?\b/.test(a.f) && /\bnotes?\b/.test(a.f), nl = /\b(?:gemarkeerd|markeringen|markering|gemarkeerde)\b/.test(a.f) && /\bnotities?\b/.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a, ['your notes', 'je notities']); if ('shut' in got) return got.shut;
  const found: {words: string; colour: string; note: string}[] = [];
  const walk = (nodes: readonly NoteInline[], note: string) => { for (const n of nodes) { if (n.type === 'mark') found.push({words: plainText([{type: 'paragraph', children: n.children}]), colour: n.colour, note}); else if (n.type === 'strong' || n.type === 'em') walk(n.children, note); } };
  for (const n of got.record.notes) for (const b of parseBlocks(n.body, {notes: true})) {
    const name = n.kind === 'daily' && n.day ? n.day : n.title.trim() || n.body.split('\n')[0]!.slice(0, 40);
    if (b.type === 'paragraph' || b.type === 'heading' || b.type === 'quote') walk(b.children, name); else if (b.type === 'list') for (const it of b.items) walk(it, name);
  }
  const lang = a.lang, NL: Record<string, string> = {yellow: 'geel', green: 'groen', blue: 'blauw', purple: 'paars', red: 'rood', orange: 'oranje'};
  if (!found.length) return answer(say(lang, 'Nothing is highlighted in your notes yet. Put == round words (==like this==), or choose words while you edit a note and press Highlight.', 'Er is nog niets gemarkeerd in je notities. Zet == om woorden (==zo==), of kies woorden terwijl je een notitie bewerkt en druk op Highlight.'), NOTES_CALL);
  return answer([say(lang, `${count(found.length, 'en', ['highlight', 'highlights'], ['', ''])} in your notes:`, `${count(found.length, 'nl', ['', ''], ['markering', 'markeringen'])} in je notities:`), ...found.slice(0, 8).map(h => `• ${short(h.words)} (${lang === 'nl' ? NL[h.colour] : h.colour}, “${short(h.note, 40)}”)`)].join('\n'), NOTES_CALL);
}
/** LEDGER #271: "how do I print a note", "hoe print ik een notitie" (where it is; nothing read). */
function printNote(a: Asked): LocalReply | null {
  const en = /\b(?:print|pdf)\b/.test(a.f) && /\bnotes?\b/.test(a.f) && !/\btasks?\b|\bjournal\b/.test(a.f);
  const nl = /\b(?:print|printen|afdrukken|pdf)\b/.test(a.f) && /\bnotities?\b/.test(a.f);
  if (!en && !nl) return null;
  return answer(say(a.lang, 'Open the note and press Print this note: the print window shows its title, day, words and photo. Choose Save as PDF there for a PDF. Nothing leaves your device.', 'Open de notitie en druk op Print this note: het printvenster toont de titel, de dag, de woorden en de foto. Kies daar Opslaan als PDF voor een pdf. Er gaat niets van je apparaat af.'), NOTES_CALL);
}
/** LEDGER #270: "which properties do my notes have", "welke eigenschappen hebben mijn notities". */
function noteProps(a: Asked): LocalReply | null {
  const en = /\b(?:properties|property|fields)\b/.test(a.f) && /\bnotes?\b/.test(a.f) && !/\btasks?\b|\bprojects?\b/.test(a.f);
  const nl = /\b(?:eigenschappen|eigenschap|velden)\b/.test(a.f) && /\bnotities?\b/.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a, ['a note’s Properties', 'Properties bij een notitie']); if ('shut' in got) return got.shut;
  const names = propNames(got.record.notes), lang = a.lang, NLT: Record<string, string> = {text: 'tekst', number: 'getal', date: 'dag', choice: 'keuze', tick: 'vinkje'};
  if (!names.length) return answer(say(lang, 'No note has its own properties yet. Open a note, then Properties, to add a status, a day, a number or a tick; Notes → Table and Board then show them.', 'Nog geen notitie heeft eigen eigenschappen. Open een notitie en dan Properties om een status, dag, getal of vinkje toe te voegen; Notes → Table en Board tonen ze dan.'), NOTES_CALL);
  const lines = names.slice(0, 10).map(p => { const vals = p.type === 'choice' ? choiceValues(got.record.notes, p.name) : []; return `• ${p.name} (${lang === 'nl' ? NLT[p.type] : p.type}, ${count(p.count, lang, ['note', 'notes'], ['notitie', 'notities'])}${vals.length ? `: ${list(vals.slice(0, 5), lang)}` : ''})`; });
  return answer([say(lang, `Your notes use ${count(names.length, 'en', ['property', 'properties'], ['', ''])}:`, `Je notities gebruiken ${count(names.length, 'nl', ['', ''], ['eigenschap', 'eigenschappen'])}:`), ...lines, say(lang, 'Notes → Notes → Board groups them by a choice.', 'Notes → Notes → Board groepeert ze op een keuze.')].join('\n'), NOTES_CALL);
}
/** LEDGER #273: "which canvases do I have", "welke canvassen heb ik". */
function canvases(a: Asked): LocalReply | null {
  const en = /\bcanvas(?:es|ses)?\b/.test(a.f), nl = /\bcanvas(?:sen)?\b/.test(a.f) && /\b(?:welke|hoeveel|mijn|heb)\b/.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a, ['Notes → Canvas', 'Notes → Canvas']); if ('shut' in got) return got.shut;
  const boards = canvasesOf(got.record), lang = a.lang;
  if (!boards.length) return answer(say(lang, 'No canvas yet. Notes → Canvas makes a board where you place notes, words and photos by hand and join them with labelled lines.', 'Nog geen canvas. Notes → Canvas maakt een bord waarop je notities, woorden en foto’s zelf neerlegt en met lijnen verbindt.'), NOTES_CALL);
  const lines = boards.map(b => `• ${b.name} (${count(b.nodes.filter(n => n.type !== 'group').length, lang, ['card', 'cards'], ['kaart', 'kaarten'])}, ${count(b.edges.length, lang, ['line', 'lines'], ['lijn', 'lijnen'])})`);
  return answer([say(lang, `${count(boards.length, 'en', ['canvas', 'canvases'], ['', ''])} in Notes → Canvas:`, `${count(boards.length, 'nl', ['', ''], ['canvas', 'canvassen'])} in Notes → Canvas:`), ...lines].join('\n'), NOTES_CALL);
}
/** LEDGER #265: "which prompts have I written from", "vanuit welke prompts heb ik geschreven". */
function promptsWritten(a: Asked): LocalReply | null {
  const en = /\b(?:prompts?|templates?)\b/.test(a.f) && /\b(?:written|wrote|answers?|answered|used)\b/.test(a.f) && !/\btasks?\b/.test(a.f);
  const nl = /\b(?:prompts?|sjablonen|sjabloon)\b/.test(a.f) && /\b(?:geschreven|schreef|antwoorden|gebruikt)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const used = promptsUsed(journalOf(a), a.lang), lang = a.lang;
  if (!used.length) return answer(say(lang, 'No entry began from a prompt yet. In Journal → Write, Start from a prompt; then Every answer to a prompt shows what you wrote under each heading.', 'Nog geen stuk begon met een prompt. Kies in Journal → Write Start from a prompt; daarna toont Every answer to a prompt wat je onder elke kop schreef.'), CALL);
  return answer(say(lang, `You wrote from ${count(used.length, 'en', ['prompt', 'prompts'], ['', ''])}: ${list(used.slice(0, 6).map(u => `${u.title} (${u.count === 1 ? '1 entry' : `${u.count} entries`})`), 'en')}. Journal → Entries → Every answer to a prompt shows what you wrote under each heading.`,
    `Je schreef vanuit ${count(used.length, 'nl', ['', ''], ['prompt', 'prompts'])}: ${list(used.slice(0, 6).map(u => `${u.title} (${u.count === 1 ? '1 stuk' : `${u.count} stukken`})`), 'nl')}. Journal → Entries → Every answer to a prompt toont wat je onder elke kop schreef.`), CALL);
}
/** LEDGER #266: "how do I make a mandala in my journal", "hoe maak ik een mandala in mijn dagboek". */
function mandala(a: Asked): LocalReply | null {
  if (!/\bmandala\b/.test(a.f) && !(/\bgrid\b/.test(a.f) && /\b(?:journal|entry|diary)\b/.test(a.f)) && !(/\braster\b/.test(a.f) && /\bdagboek\w*\b/.test(a.f))) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const n = journalOf(a).entries.filter(e => e.template === 'mandala').length, lang = a.lang;
  return answer(say(lang, `Journal → Write → Start from a prompt → Grids and look-backs → Mandala: your theme in the centre and eight sides of life around it, as a 3 × 3 grid. Any other template can be written as a grid too (Write as a grid). ${n ? `You have ${n === 1 ? '1 Mandala entry' : `${n} Mandala entries`}.` : 'No Mandala entry yet.'}`,
    `Journal → Write → Start from a prompt → Grids and look-backs → Mandala: je thema in het midden en acht kanten van je leven eromheen, als raster van 3 × 3. Elk ander sjabloon kan ook als raster (Write as a grid). ${n ? `Je hebt ${n === 1 ? '1 Mandala-stuk' : `${n} Mandala-stukken`}.` : 'Nog geen Mandala-stuk.'}`), CALL);
}
/** LEDGER #269: "which week or month entries do I have", "welke terugblikken heb ik". */
function periodEntries(a: Asked): LocalReply | null {
  const en = /\b(?:week|month|year)(?:ly)? (?:entries|entry|look ?backs?)\b|\blook ?backs?\b|\bentries (?:about|for) (?:a |the )?(?:week|month|year)\b/.test(a.f);
  const nl = /\bterugblik(?:ken)?\b|\b(?:week|maand|jaar)stuk(?:ken)?\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const p = periodsWritten(journalOf(a).entries), lang = a.lang;
  const words = (x: {period: string; kind: string}) => lang === 'en' ? periodWords(x.period) : x.kind === 'week' ? `week ${Number(x.period.slice(6))} van ${x.period.slice(0, 4)}` : x.kind === 'month' ? monthIn('nl', x.period) : x.period;
  if (!p.length) return answer(say(lang, 'No entry about a week, a month or a year yet. When you write, choose This entry is about: this or last week, month or year; a look-back template is offered for each.', 'Nog geen stuk over een week, maand of jaar. Kies bij het schrijven This entry is about: deze of vorige week, maand of jaar; voor elk is er een terugblik-sjabloon.'), CALL);
  return answer(say(lang, `${count(p.length, 'en', ['period', 'periods'], ['', ''])} with an entry about it: ${list(p.slice(0, 6).map(words), 'en')}. Search by date lists them under their week, month or year.`,
    `${count(p.length, 'nl', ['', ''], ['periode', 'periodes'])} met een stuk erover: ${list(p.slice(0, 6).map(words), 'nl')}. Search by date toont ze onder hun week, maand of jaar.`), CALL);
}
/** LEDGER #272: "can I export my journal as markdown", "kan ik mijn dagboek als markdown exporteren". */
function journalMarkdown(a: Asked): LocalReply | null {
  const en = /\bmarkdown\b|\bobsidian\b/.test(a.f) && /\b(?:journal|diary|entries)\b/.test(a.f), nl = /\bmarkdown\b|\bobsidian\b/.test(a.f) && /\bdagboek\w*\b/.test(a.f);
  if (!en && !nl) return null;
  return answer(say(a.lang, 'Yes. Journal → Import and export → Export the journal makes one ZIP: journal.json, and every entry as its own Markdown file in Markdown/ (its day, journal and tags at the top, its photos beside it) for Obsidian and other apps. Import reads the same ZIP back without doubling anything.',
    'Ja. Journal → Import and export → Export the journal maakt één ZIP: journal.json, en elk stuk als eigen Markdown-bestand in Markdown/ (de dag, het dagboek en de tags bovenaan, de foto’s ernaast) voor Obsidian en andere apps. Import leest dezelfde ZIP terug zonder iets dubbel te zetten.'), CALL);
}
/** LEDGER #277: "what is today's stoic quote", "wat is het citaat van vandaag". */
function stoicQuote(a: Asked): LocalReply | null {
  const en = /\bstoic\b|\b(?:quote|quotation) (?:of the day|for today|today)\b|\btoday s quote\b|\bmarcus aurelius\b|\bseneca\b|\bepictetus\b/.test(a.f) && !/\baffirmation\b/.test(a.f);
  const nl = /\b(?:citaat|stoicijn\w*|sto[iï]sch\w*)\b/.test(a.f);
  if (!en && !nl) return null;
  const q = quoteOfTheDay(a.today), on = a.env.journal?.quotes === true, lang = a.lang;
  return answer(say(lang, `Today’s quote: “${q.en}” — ${quoteSource(q, 'en')}.${on ? ' It is on your Today screen, with Another one and Write about this.' : ' To see one each day on Today, switch it on in Journal → Privacy.'}`,
    `Het citaat van vandaag: “${q.nl}” — ${quoteSource(q, 'nl')} (Nederlandse woorden geschreven voor ZIGoals).${on ? ' Het staat op je Today-scherm, met Nog een en Schrijf hierover.' : ' Wil je er elke dag een op Today zien, zet het dan aan in Journal → Privacy.'}`), CALL);
}
/** LEDGER #278: "which dreams did I write down", "welke dromen heb ik opgeschreven" (nights and counts; never a dream's words). */
function dreams(a: Asked): LocalReply | null {
  if (!/\bdreams?\b|\bdreamt\b|\bdreamed\b/.test(a.f) && !/\bdro(?:om|men)\b|\bgedroomd\b/.test(a.f)) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const nights = dreamNights(journalOf(a).entries), lang = a.lang, book = dreamsBook(journalOf(a));
  if (!nights.length) return answer(say(lang, 'No dream written down yet. In Health → Sleep, the latest night has Write down a dream; it goes in a Dreams journal and shows on that night.', 'Nog geen droom opgeschreven. In Health → Sleep heeft de laatste nacht Write down a dream; die komt in een Dreams-dagboek en staat bij die nacht.'), CALL);
  const total = nights.reduce((n, x) => n + x.count, 0);
  return answer(say(lang, `${count(total, 'en', ['dream', 'dreams'], ['', ''])} written down, for ${count(nights.length, 'en', ['night', 'nights'], ['', ''])}; the latest for the night ending ${dayIn('en', nights[0]!.night, a.today)}.${book ? ` They are in your ${book.name} journal.` : ''}`,
    `${count(total, 'nl', ['', ''], ['droom', 'dromen'])} opgeschreven, voor ${count(nights.length, 'nl', ['', ''], ['nacht', 'nachten'])}; de laatste voor de nacht tot ${dayIn('nl', nights[0]!.night, a.today)}.${book ? ` Ze staan in je dagboek ${book.name}.` : ''}`), CALL);
}
/** LEDGER #279: "when does my letter open", "wanneer gaat mijn brief open" (days only; never a letter's words). */
function letters(a: Asked): LocalReply | null {
  const en = /\bletters?\b/.test(a.f) && /\b(?:open|opens|opening|future|later|sealed)\b/.test(a.f), nl = /\bbrie(?:f|ven)\b/.test(a.f) && /\b(?:open|opent|openen|toekomst\w*|later|dicht)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const e = journalOf(a).entries, ahead = lettersAhead(e, a.today), opened = lettersOpen(e, a.today), lang = a.lang;
  if (!ahead.length && !opened.length) return answer(say(lang, 'No letter to open later. When you write, choose Open it later, as a letter (in a month, six months, a year or a day you pick); it stays folded away until then.', 'Geen brief om later te openen. Kies bij het schrijven Open it later, as a letter (over een maand, een half jaar, een jaar of op een dag die je kiest); tot dan blijft hij dicht.'), CALL);
  const now = opened.length ? say(lang, ` ${opened.length === 1 ? 'A letter opened' : `${opened.length} letters opened`} this week: Today shows it.`, ` Deze week ${opened.length === 1 ? 'ging een brief open' : `gingen ${opened.length} brieven open`}: Today toont hem.`) : '';
  if (!ahead.length) return answer(say(lang, `No letter is still folded away.${now}`, `Er is geen brief meer dicht.${now}`).trim(), CALL);
  return answer(say(lang, `${count(ahead.length, 'en', ['letter', 'letters'], ['', ''])} folded away; the next opens ${dayIn('en', ahead[0]!.opensOn!, a.today)}.${now}`, `${count(ahead.length, 'nl', ['', ''], ['brief', 'brieven'])} nog dicht; de volgende gaat open op ${dayIn('nl', ahead[0]!.opensOn!, a.today)}.${now}`), CALL);
}
