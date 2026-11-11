import {readDeviceRecord, updateDeviceRecord} from '../../device-record';
import {fetchWeather, shouldFetch, WeatherError, MET_CREDIT, MET_CREDIT_NL} from './met';
import {NOVA_WORLD, placeOf, readingOf, worldOn} from './record';
import {umbrella, weatherSentence} from './words';

/**
 * Session AM (ADR-038 D13–D15, D19): the weather in words, for a phone (where NOVA is a chat agent and no widget is
 * projected). The same rules as the widget: nothing is asked unless the person turned outside data on and chose a place;
 * the reading on the device is used until it expires; one ask per ten minutes. Off or without a place, it says how to
 * turn it on and never guesses.
 */
type Lang = 'en' | 'nl';
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export const WEATHER_OFF_WORDS: Readonly<Record<Lang, string>> = {
  en: 'Weather is off. Turn on “Weather (outside data)” in NOVA → Permissions and choose your place; then I ask MET Norway, which sees your network address and that place, rounded to about 1 km. Until then I don’t guess the weather.',
  nl: 'Het weer staat uit. Zet “Weather (outside data)” aan in NOVA → Permissions en kies je plaats; dan vraag ik het aan MET Norway, dat je netwerkadres en die plaats (afgerond op ongeveer 1 km) ziet. Tot dan gok ik niet naar het weer.',
};
export const WEATHER_PLACE_WORDS: Readonly<Record<Lang, string>> = {
  en: 'Weather is on, but no place is chosen yet. Choose one in NOVA → Permissions.',
  nl: 'Het weer staat aan, maar er is nog geen plaats gekozen. Kies er een in NOVA → Permissions.',
};
export async function weatherAnswer(storage: Store, now: Date, lang: Lang, fetchImpl: typeof fetch = fetch): Promise<string> {
  let world = readDeviceRecord(storage, NOVA_WORLD).data;
  if (!worldOn(world)) return WEATHER_OFF_WORDS[lang];
  const place = placeOf(world);
  if (!place) return WEATHER_PLACE_WORDS[lang];
  let trouble = '';
  if (shouldFetch({world, now, hidden: false, wanted: true})) {
    try { const next = await fetchWeather({world, now, fetchImpl}); world = updateDeviceRecord(storage, NOVA_WORLD, () => next); }
    catch (e) {
      trouble = e instanceof Error ? e.message : '';
      if (e instanceof WeatherError) { try { world = updateDeviceRecord(storage, NOVA_WORLD, () => (e as WeatherError).world); } catch { /* the ten-minute rule then holds in memory only */ } }
    }
  }
  const reading = readingOf(world);
  if (!reading) return lang === 'nl' ? `Ik heb nog geen weerbericht voor ${place.name}. ${trouble} Ik vraag het hooguit eens per tien minuten.`.replace(/\s+/g, ' ') : `I have no reading for ${place.name} yet. ${trouble} I ask at most once in ten minutes.`.replace(/\s+/g, ' ');
  const credit = lang === 'nl' ? MET_CREDIT_NL : MET_CREDIT, sentence = weatherSentence(reading, place, lang);
  return `${sentence} ${umbrella(reading, lang).words}${sentence.includes(credit) ? '' : ` ${credit}.`}`;
}
