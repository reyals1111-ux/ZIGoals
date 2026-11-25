import type {ToolEnv} from '../tools/env';
import type {Journal} from '../../journal/schema';
import {isSealed} from '../../journal/letters';
import {dayPageOf, dayPagesOn, morningReminderOf, partAnswers} from '../../journal/day-pages';
import {reminderOf} from '../../journal/reminder';
import {dayStrip, stripCount} from '../../journal/day-photo';
import {speedLabel, voiceSpeedOf, type VoiceSpeed} from '../../journal/voice-speed';
import {JOURNAL_DISPLAY} from '../../on-this-day/store';
import {readDeviceRecord} from '../../device-record';
import {getAppStorage} from '../../showcase-storage';
import {formatNumber} from '../../visual-format'; // Session AW: speeds in the display locale's own figures (fr-answers)
import {novaAreaClosed, novaEnvInfo} from './nova-env';
import {answer, asked, closed, count, isQuestion, journalClosed, list, MIXED, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AW (x3, LEDGER #441, #442, #444, #445; Evernote and The Five Minute Journal): NOVA's and ZIGi's on-device
 * answers, in English and Dutch, to "what did I write this morning", "do I have a photo for every day this month", "my
 * saved searches", and how voice notes play faster and how a day is written as a morning and an evening page. The journal
 * is read only where it is shared (av-words journalClosed) and never an entry's words (how many answers, under which
 * questions, and where to read them); a letter still folded away is never counted. The saved searches are read only with
 * the notes (NOVA's Notes scope; ZIGi does not read notes): their names and how many, never a note they find. The speed
 * of voice notes is this device's display choice. Called like `avAnswer` in engine.ts; null when the question is not one
 * of these.
 */
export type AwX3Extra = {voiceSpeed?: VoiceSpeed | null; hour?: (iso: string) => number};
export function awX3Answer(question: string, env: ToolEnv, extra: AwX3Extra = {}): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !(isQuestion(a) || /^(?:my|mijn)\b/.test(a.f))) return null;
    for (const one of [(x: Asked) => thisMorning(x, extra), photoEveryDay, savedSearches, (x: Asked) => voiceFaster(x, extra), dayPagesHow]) {
      const r = one(a);
      if (r) return r;
    }
    return null;
  } catch { return null; }
}

const JOURNAL_CALL = [{tool: 'journal', args: {}, label: 'Journal'}], NOTES_CALL = [{tool: 'notes', args: {}, label: 'Notes'}];
const journalOf = (a: Asked): Journal => a.env.journal!;
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const monthName = (a: Asked, month: string) => say(a.lang, MONTHS_EN[Number(month.slice(5, 7)) - 1]!, MONTHS_NL[Number(month.slice(5, 7)) - 1]!);
const localHour = (iso: string) => new Date(iso).getHours();
const quoted = (a: Asked, items: readonly string[]) => list(items.map(q => `“${q}”`), a.lang);
const WHERE_PAGES = 'Journal → Write → Morning and evening';

