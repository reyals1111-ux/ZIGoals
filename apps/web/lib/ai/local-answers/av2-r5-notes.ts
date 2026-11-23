import type {ToolEnv} from '../tools/env';
import {type Notes} from '../../notes/schema';
import {readableNotes} from '../../notes/lock';
import {allCards} from '../../notes/cards';
import {tagTemplatesOf} from '../../notes/tag-templates';
import {novaAreaClosed, novaEnvInfo} from './nova-env';
import {answer, asked, closed, count, isQuestion, list, MIXED, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r5-notes, LEDGER #355, #358–#367; Logseq, Craft, Akiflow): NOVA's and ZIGi's on-device answers, in
 * English and Dutch, to round 5's notes features — Recently deleted, acting on several notes at once, mentions without a
 * link, a section of another note inside one, templates for a tag, changing a table, a note for a calendar event, daily
 * notes for a range of days, a note's look, cards to review, and files on a task. Notes are read only under NOVA's Notes
 * scope (ZIGi does not read notes), never a locked note, never a note in Recently deleted by its words, and never a
 * note's words at all (counts and names only); a card is counted, never quoted. Called like `avAnswer` in engine.ts (the
 * lead wires it); null when the question is not one of these.
 */
export function av2R5NotesAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of [taskFiles, eventNote, dailyRange, recentlyDeleted, cards, tagTemplates, embed, unlinked, several, tables, look]) {
      const r = one(a);
      if (r) return r;
    }
    return null;
  } catch { return null; }
}

const NOTES_CALL = [{tool: 'notes', args: {}, label: 'Notes'}];
const NOTE = /\bnotes?\b/, NOTITIE = /\bnotities?\b|\bnotitie\w*\b/;
const notesQ = (a: Asked) => NOTE.test(a.f) || NOTITIE.test(a.f);
function notesOf(a: Asked, where: [string, string]): {record: Notes} | {shut: LocalReply} {
  const today = closed(a.env, 'today', 'search_notes'); if (today) return {shut: today};
  const record = a.env.nova?.notes;
  if (record) return {record: {...record, notes: readableNotes(record.notes)}};
  if (record === undefined && novaEnvInfo(a.env)) return {shut: {kind: 'refusal', text: novaAreaClosed('Notes', a.lang), calls: []}};
  if (record === null) return {shut: answer(say(a.lang, 'Your notes can’t be read on this device right now, so I can’t say.', 'Je notities kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'))};
  return {shut: answer(say(a.lang, `ZIGi doesn’t read your notes. Open ${where[0]} to see them; NOVA can answer this with Notes on in NOVA → Permissions.`, `ZIGi leest je notities niet. Open ${where[1]} om ze te zien; NOVA kan dit beantwoorden met Notes aan in NOVA → Permissions.`))};
}
const how = (a: Asked, en: string, nl: string) => answer(say(a.lang, en, nl), NOTES_CALL);
const nameOf = (n: Notes['notes'][number]) => n.kind === 'daily' && n.day ? n.day : `“${n.title.trim() || 'Untitled note'}”`;

