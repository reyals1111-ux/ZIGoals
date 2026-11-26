import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, dayIn, list, MIXED, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';
import {formatNumber} from '../../visual-format';
import {addLocalDays} from '../../local-date';
import {ENTERED_WORDS, type ActivityExtras} from '../../aw-kcal/activity-extras';
import {recordedCalories, SOURCE_NAMES, energySourceWords} from '../../aw-kcal/recorded';

/**
 * Session AW (kcal; owner decision 1a and amendment 4, ADR-046): "how many calories did I burn today / this week",
 * "hoeveel calorieën heb ik verbrand", answered by NOVA and ZIGi on the device from the person's own records only — the
 * calories they typed on an activity ("you entered") and the active energy a file brought in ("from your file"), each
 * summed with its source named, never added together. With neither, it says honestly that ZIGoals does not work out
 * calories burned and where to type them. Never an estimate, never a target, never advice. Behind Health's gate. Wired
 * into engine.ts before the food answers, which read "calories … burn" as the calories eaten.
 */
export function awKcalAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !claims(a.f)) return null;
    const shut = closed(a.env, 'health'); if (shut) return shut;
    return burnedAnswer(a);
  } catch { return null; }
}
const EN_ENERGY = /\b(?:calories?|kcals?|cals|active energy|energy)\b/, EN_BURN = /\b(?:burn|burns|burned|burnt|burning|expend|expended|expending)\b/;
const NL_ENERGY = /\b(?:calorie\w*|kcal|energie|actieve energie)\b/, NL_BURN = /\b(?:verbrand\w*|verbruik\w*)\b/, NL_ONE_WORD = /\b(?:calorieverbruik|energieverbruik|caloriegebruik)\b/;
/** Advice ("should I burn", "to lose weight"), fat ("burning fat") and a log line ("I burned 300 kcal") are not this question. */
const NOT_OURS = /\b(?:should|need to|have to|must|ought|to lose|lose weight|fat|moet|moeten|zou|zal|af te vallen|afvallen|vet|how to|hoe kan)\b/;
const LOG_LINE = /^(?:i|ik|today i|vandaag heb ik|log|add|track|note|noteer|voeg|zet)\b.*\d/;
export const claims = (f: string) => !NOT_OURS.test(f) && !LOG_LINE.test(f) && ((EN_ENERGY.test(f) && EN_BURN.test(f)) || (NL_ENERGY.test(f) && NL_BURN.test(f)) || NL_ONE_WORD.test(f));

type Span = {from: string; to: string; en: string; nl: string};
const monday = (day: string) => addLocalDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
/** The span asked about: today unless the question names yesterday, this or last week, the last 7 days or this month. */
export function spanOf(f: string, today: string): Span {
  if (/\byesterday\b|\bgisteren\b/.test(f)) { const d = addLocalDays(today, -1); return {from: d, to: d, en: 'yesterday', nl: 'gisteren'}; }
  if (/\blast week\b|\bvorige week\b/.test(f)) { const to = addLocalDays(monday(today), -1); return {from: addLocalDays(to, -6), to, en: 'last week', nl: 'vorige week'}; }
  if (/\b(?:last|past) (?:7|seven) days\b|\b(?:afgelopen|laatste) (?:7|zeven) dagen\b|\bpast week\b|\bafgelopen week\b/.test(f)) return {from: addLocalDays(today, -6), to: today, en: 'in the last 7 days', nl: 'in de afgelopen 7 dagen'};
  if (/\bthis week\b|\bdeze week\b|\bweek\b/.test(f)) return {from: monday(today), to: today, en: 'this week', nl: 'deze week'};
  if (/\bthis month\b|\bdeze maand\b|\bmonth\b|\bmaand\b/.test(f)) return {from: `${today.slice(0, 8)}01`, to: today, en: 'this month', nl: 'deze maand'};
  return {from: today, to: today, en: 'today', nl: 'vandaag'};
}
const CALLS = [{tool: 'health_summary', args: {}, label: 'Health summary'}];
const kcal = (lang: Lang, n: number) => `${lang === 'nl' ? n.toLocaleString('nl-NL') : formatNumber(n)} kcal`;
const when = (lang: Lang, s: Span, today: string) => {
  const days = s.from === s.to ? dayIn(lang, s.from, today) : `${dayIn(lang, s.from, today)} ${lang === 'nl' ? 'tot' : 'to'} ${dayIn(lang, s.to, today)}`;
  return `${lang === 'nl' ? s.nl : s.en} (${days})`;
};
const HOW = {
  en: 'ZIGoals doesn’t work out calories burned from your movement. You can type them on an activity in Health → Activity (“Calories (you entered)”), or bring them in with a file from your watch or phone (Settings → Switch to ZIGoals).',
  nl: 'ZIGoals rekent geen verbrande calorieën uit je beweging uit. Je kunt ze bij een activiteit invullen in Health → Activity (“Calories (you entered)”), of ze meenemen met een bestand van je horloge of telefoon (Settings → Switch to ZIGoals).',
};
function burnedAnswer(a: Asked): LocalReply {
  const lang = a.lang, today = a.env.healthDay, s = spanOf(a.f, today);
  const extras = ((a.env.ak ?? {}) as {activityExtras?: ActivityExtras | null}).activityExtras ?? null;
  const r = recordedCalories(a.env.health, extras, s.from, s.to), period = when(lang, s, today);
  if (!r.entered && !r.imported) return answer(say(lang, `No calories burned are recorded ${period}. ${HOW.en}`, `Er zijn geen verbrande calorieën vastgelegd ${period}. ${HOW.nl}`), CALLS);
  const parts: string[] = [];
  if (r.entered) {
    const n = r.entered.activities, names = list(r.entered.names.map(x => `“${x}”`), lang);
    parts.push(say(lang, `${kcal('en', r.entered.kcal)} ${ENTERED_WORDS.en} on ${n} ${n === 1 ? 'activity' : 'activities'} (${names})`, `${kcal('nl', r.entered.kcal)} ${ENTERED_WORDS.nl} bij ${n} ${n === 1 ? 'activiteit' : 'activiteiten'} (${names})`));
  }
  if (r.imported) {
    const d = r.imported.days, names = list(r.imported.sources.map(x => SOURCE_NAMES[x]), lang), from = energySourceWords(r.imported.sources, lang);
    parts.push(say(lang, `${kcal('en', r.imported.kcal)} of active energy ${from} (${names}), on ${d} ${d === 1 ? 'day' : 'days'}`, `${kcal('nl', r.imported.kcal)} actieve energie ${from} (${names}), op ${d} ${d === 1 ? 'dag' : 'dagen'}`));
  }
  const head = say(lang, `Calories burned ${period}, from your own records: `, `Verbrande calorieën ${period}, uit je eigen gegevens: `);
  const apart = r.entered && r.imported ? say(lang, ' The two are kept apart, as they can count the same movement.', ' Die twee worden niet opgeteld, want ze kunnen dezelfde beweging tellen.') : '';
  const tail = r.entered ? say(lang, ' ZIGoals doesn’t work out calories burned: these are only figures you typed or imported.', ' ZIGoals rekent geen verbrande calorieën uit: dit zijn alleen cijfers die je zelf invulde of importeerde.')
    : say(lang, ' ZIGoals doesn’t work out calories burned; you can type them on an activity in Health → Activity.', ' ZIGoals rekent geen verbrande calorieën uit; je kunt ze bij een activiteit invullen in Health → Activity.');
  return answer(`${head}${parts.join(say(lang, '; ', '; '))}.${apart}${tail}`, CALLS);
}
