import {GUIDED_PROGRAMS, type GuidedProgram} from '../../guided/programs';
import {guidedJourneysSchema, type GuidedJourney} from '../../guided/schema';
import {activeJourneys, addCalendarDays, dayProgress, isStepDone, journeyState, programmeToday} from '../../guided/engine';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, isQuestion, list, MIXED, say, type Asked, type Lang} from './av-words';
import {nlDay} from './exact/period';
import {formatDate} from '../../visual-format';
import type {LocalReply} from './engine';

/**
 * Session AW (programmes; owner decision 1d, ADR-046): NOVA's and ZIGi's on-device answers to "which programme am I on"
 * and "what's today's step", in English and Dutch, from the person's own Guided journeys record (`env.ak.guidedJourneys`,
 * read on this device by lib/ai/tools/ak-sources.ts) and the programmes' own pure functions (lib/guided/engine.ts).
 * A health programme is named only while Health is shared with the answer. It names what the person chose and ticked;
 * it never recommends a programme or promises a result. Every pattern reads the whole question, so nothing else is claimed.
 */
const PROGRAMME_EN = /\b(?:which|what) (?:programmes?|programs?|training plans?|journeys?|guided journeys?) (?:am i|i am|im|are we) (?:on|doing|following|in|running)\b|\b(?:am i|im) (?:on|doing|following) (?:a|any) (?:programmes?|programs?|training plans?|journeys?)\b|\bhow (?:far|am i doing) (?:am i |along )?(?:in|with|on) my (?:programmes?|programs?|training plans?|journeys?|couch to 5k|c25k)\b|\bmy (?:programmes?|programs?|training plans?|guided journeys?) progress\b/;
const PROGRAMME_NL = /\b(?:welk|welke) (?:programma|programmas|trainingsschema|traject|trajecten|begeleide trajecten) (?:volg|doe|ben|zit|loop) ik\b|\b(?:volg|doe) ik (?:een|al een) (?:programma|trainingsschema|traject)\b|\bmet welk (?:programma|trainingsschema|traject) ben ik bezig\b|\bhoe ver ben ik (?:met|in) mijn (?:programma|trainingsschema|traject)\b/;
/** The programme's own words: with "today" in the question, the question is about today's programme day. */
const NAMES = /\b(?:programmes?|programs?|training plans?|guided journeys?|couch to 5k|c25k|programmas?|trainingsschemas?|trajecten|traject)\b/;
const TODAY = /\b(?:today|todays|vandaag)\b/;
/** "today's step", "stap van vandaag": about a programme only while one is going (else it may be the step count). */
const TODAY_STEP = /\btodays (?:step|session|run)\b|\b(?:step|session|run) (?:for|of) today\b|\b(?:stap|sessie|run|training) (?:van|voor) vandaag\b/;
const COUNTING = /\bhow many\b|\bhoeveel\b|\bsteps? (?:count|taken)\b|\bstappen\b/;

export function awProgrammesAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !(isQuestion(a) || TODAY.test(a.f))) return null;
    const which = PROGRAMME_EN.test(a.f) || PROGRAMME_NL.test(a.f), named = NAMES.test(a.f) && TODAY.test(a.f);
    const loose = !which && !named && TODAY_STEP.test(a.f) && !COUNTING.test(a.f);
    if (!which && !named && !loose) return null;
    return programmesNow(a, named || loose, loose);
  } catch { return null; }
}