/** LEDGER #360: "which notes are in recently deleted", "hoe zet ik een verwijderde notitie terug". */
function recentlyDeleted(a: Asked): LocalReply | null {
  const en = (/\brecently deleted\b|\btrash\b|\bbin\b/.test(a.f) && notesQ(a)) || (/\b(?:deleted|removed)\b/.test(a.f) && NOTE.test(a.f) && /\b(?:restore|back|undelete|recover|get back|which|how many|where)\b/.test(a.f));
  const nl = /\b(?:verwijder\w*|prullenbak)\b/.test(a.f) && NOTITIE.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a, ['Notes → Notes → Recently deleted', 'Notes → Notes → Recently deleted']); if ('shut' in got) return got.shut;
  const trash = got.record.trash ?? [], open = trash.filter(n => !n.locked), lang = a.lang;
  if (!trash.length) return how(a, 'Recently deleted is empty. A note you delete waits there 30 days (Notes → Notes → Recently deleted), with its photos, and Restore brings it back in one tap.', 'Recently deleted is leeg. Een notitie die je verwijdert wacht daar 30 dagen (Notes → Notes → Recently deleted), met haar foto’s, en Restore zet haar in één tik terug.');
  const named = open.length ? say(lang, `: ${list(open.slice(0, 6).map(nameOf), 'en')}`, `: ${list(open.slice(0, 6).map(nameOf), 'nl')}`) : '';
  return answer(say(lang, `${count(trash.length, 'en', ['note waits', 'notes wait'], ['', ''])} in Recently deleted${named}. Each stays 30 days from when it was deleted; Notes → Notes → Recently deleted → Restore brings one back, and Empty now removes them for good.`,
    `${count(trash.length, 'nl', ['', ''], ['notitie wacht', 'notities wachten'])} in Recently deleted${named}. Elk blijft 30 dagen vanaf het verwijderen; Notes → Notes → Recently deleted → Restore zet er een terug, en Empty now verwijdert ze voorgoed.`), NOTES_CALL);
}
/** LEDGER #359: "how do I tag several notes at once", "hoe archiveer ik meerdere notities tegelijk". */
function several(a: Asked): LocalReply | null {
  const en = /\b(?:several|multiple|many|all|bulk|batch)\b/.test(a.f) && /\bnotes\b/.test(a.f) && /\b(?:at once|together|in one go|bulk|batch|select\w*)\b/.test(a.f);
  const nl = /\b(?:meerdere|alle|veel)\b/.test(a.f) && /\bnotities\b/.test(a.f) && /\b(?:tegelijk\w*|in een keer|selecteer\w*)\b/.test(a.f);
  if (!en && !nl) return null;
  return how(a, 'In Notes → Notes, press Select, tick the notes, then Add tag, Remove tag, Pin, Unpin, Archive or Delete: one step for all of them, and one Undo in the message puts them back.',
    'Druk in Notes → Notes op Select, vink de notities aan, en kies Add tag, Remove tag, Pin, Unpin, Archive of Delete: één stap voor allemaal, en één Undo in het bericht zet ze terug.');
}
/** LEDGER #358: "which notes mention this note without a link", "hoe vind ik vermeldingen zonder link". */
function unlinked(a: Asked): LocalReply | null {
  const en = /\b(?:unlinked|without (?:a )?links?|not linked|mentions?)\b/.test(a.f) && (notesQ(a) || /\breferences?\b/.test(a.f)) && !/\btask\b/.test(a.f);
  const nl = /\b(?:zonder (?:een )?link|vermeld\w*|genoemd)\b/.test(a.f) && (NOTITIE.test(a.f) || /\blink\b/.test(a.f));
  if (!en && !nl) return null;
  return how(a, 'Open a note: under the notes that link to it, Mentioned without a link lists the notes that name its title in their words without linking it, each with its line. Link it makes that place a [[link]]; the earlier words are kept under Earlier versions, and Undo is in the message.',
    'Open een notitie: onder de notities die ernaar linken staat Mentioned without a link, met de notities die haar titel noemen zonder te linken, elk met de regel. Link it maakt van die plek een [[link]]; de eerdere woorden blijven onder Earlier versions, en Undo staat in het bericht.');
}
/** LEDGER #361: "how do I embed a section of another note", "hoe toon ik een deel van een andere notitie". */
function embed(a: Asked): LocalReply | null {
  const en = /\b(?:embed\w*|transclu\w*|block ref\w*|show (?:a |the )?(?:section|part|heading|line) of)\b/.test(a.f) && (notesQ(a) || /\b(?:section|heading)\b/.test(a.f));
  const nl = /\b(?:insluit\w*|ingesloten|embed\w*|deel van (?:een )?andere|kop van (?:een )?andere)\b/.test(a.f) && (NOTITIE.test(a.f) || /\bkop\b/.test(a.f));
  if (!en && !nl) return null;
  return how(a, 'Write a line with only ![[Note name#Heading]] (or ![[Note name]] for all of it). When you read the note, that section of the other note shows there as a quote that follows it, with a link to it; it never changes the other note, and a locked note shows nothing of itself. Obsidian reads the same line.',
    'Schrijf een regel met alleen ![[Notitienaam#Kop]] (of ![[Notitienaam]] voor alles). Als je de notitie leest, staat dat deel van de andere notitie daar als citaat dat meegaat, met een link ernaartoe; de andere notitie verandert nooit, en een vergrendelde notitie toont niets van zichzelf. Obsidian leest dezelfde regel.');
}
/** LEDGER #362: "which tags have a template", "welke tags hebben een sjabloon". */
function tagTemplates(a: Asked): LocalReply | null {
  const en = /\btemplates?\b/.test(a.f) && /\btags?\b/.test(a.f), nl = /\b(?:sjablo\w*|template\w*)\b/.test(a.f) && /\btags?\b/.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a, ['Notes → Notes → Templates for tags', 'Notes → Notes → Templates for tags']); if ('shut' in got) return got.shut;
  const t = tagTemplatesOf(got.record), lang = a.lang;
  if (!t.length) return how(a, 'No tag has a template yet. Notes → Notes → Templates for tags sets words on a tag such as #meeting; a new, still empty note given that tag starts from them once.', 'Nog geen tag heeft een sjabloon. Notes → Notes → Templates for tags zet woorden op een tag zoals #overleg; een nieuwe, nog lege notitie met die tag begint er één keer mee.');
  return answer(say(lang, `${count(t.length, 'en', ['tag has', 'tags have'], ['', ''])} a template: ${list(t.map(x => `#${x.tag}`), 'en')}. A new, still empty note given one of them starts from its words; New #${t[0]!.tag} note makes one at once.`,
    `${count(t.length, 'nl', ['', ''], ['tag heeft', 'tags hebben'])} een sjabloon: ${list(t.map(x => `#${x.tag}`), 'nl')}. Een nieuwe, nog lege notitie met een ervan begint met die woorden; New #${t[0]!.tag} note maakt er meteen een.`), NOTES_CALL);
}
/** LEDGER #363: "how do I sort a table in a note", "hoe voeg ik een rij toe aan een tabel in een notitie". */
function tables(a: Asked): LocalReply | null {
  const en = /\btables?\b/.test(a.f) && (notesQ(a) || /\b(?:rows?|columns?)\b/.test(a.f)) && !/\btable view\b/.test(a.f);
  const nl = /\btabel\w*\b/.test(a.f) && (NOTITIE.test(a.f) || /\b(?:rij\w*|kolom\w*)\b/.test(a.f));
  if (!en && !nl) return null;
  return how(a, 'Edit the note and press Change a table: its cells become fields, with Add a row, Add a column, Move up and down, Remove, and Sort A to Z or Z to A by a column (numbers as numbers). It stays a Markdown table, and Save keeps the earlier words under Earlier versions.',
    'Bewerk de notitie en druk op Change a table: de cellen worden velden, met Add a row, Add a column, Move up en down, Remove, en Sort A to Z of Z to A op een kolom (getallen als getallen). Het blijft een Markdown-tabel, en Save bewaart de eerdere woorden onder Earlier versions.');
}
/** LEDGER #364: "how do I make a note for a calendar event", "hoe maak ik een notitie bij een afspraak". */
function eventNote(a: Asked): LocalReply | null {
  const en = /\b(?:events?|meetings?|appointments?)\b/.test(a.f) && notesQ(a) && /\b(?:calendar|agenda|imported|for (?:an?|the|this) (?:event|meeting|appointment))\b/.test(a.f);
  const nl = /\b(?:afspraak|afspraken|gebeurtenis\w*|evenement\w*)\b/.test(a.f) && NOTITIE.test(a.f);
  if (!en && !nl) return null;
  return how(a, 'On the Agenda, an imported calendar event has Notes for this event: the first tap makes a note named after the event and its day, linked to that day’s daily note, and opens it; after that the event names its note and opens the same one.',
    'In de Agenda heeft een geïmporteerde afspraak Notes for this event: de eerste tik maakt een notitie met de naam en de dag van de afspraak, gelinkt aan de dagnotitie van die dag, en opent haar; daarna noemt de afspraak haar notitie en opent die.');
}
/** LEDGER #366: "how do I export my daily notes for a range of days", "hoe exporteer ik dagnotities van een periode". */
function dailyRange(a: Asked): LocalReply | null {
  const en = /\bdaily notes?\b/.test(a.f) && /\b(?:export\w*|download\w*|save|zip|markdown)\b/.test(a.f);
  const nl = /\bdag ?notities?\b/.test(a.f) && /\b(?:exporte\w*|download\w*|opslaan|bewaren|zip|markdown)\b/.test(a.f);
  if (!en && !nl) return null;
  return how(a, 'Notes → Files → Daily notes from … to …: choose the first and last day, and Export these daily notes (.zip) saves only those days as Markdown, with their photos. Made on this device; locked notes stay out.',
    'Notes → Files → Daily notes from … to …: kies de eerste en laatste dag, en Export these daily notes (.zip) bewaart alleen die dagen als Markdown, met hun foto’s. Op dit apparaat gemaakt; vergrendelde notities blijven eruit.');
}
/** LEDGER #367: "how do I give a note a cover", "kan ik een notitie een kleur geven". */
function look(a: Asked): LocalReply | null {
  const en = /\b(?:cover|background|colou?r|look|style)\b/.test(a.f) && notesQ(a) && !/\bhighlight\w*\b/.test(a.f);
  const nl = /\b(?:omslag\w*|achtergrond\w*|kleur\w*|uiterlijk)\b/.test(a.f) && NOTITIE.test(a.f) && !/\bmarkeer\w*\b/.test(a.f);
  if (!en && !nl) return null;
  return how(a, 'Open the note and choose Look: a cover from the note’s own photos, and a page colour — Sand, Sage, Sky, Lilac, Rose or Stone, a light tint that keeps the words easy to read in every theme. It shows when you read the note; the words stay as they are.',
    'Open de notitie en kies Look: een omslag uit de eigen foto’s van de notitie, en een paginakleur — Sand, Sage, Sky, Lilac, Rose of Stone, een lichte tint die de woorden in elk thema goed leesbaar houdt. Je ziet het als je de notitie leest; de woorden blijven zoals ze zijn.');
}
/** LEDGER #365: "how many cards do I have in my notes", "hoe werken flashcards in notities". */
function cards(a: Asked): LocalReply | null {
  const en = /\b(?:flash ?cards?|cards? to review|review cards?|spaced repetition)\b/.test(a.f) || (/\bcards?\b/.test(a.f) && notesQ(a));
  const nl = /\b(?:flash ?cards?|kaartjes?|leerkaart\w*|herhaalkaart\w*)\b/.test(a.f) && (NOTITIE.test(a.f) || /\b(?:herhal\w*|leren|flash ?cards?)\b/.test(a.f));
  if (!en && !nl) return null;
  const got = notesOf(a, ['Notes → Notes → Review cards', 'Notes → Notes → Review cards']); if ('shut' in got) return got.shut;
  const all = allCards(got.record.notes), lang = a.lang;
  if (!all.length) return how(a, 'No cards yet. Write a line as question :: answer in a note (hola :: hello), or end a line with #card with its answer on the indented lines under it. Notes → Notes → Review cards then shows them one at a time, again on a gentle schedule.', 'Nog geen kaartjes. Schrijf een regel als vraag :: antwoord in een notitie (hola :: hallo), of eindig een regel met #card met het antwoord op de ingesprongen regels eronder. Notes → Notes → Review cards toont ze dan een voor een, opnieuw op een rustig schema.');
  const by = new Map<string, number>(); for (const c of all) by.set(c.noteName, (by.get(c.noteName) ?? 0) + 1);
  const top = [...by.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([n, k]) => `“${n}” (${k})`);
  return answer(say(lang, `${count(all.length, 'en', ['card', 'cards'], ['', ''])} in your notes: ${list(top, 'en')}. Notes → Notes → Review cards shows the ones due today, one at a time; no streak, stop whenever you like.`,
    `${count(all.length, 'nl', ['', ''], ['kaartje', 'kaartjes'])} in je notities: ${list(top, 'nl')}. Notes → Notes → Review cards toont die van vandaag, een voor een; geen reeks, stop wanneer je wilt.`), NOTES_CALL);
}
/** LEDGER #355: "can I attach a pdf to a task", "kan ik een bestand aan een taak toevoegen". */
function taskFiles(a: Asked): LocalReply | null {
  const en = /\b(?:files?|pdfs?|documents?|attachments?|attach)\b/.test(a.f) && /\btasks?\b/.test(a.f) && !/\bphotos?\b|\bvoice\b/.test(a.f);
  const nl = /\b(?:bestand\w*|pdfs?|document\w*|bijlage\w*)\b/.test(a.f) && /\btaa?k\w*\b/.test(a.f) && !/\bfoto\w*\b|\bspraak\w*\b/.test(a.f);
  if (!en && !nl) return null;
  return answer(say(a.lang, 'Yes. Open a task and use Files → Add a file (up to 10 MB each), or drop a file on Tasks to make an Inbox task holding it. A PDF, a picture or a text file opens in the browser; other files are saved to open with their own app. Tasks → Files lists them all with a search and the space used. They stay in this browser only, never uploaded or synced.',
    'Ja. Open een taak en kies Files → Add a file (tot 10 MB per bestand), of sleep een bestand op Tasks om een Inbox-taak met dat bestand te maken. Een pdf, afbeelding of tekstbestand opent in de browser; andere bestanden worden bewaard om in hun eigen app te openen. Tasks → Files toont ze allemaal met zoeken en de gebruikte ruimte. Ze blijven alleen in deze browser, nooit geüpload of gesynchroniseerd.'), [{tool: 'tasks', args: {}, label: 'Tasks'}]);
}
