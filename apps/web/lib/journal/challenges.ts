/**
 * Session AV lane 2 (bodymind-r2; LEDGER #230, Reflectly's morning motivation and daily challenge): one small challenge a
 * day beside the affirmation on Today, written for ZIGoals in English and Dutch (the same order; one per day by the date
 * alone, offset from the affirmation; "Another one" steps on). Small, kind and free: nothing about weight, food, money or
 * health results, nothing that costs anything, nothing that needs anyone else to take part (review b2b #6: the four
 * that did — a message, a thank-you, a compliment, asking how someone is — are now ones a person does alone). "Done" is the person's own
 * mark for today and nothing more: no count, no streak, no score, nothing held against a day without one. Pure.
 */
export const CHALLENGES: readonly string[] = [
  'Smile at yourself in the mirror.',
  'Be outside for ten minutes.',
  'Drink a glass of water slowly, and notice it.',
  'Write down one thing you are looking forward to.',
  'Tidy one small corner.',
  'Take three slow breaths before you open your phone.',
  'Write down one thing you are thankful for today.',
  'Listen to one song all the way through, doing nothing else.',
  'Stretch for two minutes.',
  'Put one thing off your list that does not need doing.',
  'Look out of a window for a full minute.',
  'Write one sentence about how you feel right now.',
  'Walk somewhere you usually would not.',
  'Eat one meal without a screen.',
  'Give yourself one honest compliment.',
  'Do one task you have been putting off for five minutes only.',
  'Notice three things you can hear right now.',
  'Go to bed ten minutes earlier tonight.',
  'Write down a small win from this week.',
  'Ask yourself how you are, and listen to the answer.',
  'Leave your phone in another room for half an hour.',
  'Read a few pages of something you enjoy.',
  'Step outside and look at the sky.',
  'Write a short note to your future self.',
  'Clear one thing from your desk or table.',
  'Do something kind for yourself, however small.',
  'Hum or sing one song.',
  'Plan one thing you will enjoy this weekend.',
];
export const CHALLENGES_NL: readonly string[] = [
  'Glimlach naar jezelf in de spiegel.',
  'Ga tien minuten naar buiten.',
  'Drink langzaam een glas water en merk het op.',
  'Schrijf één ding op waar je naar uitkijkt.',
  'Ruim één klein hoekje op.',
  'Haal drie keer rustig adem voor je je telefoon opent.',
  'Schrijf één ding op waar je vandaag dankbaar voor bent.',
  'Luister één nummer helemaal uit en doe verder niets.',
  'Rek je twee minuten uit.',
  'Schrap één ding van je lijst dat niet hoeft.',
  'Kijk een volle minuut uit het raam.',
  'Schrijf één zin over hoe je je nu voelt.',
  'Loop ergens waar je normaal niet komt.',
  'Eet één maaltijd zonder scherm.',
  'Geef jezelf één eerlijk compliment.',
  'Werk vijf minuten aan iets dat je al even uitstelt.',
  'Merk drie dingen op die je nu hoort.',
  'Ga vanavond tien minuten eerder naar bed.',
  'Schrijf een klein succes van deze week op.',
  'Vraag jezelf hoe het gaat en luister naar het antwoord.',
  'Leg je telefoon een half uur in een andere kamer.',
  'Lees een paar bladzijden van iets dat je leuk vindt.',
  'Stap naar buiten en kijk naar de lucht.',
  'Schrijf een kort briefje aan je toekomstige zelf.',
  'Haal één ding van je bureau of tafel.',
  'Doe iets liefs voor jezelf, hoe klein ook.',
  'Neurie of zing één liedje.',
  'Plan één ding voor het weekend waar je van geniet.',
];
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
/** The challenge for `date`, `step` further on ("Another one"), in English or Dutch. */
export function challengeOfTheDay(date: string, step = 0, lang: 'en' | 'nl' = 'en'): string {
  const list = lang === 'nl' ? CHALLENGES_NL : CHALLENGES, n = list.length, i = (((dayNumber(date) + 13 + step) % n) + n) % n;
  return list[Number.isFinite(i) ? i : 0]!;
}
/** Whether the person tapped Done today (their own mark; the day after starts fresh). */
export const challengeDoneToday = (j: {challengeDone?: string}, today: string) => j.challengeDone === today;
