/**
 * Session AV lane 2 (r3-notes; LEDGER #277, Stoic's daily quote): one quote a day from the Stoic writers, shown on Today
 * only when the person switches it on (the journal record's `quotes`). The English lines are public-domain translations,
 * quoted as printed (checked against the Wikisource transcriptions): Marcus Aurelius' Meditations in George Long's
 * translation (1862), Seneca's Moral Letters to Lucilius in Richard Mott Gummere's (Loeb, 1917–1925) and Epictetus'
 * Encheiridion in George Long's (1877). Session AV lane 2 (review B3C-7, B3C-8): a line is a whole sentence of the
 * original, or, where it starts inside one, starts with "…" and the original's own small letter; it ends where the
 * original has a full stop, a colon or a semicolon. The Dutch lines are written for ZIGoals from those English words. Chosen for calm
 * words: nothing about death, illness or what to eat. The order is fixed, one a day by the date alone; "Another one"
 * steps on. Nothing is stored here; nothing is sent. Pure.
 */
export type StoicWriter = 'marcus' | 'seneca' | 'epictetus';
export type StoicQuote = {id: string; writer: StoicWriter; where: string; en: string; nl: string};
export const WRITERS: Record<StoicWriter, {name: string; work: {en: string; nl: string}; translator: string}> = {
  marcus: {name: 'Marcus Aurelius', work: {en: 'Meditations', nl: 'Overpeinzingen'}, translator: 'George Long, 1862'},
  seneca: {name: 'Seneca', work: {en: 'Letters to Lucilius', nl: 'Brieven aan Lucilius'}, translator: 'Richard Mott Gummere, 1917–1925'},
  epictetus: {name: 'Epictetus', work: {en: 'Encheiridion', nl: 'Handboekje'}, translator: 'George Long, 1877'},
};
export const STOIC_QUOTES: readonly StoicQuote[] = [
  {id: 'ma-4-3', writer: 'marcus', where: 'IV.3', en: 'The universe is transformation: life is opinion.', nl: 'Alles verandert; het leven is wat je ervan denkt.'},
  {id: 'se-1-a', writer: 'seneca', where: '1', en: 'Hold every hour in your grasp. Lay hold of to-day’s task, and you will not need to depend so much upon to-morrow’s.', nl: 'Houd elk uur vast. Pak de taak van vandaag op, dan hoef je minder op morgen te rekenen.'},
  {id: 'ep-1', writer: 'epictetus', where: '1', en: 'Of things some are in our power, and others are not.', nl: 'Sommige dingen liggen in onze macht, andere niet.'},
  {id: 'ma-4-18', writer: 'marcus', where: 'IV.18', en: 'How much trouble he avoids who does not look to see what his neighbor says or does or thinks, but only to what he does himself, that it may be just and pure.', nl: 'Hoeveel moeite bespaart wie niet kijkt wat een ander zegt, doet of denkt, maar alleen naar wat hij zelf doet: dat het eerlijk en zuiver is.'},
  {id: 'se-1-b', writer: 'seneca', where: '1', en: 'While we are postponing, life speeds by.', nl: 'Terwijl wij uitstellen, gaat het leven snel voorbij.'},
  {id: 'ep-5-a', writer: 'epictetus', where: '5', en: 'Men are disturbed not by the things which happen, but by the opinions about the things.', nl: 'Mensen raken niet van streek door wat er gebeurt, maar door wat ze ervan vinden.'},
  {id: 'ma-4-49', writer: 'marcus', where: 'IV.49', en: 'Be like the promontory against which the waves continually break, but it stands firm and tames the fury of the water around it.', nl: 'Wees als de rots in zee: de golven breken er steeds op, maar hij blijft staan en het water om hem heen komt tot rust.'},
  {id: 'se-1-c', writer: 'seneca', where: '1', en: 'Nothing, Lucilius, is ours, except time.', nl: 'Niets is van ons, Lucilius, behalve tijd.'},
  {id: 'ep-8', writer: 'epictetus', where: '8', en: 'Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.', nl: 'Wil niet dat alles gaat zoals jij het wenst, maar wens dat het gaat zoals het gaat; dan stroomt je leven rustig.'},
  {id: 'ma-4-24', writer: 'marcus', where: 'IV.24', en: 'Occupy thyself with few things, says the philosopher, if thou wouldst be tranquil.', nl: 'Houd je met weinig dingen bezig, zegt de filosoof, als je rust wilt.'},
  {id: 'se-2', writer: 'seneca', where: '2', en: 'It is not the man who has too little, but the man who craves more, that is poor.', nl: 'Niet wie te weinig heeft is arm, maar wie steeds meer wil.'},
  {id: 'ep-10', writer: 'epictetus', where: '10', en: 'On the occasion of every accident (event) that befals you, remember to turn to yourself and inquire what power you have for turning it to use.', nl: 'Bij alles wat je overkomt: kijk naar jezelf en vraag je af welke kracht je hebt om er iets goeds mee te doen.'},
  {id: 'ma-5-1', writer: 'marcus', where: 'V.1', en: 'In the morning when thou risest unwillingly, let this thought be present,—I am rising to the work of a human being.', nl: 'Als je ’s ochtends met tegenzin opstaat, denk dan: ik sta op voor het werk van een mens.'},
  {id: 'se-2-b', writer: 'seneca', where: '2', en: 'After you have run over many thoughts, select one to be thoroughly digested that day.', nl: 'Als je veel gedachten hebt doorgenomen, kies er dan één om die dag goed te laten bezinken.'},
  {id: 'ep-12', writer: 'epictetus', where: '12', en: 'Begin then from little things.', nl: 'Begin dus bij de kleine dingen.'},
  {id: 'ma-5-16', writer: 'marcus', where: 'V.16', en: 'Such as are thy habitual thoughts, such also will be the character of thy mind; for the soul is dyed by the thoughts.', nl: 'Zoals je gewoonlijk denkt, zo wordt je geest; want je gedachten kleuren je ziel.'},
  {id: 'se-7-a', writer: 'seneca', where: '7', en: 'The process is mutual; for men learn while they teach.', nl: 'Het werkt twee kanten op: wie iets uitlegt, leert er zelf van.'},
  {id: 'ep-19', writer: 'epictetus', where: '19', en: 'You can be invincible, if you enter into no contest in which it is not in your power to conquer.', nl: 'Je bent onoverwinnelijk als je geen strijd aangaat die je niet zelf kunt winnen.'},
  {id: 'ma-6-6', writer: 'marcus', where: 'VI.6', en: 'The best way of avenging thyself is not to become like [the wrong-doer].', nl: 'De beste manier om terug te slaan is niet te worden zoals wie je onrecht deed.'},
  {id: 'se-7-b', writer: 'seneca', where: '7', en: 'Associate with those who will make a better man of you. Welcome those whom you yourself can improve.', nl: 'Ga om met mensen die je beter maken. Verwelkom mensen die jij kunt helpen groeien.'},
  {id: 'ep-5-b', writer: 'epictetus', where: '5', en: 'When then we are impeded or disturbed or grieved, let us never blame others, but ourselves, that is, our opinions.', nl: 'Als iets ons hindert, van streek maakt of verdriet doet, geven we niet anderen de schuld, maar kijken we naar onze eigen opvattingen.'},
  {id: 'ma-7-59', writer: 'marcus', where: 'VII.59', en: 'Look within. Within is the fountain of good, and it will ever bubble up, if thou wilt ever dig.', nl: 'Kijk naar binnen. Daar is de bron van het goede, en die blijft opborrelen als je blijft graven.'},
  {id: 'se-13', writer: 'seneca', where: '13', en: 'There are more things, Lucilius, likely to frighten us than there are to crush us; we suffer more often in imagination than in reality.', nl: 'Er is meer dat ons bang maakt dan wat ons echt kan breken, Lucilius; we lijden vaker in gedachten dan in werkelijkheid.'},
  {id: 'ep-22', writer: 'epictetus', where: '22', en: '…hold on to the things which seem to you best as one appointed by God to this station.', nl: '…houd vast aan wat jou het beste lijkt, als iemand die door God op deze plek is gezet.'},
  {id: 'ma-7-67', writer: 'marcus', where: 'VII.67', en: 'Very little indeed is necessary for living a happy life.', nl: 'Er is maar heel weinig nodig voor een gelukkig leven.'},
  {id: 'se-28', writer: 'seneca', where: '28', en: 'You need a change of soul rather than a change of climate.', nl: 'Je hebt eerder een andere blik nodig dan een andere plek.'},
  {id: 'ep-33', writer: 'epictetus', where: '33', en: 'In company take care not to speak much and excessively about your own acts or dangers.', nl: 'Praat in gezelschap niet te veel en te lang over wat jij hebt gedaan of meegemaakt.'},
  {id: 'ma-8-36', writer: 'marcus', where: 'VIII.36', en: 'Do not disturb thyself by thinking of the whole of thy life.', nl: 'Maak je niet onrustig door aan je hele leven tegelijk te denken.'},
  {id: 'se-78', writer: 'seneca', where: '78', en: 'Everything depends on opinion.', nl: 'Alles hangt af van hoe je ernaar kijkt.'},
  {id: 'ep-38', writer: 'epictetus', where: '38', en: 'In walking about as you take care not to step on a nail or to sprain your foot, so take care not to damage your own ruling faculty.', nl: 'Zoals je bij het lopen oplet dat je niet op een spijker trapt of je enkel verzwikt, zo let je op dat je je eigen oordeel niet beschadigt.'},
  {id: 'ma-8-47', writer: 'marcus', where: 'VIII.47', en: 'If thou art pained by any external thing, it is not this thing that disturbs thee, but thy own judgment about it. And it is in thy power to wipe out this judgment now.', nl: 'Als iets buiten je je dwarszit, is het niet dat ding dat je stoort, maar je oordeel erover. En dat oordeel kun je nu loslaten.'},
  {id: 'ma-10-16', writer: 'marcus', where: 'X.16', en: 'No longer talk at all about the kind of man that a good man ought to be, but be such.', nl: 'Praat niet langer over hoe een goed mens hoort te zijn, maar wees het.'},
  {id: 'ma-12-22', writer: 'marcus', where: 'XII.22', en: 'Consider that everything is opinion, and opinion is in thy power.', nl: 'Bedenk dat alles een kwestie van opvatting is, en je opvatting ligt in je eigen macht.'},
];
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
/** The quote for `date`, `step` further on ("Another one"). */
export function quoteOfTheDay(date: string, step = 0): StoicQuote {
  const n = STOIC_QUOTES.length, i = (((dayNumber(date) + 3 + step) % n) + n) % n;
  return STOIC_QUOTES[Number.isFinite(i) ? i : 0]!;
}
export const quoteById = (id: string | null | undefined): StoicQuote | null => STOIC_QUOTES.find(q => q.id === id) ?? null;
/** Who wrote it, and where: "Marcus Aurelius, Meditations IV.3". */
export const quoteSource = (q: StoicQuote, lang: 'en' | 'nl' = 'en') => `${WRITERS[q.writer].name}, ${WRITERS[q.writer].work[lang]} ${q.writer === 'seneca' ? (lang === 'nl' ? `brief ${q.where}` : `letter ${q.where}`) : q.where}`;
/** The start of an entry about a quote ("Write about this"): the quote as a Markdown quote, its writer, a blank line. */
export const quoteEntry = (q: StoicQuote, lang: 'en' | 'nl' = 'en') => `> ${lang === 'nl' ? q.nl : q.en}\n> — ${quoteSource(q, lang)}\n\n`;
