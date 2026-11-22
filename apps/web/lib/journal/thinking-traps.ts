/**
 * Session AV lane 2 (bodymind-r2; LEDGER #233, Moodnotes' thinking traps and thought checker): a short written journal
 * exercise for self-reflection — what happened, the thought, any thinking traps that fit, then another way to see it —
 * kept as an ordinary journal entry. Twelve common thinking traps, each with one plain line and a question that opens
 * another view, written for ZIGoals in English and Dutch. The checker only points at words that often go with a trap
 * ("always", "should", "everyone thinks"): a pattern in the words, never a judgement of the person, never a diagnosis or a
 * treatment, and the person chooses. Pure; nothing is stored here.
 */
export type Lang = 'en' | 'nl';
export type Trap = {id: string; name: Record<Lang, string>; line: Record<Lang, string>; ask: Record<Lang, string>; words: RegExp};
const t = (id: string, name: [string, string], line: [string, string], ask: [string, string], words: RegExp): Trap => ({id, name: {en: name[0], nl: name[1]}, line: {en: line[0], nl: line[1]}, ask: {en: ask[0], nl: ask[1]}, words});
export const TRAPS: readonly Trap[] = [
  t('all-or-nothing', ['All or nothing', 'Alles of niets'], ['Seeing it as a total success or a total failure, with nothing in between.', 'Het zien als helemaal gelukt of helemaal mislukt, met niets daartussen.'], ['What lies somewhere in between?', 'Wat ligt er ergens tussenin?'], /\b(?:completely|totally|entirely|perfect(?:ly)?|ruined|useless|failure|helemaal|totaal|compleet|perfect|verpest|mislukt|waardeloos)\b/i),
  t('worst-case', ['Expecting the worst', 'Het ergste verwachten'], ['Jumping to the worst outcome as if it is sure to happen.', 'Meteen uitgaan van de slechtste afloop, alsof die zeker is.'], ['What is a more likely outcome, and how would you cope with it?', 'Wat is een waarschijnlijkere afloop, en hoe zou je daarmee omgaan?'], /\b(?:disaster|catastroph\w*|the worst|awful|terrible|unbearable|ramp|rampzalig|het ergste|verschrikkelijk|vreselijk|ondraaglijk)\b/i),
  t('always-never', ['Always and never', 'Altijd en nooit'], ['One thing went wrong, so it will always go wrong.', 'Eén ding ging mis, dus het gaat altijd mis.'], ['Can you think of a time it went differently?', 'Weet je een keer dat het anders ging?'], /\b(?:always|never|every time|everything|nothing ever|altijd|nooit|elke keer|alles|niets ooit)\b/i),
  t('mind-reading', ['Mind reading', 'Gedachten lezen'], ['Being sure you know what others think of you.', 'Er zeker van zijn dat je weet wat anderen van je denken.'], ['What do you actually know, and what are you guessing?', 'Wat weet je echt, en wat raad je?'], /\b(?:(?:they|everyone|everybody|he|she|people) (?:think|thinks|hate|hates|must think)|zij denken|iedereen denkt|hij denkt|zij vindt|ze vinden|mensen denken)\b/i),
  t('fortune-telling', ['Fortune telling', 'Waarzeggen'], ['Predicting how things will turn out before they happen.', 'Voorspellen hoe het afloopt voordat het gebeurd is.'], ['What else could happen?', 'Wat zou er ook kunnen gebeuren?'], /\b(?:(?:will|is going to|am going to|gonna) (?:fail|go wrong|be a mess|never work)|won'?t work|gaat (?:mislukken|fout)|zal (?:mislukken|nooit lukken)|het wordt niks)\b/i),
  t('feelings-as-facts', ['Feelings as facts', 'Gevoel als feit'], ['I feel it, so it must be true.', 'Ik voel het, dus het moet wel waar zijn.'], ['What would the facts say, apart from the feeling?', 'Wat zeggen de feiten, los van het gevoel?'], /\b(?:i feel (?:like )?(?:a |an )?(?:failure|stupid|useless|worthless)|i feel it so|ik voel me (?:een )?(?:mislukkeling|dom|nutteloos|waardeloos))\b/i),
  t('shoulds', ['Shoulds and musts', 'Moeten en horen'], ['Strict rules about how you or others ought to be.', 'Strenge regels over hoe jij of anderen zouden moeten zijn.'], ['What would you say to a friend with this rule?', 'Wat zou je tegen een vriend met deze regel zeggen?'], /\b(?:should(?:n'?t)?|must(?:n'?t)?|ought to|have to|moet(?:en)?|hoor(?:t|en) te|zou moeten)\b/i),
  t('labelling', ['Labelling', 'Een etiket plakken'], ['Calling yourself a name instead of describing what happened.', 'Jezelf een naam geven in plaats van beschrijven wat er gebeurde.'], ['How would you describe what happened, without the name?', 'Hoe beschrijf je wat er gebeurde, zonder die naam?'], /\b(?:i'?m (?:such )?(?:a |an )?(?:idiot|loser|failure|mess|fool)|i am (?:a |an )?(?:idiot|loser|failure|mess|fool)|ik ben (?:een )?(?:idioot|loser|mislukkeling|sukkel|puinhoop))\b/i),
  t('taking-the-blame', ['Taking all the blame', 'Alle schuld nemen'], ['Seeing yourself as the cause of something that was not all up to you.', 'Jezelf zien als de oorzaak van iets dat niet alleen aan jou lag.'], ['What else played a part?', 'Wat speelde er nog meer mee?'], /\b(?:my fault|all because of me|i ruined|i caused|mijn schuld|door mij|ik heb het verpest)\b/i),
  t('blaming-others', ['Blaming others', 'Anderen de schuld geven'], ['Putting it all on someone else.', 'Het helemaal bij een ander leggen.'], ['What part could you still shape yourself?', 'Welk deel kun je zelf nog vormgeven?'], /\b(?:(?:his|her|their|your) fault|because of (?:him|her|them)|zijn schuld|haar schuld|hun schuld|door hem|door haar|door hen)\b/i),
  t('only-the-bad', ['Only the bad', 'Alleen het slechte'], ['Noticing what went wrong and leaving out what went well.', 'Zien wat misging en weglaten wat goed ging.'], ['What went well, even a little?', 'Wat ging er goed, al was het maar een beetje?'], /\b(?:only bad|nothing good|nothing went right|alleen maar slecht|niets goeds|niets ging goed)\b/i),
  t('doesnt-count', ['That does not count', 'Dat telt niet'], ['Brushing off what went well as luck or nothing special.', 'Wat goed ging wegwuiven als geluk of niets bijzonders.'], ['If a friend did this, would it count?', 'Als een vriend dit deed, zou het dan tellen?'], /\b(?:just luck|doesn'?t count|anyone could|no big deal|gewoon geluk|telt niet|kan iedereen|stelt niks voor)\b/i),
];
export const THOUGHT_CHECK_ID = 'thought-check';
export const trapById = (id: string) => TRAPS.find(x => x.id === id);
/** The traps whose usual words appear in what was written: a pointer, never a verdict; the person chooses. */
export const possibleTraps = (thought: string): string[] => thought.trim() ? TRAPS.filter(x => x.words.test(thought)).map(x => x.id) : [];

export type ThoughtCheck = {situation: string; thought: string; traps: string[]; other: string};
export const HEADINGS: Record<Lang, {title: string; situation: string; thought: string; traps: string; other: string; none: string}> = {
  en: {title: 'Thought check', situation: 'What happened', thought: 'The thought', traps: 'Thinking traps I noticed', other: 'Another way to see it', none: 'none'},
  nl: {title: 'Gedachtecheck', situation: 'Wat er gebeurde', thought: 'De gedachte', traps: 'Denkvalkuilen die ik zag', other: 'Een andere kijk', none: 'geen'},
};
/** The entry's text: four short headed parts in the chosen language. Throws when the thought is empty. */
export function thoughtEntryText(c: ThoughtCheck, lang: Lang): string {
  const h = HEADINGS[lang], thought = c.thought.trim();
  if (!thought) throw Error(lang === 'nl' ? 'Schrijf eerst de gedachte op.' : 'Write the thought first.');
  const traps = c.traps.map(id => trapById(id)?.name[lang]).filter(Boolean).join(', ') || h.none;
  return [h.title, `${h.situation}: ${c.situation.trim() || '—'}`, `${h.thought}: ${thought}`, `${h.traps}: ${traps}`, `${h.other}: ${c.other.trim() || '—'}`].join('\n');
}
/** How many entries are thought checks, and the traps named most in them (by their English or Dutch name). */
export function thoughtCheckStats(entries: readonly {template?: string; text: string}[]): {checks: number; traps: {id: string; count: number}[]} {
  const checks = entries.filter(e => e.template === THOUGHT_CHECK_ID), count = new Map<string, number>();
  for (const e of checks) { const line = e.text.split('\n').find(l => l.startsWith(`${HEADINGS.en.traps}:`) || l.startsWith(`${HEADINGS.nl.traps}:`)) ?? ''; for (const x of TRAPS) if (line.includes(x.name.en) || line.includes(x.name.nl)) count.set(x.id, (count.get(x.id) ?? 0) + 1); }
  return {checks: checks.length, traps: [...count].map(([id, n]) => ({id, count: n})).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))};
}
