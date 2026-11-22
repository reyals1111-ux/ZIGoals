import type {Family} from './connect-families';

/**
 * Session AM-2 (step 3, round 2, "NOVA connected"; ADR-038 D4, D6): the phrasing families of the widgets for the pages
 * that still had none — the priority matrix, today by the hour, reviews, goal milestones, cash flow and payees, accounts
 * and debts, the debt payoff plan, savings challenges, price alerts — and, under the Health gate only, health trends,
 * food-logging days, fasting, meditation, supplements and the cycle log.
 *
 * English and Dutch, as every family (AL lesson 6); each pattern runs on `normal(text)`. They are matched after the
 * first round's families and before the general ones (lib/nova/summon/summon.ts FAMILIES); `morePrune` then drops the
 * general widget the same words would also make, and lets a family that leans on an everyday word ("balance", "trend")
 * step back when the request is about something else. Deterministic and on the device: nothing here reads, sends or
 * invents a value.
 */
export const MORE_FAMILIES: readonly Family[] = [
  {id: 'priority-matrix', en: /\b(priority matrix|eisenhower|urgent (?:and|or|vs) important|urgent tasks?|whats urgent|what is urgent|most (?:urgent|important) tasks?|important tasks?)\b/,
    nl: /\b(prioriteiten ?matrix|eisenhower|dringend(?:e)? (?:en|of) belangrijk(?:e)?|dringende taken|wat is (?:er )?dringend|belangrijk(?:st)?e taken)\b/},
  {id: 'hour-grid', en: /\b(hour grid|hour by hour|by the hour|hourly (?:plan|view|schedule)|time ?block(?:s|ing)?|my hours today|todays hours|hours (?:of|for) today)\b/, nl: /\b(uurrooster|uur voor uur|per uur|tijdblokken|uurschema|mijn uren vandaag)\b/, stageOnly: true},
  {id: 'reviews', en: /\b(weekly review|life review|my reviews?|review (?:due|day)|is my review due|when is my (?:next )?review|week in review)\b/,
    nl: /\b(weekreview|weekoverzicht|wekelijkse (?:review|terugblik)|levensreview|mijn reviews?|wanneer is mijn (?:volgende )?review|is mijn review)\b/},
  {id: 'milestones', en: /\b(milestones?)\b/, nl: /\b(mijlpalen|mijlpaal)\b/},
  {id: 'cash-flow', en: /\b(cash ?flow|income (?:and|vs|versus) (?:spending|expenses)|money in and (?:money )?out|payees?|who (?:did|do) i pay|where (?:does|did) my money go)\b/,
    nl: /\b(kasstroom|cashflow|inkomsten en uitgaven|geld in en uit|aan wie (?:betaal|betaalde) ik|waar gaat mijn geld (?:heen|naartoe))\b/},
  {id: 'debt-plan', en: /\b(debt (?:plan|payoff|pay off|free|planner)|pay(?:ing)? off my (?:debts?|loans?|credit cards?)|payoff (?:plan|planner|date)|when (?:will|am) i (?:be )?debt free|snowball|avalanche)\b/,
    nl: /\b(aflosplan|schulden ?plan|schuldenvrij|aflossen|afbetalen|afbetalingsplan|sneeuwbal|lawine)\b/},
  {id: 'accounts', en: /\b(accounts?|debts?|what (?:do )?i owe|how much do i owe|balances?|loans?|mortgage|credit cards?)\b/,
    nl: /\b(schuld(?:en)?|wat ben ik (?:nog )?schuldig|saldo|saldi|lening(?:en)?|hypotheek|creditcards?|spaarrekening(?:en)?|bankrekening(?:en)?)\b/},
  {id: 'savings-challenges', en: /\b(savings? challenges?|52 week|no spend|round ups?|money challenges?)\b/, nl: /\b(spaaruitdaging(?:en)?|spaar ?challenges?|52 weken|no spend|afrondingen)\b/},
  {id: 'price-alerts', en: /\b(price alerts?|alerts?|price (?:targets?|warnings?))\b/, nl: /\b(prijsalerts?|prijsalarm(?:en)?|koersalarm(?:en)?|prijswaarschuwing(?:en)?|alerts?)\b/},
  {id: 'health-trends', en: /\b(health trends?|trends?|resting heart rate|heart rate)\b/, nl: /\b(gezondheidstrends?|trends?|rusthartslag|hartslag)\b/},
  {id: 'food-days', en: /\b(food logging|logging days|days (?:i )?logged (?:food|meals)|food (?:log )?(?:days|consistency)|how (?:often|many days) (?:did|do|have) i log(?:ged)? (?:food|meals|my food|my meals))\b/,
    nl: /\b(eetdagboek ?dagen|dagen (?:eten|voeding) gelogd|hoe vaak (?:log|logde) ik (?:mijn )?(?:eten|voeding)|hoeveel dagen (?:heb ik )?(?:eten|voeding) gelogd|eten gelogd)\b/},
  {id: 'fasting', en: /\b(fasting|fasts|fasted|my fast|a fast|current fast|last fast|intermittent)\b/, nl: /\b(vasten|gevast|vastenperiode|mijn vast|intermitterend)\b/},
  {id: 'meditation', en: /\b(meditat(?:e|ed|ion|ing)|mindfulness|breathing (?:exercise|session)s?)\b/, nl: /\b(meditatie|gemediteerd|mediteren|mindfulness|ademhalingsoefening(?:en)?)\b/},
  {id: 'supplements', en: /\b(supplements?|vitamins?|medication|doses?)\b/, nl: /\b(supplement(?:en)?|vitamines?|medicatie|doses|dosering(?:en)?)\b/},
  {id: 'cycle', en: /\b(cycle (?:log|day|tracker)|my cycle|period (?:log|tracker|due)|next period|menstrua[a-z]*)\b/, nl: /\b(cyclus|menstruatie|ongesteld|volgende menstruatie)\b/},
];
/**
 * Session AV (A42-4): six kinds that only the gallery could make (ADR-042's "gallery only"): sleep stages, bed and wake,
 * fasting windows, the mood map, debts ranked and the body scan. Their lines and data paths exist (ax-lines-health.ts,
 * ax-lines-money.ts); these families let a request make them. Each is more specific than its general family (sleep,
 * fasting, accounts, the Health HUD), which `morePrune` then drops. Matched right after round 2, before the general ones.
 */
