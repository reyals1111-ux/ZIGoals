/**
 * Session AV lane 2 (journal; LEDGER #176, Fabulous's daily affirmations): one short affirmation a day for Today, written
 * for ZIGoals in English and Dutch (the same order, one per day, chosen by the date alone; "Another one" steps on).
 * Calm, first-person, kind words: no promise, no advice, nothing about weight, food, money or health results. Shown only
 * when the person switches it on (the journal record's `affirmations`). Nothing is stored here; nothing is sent. Pure.
 */
export const AFFIRMATIONS: readonly string[] = [
  'I can take today one step at a time.',
  'Small steps still move me forward.',
  'I am allowed to rest.',
  'I can begin again at any moment.',
  'My pace is a good pace.',
  'I notice what went well, however small.',
  'I can be kind to myself today.',
  'I do not have to do everything at once.',
  'I am learning, and that is enough.',
  'I can let a hard moment pass.',
  'What I do today counts.',
  'I can ask for help when I need it.',
  'I choose one thing that matters today.',
  'I am more than one bad day.',
  'I can listen to what my body needs.',
  'I let done be better than perfect.',
  'I make room for what brings me calm.',
  'I can say no to protect my time.',
  'I am proud of showing up.',
  'Today I can be patient with myself.',
  'I have handled hard days before.',
  'I can enjoy something simple today.',
  'My effort matters, even when it is quiet.',
  'I can keep a promise to myself, a small one.',
  'I give myself the same kindness I give a friend.',
  'I can change my mind and still be steady.',
  'I breathe out, and start again.',
  'I am building something, day by day.',
];
export const AFFIRMATIONS_NL: readonly string[] = [
  'Ik kan vandaag stap voor stap nemen.',
  'Kleine stappen brengen me ook vooruit.',
  'Ik mag rusten.',
  'Ik kan op elk moment opnieuw beginnen.',
  'Mijn tempo is een goed tempo.',
  'Ik zie wat goed ging, hoe klein ook.',
  'Ik kan vandaag mild zijn voor mezelf.',
  'Ik hoef niet alles tegelijk te doen.',
  'Ik ben aan het leren, en dat is genoeg.',
  'Ik kan een moeilijk moment laten voorbijgaan.',
  'Wat ik vandaag doe, telt.',
  'Ik kan om hulp vragen als ik die nodig heb.',
  'Ik kies vandaag één ding dat ertoe doet.',
  'Ik ben meer dan één slechte dag.',
  'Ik kan luisteren naar wat mijn lichaam nodig heeft.',
  'Ik laat af beter zijn dan perfect.',
  'Ik maak ruimte voor wat me rust geeft.',
  'Ik kan nee zeggen om mijn tijd te beschermen.',
  'Ik ben trots dat ik er ben.',
  'Vandaag mag ik geduld hebben met mezelf.',
  'Ik ben al eerder door moeilijke dagen gekomen.',
  'Ik kan vandaag genieten van iets eenvoudigs.',
  'Mijn inzet telt, ook als die stil is.',
  'Ik kan een kleine belofte aan mezelf houden.',
  'Ik geef mezelf dezelfde vriendelijkheid als een vriend.',
  'Ik kan van gedachten veranderen en toch stevig staan.',
  'Ik adem uit, en begin opnieuw.',
  'Ik bouw aan iets, dag na dag.',
];
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
/** The affirmation for `date`, `step` further on ("Another one"), in English or Dutch. */
export function affirmationOfTheDay(date: string, step = 0, lang: 'en' | 'nl' = 'en'): string {
  const list = lang === 'nl' ? AFFIRMATIONS_NL : AFFIRMATIONS, n = list.length, i = (((dayNumber(date) + 7 + step) % n) + n) % n;
  return list[Number.isFinite(i) ? i : 0]!;
}