/** LEDGER #444: "what did I write this morning", "wat heb ik vanochtend geschreven", "what is on my morning page". */
function thisMorning(a: Asked, extra: AwX3Extra): LocalReply | null {
  const en = (/\bthis morning\b/.test(a.f) && /\b(?:write|wrote|written|journal(?:ed)?|diary)\b/.test(a.f)) || /\bmorning page\b/.test(a.f) && /^(?:what|whats|did|have|is|show)\b/.test(a.f) && !/\bevening\b/.test(a.f);
  const nl = (/\b(?:vanochtend|vanmorgen)\b/.test(a.f) && /\b(?:geschreven|schreef|schrijf|dagboek)\b/.test(a.f)) || /\bochtendpagina\b/.test(a.f) && /^(?:wat|staat|stond|heb|toon)\b/.test(a.f) && !/\bavond\w*\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const j = journalOf(a), lang = a.lang, morning = partAnswers(dayPageOf(j, a.today), 'morning');
  if (morning.length) return answer(say(lang, `This morning’s page is written: ${count(morning.length, 'en', ['answer', 'answers'], ['', ''])}, under ${quoted(a, morning.map(m => m.q))}. Its words stay on the Journal page: ${WHERE_PAGES} shows them above the evening page.`,
    `De ochtendpagina van vandaag is geschreven: ${count(morning.length, 'nl', ['', ''], ['antwoord', 'antwoorden'])}, onder ${quoted(a, morning.map(m => m.q))}. De woorden blijven op de Journal-pagina: ${WHERE_PAGES} toont ze boven de avondpagina.`), JOURNAL_CALL);
  const hour = extra.hour ?? localHour, early = j.entries.filter(e => e.date === a.today && !isSealed(e, a.today) && hour(e.createdAt) < 12).length;
  if (early) return answer(say(lang, `${count(early, 'en', ['journal entry', 'journal entries'], ['', ''])} this morning (before noon). Its words stay on the Journal page, under Entries.`, `${count(early, 'nl', ['', ''], ['dagboekstuk', 'dagboekstukken'])} vanochtend (voor 12 uur). De woorden blijven op de Journal-pagina, onder Entries.`), JOURNAL_CALL);
  return answer(dayPagesOn(j) ? say(lang, `Nothing on this morning’s page yet. ${WHERE_PAGES} has its questions; the evening page shows what the morning said.`, `Nog niets op de ochtendpagina van vandaag. ${WHERE_PAGES} heeft de vragen; de avondpagina toont wat de ochtend zei.`)
    : say(lang, `Nothing written in your journal this morning. ${WHERE_PAGES} can split each day into a morning page and an evening page, each with its own reminder.`, `Vanochtend is er niets in je dagboek geschreven. ${WHERE_PAGES} kan elke dag splitsen in een ochtendpagina en een avondpagina, elk met een eigen herinnering.`), JOURNAL_CALL);
}

/** LEDGER #445: "do I have a photo for every day this month", "heb ik deze maand elke dag een foto". */
function photoEveryDay(a: Asked): LocalReply | null {
  const en = /\b(?:photos?|pictures?|pics?)\b/.test(a.f) && /\b(?:every day|each day|a day|of the day|per day|daily)\b/.test(a.f);
  const nl = /\bfoto\w*\b/.test(a.f) && /\b(?:elke dag|iedere dag|per dag|van de dag|dagelijks|een dag)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const last = /\blast month\b|\bvorige maand\b/.test(a.f), now = a.today.slice(0, 7);
  const month = last ? (Number(now.slice(5, 7)) === 1 ? `${Number(now.slice(0, 4)) - 1}-12` : `${now.slice(0, 4)}-${String(Number(now.slice(5, 7)) - 1).padStart(2, '0')}`) : now;
  const strip = dayStrip(journalOf(a), a.today, month), {withPhoto, soFar} = stripCount(strip), lang = a.lang, name = monthName(a, month);
  const where = say(lang, 'Journal → Entries → Photos and voice notes → A photo a day shows the month as a strip.', 'Journal → Entries → Photos and voice notes → A photo a day toont de maand als strook.');
  const days = (n: number, l: 'en' | 'nl') => count(n, l, ['day', 'days'], ['dag', 'dagen']);
  if (!withPhoto) return answer(say(lang, `No photo in your journal in ${name}${last ? '' : ' yet'}. Add one to an entry under Write; the day’s first photo stands for it, or press Photo of the day on the one you like best. ${where}`, `Nog geen foto in je dagboek in ${name}. Voeg er een toe aan een stuk onder Write; de eerste foto van de dag staat ervoor, of druk op Photo of the day bij de foto die je het mooist vindt. ${where}`), JOURNAL_CALL);
  if (withPhoto >= soFar) return answer(say(lang, `Yes: every day of ${name}${last ? '' : ' so far'} has a photo (${days(withPhoto, 'en')}). ${where}`, `Ja: elke dag van ${name}${last ? '' : ' tot nu toe'} heeft een foto (${days(withPhoto, 'nl')}). ${where}`), JOURNAL_CALL);
  return answer(say(lang, `Not every day: a photo on ${days(withPhoto, 'en')} of the ${soFar} in ${name}${last ? '' : ' so far'}. A day without one simply stays blank; nothing is counted as missed. ${where}`,
    `Niet elke dag: een foto op ${days(withPhoto, 'nl')} van de ${soFar} in ${name}${last ? '' : ' tot nu toe'}. Een dag zonder foto blijft gewoon leeg; er wordt niets als gemist geteld. ${where}`), JOURNAL_CALL);
}