export const AV_FAMILIES: readonly Family[] = [
  {id: 'sleep-stages', en: /\b(sleep stages?|deep sleep|rem sleep|light sleep|core sleep|stages? of (?:my )?sleep)\b/, nl: /\b(slaapfases?|slaapfasen|diepe slaap|remslaap|rem slaap|lichte slaap)\b/},
  {id: 'sleep-times', en: /\b(bed (?:and|&) wake(?: times?)?|bedtimes? and wake(?: ?up)? times?|when (?:did|do) i (?:go to bed|get up|wake up)|what time did i (?:go to bed|wake up|get up))\b/,
    nl: /\b(bedtijd en (?:opstaan|wektijd|ontwaken)|hoe laat (?:ging|ga) ik (?:naar bed|slapen)|hoe laat (?:stond|sta) ik op|hoe laat werd ik wakker)\b/},
  {id: 'fasting-windows', en: /\b(fasting windows?|past fasts|fasts? (?:against|vs) (?:my|the|their) targets?)\b/, nl: /\b(vastvensters?|mijn laatste vastenperiodes|vastenperiodes tegen (?:mijn |hun )?doel)\b/},
  {id: 'mood-map', en: /\b(mood map|map of my moods?|moods? (?:this|last|of the|over the) month|month of moods?|my moods? by day)\b/, nl: /\b(stemmingskaart|stemmingen (?:deze|vorige) maand|mijn stemming per dag|maand (?:van|met) stemmingen)\b/},
  {id: 'debt-ranks', en: /\b(rank(?:ed)? my debts?|debts? ranked|biggest debts?|largest debts?|which debt is (?:the )?(?:biggest|largest)|debt balances?)\b/,
    nl: /\b(rangschik mijn schulden|grootste schulden?|welke schuld is het grootst|schulden gerangschikt|schuldsaldo'?s)\b/},
  {id: 'body-scan', en: /\b(body scan|body measurements?|my measurements|waist|hips|chest measurement)\b/, nl: /\b(lichaamsscan|lichaamsmaten|mijn maten|taille|heupen|borstomtrek)\b/},
];
export const AV_NL_TITLES: Readonly<Record<string, string>> = {'sleep-stages': 'Slaapfasen', 'sleep-times': 'Naar bed en op', 'fasting-windows': 'Vastvensters', 'mood-map': 'Stemmingskaart', 'debt-ranks': 'Schuldsaldo\'s', 'body-scan': 'Lichaamsscan'};
/** The Dutch titles of these widgets (lib/nova/summon/words.ts NL_TITLES). */
export const MORE_NL_TITLES: Readonly<Record<string, string>> = {
  'priority-matrix': 'Prioriteitenmatrix', 'hour-grid': 'Vandaag per uur', reviews: 'Reviews', milestones: 'Mijlpalen van je doelen', 'cash-flow': 'Kasstroom', accounts: 'Rekeningen en schulden', 'debt-plan': 'Aflosplan',
  'savings-challenges': 'Spaaruitdagingen', 'price-alerts': 'Prijsalerts', 'health-trends': 'Gezondheidstrends', 'food-days': 'Dagen met eten gelogd', fasting: 'Vasten', meditation: 'Meditatie', supplements: 'Supplementen', cycle: 'Cyclus',
};
/** Dutch words of these families' requests, for the language of NOVA's answer (lib/nova/summon/summon.ts summonLanguage). */
export const MORE_NL_WORDS = 'slaapfasen|slaapfases|slaapfase|remslaap|vastvensters|vastvenster|stemmingskaart|stemmingen|stemming|rangschik|lichaamsscan|lichaamsmaten|taille|dringend|dringende|belangrijke|belangrijkste|mijlpalen|kasstroom|inkomsten|schuld|schulden|schuldig|saldo|aflosplan|aflossen|schuldenvrij|spaaruitdagingen|prijsalerts|gezondheidstrends|hartslag|gelogd|vasten|gevast|meditatie|gemediteerd|supplementen|vitamines|cyclus|uurrooster|weekreview|wie|betaal';
const GENERAL: Readonly<Record<string, readonly string[]>> = {
  'priority-matrix': ['tasks'], 'hour-grid': ['agenda-clock', 'next'], reviews: ['briefs'], milestones: ['goal-pace', 'goals-hud'],
  'cash-flow': ['spending', 'wealth-hud'], 'debt-plan': ['accounts', 'wealth-hud'], accounts: ['wealth-hud'], 'savings-challenges': ['spending', 'wealth-hud'], 'price-alerts': ['markets'],
  'sleep-stages': ['sleep', 'health-hud'], 'sleep-times': ['sleep', 'health-hud'], 'fasting-windows': ['fasting', 'health-hud'], 'mood-map': ['mood-tags', 'health-hud'], 'debt-ranks': ['accounts', 'debt-plan', 'wealth-hud'], 'body-scan': ['weight', 'health-hud'],
  'health-trends': ['health-hud'], 'food-days': ['health-hud', 'habits-hud'], fasting: ['health-hud'], meditation: ['health-hud'], supplements: ['health-hud'], cycle: ['health-hud'],
};
/** Whether one of `asked` already stands in for the general widget `id` (a lookup's "Wealth HUD" beside the asked "Accounts and debts"). */
export const moreStandsIn = (asked: readonly string[], id: string): boolean => asked.some(a => GENERAL[a]?.includes(id) ?? false);
const ACCOUNT_WORDS = /\b(accounts?|debts?|owe|loans?|mortgage|credit cards?|schuld[a-z]*|lening[a-z]*|hypotheek|saldo|saldi|bankrekening[a-z]*|spaarrekening[a-z]*)\b/;
const TREND_WORDS = /\b(health trends?|gezondheidstrends?|heart rate|hartslag)\b/, ALERT_WORDS = /\b(price|prijs[a-z]*|koers[a-z]*)\b/;
/**
 * One request, one widget of a kind (as `connectPrune`): the specific widget stands in for the general one. Three
 * families lean on an everyday word and step back when the request is about something else: "balance" beside sleep,
 * "trend" beside a weight or a net worth, "alerts" beside anything that is not a price.
 */
export function morePrune(ids: readonly string[], n: string): string[] {
  let out = [...ids];
  const beside = (id: string) => out.includes(id) && out.some(x => x !== id && x !== 'glance');
  if (beside('accounts') && !out.includes('debt-plan') && !ACCOUNT_WORDS.test(n)) out = out.filter(id => id !== 'accounts');
  if (beside('health-trends') && !TREND_WORDS.test(n)) out = out.filter(id => id !== 'health-trends');
  if (beside('price-alerts') && !ALERT_WORDS.test(n)) out = out.filter(id => id !== 'price-alerts');
  // "Rekeningen en schulden" is one thing in Dutch (accounts and debts), not the bills ("rekeningen") beside it.
  if (out.includes('accounts') && /\brekeningen en schulden\b/.test(n)) out = out.filter(id => id !== 'bills');
  for (const [id, general] of Object.entries(GENERAL)) if (out.includes(id)) out = out.filter(x => !general.includes(x));
  return out;
}
