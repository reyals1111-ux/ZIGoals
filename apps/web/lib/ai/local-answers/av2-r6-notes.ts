import type {ToolEnv} from '../tools/env';
import {type Notes} from '../../notes/schema';
import {readableNotes} from '../../notes/lock';
import {notReadBack} from '../../notes/read-back';
import {propNames} from '../../notes/props';
import {columnSum} from '../../notes/table-sums';
import {unsealed} from '../../journal/letters';
import {wordsOn} from '../../journal/word-goal';
import {peopleCounts} from '../../journal/people';
import {MOON_WORDS, SKY_CITIES, moonOn, sunOn} from '../../journal/sky';
import {wallClock} from '../../zone-time';
import {novaAreaClosed, novaEnvInfo} from './nova-env';
import {answer, asked, closed, count, dayIn, isQuestion, journalClosed, list, MIXED, num, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r6-notes, LEDGER #399–#410 of groups W2 and W3; Capacities, Diarium): NOVA's and ZIGi's on-device
 * answers, in English and Dutch, to round 6's notes and journal features — renaming or merging a tag, daily notes read
 * back, a property on several notes, merging two notes, the sums of a number property, the daily word goal, who was
 * there, On this day for any day, every photo in one place, sunrise and the moon, locking again after a while away, and
 * imports from Journey and a CSV. Notes are read only under NOVA's Notes scope (ZIGi does not read notes), never a locked
 * note and never a note's words (counts, days and property names only); the journal only where it is shared (av-words
 * journalClosed), never a letter still folded away, never an entry's words. Sunrise and the moon are worked out here for
 * the city of this device's time zone; nothing is looked up, and the weather is not given (it needs an outside service).
 * Called like `avAnswer` in engine.ts (the lead wires it); null when the question is not one of these.
 */
export function av2R6NotesAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !(isQuestion(a) || /^(?:who|wie)\b/.test(a.f))) return null; // "who appears most…", "wie komt…"
    for (const one of [tagRename, mergeNotes, readBack, propertySums, propertyOnMany, wordGoal, people, anyDay, photos, sky, lockAway, imports]) {
      const r = one(a);
      if (r) return r;
    }
    return null;
  } catch { return null; }
}

const NOTES_CALL = [{tool: 'notes', args: {}, label: 'Notes'}], JOURNAL_CALL = [{tool: 'journal', args: {}, label: 'Journal'}];
const NOTE = /\bnotes?\b/, NOTITIE = /\bnotities?\b|\bnotitie\w*\b/, JOURNAL_EN = /\b(?:journal|diary|entry|entries)\b/, JOURNAL_NL = /\bdagboek\w*\b|\bstukken\b|\bstuk\b/;
function notesOf(a: Asked, where: [string, string]): {record: Notes} | {shut: LocalReply} {
  const today = closed(a.env, 'today', 'search_notes'); if (today) return {shut: today};
  const record = a.env.nova?.notes;
  if (record) return {record: {...record, notes: readableNotes(record.notes)}};
  if (record === undefined && novaEnvInfo(a.env)) return {shut: {kind: 'refusal', text: novaAreaClosed('Notes', a.lang), calls: []}};
  if (record === null) return {shut: answer(say(a.lang, 'Your notes can’t be read on this device right now, so I can’t say.', 'Je notities kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'))};
  return {shut: answer(say(a.lang, `ZIGi doesn’t read your notes. Open ${where[0]} to see them; NOVA can answer this with Notes on in NOVA → Permissions.`, `ZIGi leest je notities niet. Open ${where[1]} om ze te zien; NOVA kan dit beantwoorden met Notes aan in NOVA → Permissions.`))};
}
const how = (a: Asked, en: string, nl: string, calls = NOTES_CALL) => answer(say(a.lang, en, nl), calls);

