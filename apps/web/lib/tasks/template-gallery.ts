import type {TemplateItem} from './templates';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #226; Any.do's template gallery): a larger gallery of project templates, written in
 * the repository in English and Dutch, in groups (home, work, family, personal). Each is a project with sections, subtasks,
 * priorities, minutes and days counted from a start day (`offset`), used exactly as the built-in templates are
 * (lib/tasks/templates.ts `applyTemplate`). Written text, nothing fetched; never stored. Pure.
 */
export type GalleryLang = 'en' | 'nl';
export const GALLERY_GROUPS = ['home', 'work', 'family', 'personal'] as const;
export type GalleryGroup = (typeof GALLERY_GROUPS)[number];
export const GROUP_WORDS: Record<GalleryGroup, Record<GalleryLang, string>> = {home: {en: 'Home', nl: 'Thuis'}, work: {en: 'Work', nl: 'Werk'}, family: {en: 'Family', nl: 'Gezin'}, personal: {en: 'Personal', nl: 'Persoonlijk'}};
type Words = readonly [en: string, nl: string];
type GalleryItem = {title: Words; section?: Words} & Omit<TemplateItem, 'title' | 'section'>;
export type GalleryTemplate = {id: string; group: GalleryGroup; name: Words; about: Words; items: readonly GalleryItem[]};
const i = (en: string, nl: string, more: Omit<GalleryItem, 'title'> = {}): GalleryItem => ({title: [en, nl], ...more});
const sec = (en: string, nl: string): Words => [en, nl];

