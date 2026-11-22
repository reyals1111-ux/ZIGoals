import type {ToolEnv} from '../tools/env';
import type {Journal} from '../../journal/schema';
import {latestHabitRule} from '../../habits';
import {tickLines} from '../../notes/ticks';
import {throwbacks} from '../../on-this-day/throwback';
import {MAX_ENTRY_PHOTOS_ALL} from '../../journal/schema';
import {countLine, identitiesOf, identityCounts} from '../../habit-intentions/identity';
import {sizeWords, stepOffers, stepUpOf} from '../../habits-v2/step-up';
import {meaningOf, ownMeanings} from '../../mood-words/meanings';
import {strategiesFor} from '../../mood-words/strategies';
import {bodyCounts} from '../../mood-words/body';
import {QUADRANTS, quadrantOfWord} from '../../mood-words/words';
import {answer, asked, closed, count, dayIn, isQuestion, journalClosed, list, MIXED, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r4-mind, LEDGER #308–#310, #317, #323–#327; Journey, Atoms, How We Feel): NOVA's and ZIGi's on-device
 * answers, in English and Dutch, to what round 4's journal and mind features hold — tick boxes and formatting in entries,
 * favourites, a week / a month / a year back, how many photos an entry holds, the lines of who you are becoming with
 * their counts, habits ready to step up, what a feeling word means, choices for a feeling, and where a feeling is felt.
 * Each reads the feature's own pure function: the journal only where it is shared (av-words.ts journalClosed), habits
 * under the Habits switch and feelings under Health's gate, as the daily energy is. An entry's words are never quoted;
 * choices are offered, never advised. Called like `avAnswer` in engine.ts (the lead wires it); null when the question is
 * not one of these.
 */
export function av2R4MindAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of [journalTicks, favourites, throwback, morePhotos, identity, stepUp, wordMeaning, feelingChoices, whereFelt]) {
      const r = one(a);
      if (r) return r;
    }
    return null;
  } catch { return null; }
}

const CALL = [{tool: 'journal', args: {}, label: 'Journal'}], OPEN = [{tool: 'habits_due', args: {}, label: 'Open today'}], FEEL = [{tool: 'energy', args: {}, label: 'Energy and feelings'}];
const journalOf = (a: Asked): Journal => a.env.journal!;
const JOURNAL_EN = /\b(?:journal|diary|entry|entries)\b/, JOURNAL_NL = /\bdagboek\w*\b|\bstukken\b|\bstuk\b/;