/** LEDGER #399: "how do I rename a tag in my notes", "kan ik twee tags samenvoegen in mijn notities". */
function tagRename(a: Asked): LocalReply | null {
  const en = /\btags?\b/.test(a.f) && /\b(?:rename\w*|merge\w*|combine\w*|change the name)\b/.test(a.f) && !JOURNAL_EN.test(a.f);
  const nl = /\btags?\b/.test(a.f) && /\b(?:hernoem\w*|samenvoeg\w*|samen voegen|voeg\w* samen|andere naam)\b/.test(a.f) && !JOURNAL_NL.test(a.f);
  if (!en && !nl) return null;
  return how(a, 'Notes → Notes → Tags → Rename or merge a tag: choose the tag, then give it a new name (Rename tag) or choose another tag (Merge into …). Every note’s #tag changes at once — in its words and its Tags field, with the tags nested under it — the earlier words are kept under Earlier versions, and one Undo puts every note back.',
    'Notes → Notes → Tags → Rename or merge a tag: kies de tag, geef hem een nieuwe naam (Rename tag) of kies een andere tag (Merge into …). De #tag verandert in elke notitie tegelijk — in de woorden en het veld Tags, met de tags eronder — de eerdere woorden blijven onder Earlier versions, en één Undo zet alle notities terug.');
}
/** LEDGER #407: "how do I merge two notes", "hoe voeg ik twee notities samen". */
function mergeNotes(a: Asked): LocalReply | null {
  const en = /\b(?:merge\w*|combine\w*|join\w*)\b/.test(a.f) && NOTE.test(a.f) && !/\btags?\b/.test(a.f);
  const nl = /\b(?:samenvoeg\w*|samen voegen|voeg\w* .*samen|samengevoegd)\b/.test(a.f) && NOTITIE.test(a.f) && !/\btags?\b/.test(a.f);
  if (!en && !nl) return null;
  return how(a, 'Open the topic note and press Merge into…, then choose the note it joins. Its words go under the other note’s, below a heading with its name; its tags, photos and properties are added where the other has none, and links to it point at that heading. The note itself waits 30 days in Recently deleted, and one Undo puts both back as they were. A locked note is never merged.',
    'Open de onderwerpnotitie en druk op Merge into…, en kies de notitie waar ze bij komt. De woorden komen onder die van de andere notitie, onder een kop met haar naam; tags, foto’s en eigenschappen komen erbij waar de andere ze niet heeft, en links ernaar wijzen naar die kop. De notitie zelf wacht 30 dagen in Recently deleted, en één Undo zet beide terug. Een vergrendelde notitie wordt nooit samengevoegd.');
}
/** LEDGER #402: "which daily notes have I not read back", "hoe markeer ik een dagnotitie als teruggelezen". */
function readBack(a: Asked): LocalReply | null {
  const en = /\bread (?:them |it )?back\b|\bre ?read\b|\breviewed\b/.test(a.f) && /\b(?:daily notes?|notes?|days?)\b/.test(a.f);
  const nl = /\bteruggelezen\b|\bterug ?lezen\b|\bteruglezen\b|\bnagelezen\b/.test(a.f) && (NOTITIE.test(a.f) || /\bdag ?notitie\w*\b|\bdagen\b/.test(a.f));
  if (!en && !nl) return null;
  const mark = /\b(?:how|mark|hoe|markeer\w*)\b/.test(a.f) && !/\b(?:which|what|how many|welke|hoeveel)\b/.test(a.f);
  if (mark) return how(a, 'Open the day’s note and press Read back: its day keeps a quiet mark in Days and in the This day strip. Notes → Days → Not read back yet lists the daily notes of the last 30 days you have not read back, oldest first. Nothing is counted against you.',
    'Open de notitie van die dag en druk op Read back: de dag krijgt een rustig teken in Days en in de strook This day. Notes → Days → Not read back yet toont de dagnotities van de laatste 30 dagen die je nog niet terugleest, oudste eerst. Er wordt niets tegen je geteld.');
  const got = notesOf(a, ['Notes → Days → Not read back yet', 'Notes → Days → Not read back yet']); if ('shut' in got) return got.shut;
  const left = notReadBack(got.record, a.today), lang = a.lang; // a locked daily note is left out of NOVA's answer
  if (!left.length) return how(a, 'Every daily note of the last 30 days with words is read back. Open a day and press Read back when you have looked over it.', 'Elke dagnotitie van de laatste 30 dagen met woorden is teruggelezen. Open een dag en druk op Read back als je hem hebt doorgekeken.');
  return answer(say(lang, `${count(left.length, 'en', ['daily note', 'daily notes'], ['', ''])} of the last 30 days ${left.length === 1 ? 'is' : 'are'} not read back yet: ${list(left.slice(0, 6).map(n => dayIn('en', n.day!, a.today)), 'en')}. Notes → Days → Not read back yet lists them, oldest first.`,
    `${count(left.length, 'nl', ['', ''], ['dagnotitie', 'dagnotities'])} van de laatste 30 dagen ${left.length === 1 ? 'is' : 'zijn'} nog niet teruggelezen: ${list(left.slice(0, 6).map(n => dayIn('nl', n.day!, a.today)), 'nl')}. Notes → Days → Not read back yet toont ze, oudste eerst.`), NOTES_CALL);
}
/** LEDGER #408: "what is the sum of a number property across my notes", "wat is het gemiddelde van een eigenschap in mijn notities". */
function propertySums(a: Asked): LocalReply | null {
  const en = /\b(?:sum|total|add up|adds up|average)\b/.test(a.f) && /\bpropert(?:y|ies)\b/.test(a.f) && NOTE.test(a.f);
  const nl = /\b(?:som|totaal|optell\w*|opgeteld|gemiddeld\w*)\b/.test(a.f) && /\beigenschap\w*\b/.test(a.f) && NOTITIE.test(a.f);
  if (!en && !nl) return null;
  const got = notesOf(a, ['Notes → Notes → Table', 'Notes → Notes → Table']); if ('shut' in got) return got.shut;
  const notes = got.record.notes, lang = a.lang, numbers = propNames(notes).filter(p => p.type === 'number').slice(0, 4);
  const sums = numbers.flatMap(p => { const s = columnSum(notes, p.name, 'number'); return s && s.kind === 'number' && s.count ? [{name: p.name, ...s}] : []; });
  if (!sums.length) return how(a, 'None of your notes has a Number property yet. Open a note, then Properties, and add one with the type Number (for example Budget); Notes → Notes → Table then shows its sum and average under its column, for the notes shown.',
    'Nog geen van je notities heeft een eigenschap van het type Number. Open een notitie, dan Properties, en voeg er een toe met het type Number (bijvoorbeeld Budget); Notes → Notes → Table toont dan de som en het gemiddelde onder de kolom, voor de getoonde notities.');
  const line = (l: 'en' | 'nl') => list(sums.map(s => l === 'en' ? `${s.name}: ${num(s.sum)} in all, ${num(s.average)} on average over ${count(s.count, 'en', ['note', 'notes'], ['', ''])}` : `${s.name}: ${num(s.sum)} samen, gemiddeld ${num(s.average)} over ${count(s.count, 'nl', ['', ''], ['notitie', 'notities'])}`), l);
  return answer(say(lang, `${line('en')}. Notes → Notes → Table shows these under each Number column for the notes shown (after its filters), and how many are ticked under a Tick column.`,
    `${line('nl')}. Notes → Notes → Table toont dit onder elke Number-kolom voor de getoonde notities (na de filters), en hoeveel er aangevinkt zijn onder een Tick-kolom.`), NOTES_CALL);
}
/** LEDGER #405: "how do I set a property on all chosen notes", "kan ik een eigenschap op veel notities zetten". */
function propertyOnMany(a: Asked): LocalReply | null {
  const en = /\bpropert(?:y|ies)\b/.test(a.f) && /\bnotes\b/.test(a.f) && /\b(?:several|multiple|many|all|chosen|selected|more than one|same)\b/.test(a.f);
  const nl = /\beigenschap\w*\b/.test(a.f) && /\bnotities\b/.test(a.f) && /\b(?:meerdere|veel|alle|gekozen|geselecteerde|dezelfde)\b/.test(a.f);
  if (!en && !nl) return null;
  return how(a, 'In Notes → Notes, press Select and tick the notes. Under Set a property, give the name, the type and the value, then Set property (or Remove property): one step for all of them, and one Undo puts them back. A note with ten properties already, or a locked note, is left as it is and counted.',
    'Druk in Notes → Notes op Select en vink de notities aan. Geef onder Set a property de naam, het type en de waarde, en kies Set property (of Remove property): één stap voor allemaal, en één Undo zet ze terug. Een notitie die al tien eigenschappen heeft, of een vergrendelde notitie, blijft zoals ze is en wordt geteld.');
}
/** LEDGER #400: "what is my daily word goal", "heb ik mijn woorddoel vandaag gehaald". */
function wordGoal(a: Asked): LocalReply | null {
  const en = /\bword (?:goal|target|count goal)\b|\bwords a day\b|\bwords per day\b/.test(a.f);
  const nl = /\bwoord(?:en)? ?doel\w*\b|\bwoorden per dag\b|\bwoorden op een dag\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const j = a.env.journal!, goal = j.wordGoal, lang = a.lang;
  if (!goal) return how(a, 'You have no daily word goal. Journal → Entries → Daily word goal sets one (for example 200 words a day): Write then shows today’s words beside it, and the calendar marks the days you reached it. Nothing is said on a day you do not.',
    'Je hebt geen woorddoel per dag. Journal → Entries → Daily word goal zet er een (bijvoorbeeld 200 woorden per dag): Write toont dan de woorden van vandaag ernaast, en de kalender markeert de dagen dat je het haalde. Op een dag dat je het niet haalt wordt niets gezegd.', JOURNAL_CALL);
  const today = wordsOn(unsealed(j.entries, a.today).filter(e => e.date === a.today), a.today);
  return answer(say(lang, today >= goal ? `Your goal is ${num(goal)} words a day, and today holds ${num(today)}: they are written. The journal calendar marks each day you reached it.` : `Your goal is ${num(goal)} words a day; today holds ${num(today)} so far. The journal calendar marks each day you reached it, and nothing is said on a day you do not.`,
    today >= goal ? `Je doel is ${num(goal)} woorden per dag, en vandaag staan er ${num(today)}: ze zijn geschreven. De dagboekkalender markeert elke dag dat je het haalde.` : `Je doel is ${num(goal)} woorden per dag; vandaag staan er tot nu toe ${num(today)}. De dagboekkalender markeert elke dag dat je het haalde, en op een andere dag wordt niets gezegd.`), JOURNAL_CALL);
}
/** LEDGER #401: "who appears most in my journal", "hoe voeg ik toe wie erbij was in een dagboekstuk". */
function people(a: Asked): LocalReply | null {
  const en = (/\bwho (?:was there|appears|shows up|is in|was in|comes up)\b/.test(a.f) || /\b(?:people|persons?|names?) in\b/.test(a.f)) && JOURNAL_EN.test(a.f);
  const nl = (/\bwie (?:er ?bij was|was erbij|komt|staat|staan|zijn)\b/.test(a.f) || /\b(?:mensen|personen|namen) in\b/.test(a.f)) && JOURNAL_NL.test(a.f);
  if (!en && !nl) return null;
  if (/\b(?:how|add|hoe|voeg\w*)\b/.test(a.f) && !/\b(?:most|often|vaakst|meest)\b/.test(a.f)) return how(a, 'Under an entry, press Who was there and type a name (the names you used before are offered again; nothing is read from your contacts). Up to eight names an entry. A name is a button that lists the entries with that person, and the journal’s search finds it as a word.',
    'Druk onder een stuk op Who was there en typ een naam (de namen die je eerder gebruikte worden weer aangeboden; er wordt niets uit je contacten gelezen). Tot acht namen per stuk. Een naam is een knop die de stukken met die persoon toont, en de zoekfunctie van het dagboek vindt hem als woord.', JOURNAL_CALL);
  const shut = journalClosed(a); if (shut) return shut;
  const top = peopleCounts(unsealed(a.env.journal!.entries, a.today)).slice(0, 5), lang = a.lang;
  if (!top.length) return how(a, 'No entry has a name yet. Under an entry, press Who was there and type who was with you; a name then lists every entry with that person.', 'Nog geen stuk heeft een naam. Druk onder een stuk op Who was there en typ wie erbij was; een naam toont dan elk stuk met die persoon.', JOURNAL_CALL);
  return answer(say(lang, `Most often in your entries: ${list(top.map(p => `${p.name} (${count(p.count, 'en', ['entry', 'entries'], ['', ''])})`), 'en')}. A name under an entry lists every entry with that person.`,
    `Het vaakst in je stukken: ${list(top.map(p => `${p.name} (${count(p.count, 'nl', ['', ''], ['stuk', 'stukken'])})`), 'nl')}. Een naam onder een stuk toont elk stuk met die persoon.`), JOURNAL_CALL);
}
/** LEDGER #403: "how do I see on this day for another date", "hoe zie ik wat ik op een andere datum in eerdere jaren schreef". */
function anyDay(a: Asked): LocalReply | null {
  const en = /\bon this day\b/.test(a.f) && /\b(?:another|other|different|any|chosen|tomorrow|yesterday) (?:day|date)\b/.test(a.f) || /\b(?:another|other|any) date in (?:earlier|past|previous) years\b/.test(a.f);
  const nl = /\bop deze dag\b/.test(a.f) && /\b(?:andere|elke|gekozen|willekeurige) (?:dag|datum)\b/.test(a.f) || /\b(?:andere|elke) datum in (?:eerdere|vorige) jaren\b/.test(a.f);
  if (!en && !nl) return null;
  return how(a, 'In the Journal, On this day has arrows: the day before and the day after show that date in the years before it. A day chosen on the calendar under Search by date opens there too; Back to today returns. Entries you set aside and letters still folded away stay out.',
    'In het Journal heeft On this day pijlen: de dag ervoor en de dag erna tonen die datum in de jaren ervoor. Een dag die je kiest op de kalender onder Search by date opent daar ook; Back to today gaat terug. Stukken die je opzij legde en brieven die nog dicht zijn blijven eruit.', JOURNAL_CALL);
}
/** LEDGER #404: "where are all my journal photos", "waar staan alle foto's van mijn dagboek". */
function photos(a: Asked): LocalReply | null {
  const en = /\b(?:all|every|see all|gallery)\b/.test(a.f) && /\b(?:photos?|pictures?|voice notes?|media)\b/.test(a.f) && JOURNAL_EN.test(a.f) && !/\bhow many\b/.test(a.f);
  const nl = /\b(?:alle|elke|overzicht|galerij)\b/.test(a.f) && /\b(?:foto\w*|foto s|spraakmemo\w*|spraakberichten)\b/.test(a.f) && JOURNAL_NL.test(a.f) && !/\bhoeveel\b/.test(a.f);
  if (!en && !nl) return null;
  return how(a, 'Journal → Entries → Photos and voice notes shows every photo of your entries as a grid and every voice note as a tile, newest first; choose a journal or a year to narrow it, and a tap opens that day’s entries. They stay on this device; a letter still folded away keeps its photos folded until its day.',
    'Journal → Entries → Photos and voice notes toont elke foto van je stukken als raster en elke spraakmemo als tegel, nieuwste eerst; kies een dagboek of een jaar om te beperken, en een tik opent de stukken van die dag. Ze blijven op dit apparaat; een brief die nog dicht is houdt zijn foto’s dicht tot zijn dag.', JOURNAL_CALL);
}
const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
/** LEDGER #409: "what time is sunrise today", "welke fase heeft de maan vandaag". */
function sky(a: Asked): LocalReply | null {
  const sunEn = /\b(?:sunrise|sunset|sun rise|sun set|sun come up|sun go down)\b/.test(a.f), moonEn = /\b(?:moon|full moon|new moon)\b/.test(a.f) && /\b(?:phase|full|new|tonight|today|moon)\b/.test(a.f);
  const sunNl = /\b(?:zonsopkomst|zonsondergang|zon op|zon onder|komt de zon|gaat de zon)\b/.test(a.f), moonNl = /\b(?:maan|volle maan|nieuwe maan|maanfase)\b/.test(a.f);
  if (!(sunEn || moonEn || sunNl || moonNl) || /\bweather\b|\bweer\b/.test(a.f)) return null;
  const day = a.today, moon = moonOn(day), city = SKY_CITIES.find(c => c.zone === deviceZone()), lang = a.lang;
  const moonText = say(lang, `${MOON_WORDS[moon.phase].en}, ${Math.round(moon.lit * 100)}% lit`, `${MOON_WORDS[moon.phase].nl}, ${Math.round(moon.lit * 100)}% verlicht`);
  if (!city) return answer(say(lang, `Today the moon is: ${moonText}. For sunrise and sunset, choose a place under Journal → Entries → Sun and moon on a day; it is worked out on this device, nothing is looked up.`, `Vandaag is de maan: ${moonText}. Kies voor zonsopkomst en zonsondergang een plaats onder Journal → Entries → Sun and moon on a day; het wordt op dit apparaat berekend, er wordt niets opgezocht.`), JOURNAL_CALL);
  const sun = sunOn(day, city.lat, city.lon), at = (ms: number) => wallClock(ms, city.zone).clock;
  const sunText = sun.kind === 'normal' ? say(lang, `sunrise ${at(sun.rise)} and sunset ${at(sun.set)} in ${city.name}`, `zonsopkomst ${at(sun.rise)} en zonsondergang ${at(sun.set)} in ${city.name}`) : sun.kind === 'up' ? say(lang, `the sun stays up all day in ${city.name}`, `de zon blijft de hele dag op in ${city.name}`) : say(lang, `the sun stays down all day in ${city.name}`, `de zon blijft de hele dag onder in ${city.name}`);
  return answer(say(lang, `Today: ${sunText} (this device’s time zone; good to a few minutes), and the moon: ${moonText}. Worked out on this device, nothing looked up; choose another place under Journal → Entries → Sun and moon on a day.`,
    `Vandaag: ${sunText} (de tijdzone van dit apparaat; op een paar minuten na), en de maan: ${moonText}. Op dit apparaat berekend, er wordt niets opgezocht; kies een andere plaats onder Journal → Entries → Sun and moon on a day.`), JOURNAL_CALL);
}
/** LEDGER #406: "can ZIGoals lock again after I am away", "kan ZIGoals opnieuw vergrendelen als ik even weg ben". */
function lockAway(a: Asked): LocalReply | null {
  const en = /\block\w*\b/.test(a.f) && /\b(?:away|again|after (?:a few|\d+|some) minutes|idle|inactive|come back|return)\b/.test(a.f) && !NOTE.test(a.f) && !/\bnotes?\b|\bentry\b|\bdoor\b|\bphone\b/.test(a.f);
  const nl = /\b(?:vergrendel\w*|op slot)\b/.test(a.f) && /\b(?:weg|opnieuw|weer|na (?:een paar|\d+|enkele) minuten|terugkom\w*|niets doe)\b/.test(a.f) && !NOTITIE.test(a.f);
  if (!en && !nl) return null;
  return answer(say(a.lang, 'Yes, with the screen cover on: Settings → Account & devices → Screen cover with a PIN → Lock again after a while away, then 5, 15 or 60 minutes. When ZIGoals has been hidden that long, the same cover asks for your PIN when you come back; a new tab or window still asks as before. It hides the screen; it does not encrypt your records.',
    'Ja, met de schermafdekking aan: Settings → Account & devices → Screen cover with a PIN → Lock again after a while away, en dan 5, 15 of 60 minuten. Als ZIGoals zo lang verborgen was, vraagt dezelfde afdekking je pincode als je terugkomt; een nieuw tabblad of venster vraagt erom zoals voorheen. Het verbergt het scherm; je gegevens worden er niet door versleuteld.'), [{tool: 'settings', args: {}, label: 'Settings'}]);
}
/** LEDGER #410: "can I import my Journey journal", "hoe importeer ik dagboekstukken uit een csv". */
function imports(a: Asked): LocalReply | null {
  const en = /\bimport\w*\b/.test(a.f) && /\b(?:journey|csv|spreadsheet)\b/.test(a.f);
  const nl = /\bimporte\w*\b/.test(a.f) && /\b(?:journey|csv|spreadsheet)\b/.test(a.f);
  if (!en && !nl) return null;
  return how(a, 'Journal → Import and export → Choose files to import takes Journey’s export (its ZIP of entries, with their photos) and a CSV with a date, the words and tags on each row (comma or semicolon; a header in English or Dutch is read). You see what is found and what is left out first; Import adds it with one Undo. Nothing in a file runs, and it is all read on this device.',
    'Journal → Import and export → Choose files to import neemt de export van Journey (de ZIP met stukken en hun foto’s) en een CSV met per rij een datum, de woorden en tags (komma of puntkomma; een kopregel in het Engels of Nederlands wordt gelezen). Je ziet eerst wat er gevonden en weggelaten is; Import voegt het toe met één Undo. Niets in een bestand wordt uitgevoerd, en alles wordt op dit apparaat gelezen.', JOURNAL_CALL);
}
