import type {TimelineSource, TimelineSourceItem} from './sources';
import type {HealthData} from '../health';
import {healthGroupIn} from '../vault/w-homes';
import {readDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {ENERGY, type Energy} from '../energy/schema';
import {wordsOf} from '../mood-words/schema';
import {MOOD_WORDS} from '../wrap-up/engine';
import {wallClock} from '../zone-time';
import {isShown} from '../pages/visibility';
import {pagesViewSnapshot} from '../pages/view-store';

/**
 * Session AV lane 2 (r5-body; Tiimo's moods through the day; LEDGER #370): the day's check-ins on the Day Timeline as small
 * marks at their times — the mood (1–5, in its word), the energy and the feeling words — each in words as well as colour.
 * Only while Health is shown (the Health gate): a mood is Health data. A read only; nothing is stored. A check-in answered
 * on a later day has no time on this one and sits on the Anytime shelf. Registered by components/timeline/mood-source.tsx.
 */
const STRENGTH: Record<string, string> = {little: 'a little', quite: 'quite', very: 'very'};
/** A calm colour per level, from the theme (low, middle, high): the words always say the level too. */
export const levelColour = (n: number) => n <= 2 ? 'var(--pink)' : n === 3 ? 'var(--muted)' : 'var(--cyan)';
const when = (iso: string | undefined, date: string, zone: string): {time?: string; band: 'anytime'} => {
  if (!iso) return {band: 'anytime'};
  try { const w = wallClock(Date.parse(iso), zone); return w.date === date ? {time: w.clock, band: 'anytime'} : {band: 'anytime'}; } catch { return {band: 'anytime'}; }
};
export function moodMarks(date: string, health: HealthData | null | undefined, energy: Pick<Energy, 'days' | 'words'> | null | undefined, zone: string): TimelineSourceItem[] {
  const out: TimelineSourceItem[] = [];
  const mood = health ? (healthGroupIn(health, 'moods') as {days?: Record<string, {mood: number; at?: string}>} | undefined)?.days?.[date] : undefined;
  if (mood) out.push({id: `mood-${date}`, title: `Mood: ${MOOD_WORDS[mood.mood - 1] ?? mood.mood} (${mood.mood} of 5)`, done: false, href: '/app/health?mood=ask', pillar: 'health', label: 'Mood check-in', colour: levelColour(mood.mood), mark: true, ...when(mood.at, date, zone)});
  const e = energy?.days?.[date];
  if (e) out.push({id: `energy-${date}`, title: `Energy: ${e.energy} of 5`, done: false, href: '/app/health', pillar: 'health', label: 'Energy check-in', colour: levelColour(e.energy), mark: true, ...when(e.at, date, zone)});
  const w = wordsOf(energy)[date];
  if (w) {
    const words = [`${w.word}${w.strength ? ` (${STRENGTH[w.strength]})` : ''}`, ...(w.more ?? []).map(m => `${m.word}${m.strength ? ` (${STRENGTH[m.strength]})` : ''}`)];
    out.push({id: `feeling-${date}`, title: `Feeling: ${words.join(', ')}`, done: false, href: '/app/health', pillar: 'health', label: w.pleasantness === 'pleasant' ? 'A pleasant feeling word' : 'An unpleasant feeling word', colour: w.pleasantness === 'pleasant' ? 'var(--cyan)' : 'var(--pink)', mark: true, ...when(w.at, date, zone)});
  }
  return out;
}
function readEnergy(): Energy | null { try { const r = readDeviceRecord(getAppStorage(), ENERGY); return r.unreadable ? null : r.data; } catch { return null; } }
const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
export const moodTimelineSource: TimelineSource = ({date, stores}) => {
  if (!isShown(pagesViewSnapshot(), 'health')) return [];
  return moodMarks(date, stores.health as HealthData | null | undefined, readEnergy(), typeof stores.zone === 'string' ? stores.zone : deviceZone());
};
export default moodTimelineSource;
