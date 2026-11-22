import type {Intent} from './cases';

/**
 * Session AV lane 2, round 6 (r6-body; Medito, Moodfit, AutoSleep, Lifesum, Caliber): the questions the round's Health
 * features raise, in English and Dutch, answered on the device by lib/ai/local-answers/av2-r6-body.ts. The lead adds them
 * to the corpus (cases.ts) and records their expected facts (expected.json). `never`: words the answer must not hold.
 */
export const AV2_R6_BODY: readonly Intent[] = [
  {id: 'av2r6-med-day', pillar: 'health', en: ['which day does a late meditation count on', 'does a meditation after midnight count for yesterday?'], nl: ['op welke dag telt een late meditatie?', 'telt een meditatie na middernacht voor gisteren?'], never: ['you should', 'je moet']},
  {id: 'av2r6-consistency', pillar: 'health', en: ['how consistent is my meditation', 'what is my meditation consistency'], nl: ['hoe consequent mediteer ik', 'hoe consequent is mijn meditatie'], never: ['streak lost', 'broke', 'failed', 'gebroken', 'mislukt']},
  {id: 'av2r6-range', pillar: 'health', en: ['can I log meditation for several days at once', 'how do I log meditation for past days'], nl: ['kan ik meditatie voor meerdere dagen tegelijk loggen', 'hoe log ik meditatie van vorige dagen'], never: ['kcal']},
  {id: 'av2r6-grounding', pillar: 'health', en: ['how does the grounding exercise work', 'is there a 5 4 3 2 1 exercise'], nl: ['hoe werkt de aardingsoefening', 'is er een vijf vier drie twee een oefening'], never: ['anxiety', 'panic', 'therapy', 'diagnos', 'angst', 'therapie']},
  {id: 'av2r6-lifts', pillar: 'health', en: ['what lifts me', 'what things lift me up?'], nl: ['wat beurt mij op', 'welke dingen die mij opbeuren heb ik?'], never: ['you should', 'je moet', 'therapy']},
  {id: 'av2r6-low-day', pillar: 'health', en: ['where is my plan for a low day', 'do I have a page for a bad day'], nl: ['waar is mijn plan voor een mindere dag', 'heb ik een pagina voor een slechte dag'], never: ['diagnos', 'therapy', 'treatment', 'behandeling']},
  {id: 'av2r6-bring-up', pillar: 'health', en: ['what do I want to bring up at my next appointment', 'how many things are on my list to bring up'], nl: ['wat wil ik bespreken bij mijn volgende afspraak', 'hoeveel dingen staan op mijn lijst om te bespreken'], never: ['diagnos', 'you should', 'je moet']},
  {id: 'av2r6-bedtime', pillar: 'health', en: ['what is my bedtime tonight', "what is tonight's bedtime"], nl: ['wat is mijn bedtijd vanavond', 'wanneer is mijn bedtijd vanavond'], never: ['you must', 'you should', 'je moet']},
  {id: 'av2r6-efficiency', pillar: 'health', en: ['what is my sleep efficiency', 'how much of my time in bed was I asleep'], nl: ['wat is mijn slaapefficiëntie', 'hoeveel van mijn tijd in bed sliep ik'], never: ['poor', 'bad sleep', 'slecht', 'insomnia']},
  {id: 'av2r6-portions', pillar: 'health', en: ['how many portions of vegetables did I have today', 'how many portions have I counted today'], nl: ['hoeveel porties groente heb ik vandaag gehad', 'hoeveel porties heb ik vandaag geteld'], never: ['off track', 'behind', 'kcal']},
  {id: 'av2r6-fav-exercises', pillar: 'health', en: ['which exercises are my favourites', 'what are my favourite exercises'], nl: ['welke oefeningen zijn mijn favorieten', 'wat zijn mijn favoriete oefeningen'], never: ['kcal']},
  {id: 'av2r6-light', pillar: 'health', en: ['which workouts are light weeks', 'which workouts are left out of my bests'], nl: ['welke workouts zijn lichte weken', 'welke workouts tellen niet mee voor mijn records'], never: ['kcal', 'you should', 'je moet']},
  {id: 'av2r6-best-days', pillar: 'health', en: ['when did I set my personal bests', 'on which days did I set my bests?'], nl: ['wanneer heb ik mijn persoonlijke records gezet', 'op welke dagen zette ik mijn records?'], never: ['kcal']},
  {id: 'av2r6-defaults', pillar: 'health', en: ['what are my exercise defaults', 'which exercises have their own defaults'], nl: ['wat zijn de standaardwaarden van mijn oefeningen', 'welke oefeningen hebben eigen standaardwaarden'], never: ['kcal']},
];