function readRecord(env: ToolEnv) {
  const raw = (env.ak as {guidedJourneys?: unknown} | null | undefined)?.guidedJourneys;
  if (raw === null || raw === undefined) return null;
  const parsed = guidedJourneysSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
/** The part of life whose switch covers a program: Health, Habits or Wealth (a Goals journey has no switch of its own here). */
const areaOf = (p: GuidedProgram) => p.pillar === 'goals' ? null : p.pillar;
const shut = (env: ToolEnv, p: GuidedProgram) => { const area = areaOf(p); return area ? closed(env, area) : null; };
const wordOf = (p: GuidedProgram, lang: Lang, many = false) => {
  const w = p.dayWord ?? 'Day';
  if (lang === 'nl') return w === 'Session' ? (many ? 'sessies' : 'sessie') : w === 'Run' ? (many ? 'runs' : 'run') : (many ? 'dagen' : 'dag');
  return w === 'Session' ? (many ? 'sessions' : 'session') : w === 'Run' ? (many ? 'runs' : 'run') : (many ? 'days' : 'day');
};
const opensIn = (lang: Lang, date: string, today: string) => date === addCalendarDays(today, 1) ? say(lang, 'tomorrow', 'morgen') : lang === 'nl' ? `op ${nlDay(date, today)}` : `on ${formatDate(date, {weekday: true, year: false})}`;

function programmesNow(a: Asked, todayAsked: boolean, onlyWhenGoing: boolean): LocalReply | null {
  const lang = a.lang, record = readRecord(a.env), all = record ? activeJourneys(record) : [];
  if (onlyWhenGoing && !all.length) return null;
  const shown = all.filter(({program}) => !shut(a.env, program));
  if (!shown.length && all.length) return shut(a.env, all[0]!.program)!;
  if (!shown.length) {
    const titles = list(GUIDED_PROGRAMS.filter(p => p.days).map(p => `“${p.title}”`), lang);
    return answer(say(lang,
      `You are not on a programme or a journey${todayAsked ? ', so there is no step for today' : ''}. Guided journeys has five written programmes, ${titles}, and short journeys; you can start one there whenever you like, or none.`,
      `Je volgt geen programma of traject${todayAsked ? ', dus er is vandaag geen stap' : ''}. Guided journeys heeft vijf geschreven programma’s, ${titles}, en korte trajecten; je kunt er daar een starten wanneer je wilt, of geen.`));
  }
  const lines = shown.map(({journey, program}) => line(a, journey, program));
  return answer(say(lang,
    `${shown.length === 1 ? 'You are on' : `You are on ${shown.length}:`} ${lines.join(' ')} You tick each step yourself in Guided journeys.`,
    `${shown.length === 1 ? 'Je volgt' : `Je volgt er ${shown.length}:`} ${lines.join(' ')} Je vinkt elke stap zelf af in Guided journeys.`));
}

function line(a: Asked, journey: GuidedJourney, program: GuidedProgram): string {
  const lang = a.lang, today = a.today, s = journeyState(journey, program, today), label = `“${program.title}”${journey.showcase ? ' (Showcase)' : ''}`;
  if (!program.days) {
    const where = say(lang, `step ${Math.min(Math.max(s.day, 0), s.total)} of ${s.total}, ${s.doneCount} done`, `stap ${Math.min(Math.max(s.day, 0), s.total)} van ${s.total}, ${s.doneCount} gedaan`);
    const step = s.today ? say(lang, `Today’s step: ${s.today.title}${journey.done.includes(s.today.id) ? ' (done)' : ''}.`, `De stap van vandaag: ${s.today.title}${journey.done.includes(s.today.id) ? ' (gedaan)' : ''}.`) : say(lang, 'No new step opens today.', 'Vandaag opent er geen nieuwe stap.');
    return `${label} (${where}). ${step}`;
  }
  const one = wordOf(program, lang), many = wordOf(program, lang, true);
  const week = program.weeks && s.day >= 1 ? say(lang, `week ${Math.min(program.weeks, Math.floor((s.day - 1) / 7) + 1)} of ${program.weeks}, `, `week ${Math.min(program.weeks, Math.floor((s.day - 1) / 7) + 1)} van ${program.weeks}, `) : '';
  const where = say(lang, `${week}${s.doneCount} of ${s.total} ${many} done`, `${week}${s.doneCount} van ${s.total} ${many} gedaan`);
  const now = programmeToday(journey, program, today)!;
  let todayText: string;
  if (now.kind === 'day') {
    const p = dayProgress(journey, now.day), next = now.day.steps.find(x => !isStepDone(journey, now.day, x));
    todayText = say(lang,
      `Today is ${one} ${now.number}: ${now.day.title}. ${p.done} of ${p.total} steps ticked${next ? `; next: ${next.title}` : ''}.`,
      `Vandaag is ${one} ${now.number}: ${now.day.title}. ${p.done} van ${p.total} stappen afgevinkt${next ? `; hierna: ${next.title}` : ''}.`);
  } else if (now.kind === 'rest') {
    todayText = now.next ? say(lang, `Today is a rest day; ${one} ${now.next.number} opens ${opensIn(lang, now.next.opensOn, today)}.`, `Vandaag is een rustdag; ${one} ${now.next.number} opent ${opensIn(lang, now.next.opensOn, today)}.`) : say(lang, 'Today is a rest day.', 'Vandaag is een rustdag.');
  } else if (now.kind === 'before') {
    todayText = say(lang, `${one.charAt(0).toUpperCase()}${one.slice(1)} 1 opens ${opensIn(lang, now.opensOn, today)}.`, `${one.charAt(0).toUpperCase()}${one.slice(1)} 1 opent ${opensIn(lang, now.opensOn, today)}.`);
  } else if (now.kind === 'complete') {
    todayText = say(lang, `Every ${one} is done.`, `Elke ${one} is gedaan.`);
  } else {
    todayText = say(lang, `Every ${one} is open; the ones left can be done whenever you like.`, `Elke ${one} is open; wat nog over is kun je doen wanneer je wilt.`);
  }
  return `${label} (${where}). ${todayText}`;
}
