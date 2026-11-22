import {scaleNutrition, type HealthDiaryEntry} from '../health';
import {sugarAlcoholMg} from '../food-plus/day-target';
import {formatNumber} from '../visual-format';
import {netCarbs, type NetCarbs} from './macro-mode';

/**
 * Review b2b #4 (LEDGER #88): a day's net carbs, one rule for every place that shows them — the Carbs tile on Health's
 * summary, Targets → Macro mode's "Net carbs today", and NOVA's and ZIGi's answer. Fiber is taken off only when every
 * entry of the day carries a fiber value (a part-known fiber total would be a guess); the sugar alcohols the person set
 * per library food (Targets → "Sugar alcohols for net carbs") are always taken off. The words say what was taken off,
 * and when fiber was not, why — never a silent switch to plain carbs. Pure: no storage, no React.
 */
export type NetCarbsDay = NetCarbs & {entries: number; sugarAlcoholMg: number};
type DayEntry = Pick<HealthDiaryEntry, 'date' | 'sourceId' | 'sourceKind' | 'quantityMilli'> & {snapshot: Pick<HealthDiaryEntry['snapshot'], 'nutrients'>};

/** The day's net carbs from its diary entries and the sugar alcohols set per food (food id → mg per serving). */
export function netCarbsOfDay(diary: readonly DayEntry[], date: string, sugarAlcohols: Record<string, number>): NetCarbsDay {
  const entries = diary.filter(e => e.date === date), sa = sugarAlcoholMg(entries, sugarAlcohols);
  const n = netCarbs(entries.map(e => scaleNutrition(e.snapshot.nutrients, e.quantityMilli)), sa);
  return {...n, entries: entries.length, sugarAlcoholMg: n.grams === null ? 0 : sa};
}

export type NetCarbsWords = {
  /** What was taken off ("fiber", "10 g sugar alcohols"), in order; empty when nothing was. */
  minus: string[];
  /** "carbs minus fiber and 10 g sugar alcohols", or "plain carbs" when nothing was taken off. */
  how: string;
  /** For a figure: "after fiber and 10 g sugar alcohols"; null when nothing was taken off. */
  after: string | null;
  /** "Fiber is not taken off: 3 of 4 entries carry it." when some (or all) entries lack fiber; else null. */
  fiberNote: string | null;
};
/** The plain words for a day's net carbs, in English or Dutch. */
export function netCarbsWords(n: NetCarbsDay, lang: 'en' | 'nl' = 'en'): NetCarbsWords {
  const nl = lang === 'nl';
  const minus = [n.net ? (nl ? 'vezels' : 'fiber') : null, n.sugarAlcoholMg > 0 ? `${formatNumber(n.sugarAlcoholMg / 1000, {maximumFractionDigits: 2})} g ${nl ? 'suikeralcoholen' : 'sugar alcohols'}` : null].filter((x): x is string => x !== null);
  const joined = minus.join(nl ? ' en ' : ' and ');
  return {
    minus,
    how: minus.length ? `${nl ? 'koolhydraten min' : 'carbs minus'} ${joined}` : nl ? 'gewone koolhydraten' : 'plain carbs',
    after: minus.length ? `${nl ? 'na' : 'after'} ${joined}` : null,
    fiberNote: n.net || !n.entries || n.grams === null ? null : nl ? `Vezels zijn er niet af gehaald: ${n.fiberKnownOf} van ${n.entries} items hebben ze.` : `Fiber is not taken off: ${n.fiberKnownOf} of ${n.entries} entries carry it.`,
  };
}