/** LEDGER #308: "which tick boxes are open in my journal", "hoe maak ik iets vet in mijn dagboek". */
function journalTicks(a: Asked): LocalReply | null {
  const ticks = /\b(?:tick ?box(?:es)?|check ?box(?:es)?|checklists?)\b/.test(a.f) || /\b(?:vinkjes?|aanvinkvak\w*|afvinklijst\w*)\b/.test(a.f);
  const format = /\b(?:format(?:ting)?|bold|italics?|headings?|bullet(?: points)?)\b/.test(a.f) || /\b(?:opmaak|opmaken|vet|cursief|koppen|kopje|opsomming)\b/.test(a.f);
  if (!(ticks || format) || !(JOURNAL_EN.test(a.f) || JOURNAL_NL.test(a.f)) || /\bnotes?\b|\bnotities?\b|\btasks?\b|\btaken\b/.test(a.f)) return null;
  const lang = a.lang, how = say(lang, 'Under the entry’s words the format bar makes words bold, italic or highlighted, and a line a heading, a list item, a quote or a tick box; typing the marks works too (**bold**, ## a heading, - [ ] a tick box).', 'Onder de woorden van een stuk maakt de opmaakbalk woorden vet, cursief of gemarkeerd, en een regel een kop, een opsommingsteken, een citaat of een vinkje; de tekens zelf typen kan ook (**vet**, ## een kop, - [ ] een vinkje).');
  if (format && !ticks) return answer(say(lang, `Yes. ${how} Your entry keeps its words as written.`, `Ja. ${how} Je stuk houdt de woorden zoals je ze schreef.`), CALL);
  const shut = journalClosed(a); if (shut) return shut;
  const open = journalOf(a).entries.flatMap(e => tickLines(e.text).filter(t => !t.checked).map(() => e.date)), lang2 = lang;
  if (!open.length) return answer(say(lang2, `No open tick box in your journal. ${how}`, `Geen open vinkje in je dagboek. ${how}`), CALL);
  const days = [...new Set(open)].sort().reverse();
  return answer(say(lang2, `${count(open.length, 'en', ['open tick box', 'open tick boxes'], ['', ''])} in your journal, in the entries of ${list(days.slice(0, 5).map(d => dayIn('en', d, a.today)), 'en')}. Tick one with a tap in the list; the words it had are kept under Earlier versions.`,
    `${count(open.length, 'nl', ['', ''], ['open vinkje', 'open vinkjes'])} in je dagboek, in de stukken van ${list(days.slice(0, 5).map(d => dayIn('nl', d, a.today)), 'nl')}. Vink er een aan met een tik in de lijst; de woorden van ervoor blijven onder Earlier versions.`), CALL);
}
/** LEDGER #310: "which journal entries are my favourites", "welke dagboekstukken zijn favoriet". */
function favourites(a: Asked): LocalReply | null {
  const en = /\b(?:favou?rites?|starred|stars?)\b/.test(a.f) && JOURNAL_EN.test(a.f), nl = /\b(?:favoriet\w*|ster(?:ren)?|gemarkeerd met een ster)\b/.test(a.f) && JOURNAL_NL.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const fav = journalOf(a).entries.filter(e => e.star === true).map(e => e.date).sort().reverse(), lang = a.lang;
  if (!fav.length) return answer(say(lang, 'No favourite entry yet. Press ☆ Favourite on an entry in the Journal; Favourites above the list then shows only those.', 'Nog geen favoriet stuk. Druk in het dagboek op ☆ Favourite bij een stuk; Favourites boven de lijst toont dan alleen die.'), CALL);
  return answer(say(lang, `${count(fav.length, 'en', ['favourite entry', 'favourite entries'], ['', ''])}: ${list(fav.slice(0, 6).map(d => dayIn('en', d, a.today)), 'en')}. Favourites above the Journal’s list shows them.`,
    `${count(fav.length, 'nl', ['', ''], ['favoriet stuk', 'favoriete stukken'])}: ${list(fav.slice(0, 6).map(d => dayIn('nl', d, a.today)), 'nl')}. Favourites boven de lijst in het dagboek toont ze.`), CALL);
}
/** LEDGER #309: "what did I write a week ago", "wat schreef ik een maand geleden" (when, never the words). */
function throwback(a: Asked): LocalReply | null {
  const en = /\b(?:a|one) (?:week|month|year) ago\b/.test(a.f) && /\b(?:write|wrote|written|journal|diary|entry|entries|memor(?:y|ies))\b/.test(a.f) || /\bthrowbacks?\b/.test(a.f);
  const nl = /\been (?:week|maand|jaar) geleden\b/.test(a.f) && /\b(?:schreef|geschreven|dagboek\w*|stuk(?:ken)?|herinnering\w*)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const items = throwbacks(journalOf(a).entries, a.today), lang = a.lang;
  const NL = (l: string) => l === 'A week ago' ? 'een week geleden' : l === 'A month ago' ? 'een maand geleden' : l.replace(/^1 year ago$/, '1 jaar geleden').replace(/^(\d+) years ago$/, '$1 jaar geleden');
  if (!items.length) return answer(say(lang, 'Nothing from a week, a month or a year ago today. On days with one, On this day at the top of the Journal shows it; Journal → Privacy can tell you in the morning.', 'Vandaag niets van een week, een maand of een jaar geleden. Op dagen dat er iets is, toont On this day bovenaan het dagboek het; Journal → Privacy kan het je ’s ochtends laten weten.'), CALL);
  return answer(say(lang, `On this day: ${list(items.map(i => `${i.label.toLowerCase()} (${dayIn('en', i.entry.date, a.today)})`), 'en')}. Open the Journal to read them; I don’t repeat your words here.`,
    `Op deze dag: ${list(items.map(i => `${NL(i.label)} (${dayIn('nl', i.entry.date, a.today)})`), 'nl')}. Open het dagboek om ze te lezen; ik herhaal je woorden hier niet.`), CALL);
}
/** LEDGER #317: "how many photos can a journal entry have", "hoeveel foto’s kan een dagboekstuk hebben". */
function morePhotos(a: Asked): LocalReply | null {
  const en = /\bhow many (?:photos|pictures)\b/.test(a.f) && /\b(?:can|fit|hold|allowed|per)\b/.test(a.f) && JOURNAL_EN.test(a.f);
  const nl = /\bhoeveel (?:foto s|fotos|foto’s|foto)\b/.test(a.f) && /\b(?:kan|kunnen|past|passen|mag|per)\b/.test(a.f) && JOURNAL_NL.test(a.f);
  if (!en && !nl) return null;
  return answer(say(a.lang, `Up to ${MAX_ENTRY_PHOTOS_ALL} photos an entry, kept on this device only. Before they are kept ZIGoals checks there is room; older versions of ZIGoals show the first four.`, `Tot ${MAX_ENTRY_PHOTOS_ALL} foto’s per stuk, alleen op dit apparaat bewaard. Voordat ze bewaard worden kijkt ZIGoals of er ruimte is; oudere versies van ZIGoals tonen de eerste vier.`), CALL);
}
const habitsOf = (a: Asked) => a.env.habits.habits.filter(h => latestHabitRule(h).state !== 'archived');
/** LEDGER #323: "who am I becoming", "wie wil ik worden" — the person's own lines with their counts (never a score). */
function identity(a: Asked): LocalReply | null {
  const en = /\bwho (?:am i|i am) becoming\b|\bidentit(?:y|ies)\b|\bthe person behind (?:my|the) habits\b|\bwho i want to be\b/.test(a.f);
  const nl = /\bwie (?:ik )?wil (?:ik )?worden\b|\bwie ik word\b|\bidentiteit\w*\b|\bde persoon achter (?:mijn|de) gewoontes\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const lines = identitiesOf(a.env.ak?.habitExtras ?? null), lang = a.lang;
  if (!lines.length) return answer(say(lang, 'No line yet. On Habits, Who you are becoming → Write your first line: who you want to be, in your own words (“I am someone who reads every evening”), joined to the habits that serve it; their ticks count toward it.', 'Nog geen zin. Op Habits: Who you are becoming → Write your first line: wie je wilt zijn, in je eigen woorden (“Ik ben iemand die elke avond leest”), gekoppeld aan de gewoontes die erbij horen; hun vinkjes tellen mee.'), OPEN);
  const counts = identityCounts(lines, habitsOf(a), a.today);
  const nlLine = (c: (typeof counts)[number]) => !c.habits.length ? 'nog geen gewoonte gekoppeld' : `${c.month === 1 ? '1 keer' : `${c.month} keer`} deze maand · ${c.week === 1 ? '1 keer' : `${c.week} keer`} deze week`;
  return answer([say(lang, 'Who you are becoming, counted from your own habits (never a score):', 'Wie je wordt, geteld uit je eigen gewoontes (nooit een score):'), ...counts.map(c => `• ${c.identity.text} — ${lang === 'nl' ? nlLine(c) : countLine(c)}`)].join('\n'), OPEN);
}
/** LEDGER #327: "which habits are ready to step up", "welke gewoontes kan ik opschalen". */
function stepUp(a: Asked): LocalReply | null {
  const en = /\bstep(?:ping)? up\b|\bsmall(?:er)? version\b|\bstart small\b/.test(a.f) && /\bhabits?\b/.test(a.f);
  const nl = /\b(?:opschalen|een stap omhoog|kleine versie|klein beginnen|stapje (?:hoger|omhoog))\b/.test(a.f) && /\bgewoontes?\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const extras = a.env.ak?.habitExtras ?? null, hs = habitsOf(a), lang = a.lang;
  const sized = hs.filter(h => { const s = stepUpOf(extras, h.id); return s.small || s.next; }), offers = stepOffers(hs, extras, a.today);
  if (!sized.length) return answer(say(lang, 'No habit has a small version yet. In a habit’s Details, Start small, then step up: write a small version (“one page”) and a next step (“two pages”); switch on the card, and after four steady weeks it offers the next size. You decide each time.', 'Nog geen gewoonte heeft een kleine versie. In Details van een gewoonte, Start small, then step up: schrijf een kleine versie (“één bladzijde”) en een volgende stap (“twee bladzijdes”); zet de kaart aan, en na vier vaste weken biedt hij de volgende maat aan. Jij beslist elke keer.'), OPEN);
  const now = sized.slice(0, 6).map(h => `${h.title}: ${sizeWords(h, stepUpOf(extras, h.id))}`);
  const ready = offers.map(o => o.offer.kind === 'up' ? say(lang, `${o.habit.title} is ready for “${o.offer.words}” (${o.offer.done} of ${o.offer.due} due days)`, `${o.habit.title} is klaar voor “${o.offer.words}” (${o.offer.done} van ${o.offer.due} geplande dagen)`) : say(lang, `${o.habit.title} could be “${o.offer.words}” for now`, `${o.habit.title} kan voorlopig “${o.offer.words}” zijn`));
  return answer(say(lang, `Now: ${list(now, 'en')}. ${ready.length ? `${list(ready, 'en')}; the card on Habits asks you.` : 'No step is offered right now.'}`, `Nu: ${list(now, 'nl')}. ${ready.length ? `${list(ready, 'nl')}; de kaart op Habits vraagt het je.` : 'Er wordt nu geen stap aangeboden.'}`), OPEN);
}
const ALL_WORDS = QUADRANTS.flatMap(q => q.words).sort((x, y) => y.length - x.length);
const wordIn = (f: string) => ALL_WORDS.find(w => new RegExp(`\\b${w.replace(' ', '\\s')}\\b`).test(f)) ?? null;
/** LEDGER #324: "what does restless mean", "wat betekent restless". */
function wordMeaning(a: Asked): LocalReply | null {
  const m = /\bwhat (?:does|do) (?:the (?:word|feeling) )?(.+?) mean\b|\bwhat is (?:the )?meaning of (.+)$/.exec(a.f) ?? /\bwat (?:betekent|bedoel je met) (?:het (?:woord|gevoel) )?(.+?)(?: als gevoel)?$/.exec(a.f);
  if (!m) return null;
  const asked0 = (m[1] ?? m[2] ?? '').trim(), word = wordIn(asked0) ?? (Object.keys(ownMeanings(a.env.energy)).find(w => w.toLowerCase() === asked0) ?? null);
  if (!word) return null;
  const line = meaningOf(word) ?? ownMeanings(a.env.energy)[word], lang = a.lang, q = quadrantOfWord(word);
  if (!line) return null;
  return answer(say(lang, `“${word}”: ${line}.${q ? ` It is in ${q.title.toLowerCase()}.` : ' In your own words.'}`, `“${word}”: ${line}.${q ? ` (Het staat bij ${q.title}; de gevoelswoorden zijn Engels.)` : ' In je eigen woorden.'}`), FEEL);
}
/** LEDGER #325: "what can I do when I feel stressed", "wat kan ik doen als ik me tense voel" — choices, never advice. */
function feelingChoices(a: Asked): LocalReply | null {
  const en = /\bwhat (?:can|could) i do (?:when|if) i (?:feel|am|m)\b|\bwhat helps (?:when|if) i (?:feel|am)\b/.test(a.f), nl = /\bwat (?:kan|zou) ik doen als ik me\b|\bwat helpt als ik me\b/.test(a.f);
  if (!en && !nl) return null;
  const word = wordIn(a.f); if (!word) return null;
  const s = strategiesFor(word), lang = a.lang;
  return answer(say(lang, `For “${word}”, the feeling words offer, if you like: ${list(s.map(x => x.label), 'en')}. Pick one or none; it is your choice, not advice.`, `Bij “${word}” bieden de gevoelswoorden, als je wilt: ${list(s.map(x => x.label), 'nl')} (in het Engels in de app). Kies er een of geen; het is jouw keuze, geen advies.`), FEEL);
}
/** LEDGER #326: "where do I feel it in my body", "waar voel ik het in mijn lichaam" — counts over 90 days, no meaning read. */
function whereFelt(a: Asked): LocalReply | null {
  const en = /\bwhere (?:do|did) i feel\b|\bin my body\b/.test(a.f) && /\b(?:feel|felt|feeling|feelings|stress|tense|body)\b/.test(a.f), nl = /\bwaar voel ik\b|\bin mijn lichaam\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const c = bodyCounts(a.env.energy ?? {}, a.today), lang = a.lang;
  if (!c.length) return answer(say(lang, 'Nothing noted yet. After a feeling word, “Where do you feel it?” keeps up to three places, each with a word for how it feels there; the most common show as counts.', 'Nog niets genoteerd. Na een gevoelswoord bewaart “Where do you feel it?” tot drie plekken, elk met een woord voor hoe het daar voelt; de meest voorkomende staan er als tellingen.'), FEEL);
  return answer([say(lang, 'Where you noted your feelings, the last 90 days (counts only, no meaning read into them):', 'Waar je je gevoelens noteerde, de afgelopen 90 dagen (alleen tellingen, er wordt niets uit afgeleid):'),
    ...c.map(x => `• ${QUADRANTS.find(q => q.id === x.quadrant)!.title}: ${x.area ? `${x.area.name} (${x.area.count}×)` : ''}${x.feel ? `, ${x.feel.name}` : ''}`)].join('\n'), FEEL);
}
