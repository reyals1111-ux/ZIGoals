import {MET_CREDIT, MET_CREDIT_NL, condition, deviceZone} from './met';
import type {WorldPlace, WorldReading} from './record';

/**
 * Session AM (ADR-038 D12–D15): the weather in words, for NOVA to say and for the widget's caption. Built only from the
 * reading on the device; every sentence names the source and the reading's time, and anything about the hours ahead is
 * said as what the forecast shows, never as a promise.
 */
export type WeatherLang = 'en' | 'nl';
/**
 * The temperature unit. Celsius only: the app has no preference for a temperature unit (its unit choices are for water
 * and weight), so none is invented here. A later unit joins this type.
 */
export type WeatherUnits = 'celsius';

/** A temperature as it is said: whole degrees, "12°", "-3°", never "-0°". */
export function degrees(t: number, units: WeatherUnits = 'celsius'): string { void units; return `${Math.round(t) + 0}°`; }
/** A moment as a clock time on the device ("14:00"). */
export function clockTime(iso: string, timeZone: string = deviceZone()): string {
  const options = {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'} as const, date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try { return new Intl.DateTimeFormat('en-GB', {...options, timeZone}).format(date); } catch { return new Intl.DateTimeFormat('en-GB', {...options, timeZone: 'UTC'}).format(date); }
}
/** How a condition joins "it is 12°": a state of the sky with "and", anything that falls with "with"; '' when unknown. */
function phrase(symbol: string, lang: WeatherLang): string {
  if (!symbol) return '';
  const c = condition(symbol);
  if (c.words === 'Weather') return '';
  const sky = c.kind === 'clear' || c.kind === 'partly' || c.kind === 'cloud' || c.kind === 'fog';
  if (lang === 'nl') return sky ? ` en ${c.kind === 'fog' ? 'mistig' : c.wordsNl.toLowerCase()}` : ` met ${c.wordsNl.toLowerCase()}`;
  return sky ? ` and ${c.kind === 'clear' ? 'clear' : c.kind === 'fog' ? 'foggy' : c.words.toLowerCase()}` : ` with ${c.words.toLowerCase()}`;
}
/**
 * One sentence about now, then the source and the reading's time: "In Brussels it is 12° with light rain. Data from
 * MET Norway, 14:00." The place is named as the person named it; the time is the device's clock.
 */
export function weatherSentence(reading: Pick<WorldReading, 'now'>, place: Pick<WorldPlace, 'name'>, lang: WeatherLang = 'en', units: WeatherUnits = 'celsius', timeZone: string = deviceZone()): string {
  const now = reading.now, time = clockTime(now.at, timeZone), credit = `${lang === 'nl' ? MET_CREDIT_NL : MET_CREDIT}${time ? `, ${time}` : ''}.`;
  return lang === 'nl'
    ? `In ${place.name} is het ${degrees(now.t, units)}${phrase(now.symbol, lang)}. ${credit}`
    : `In ${place.name} it is ${degrees(now.t, units)}${phrase(now.symbol, lang)}. ${credit}`;
}

export const UMBRELLA_HOURS = 6;
/** From this much in the hours ahead (in mm) the forecast counts as showing precipitation; less is a trace. */
export const UMBRELLA_FROM_MM = 0.1;
export type Umbrella = {
  /** Does the forecast show precipitation in the hours ahead? null: it does not say (no amounts in the reading). */
  expected: boolean | null;
  /** The amounts of those hours added up, in mm; null when the reading has none. */
  mm: number | null;
  /** How many of the next hours the reading has an amount for (6 at most). */
  hours: number;
  words: string;
};
/**
 * Does the forecast show precipitation in the six hours from the reading's time? The amounts of the current hour and
 * the hours after it are added up. Said as a forecast: "The forecast shows rain in the next 6 hours, about 1.4 mm."
 * A reading without amounts gives `expected: null` and says so; it is never read as dry.
 */
export function umbrella(reading: Pick<WorldReading, 'now' | 'hours'>, lang: WeatherLang = 'en'): Umbrella {
  const start = Date.parse(reading.now.at), end = start + UMBRELLA_HOURS * 3_600_000;
  const steps = [reading.now, ...reading.hours].filter(step => { const ms = Date.parse(step.at); return ms >= start && ms < end && typeof step.precip === 'number' && Number.isFinite(step.precip); }).slice(0, UMBRELLA_HOURS);
  const hours = steps.length, span = lang === 'nl' ? (hours === 1 ? 'het komende uur' : `de komende ${hours} uur`) : (hours === 1 ? 'the next hour' : `the next ${hours} hours`);
  if (!hours) return {expected: null, mm: null, hours, words: lang === 'nl' ? `De verwachting zegt niet of er regen komt in de komende ${UMBRELLA_HOURS} uur.` : `The forecast does not say if rain is expected in the next ${UMBRELLA_HOURS} hours.`};
  const mm = Math.round(steps.reduce((sum, step) => sum + (step.precip ?? 0), 0) * 10) / 10;
  if (mm < UMBRELLA_FROM_MM) return {expected: false, mm, hours, words: lang === 'nl' ? `De verwachting toont geen regen of sneeuw in ${span}.` : `The forecast shows no rain or snow in ${span}.`};
  const kinds = new Set(steps.filter(step => (step.precip ?? 0) > 0).map(step => condition(step.symbol).kind));
  const falls = kinds.has('snow') ? 'snow' : kinds.has('sleet') ? 'sleet' : 'rain';
  const amount = lang === 'nl' ? `ongeveer ${String(mm).replace('.', ',')} mm` : `about ${mm} mm`;
  const words = lang === 'nl'
    ? `De verwachting toont ${falls === 'snow' ? 'sneeuw' : falls === 'sleet' ? 'natte sneeuw' : 'regen'} in ${span}, ${amount}.${falls === 'snow' ? '' : ' Een paraplu kan van pas komen.'}`
    : `The forecast shows ${falls} in ${span}, ${amount}.${falls === 'snow' ? '' : ' An umbrella may be useful.'}`;
  return {expected: true, mm, hours, words};
}
