import {fromCents} from '../../money-log/engine';
import {formatClock, formatCurrencyAmount, formatMonth, formatNumber} from '../../visual-format';
import type {ToolEnv} from '../tools/env';
import {HEALTH_CLOSED} from '../tools/format';
import type {LocalReply, ToolCallRecord} from './engine';
import {dayWords, nlDay} from './exact/period';
import {fold, langOf} from './exact/text';
import {novaAreaClosed, novaEnvInfo} from './nova-env';

/**
 * Session AV (owner follow-up 2, item 1c; the fresh reviewers' check 5, q1–q4): the shared words of the on-device answers
 * to the AV features (av-answers.ts, av-life.ts). A question is read folded (lower case, accents and punctuation gone), its
 * language by its function words; a Dutch answer writes its dates the Dutch way ("di 17 nov"), never "Tue, Nov 17". Each
 * part of life is read only under its own switch, with the same refusal the tools give (NOVA's wording follows from it).
 */
export type Lang = 'en' | 'nl';
export type Asked = {raw: string; f: string; lang: Lang; env: ToolEnv; today: string};
export function asked(question: string, env: ToolEnv): Asked | null {
  const raw = question.trim().replace(/\s+/g, ' ');
  if (!raw || raw.length > 200) return null;
  const f = fold(raw);
  return f ? {raw, f, lang: languageOf(f), env, today: env.habitDay} : null;
}
const NL_ONLY = new Set('ik mijn mn je jij jouw wat welk welke hoe hoeveel wanneer waar waarom heb hebt heeft ben bent zijn zit zitten ligt liggen het een van voor niet met deze dit vandaag gisteren morgen maand jaar dagen bevat veel nog ook naar moet kan kun bij aan tot zich op de er staat staan ging gaat gaan geen mama vorige afgelopen laatste toon laat zien eten'.split(' '));
const EN_ONLY = new Set('i my me what which how when where why did do does the a an of for not with this that today yesterday tomorrow month year much many have has had am are is my last days food foods show list'.split(' '));
/** Dutch when the question holds more Dutch-only words than English-only ones ("welk eten bevat veel ijzer"); else the exact layer's reading. */
export function languageOf(folded: string): Lang {
  const words = folded.split(' '), nl = words.filter(w => NL_ONLY.has(w)).length, en = words.filter(w => EN_ONLY.has(w)).length;
  return nl === en ? langOf(folded) : nl > en ? 'nl' : 'en';
}
/** The run of words in what was typed whose folded form is `folded` ("Café Noël" for "cafe noel"), or null. */
export function typedWords(raw: string, folded: string): string | null {
  const words = raw.replace(/[?!.]+$/, '').split(' ');
  for (let i = 0; i < words.length; i++) for (let k = i + 1; k <= words.length; k++) { const run = words.slice(i, k).join(' '); if (fold(run) === folded) return run.replace(/^[“"']|[”"']$/g, ''); }
  return null;
}
export const say = (lang: Lang, en: string, nl: string) => lang === 'nl' ? nl : en;
export const answer = (text: string, calls: ToolCallRecord[] = []): LocalReply => ({kind: 'answer', text, calls});
/** A question, not a log line or a request to change something: a question word first, or a question mark at the end. */
export const QUESTION = /^(?:(?:hey|hi|ok|okay|so|and|nova|zigi|hoi|en|dus|nou)\s+)*(?:what|whats|which|when|whens|where|wheres|how|hows|show|list|tell me|give me|do i|did i|have i|am i|is|are|was|were|does|can|could|wat|welke|welk|wanneer|hoeveel|hoe|waar|waarom|toon|laat|heb ik|had ik|ben ik|zijn|is er|staan|staat|geef|vertel|noem|moet ik|kan ik|vraagt|zit|zitten|ligt|liggen|bleven|bleef)\b/;
export const isQuestion = (a: Asked) => QUESTION.test(a.f) || /\?\s*$/.test(a.raw);
/** "…, and log one more glass": a question with an action in it is the model's or a card's, never only this answer. */
export const MIXED = /\b(?:and|then|also|plus|en|dan|ook)\s+(?:please\s+|ook\s+|even\s+)?(?:log|add|track|mark|tick|skip|create|make|set|remind|start|stop|delete|remove|note|save|zet|voeg|noteer|vink|sla|registreer|verwijder|maak|plan)\b/;

const MONTH_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export {nlDay};
/** A day in the answer's language: "Tue, Nov 17" or "di 17 nov". */
export const dayIn = (lang: Lang, date: string, today: string) => lang === 'nl' ? nlDay(date, today) : dayWords(date, today);
/** A month key ("2026-10") in words: "Oct 2026" or "oktober 2026". */
export const monthIn = (lang: Lang, month: string) => lang === 'nl' ? `${MONTH_NL[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}` : formatMonth(month);
/** A wall clock ("18:30") in the answer's language: the app's own hour cycle in English, 24 hours in Dutch. */
export const clockIn = (lang: Lang, clock: string) => lang === 'nl' ? clock : formatClock(clock);
export const money = (amountCents: number, currency: string) => formatCurrencyAmount(fromCents(amountCents), currency);
/**
 * Review b2a #6 (as review b1 #16 did for the pay-period answer): money in the answer's language — a Dutch answer writes
 * it the Dutch way ("€ 40,00"), as it writes its dates; an English answer in the app's display format, as the screens.
 */
export const moneyIn = (lang: Lang, amountCents: number, currency: string) => lang === 'nl' ? formatCurrencyAmount(fromCents(amountCents), currency, 'nl-NL') : money(amountCents, currency);
export const num = (n: number) => formatNumber(n, {maximumFractionDigits: 2});
export const count = (n: number, lang: Lang, en: [string, string], nl: [string, string]) => `${formatNumber(n)} ${(lang === 'nl' ? nl : en)[n === 1 ? 0 : 1]}`;
export function list(items: readonly string[], lang: Lang): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${lang === 'nl' ? 'en' : 'and'} ${items.at(-1)}`;
}
/** Minutes as the sleep answers write them: "7 h 05 min". */
export const hm = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(Math.round(minutes % 60)).padStart(2, '0')} min`;

type Area = 'today' | 'habits' | 'wealth' | 'health';
const AREA = {today: 'Today', habits: 'Habits', wealth: 'Wealth'} as const;
/**
 * Why a part of life is not read here, or null when it is: the tools' own sentence for a closed switch (NOVA's wording
 * turns it into NOVA → Permissions), Health's three-part gate, and NOVA with Today off (only Notes and the Journal open).
 */
export function closed(env: ToolEnv, area: Area, tool = 'tasks'): LocalReply | null {
  if (area === 'health') return env.health && env.areas.health !== false ? null : {kind: 'refusal', text: HEALTH_CLOSED, calls: []};
  const shut = env.areas[area] === false || (area === 'today' && !!env.todayTools && !env.todayTools.has(tool));
  return shut ? {kind: 'refusal', text: `${AREA[area]} isn't shared with ZIGi here — its switch is off in Settings → ZIGi · your companion.`, calls: []} : null;
}
/** The journal is read only where it is shared with this answer (NOVA: its Journal permission). */
export function journalClosed(a: Asked): LocalReply | null {
  const today = closed(a.env, 'today', 'journal');
  if (today) return today;
  if (a.env.journal) return null;
  return novaEnvInfo(a.env) ? {kind: 'refusal', text: novaAreaClosed('Journal', a.lang), calls: []} : answer(say(a.lang, 'Your journal can’t be read on this device right now, so I can’t say.', 'Je dagboek kan nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'));
}
/** "Example · Mum’s birthday" → the folded words, the possessive and the Showcase's label taken off. */
export const titleWords = (title: string) => fold(title).replace(/\bshowcase data\b|\bexample\b/g, ' ').split(' ').map(w => w.replace(/(?<=\w{2})s$/, '')).filter(w => w.length >= 2);
