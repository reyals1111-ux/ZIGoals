/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-038 D4, D6): the phrasing families of the widgets that show what Sessions
 * AO and AP added to the pages — net-worth history, Perfect days, the day's rules ("A day counts as done at N", "My day
 * ends at"), This evening and Someday, countdowns, money tags, Ready to assign, age of money, spending pace, bill
 * changes, run splits, journal numbers, templates — and, under the Health gate only, mood tags and symptoms.
 *
 * English and Dutch, as every family (AL lesson 6). Each pattern runs on `normal(text)` (lower case, accents folded,
 * punctuation to spaces). They are more specific than the earlier families ("spending pace" is not "spending"), so they
 * are matched first (lib/nova/summon/summon.ts FAMILIES) and `connectPrune` then drops the general widget the same
 * words would also make. Deterministic and on the device: nothing here reads, sends or invents a value.
 */
export type Family = {id: string; en: RegExp; nl: RegExp; /** Only NOVA's stage answers this (no on-device lookup exists for it). */ stageOnly?: true};
export const CONNECT_FAMILIES: readonly Family[] = [
  {id: 'net-worth-history', en: /\b(net worth (?:history|over time|by day|day by day|trend|chart|line|graph)|history of my net worth|how (?:has|have|did) my net worth (?:changed?|grown?|grow|moved?|developed?))\b/,
    nl: /\b(vermogensverloop|vermogensgeschiedenis|vermogen (?:door de tijd|over tijd|per dag)|(?:verloop|geschiedenis|ontwikkeling) van mijn vermogen|hoe (?:is|heeft) mijn vermogen (?:zich )?(?:veranderd|gegroeid|ontwikkeld|verlopen))\b/},
  {id: 'ready-to-assign', en: /\b(ready to assign|left to (?:assign|budget)|unassigned|(?:money|income) (?:left )?to assign|to be budgeted|not (?:yet )?budgeted)\b/,
    nl: /\b(klaar om toe te wijzen|(?:nog )?toe te wijzen|(?:nog )?toewijzen|(?:nog )?te verdelen|niet toegewezen|onverdeeld)\b/},
  {id: 'age-of-money', en: /\b(age of (?:my |the )?money|how old is (?:my|the) money|money age|how long (?:does|did) my money (?:sit|stay|wait))\b/,
    nl: /\b(leeftijd van (?:mijn |het |je )?geld|hoe oud is (?:mijn|het) geld|geldleeftijd|ouderdom van mijn geld)\b/},
  {id: 'spending-pace', en: /\b(spending pace|pace of (?:my )?spending|usual (?:spending )?pace|(?:spend|spent|spending)\b.{0,30}\b(?:than|as) (?:i )?(?:usual|usually|normal|normally)|usually (?:have )?spen[dt]|spending compared (?:to|with))\b/,
    nl: /\b(uitgaventempo|tempo van (?:mijn )?uitgaven|(?:geef|gaf|uitgegeven|uitgaven)\b.{0,30}\bdan (?:normaal|gewoonlijk|anders)|uitgaven vergeleken met)\b/},
  {id: 'bill-changes', en: /\b(bill (?:changes?|increases?)|price (?:changes?|increases?|rises?|hikes?)|(?:bills?|subscriptions?)\b.{0,24}\b(?:changed?|increased?|risen|rose|go up|gone up|went up|going up|more expensive|cheaper|pricier))\b/,
    nl: /\b(prijswijziging(?:en)?|prijsverhoging(?:en)?|prijsstijging(?:en)?|(?:rekening(?:en)?|abonnement(?:en)?)\b.{0,24}\b(?:duurder|goedkoper|gestegen|verhoogd|veranderd|omhoog))\b/},
  {id: 'mood-tags', en: /\b(mood tags?|tags? (?:on|for|of) my moods?|what goes with (?:my )?(?:good|great) days?|(?:good|great) days? (?:go|goes) with|mood patterns?)\b/,
    nl: /\b(stemmingstags?|stemmings?labels?|tags? bij mijn stemming|wat (?:hoort|past|gaat) (?:er )?(?:bij|samen met) (?:mijn )?goede dagen|stemmingspatronen?)\b/},
  {id: 'money-tags', en: /\b((?:spending|spent|expenses|money|entries) (?:by|per|for each) tag|by tag|per tag|money tags?|spending tags?|expense tags?|tagged (?:spending|expenses|entries)|my tags|tag totals?|totals? per tag)\b/,
    nl: /\b((?:uitgaven|geld|kosten) per (?:tag|label)|per tag|per label|geldtags?|uitgaventags?|getagde (?:uitgaven|posten)|mijn tags|totalen? per tag)\b/},
  {id: 'perfect-days', en: /\b(perfect days?|days? (?:with )?(?:all|every) (?:of )?(?:my )?habits? (?:done|completed?)|every habit done|all (?:my )?habits done)\b/,
    nl: /\b(perfecte dag(?:en)?|alle gewoontes? gedaan|elke gewoonte gedaan|dagen met alle gewoontes?)\b/},
  {id: 'day-rules', en: /\b(day counts? as done|counts? as done|day (?:is )?done at|when (?:does|is) (?:my|a|the) day (?:count|done|end|over)|my day ends?|day ends? at|day rules?|rules? of my day|night owl)\b/,
    nl: /\b(dag telt als gedaan|telt als gedaan|wanneer telt (?:mijn|een|de) dag|mijn dag eindigt|dag eindigt om|wanneer eindigt mijn dag|einde van mijn dag|dagregels?|regels van mijn dag|nachtbraker)\b/},
  {id: 'tasks-later', en: /\b(this evening|(?:for|on) tonight|tonights? (?:list|tasks?|to ?dos?)|evening list|someday)\b/,
    nl: /\b(vanavond|avondlijst|someday|ooit ?lijst|voor ooit|taken voor (?:ooit|later))\b/},
  {id: 'countdowns', en: /\b(countdowns?|days? until|days? till|days? to go|how (?:many days|long) (?:until|till|to|before)|how many sleeps)\b/,
    nl: /\b(aftellen|aftelling(?:en)?|countdowns?|dagen tot|dagen te gaan|hoeveel dagen (?:tot|nog|voor)|hoe lang (?:nog )?tot|nog hoeveel dagen)\b/},
  {id: 'journal-numbers', en: /\b(journal (?:numbers|stats|statistics|streak|words?)|writing streak|words? (?:written|i wrote|have i written|did i write)|word count|how many words|how much (?:have|did) i (?:written|write))\b/,
    nl: /\b(dagboek ?(?:cijfers|statistieken|reeks)|dagboek in cijfers|schrijfreeks|woorden (?:geschreven|heb ik geschreven)|hoeveel woorden|aantal woorden|hoeveel heb ik geschreven)\b/},
  {id: 'run-splits', en: /\b((?:run|running|km|kilometer|kilometre|lap)s? splits?|splits? (?:of|for|from|on) (?:my )?(?:last |latest )?(?:runs?|running|workout)|my splits|pace per (?:km|kilometer|kilometre)|per ?km pace|(?:running|run) pace|pace (?:of|on|for) my (?:last |latest )?run|how fast (?:did i run|was my (?:last |latest )?run))\b/,
    nl: /\b(tussentijden|(?:km|kilometer) ?splits?|mijn splits|splits? van mijn (?:laatste )?(?:run|loop|hardloopronde)|tempo per (?:km|kilometer)|kilometertijden|hardlooptempo|looptempo|tempo van mijn (?:laatste )?(?:run|loop|hardloopronde)|hoe snel (?:liep ik|heb ik gelopen))\b/},
  {id: 'symptoms', en: /\b(symptoms?|symptom (?:tracker|log)|factors? i (?:follow|track))\b/, nl: /\b(symptomen|symptoom|klachten ?(?:log|lijst)|factoren die ik (?:volg|bijhoud))\b/},
  {id: 'templates', en: /\b(templates?|template library|goal ideas?|habit ideas?|ideas? for (?:(?:a|an|new|my|some) )*(?:goals?|habits?)|starter (?:goals?|habits?))\b/,
    nl: /\b(sjablonen|sjabloon|templates?|voorbeelddoelen|doelideeen|gewoonte ?ideeen|ideeen voor (?:(?:een|nieuwe?|mijn) )*(?:doel(?:en)?|gewoontes?))\b/, stageOnly: true},
];
/** The Dutch titles of these widgets (lib/nova/summon/words.ts NL_TITLES). */
export const CONNECT_NL_TITLES: Readonly<Record<string, string>> = {
  'net-worth-history': 'Vermogen door de tijd', 'ready-to-assign': 'Klaar om toe te wijzen', 'age-of-money': 'Leeftijd van je geld', 'spending-pace': 'Uitgaventempo', 'bill-changes': 'Prijswijzigingen',
  'money-tags': 'Uitgaven per tag', 'perfect-days': 'Perfecte dagen', 'day-rules': 'De regels van je dag', 'tasks-later': 'Vanavond en ooit', countdowns: 'Dagen tot', 'journal-numbers': 'Dagboek in cijfers',
  templates: 'Sjablonen', 'run-splits': 'Tussentijden', 'mood-tags': 'Stemmingstags', symptoms: 'Symptomen',
};
/**
 * One request, one widget of a kind: the specific widget stands in for the general one the same words also name
 * ("spending pace" makes Spending pace, not Spending and Goal pace beside it). Two families that lean on everyday words
 * step back when the request is about something else: "this evening" beside the weather, "days until" beside a bill.
 */