/** LEDGER #441: "my saved searches in notes", "which searches have I saved in my notes", "mijn bewaarde zoekopdrachten in notities". */
function savedSearches(a: Asked): LocalReply | null {
  const en = /\bsaved searche?s?\b|\bkept searche?s?\b|\bsearche?s?\b.*\b(?:saved|kept)\b/.test(a.f) && !/\b(?:money|spending|payee|transactions?)\b/.test(a.f);
  const nl = /\b(?:opgeslagen|bewaarde|bewaard\w*) zoek\w*\b|\bzoekopdrachten\b.*\b(?:bewaard|opgeslagen)\b/.test(a.f);
  // Money's saved searches keep "my saved searches" (av2-r4-money.ts); these are the ones that name the notes.
  if ((!en && !nl) || !/\bnotes?\b|\bnotities?\b|\bnotitie\w*\b/.test(a.f)) return null;
  const lang = a.lang;
  const today = closed(a.env, 'today', 'search_notes'); if (today) return today;
  const notes = a.env.nova?.notes;
  if (notes === undefined) {
    if (novaEnvInfo(a.env)) return {kind: 'refusal', text: novaAreaClosed('Notes', lang), calls: []};
    return answer(say(lang, 'ZIGi doesn’t read your notes. Notes → Notes lists your saved searches above the search; NOVA can answer this with Notes on in NOVA → Permissions.', 'ZIGi leest je notities niet. Notes → Notes toont je bewaarde zoekopdrachten boven de zoekbalk; NOVA kan dit beantwoorden met Notes aan in NOVA → Permissions.'));
  }
  if (notes === null || a.env.nova?.noteSearches === null) return answer(say(lang, 'Your notes can’t be read on this device right now, so I can’t say.', 'Je notities kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'));
  const list_ = a.env.nova?.noteSearches?.searches ?? [];
  if (!list_.length) return answer(say(lang, 'No saved searches yet. In Notes → Notes, search with words or Narrow the search (a tag, a kind of note, a property), then press Keep this search and give it a name; up to 12, each opened again in one tap.', 'Nog geen bewaarde zoekopdrachten. Zoek in Notes → Notes met woorden of Narrow the search (een tag, een soort notitie, een eigenschap), druk dan op Keep this search en geef hem een naam; tot 12, elk weer te openen met één tik.'), NOTES_CALL);
  return answer(say(lang, `${count(list_.length, 'en', ['saved search', 'saved searches'], ['', ''])}: ${quoted(a, list_.map(x => x.name))}. Notes → Notes lists them above the search; one tap opens each, and Rename or remove saved searches changes them.`,
    `${count(list_.length, 'nl', ['', ''], ['bewaarde zoekopdracht', 'bewaarde zoekopdrachten'])}: ${quoted(a, list_.map(x => x.name))}. Notes → Notes toont ze boven de zoekbalk; één tik opent elk, en Rename or remove saved searches verandert ze.`), NOTES_CALL);
}