export const TEMPLATE_GALLERY: readonly GalleryTemplate[] = [
  // ---- Home ----
  {id: 'gallery-cleaning-week', group: 'home', name: ['Cleaning week', 'Schoonmaakweek'], about: ['One room a day, about half an hour each, Monday to Saturday.', 'Elke dag één ruimte, zo’n half uur, van maandag tot zaterdag.'], items: (() => {
    const mon = sec('Monday · kitchen', 'Maandag · keuken'), tue = sec('Tuesday · bathroom', 'Dinsdag · badkamer'), wed = sec('Wednesday · living room', 'Woensdag · woonkamer'), thu = sec('Thursday · bedrooms', 'Donderdag · slaapkamers'), fri = sec('Friday · floors', 'Vrijdag · vloeren'), sat = sec('Saturday · laundry and bins', 'Zaterdag · was en afval');
    return [
      i('Wipe the counters and the hob', 'Aanrecht en kookplaat afnemen', {section: mon, offset: 0, minutes: 15}), i('Clean out the fridge', 'Koelkast leeghalen en schoonmaken', {section: mon, offset: 0, minutes: 15}),
      i('Clean the sink, the toilet and the shower', 'Wastafel, wc en douche schoonmaken', {section: tue, offset: 1, minutes: 30}),
      i('Dust the shelves and the screens', 'Planken en schermen afstoffen', {section: wed, offset: 2, minutes: 20}), i('Tidy the table and the sofa', 'Tafel en bank opruimen', {section: wed, offset: 2, minutes: 10}),
      i('Change the bed linen', 'Beddengoed verschonen', {section: thu, offset: 3, minutes: 20}), i('Put away the clothes on the chair', 'Kleren van de stoel opruimen', {section: thu, offset: 3, minutes: 10}),
      i('Vacuum every room', 'Alle kamers stofzuigen', {section: fri, offset: 4, minutes: 25}), i('Mop the kitchen and the hall', 'Keuken en gang dweilen', {section: fri, offset: 4, minutes: 15}),
      i('Two loads of washing', 'Twee wassen draaien', {section: sat, offset: 5, minutes: 20}), i('Take out the bins and the recycling', 'Afval en oud papier buiten zetten', {section: sat, offset: 5, minutes: 10}),
    ];
  })()},
  {id: 'gallery-party', group: 'home', name: ['A party', 'Een feestje'], about: ['Three weeks from the guest list to the thank-yous; the party is on day 21.', 'Drie weken van gastenlijst tot bedankjes; het feest is op dag 21.'], items: [
    i('Choose the day and the place', 'Dag en plek kiezen', {section: sec('Plan', 'Plannen'), offset: 0, level: 1}), i('Make the guest list', 'Gastenlijst maken', {section: sec('Plan', 'Plannen'), offset: 0, minutes: 20}),
    i('Send the invitations', 'Uitnodigingen versturen', {section: sec('Plan', 'Plannen'), offset: 2, level: 2}),
    i('Order the cake', 'Taart bestellen', {section: sec('Two weeks before', 'Twee weken ervoor'), offset: 7}), i('Plan the food and the drinks', 'Eten en drinken plannen', {section: sec('Two weeks before', 'Twee weken ervoor'), offset: 7, minutes: 30}),
    i('Make a music list', 'Muzieklijst maken', {section: sec('Two weeks before', 'Twee weken ervoor'), offset: 10, minutes: 30}),
    i('Count who is coming', 'Tellen wie er komt', {section: sec('The week before', 'De week ervoor'), offset: 16}), i('Borrow chairs and glasses', 'Stoelen en glazen lenen', {section: sec('The week before', 'De week ervoor'), offset: 17}),
    i('Do the shopping', 'Boodschappen doen', {section: sec('The day before', 'De dag ervoor'), offset: 20, minutes: 60}), i('Tidy and clear space', 'Opruimen en ruimte maken', {section: sec('The day before', 'De dag ervoor'), offset: 20, minutes: 45}),
    i('Decorate and set out the food', 'Versieren en het eten klaarzetten', {section: sec('Party day', 'Feestdag'), offset: 21, minutes: 60}),
    i('Send thank-you messages', 'Bedankberichtjes sturen', {section: sec('After', 'Erna'), offset: 22, minutes: 15}), i('Give back what you borrowed', 'Geleende spullen terugbrengen', {section: sec('After', 'Erna'), offset: 23}),
  ]},
  {id: 'gallery-packing', group: 'home', name: ['A packing list', 'Een paklijst'], about: ['What to take, ticked off as it goes in the bag.', 'Wat mee moet, afgevinkt zodra het in de tas zit.'], items: [
    i('Clothes for each day', 'Kleren voor elke dag', {section: sec('Clothes', 'Kleding')}), i('Something warm and a rain jacket', 'Iets warms en een regenjas', {section: sec('Clothes', 'Kleding')}), i('Shoes and slippers', 'Schoenen en slippers', {section: sec('Clothes', 'Kleding')}),
    i('Toothbrush and toothpaste', 'Tandenborstel en tandpasta', {section: sec('Toiletries', 'Toilettas')}), i('Medicines you take', 'Medicijnen die je gebruikt', {section: sec('Toiletries', 'Toilettas'), level: 1}), i('Sun cream', 'Zonnebrand', {section: sec('Toiletries', 'Toilettas')}),
    i('Passport or ID', 'Paspoort of id-kaart', {section: sec('Papers', 'Papieren'), level: 1}), i('Tickets and bookings', 'Tickets en boekingen', {section: sec('Papers', 'Papieren'), level: 1}), i('Bank card and some cash', 'Bankpas en wat contant geld', {section: sec('Papers', 'Papieren')}),
    i('Phone charger and adapter', 'Oplader en verloopstekker', {section: sec('Electronics', 'Elektronica')}), i('Headphones', 'Koptelefoon', {section: sec('Electronics', 'Elektronica')}),
    i('Lock the windows and the door', 'Ramen en deur op slot', {section: sec('Leaving the house', 'Het huis uit'), level: 2}), i('Plants watered, bins out', 'Planten water, afval buiten', {section: sec('Leaving the house', 'Het huis uit')}),
  ]},
  {id: 'gallery-spring-clean', group: 'home', name: ['Spring clean', 'Grote schoonmaak'], about: ['A weekend for the jobs that wait all year.', 'Een weekend voor de klussen die het hele jaar wachten.'], items: [
    i('Wash the windows inside and out', 'Ramen binnen en buiten lappen', {section: sec('Saturday', 'Zaterdag'), offset: 0, minutes: 90}), i('Clean the oven', 'Oven schoonmaken', {section: sec('Saturday', 'Zaterdag'), offset: 0, minutes: 45}),
    i('Wash the curtains', 'Gordijnen wassen', {section: sec('Saturday', 'Zaterdag'), offset: 0, minutes: 30}),
    i('Sort the wardrobe: keep, give away, throw out', 'Kledingkast uitzoeken: houden, weggeven, weggooien', {section: sec('Sunday', 'Zondag'), offset: 1, minutes: 90}), i('Clear the cupboard under the stairs', 'Trapkast opruimen', {section: sec('Sunday', 'Zondag'), offset: 1, minutes: 45}),
    i('Take the give-away bags to a charity shop', 'Weggeefzakken naar de kringloop brengen', {section: sec('After', 'Erna'), offset: 6}),
  ]},
  // ---- Work ----
  {id: 'gallery-kickoff', group: 'work', name: ['Project kick-off', 'Projectstart'], about: ['From a clear goal to the first check-in, two weeks in.', 'Van een helder doel tot het eerste overleg, twee weken later.'], items: [
    i('Write the goal in two sentences', 'Het doel in twee zinnen opschrijven', {section: sec('Define', 'Bepalen'), offset: 0, level: 1, minutes: 30}), i('List who is involved and who decides', 'Opschrijven wie meedoet en wie beslist', {section: sec('Define', 'Bepalen'), offset: 0, minutes: 20}),
    i('Agree what is in and what is out', 'Afspreken wat erbij hoort en wat niet', {section: sec('Define', 'Bepalen'), offset: 1, minutes: 30}),
    i('Plan the kick-off meeting', 'Startoverleg plannen', {section: sec('Kick-off', 'Start'), offset: 2, level: 2}), i('Send the agenda', 'Agenda rondsturen', {section: sec('Kick-off', 'Start'), offset: 3}),
    i('Hold the kick-off and write down the actions', 'Startoverleg houden en acties noteren', {section: sec('Kick-off', 'Start'), offset: 5, minutes: 60}),
    i('Make the plan with milestones', 'Plan maken met mijlpalen', {section: sec('Plan', 'Plan'), offset: 7, minutes: 90}), i('Note the risks and what to do about them', 'Risico’s noteren en wat je eraan doet', {section: sec('Plan', 'Plan'), offset: 8, minutes: 30}),
    i('First check-in', 'Eerste overleg', {section: sec('Plan', 'Plan'), offset: 14, minutes: 30}),
  ]},
  {id: 'gallery-weekly-review', group: 'work', name: ['Weekly review', 'Weekreview'], about: ['Clear, current and ready for the next week, in about an hour.', 'Leeg, bijgewerkt en klaar voor de nieuwe week, in zo’n uur.'], items: [
    i('Empty every inbox: mail, notes, the desk', 'Alle inboxen leeg: mail, notities, het bureau', {section: sec('Get clear', 'Leegmaken'), minutes: 20}), i('Write down what is on your mind', 'Opschrijven wat door je hoofd gaat', {section: sec('Get clear', 'Leegmaken'), minutes: 10}),
    i('Look back at last week’s calendar', 'De agenda van vorige week nalopen', {section: sec('Get current', 'Bijwerken'), minutes: 10}), i('Look ahead at the next two weeks', 'Vooruitkijken naar de komende twee weken', {section: sec('Get current', 'Bijwerken'), minutes: 10}),
    i('Check each project has a next step', 'Elk project heeft een volgende stap', {section: sec('Get current', 'Bijwerken'), minutes: 15, level: 2}),
    i('Choose the three things that matter most', 'De drie belangrijkste dingen kiezen', {section: sec('Get ready', 'Klaarzetten'), minutes: 10, level: 1}),
  ]},
  {id: 'gallery-meeting', group: 'work', name: ['Meeting prep', 'Vergadering voorbereiden'], about: ['Before, during and after one meeting.', 'Voor, tijdens en na één vergadering.'], items: [
    i('Write the purpose and the agenda', 'Doel en agenda opschrijven', {section: sec('Before', 'Ervoor'), offset: 0, minutes: 20}), i('Send the agenda and any papers', 'Agenda en stukken rondsturen', {section: sec('Before', 'Ervoor'), offset: 0}),
    i('Book the room or the call', 'Ruimte of videogesprek boeken', {section: sec('Before', 'Ervoor'), offset: 0}),
    i('Take notes of decisions and actions', 'Besluiten en acties noteren', {section: sec('During', 'Tijdens'), offset: 2}),
    i('Send the notes with who does what', 'Verslag sturen met wie wat doet', {section: sec('After', 'Erna'), offset: 2, level: 2}), i('Put your own actions in Tasks', 'Je eigen acties in Tasks zetten', {section: sec('After', 'Erna'), offset: 2}),
  ]},
  {id: 'gallery-job-application', group: 'work', name: ['A job application', 'Een sollicitatie'], about: ['From the vacancy to the follow-up after the interview.', 'Van de vacature tot de opvolging na het gesprek.'], items: [
    i('Read the vacancy and mark what they ask', 'Vacature lezen en aanstrepen wat ze vragen', {section: sec('Prepare', 'Voorbereiden'), offset: 0, minutes: 20}), i('Update your CV for this role', 'Cv bijwerken voor deze functie', {section: sec('Prepare', 'Voorbereiden'), offset: 1, minutes: 60}),
    i('Write the letter', 'Brief schrijven', {section: sec('Prepare', 'Voorbereiden'), offset: 2, minutes: 60, level: 2}), i('Send the application', 'Sollicitatie versturen', {section: sec('Prepare', 'Voorbereiden'), offset: 3, level: 1}),
    i('Prepare three examples of your work', 'Drie voorbeelden van je werk voorbereiden', {section: sec('Interview', 'Gesprek'), offset: 10, minutes: 45}), i('Plan the route and the time', 'Route en tijd plannen', {section: sec('Interview', 'Gesprek'), offset: 13}),
    i('Send a short thank-you', 'Kort bedankje sturen', {section: sec('After', 'Erna'), offset: 15}), i('Ask how it stands if you hear nothing', 'Navragen als je niets hoort', {section: sec('After', 'Erna'), offset: 25}),
  ]},
  {id: 'gallery-quarter', group: 'work', name: ['Quarter planning', 'Kwartaalplanning'], about: ['Look back, choose a few goals, plan the first weeks.', 'Terugkijken, een paar doelen kiezen, de eerste weken plannen.'], items: [
    i('What went well last quarter', 'Wat ging goed vorig kwartaal', {section: sec('Look back', 'Terugkijken'), offset: 0, minutes: 20}), i('What to stop doing', 'Waar je mee stopt', {section: sec('Look back', 'Terugkijken'), offset: 0, minutes: 15}),
    i('Choose at most three goals', 'Hooguit drie doelen kiezen', {section: sec('Choose', 'Kiezen'), offset: 1, level: 1, minutes: 30}), i('Give each goal a first step', 'Elk doel een eerste stap geven', {section: sec('Choose', 'Kiezen'), offset: 1, minutes: 20}),
    i('Put the first steps in the next two weeks', 'De eerste stappen in de komende twee weken zetten', {section: sec('Plan', 'Plan'), offset: 2, minutes: 20}), i('Plan a check halfway through', 'Halverwege een check plannen', {section: sec('Plan', 'Plan'), offset: 45}),
  ]},
  // ---- Family ----
  {id: 'gallery-school-year', group: 'family', name: ['School year start', 'Start van het schooljaar'], about: ['The two weeks before school starts again; the first day is day 14.', 'De twee weken voor de school weer begint; de eerste dag is dag 14.'], items: [
    i('Check the school list: books and supplies', 'Schoollijst nalopen: boeken en spullen', {section: sec('Two weeks before', 'Twee weken ervoor'), offset: 0, level: 2}), i('Order the books', 'Boeken bestellen', {parent: 0}), i('Buy pens, folders and a bag', 'Pennen, mappen en een tas kopen', {parent: 0}),
    i('Try on clothes and shoes; buy what is too small', 'Kleren en schoenen passen; kopen wat te klein is', {section: sec('Two weeks before', 'Twee weken ervoor'), offset: 2, minutes: 60}),
    i('Put the school times and holidays in the Agenda', 'Schooltijden en vakanties in de agenda zetten', {section: sec('The week before', 'De week ervoor'), offset: 7, minutes: 20}), i('Arrange sport and clubs after school', 'Sport en clubs na school regelen', {section: sec('The week before', 'De week ervoor'), offset: 8}),
    i('Agree who takes and picks up on which day', 'Afspreken wie wanneer brengt en haalt', {section: sec('The week before', 'De week ervoor'), offset: 9, level: 1}),
    i('Back to the school bedtime', 'Terug naar de schoolbedtijd', {section: sec('The last days', 'De laatste dagen'), offset: 11}), i('Pack the bag and the lunch box', 'Tas en broodtrommel klaarmaken', {section: sec('The last days', 'De laatste dagen'), offset: 13}),
    i('First school day photo', 'Foto van de eerste schooldag', {section: sec('First day', 'Eerste dag'), offset: 14}),
  ]},
  {id: 'gallery-kids-birthday', group: 'family', name: ['A child’s birthday', 'Een kinderverjaardag'], about: ['Party, presents and treats; the birthday is on day 14.', 'Feestje, cadeaus en traktatie; de verjaardag is op dag 14.'], items: [
    i('Choose the party and who to invite', 'Feestje kiezen en wie je uitnodigt', {section: sec('Plan', 'Plannen'), offset: 0, level: 2}), i('Hand out the invitations', 'Uitnodigingen uitdelen', {section: sec('Plan', 'Plannen'), offset: 2}),
    i('Buy the presents', 'Cadeaus kopen', {section: sec('Plan', 'Plannen'), offset: 5}), i('Wrap the presents', 'Cadeaus inpakken', {section: sec('The day before', 'De dag ervoor'), offset: 13, minutes: 20}),
    i('Treats for school', 'Traktatie voor school', {section: sec('The day before', 'De dag ervoor'), offset: 13, minutes: 45}), i('Decorate the room', 'De kamer versieren', {section: sec('The day before', 'De dag ervoor'), offset: 13, minutes: 30}),
    i('Candles and the cake', 'Kaarsjes en de taart', {section: sec('Birthday', 'Verjaardag'), offset: 14}),
  ]},
  {id: 'gallery-family-holiday', group: 'family', name: ['Family holiday', 'Gezinsvakantie'], about: ['Six weeks of getting ready; you leave on day 42.', 'Zes weken voorbereiden; je vertrekt op dag 42.'], items: [
    i('Book the stay and the travel', 'Verblijf en reis boeken', {section: sec('Six weeks before', 'Zes weken ervoor'), offset: 0, level: 1}), i('Check everyone’s passport or ID', 'Ieders paspoort of id-kaart controleren', {section: sec('Six weeks before', 'Zes weken ervoor'), offset: 0, level: 1}),
    i('Arrange the pets and the plants', 'Huisdieren en planten regelen', {section: sec('A month before', 'Een maand ervoor'), offset: 14}), i('Travel insurance', 'Reisverzekering', {section: sec('A month before', 'Een maand ervoor'), offset: 14}),
    i('Games and books for the journey', 'Spelletjes en boeken voor onderweg', {section: sec('The week before', 'De week ervoor'), offset: 35}), i('Download maps and films', 'Kaarten en films downloaden', {section: sec('The week before', 'De week ervoor'), offset: 39}),
    i('Pack per person', 'Inpakken per persoon', {section: sec('The day before', 'De dag ervoor'), offset: 41, minutes: 90}), i('Snacks and water for the road', 'Eten en water voor onderweg', {section: sec('The day before', 'De dag ervoor'), offset: 41}),
    i('Empty the fridge, close up and go', 'Koelkast leeg, alles dicht en gaan', {section: sec('Leaving', 'Vertrek'), offset: 42}),
  ]},
  {id: 'gallery-week-menu', group: 'family', name: ['A week of meals', 'Een weekmenu'], about: ['Plan the meals on Sunday, shop once, cook ahead.', 'Op zondag de maaltijden plannen, één keer boodschappen, vooruit koken.'], items: [
    i('Ask everyone for one meal they want', 'Iedereen om één maaltijd vragen', {section: sec('Sunday', 'Zondag'), offset: 0, minutes: 10}), i('Write the seven meals down', 'De zeven maaltijden opschrijven', {section: sec('Sunday', 'Zondag'), offset: 0, minutes: 15}),
    i('Make the shopping list from the meals', 'Boodschappenlijst maken van de maaltijden', {section: sec('Sunday', 'Zondag'), offset: 0, minutes: 15}), i('Do the shopping', 'Boodschappen doen', {section: sec('Sunday', 'Zondag'), offset: 0, minutes: 60}),
    i('Cook two meals ahead', 'Twee maaltijden vooruit koken', {section: sec('Sunday', 'Zondag'), offset: 0, minutes: 90}), i('Use up the leftovers', 'Restjes opmaken', {section: sec('Friday', 'Vrijdag'), offset: 5}),
  ]},
  // ---- Personal ----
  {id: 'gallery-tax-papers', group: 'personal', name: ['Tax return papers', 'Belastingaangifte'], about: ['Gather the papers, fill it in, keep a copy.', 'Papieren verzamelen, invullen, een kopie bewaren.'], items: [
    i('Find last year’s return', 'De aangifte van vorig jaar opzoeken', {section: sec('Gather', 'Verzamelen'), offset: 0}), i('Annual statements from the bank', 'Jaaroverzichten van de bank', {section: sec('Gather', 'Verzamelen'), offset: 0}),
    i('Statements from work and pension', 'Jaaropgaven van werk en pensioen', {section: sec('Gather', 'Verzamelen'), offset: 0}), i('Receipts for what you can deduct', 'Bonnetjes van wat je mag aftrekken', {section: sec('Gather', 'Verzamelen'), offset: 2}),
    i('Fill in the return', 'De aangifte invullen', {section: sec('File', 'Indienen'), offset: 7, minutes: 90, level: 1}), i('Check it once more and send it', 'Nog één keer nakijken en versturen', {section: sec('File', 'Indienen'), offset: 8, level: 1}),
    i('Save a copy with the papers', 'Een kopie bij de papieren bewaren', {section: sec('After', 'Erna'), offset: 8}),
  ]},
  {id: 'gallery-digital-tidy', group: 'personal', name: ['A digital tidy-up', 'Digitaal opruimen'], about: ['An afternoon for files, photos, apps and passwords.', 'Een middag voor bestanden, foto’s, apps en wachtwoorden.'], items: [
    i('Empty the downloads folder', 'De map Downloads leegmaken', {section: sec('Files', 'Bestanden'), minutes: 15}), i('Back up your photos', 'Een back-up van je foto’s maken', {section: sec('Files', 'Bestanden'), minutes: 30, level: 2}),
    i('Remove apps you no longer use', 'Apps verwijderen die je niet meer gebruikt', {section: sec('Phone', 'Telefoon'), minutes: 15}), i('Turn off notifications you do not need', 'Meldingen uitzetten die je niet nodig hebt', {section: sec('Phone', 'Telefoon'), minutes: 10}),
    i('Unsubscribe from mail you never read', 'Afmelden voor mail die je nooit leest', {section: sec('Mail', 'Mail'), minutes: 20}),
    i('Change the passwords used twice', 'Wachtwoorden die dubbel zijn veranderen', {section: sec('Accounts', 'Accounts'), minutes: 30, level: 1}), i('Export your ZIGoals data as a backup', 'Je ZIGoals-gegevens exporteren als back-up', {section: sec('Accounts', 'Accounts'), minutes: 5}),
  ]},
  {id: 'gallery-moving-in', group: 'personal', name: ['Settling into a new home', 'Wennen in een nieuw huis'], about: ['The first month after the keys, room by room.', 'De eerste maand na de sleutels, kamer voor kamer.'], items: [
    i('Note the meter readings', 'Meterstanden noteren', {section: sec('Day one', 'Dag één'), offset: 0, level: 1}), i('Find the fuse box and the water tap', 'Meterkast en hoofdkraan zoeken', {section: sec('Day one', 'Dag één'), offset: 0}),
    i('Unpack the kitchen and the beds first', 'Eerst keuken en bedden uitpakken', {section: sec('The first week', 'De eerste week'), offset: 1, minutes: 120}), i('Register at the new address', 'Inschrijven op het nieuwe adres', {section: sec('The first week', 'De eerste week'), offset: 3, level: 1}),
    i('Say hello to the neighbours', 'Kennismaken met de buren', {section: sec('The first week', 'De eerste week'), offset: 5}),
    i('Hang the lights and the curtains', 'Lampen en gordijnen ophangen', {section: sec('The first month', 'De eerste maand'), offset: 10, minutes: 120}), i('Take the empty boxes away', 'Lege dozen wegbrengen', {section: sec('The first month', 'De eerste maand'), offset: 14}),
  ]},
];
/** A gallery template in one language, in the built-in templates' shape (for `applyTemplate`). */
export function galleryTemplate(t: GalleryTemplate, lang: GalleryLang): {id: string; name: string; about: string; items: TemplateItem[]} {
  const k = lang === 'nl' ? 1 : 0;
  return {id: t.id, name: t.name[k], about: t.about[k], items: t.items.map(({title, section, ...rest}) => ({title: title[k], ...(section ? {section: section[k]} : {}), ...rest}))};
}
/** The gallery by group, in one language. */
export function galleryByGroup(lang: GalleryLang): {group: GalleryGroup; title: string; items: ReturnType<typeof galleryTemplate>[]}[] {
  return GALLERY_GROUPS.map(group => ({group, title: GROUP_WORDS[group][lang], items: TEMPLATE_GALLERY.filter(t => t.group === group).map(t => galleryTemplate(t, lang))}));
}