const GENERAL: Readonly<Record<string, readonly string[]>> = {
  'mood-tags': ['money-tags'],
  'net-worth-history': ['net-worth', 'wealth-hud', 'requests'], 'ready-to-assign': ['budgets', 'wealth-hud'], 'age-of-money': ['wealth-hud'],
  'spending-pace': ['spending', 'goal-pace', 'wealth-hud'], 'bill-changes': ['bills', 'markets', 'money', 'wealth-hud'], 'money-tags': ['spending', 'wealth-hud'],
  'perfect-days': ['habit-week', 'habits-hud'], 'tasks-later': ['tasks', 'next'], 'journal-numbers': ['journal', 'habits-hud'],
  templates: ['goal-pace', 'goals-hud', 'habit-week', 'habits-hud'], 'run-splits': ['workouts', 'goal-pace'],
};
/** Whether one of `asked` already stands in for the general widget `id` (a lookup's "Spending" beside the asked "Spending pace"). */
export const standsIn = (asked: readonly string[], id: string): boolean => asked.some(a => GENERAL[a]?.includes(id) ?? false);
const LIST_WORDS = /\b(someday|ooit|tasks?|taken|taak|list|lijst|to ?dos?)\b/, COUNT_WORDS = /\b(countdowns?|aftel[a-z]*)\b/;
export function connectPrune(ids: readonly string[], n: string): string[] {
  let out = [...ids];
  const only = (id: string, beside: readonly string[]) => out.includes(id) && out.some(x => x !== id && !beside.includes(x));
  if (only('tasks-later', ['glance', 'tasks', 'next']) && !LIST_WORDS.test(n)) out = out.filter(id => id !== 'tasks-later');
  if (only('countdowns', ['glance', 'time']) && !COUNT_WORDS.test(n)) out = out.filter(id => id !== 'countdowns');
  for (const [id, general] of Object.entries(GENERAL)) if (out.includes(id)) out = out.filter(x => !general.includes(x));
  return out;
}
/**
 * Dutch words of these families' requests, for the language of NOVA's answer (lib/nova/summon/summon.ts summonLanguage):
 * a few more function words and the families' own nouns, so "Wat is er nog te verdelen?" is answered in Dutch.
 */
export const CONNECT_NL_WORDS = 'er|nog|dan|zijn|kan|geef|tot|om|uit|vermogen|vanavond|dagen|woorden|geschreven|verdelen|toewijzen|normaal|abonnementen|gestegen|duurder|eindigt|telt|perfecte|sjablon(?:en)?|sjabloon|tussentijden|stemmingstags?|symptomen|aftellingen|prijswijzigingen|uitgaventempo|leeftijd|ideeen|klachtenlog';