const savedSpeed = (): VoiceSpeed | null => { try { return typeof window === 'undefined' ? null : voiceSpeedOf(readDeviceRecord(getAppStorage(), JOURNAL_DISPLAY).data); } catch { return null; } };
/** LEDGER #442: "can I play my voice notes faster", "hoe speel ik spraakmemo's sneller af". */
function voiceFaster(a: Asked, extra: AwX3Extra): LocalReply | null {
  const en = /\b(?:voice notes?|voice memos?|audio notes?|recordings?)\b/.test(a.f) && /\b(?:faster|quicker|speed|sped up|1 5x|2x|double)\b/.test(a.f);
  const nl = /\b(?:spraakmemo\w*|spraakbericht\w*|spraaknotitie\w*|opname\w*)\b/.test(a.f) && /\b(?:sneller|snelheid|versnel\w*)\b/.test(a.f);
  if (!en && !nl) return null;
  const speed = 'voiceSpeed' in extra ? extra.voiceSpeed ?? null : savedSpeed(), lang = a.lang;
  const now = speed ? say(lang, ` Your speed now: ${speedLabel(speed)}, kept on this device.`, ` Je snelheid nu: ${speedLabel(speed)}, bewaard op dit apparaat.`) : '';
  return answer(say(lang, `Yes. A journal voice note plays in ZIGoals’ own player, on the entry and in Journal → Photos and voice notes: 1×, ${formatNumber(1.25)}×, ${formatNumber(1.5)}× or 2×, 15 seconds back or forward, and the time played of the whole. The speed you choose is remembered for every voice note.${now} A written transcript is not made: it needs a model, and a voice note never leaves this device.`,
    `Ja. Een spraakmemo in je dagboek speelt in de eigen speler van ZIGoals, bij het stuk en in Journal → Photos and voice notes: 1×, 1,25×, 1,5× of 2×, 15 seconden terug of vooruit, en de gespeelde tijd van het geheel. De snelheid die je kiest geldt voor elke spraakmemo.${now} Een uitgeschreven tekst wordt niet gemaakt: daar is een model voor nodig, en een spraakmemo verlaat dit apparaat nooit.`), JOURNAL_CALL);
}

/** LEDGER #444: "how do I write a morning and an evening page", "hoe schrijf ik een ochtend- en avondpagina". */
function dayPagesHow(a: Asked): LocalReply | null {
  const en = /\bmorning (?:and|&) (?:an )?evening\b|\bevening page\b|\bmorning pages?\b|\bfive minute journal\b/.test(a.f);
  const nl = /\bochtend (?:en|&) (?:een )?avond\w*\b|\bavondpagina\b|\bochtendpagina\b|\bochtend en avondpagina\b/.test(a.f);
  if (!en && !nl) return null;
  const lang = a.lang, j = a.env.journal;
  const time = (r: {on: boolean; time: string}, l: 'en' | 'nl') => r.on ? r.time : l === 'nl' ? 'uit' : 'off';
  const state = !j ? '' : dayPagesOn(j)
    ? say(lang, ` It is on. Morning reminder: ${time(morningReminderOf(j), 'en')}; evening reminder: ${time(reminderOf(j), 'en')}.`, ` Het staat aan. Ochtendherinnering: ${time(morningReminderOf(j), 'nl')}; avondherinnering: ${time(reminderOf(j), 'nl')}.`)
    : say(lang, ' It is off now.', ' Het staat nu uit.');
  return answer(say(lang, `${WHERE_PAGES}: switch on “Write each day as a morning page and an evening page”. The morning page asks “I am grateful for…” and “What would make today great?” (or your own questions); the evening page shows what you wrote that morning above its own two questions. The day stays one entry, and each page can have its own reminder (both off until you choose them).${state}`,
    `${WHERE_PAGES}: zet “Write each day as a morning page and an evening page” aan. De ochtendpagina vraagt “Ik ben dankbaar voor…” en “Wat zou vandaag mooi maken?” (of je eigen vragen); de avondpagina toont wat je die ochtend schreef boven haar eigen twee vragen. De dag blijft één stuk, en elke pagina kan een eigen herinnering krijgen (beide uit tot je ze kiest).${state}`), JOURNAL_CALL);
}
