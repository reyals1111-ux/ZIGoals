import type {Ask, Domain, Shape} from './types';

/**
 * Session AS (ADR-042, Part 1): the words the exact layer knows, English and Dutch. Every pattern is a plain alternation
 * of whole words, so the same tables give the typo fixer its vocabulary (`VOCABULARY`: every word of four letters or more
 * that appears here). Patterns run on folded text (lib/ai/local-answers/exact/text.ts `fold`).
 */
const w = (words: string) => new RegExp(`\\b(?:${words})\\b`);

/** What part of life a question is about. Order matters: the first match wins where two fit ("sleep goal" is sleep). */
export const DOMAIN_WORDS: readonly [Domain, RegExp][] = [
  ['nova', w('what can you see|what do you see|what can you read|what do you know about me|what can you do|what can you answer|what can i ask|who are you|what are you|which model|what model|which brain|your brain|are you online|are you connected|which ai|what did i ask|my requests|my questions|is my data private|is my data safe|where does my data go|do you send|do you share|wat kun je zien|wat zie je|wat kun je lezen|wat weet je over mij|wat kun je doen|wat kun je|wat kan ik vragen|wie ben je|wat ben je|welk model|welk brein|ben je online|ben je verbonden|welke ai|wat heb ik gevraagd|mijn vragen|is mijn data prive|zijn mijn gegevens prive|zijn mijn gegevens veilig|stuur je|deel je')],
  ['vitals', w('heart rate|resting heart rate|heartrate|pulse|bpm|hartslag|rusthartslag|polsslag')],
  ['sleep', w('sleep|slept|sleeping|asleep|bedtime|nights|night|slaap|geslapen|slapen|slaapt|slaapdoel|nacht|nachten|bedtijd|nachtrust')],
  ['weight', w('weight|weigh|weighed|kilos|kilo|pounds|heavier|lighter|gewicht|weeg|woog|gewogen|afgevallen|aangekomen|zwaarder|lichter')],
  ['water', w('water|waterdoel|hydration|hydrated|glasses|glazen')],
  ['steps', w('steps|step|step count|stappen|stappendoel')],
  ['protein', w('protein|eiwit|eiwitten|eiwitdoel')],
  ['calories', w('calories|calorie|kcal|calorieen|caloriedoel|ate|eaten|eat|food|gegeten|eten|voeding')],
  ['meditation', w('meditate|meditated|meditating|meditation|mindful|mindfulness|mediteren|gemediteerd|mediteer|meditatie')],
  ['workouts', w('workout|workouts|worked out|work out|working out|exercise|exercised|exercising|training|trained|gym|gesport|sporten|sport|getraind|trainen|sportschool|hardgelopen|hardlopen')],
  ['budgets', w('budget|budgets|budgetten')],
  ['bills', w('bill|bills|subscription|subscriptions|rent|invoice|invoices|rekening|rekeningen|abonnement|abonnementen|huur|factuur|facturen|vaste lasten')],
  ['income', w('income|earned|earnings|earn|salary|paycheck|inkomen|inkomsten|verdiend|verdien|salaris|loon')],
  ['spending', w('spend|spent|spending|expense|expenses|paid|purchases|purchase|bought|uitgegeven|uitgaven|uitgave|uitgeven|uitgeef|uitgaf|geef ik|gaf ik|besteed|betaald|gekocht|kosten|aankoop|money go|my money went|geld naartoe|geld heen')],
  ['networth', w('net worth|networth|worth|wealth|assets|portfolio|how rich|vermogen|nettovermogen|waard|bezit|bezittingen|portefeuille')],
  ['goals', w('goal|goals|on track|saving for|doel|doelen|op schema|spaardoel|spaardoelen')],
  ['tasks', w('task|tasks|todo|todos|to do list|to-do|chores|taak|taken|takenlijst|klusjes')],
  ['journal', w('journal|journaled|journaling|diary|dagboek|geschreven|schrijf|wrote in|written in|write in')],
  ['notes', w('note|notes|notitie|notities|aantekening|aantekeningen')],
  ['agenda', w('agenda|calendar|schedule|appointment|appointments|meeting|meetings|events|event|kalender|afspraak|afspraken|vergadering|vergaderingen|planning')],
  ['checklist', w('checklist|check list|my list|orbit|lijstje|checklijst')],
  ['focus', w('focus|focused|focussed|pomodoro|pomodoros|deep work|concentrated|gefocust|gefocused|geconcentreerd|concentratie')],
  ['habits', w('habit|habits|gewoonte|gewoontes|gewoonten')],
  ['health', w('health|healthy|body|wellbeing|fitness|gezondheid|gezond|lichaam|conditie')],
  ['life', w('how am i doing|how am i doing overall|how is it going|how is everything|how was my day|how was my week|how is my day|how is my week|hows my day|hows my week|my day|my week|how did i do|overall|hoe gaat het|hoe doe ik het|hoe sta ik ervoor|hoe was mijn dag|hoe was mijn week|hoe gaat mijn dag|hoe gaat mijn week|mijn dag|mijn week|hoe deed ik het|in het algemeen')],
];
/** What is asked about it. The first match wins, so the more specific readings stand first. */
export const ASK_WORDS: readonly [Ask, RegExp][] = [
  ['why', w('why|how come|what caused|reason|waarom|hoezo|hoe komt|waardoor|oorzaak')],
  ['compare', w('vs|versus|compare|compared|comparison|than last|than the|than before|than usual|more than|less than|difference|better than|worse than|against last|vergeleken|vergelijk|dan vorige|dan de|dan normaal|meer dan|minder dan|verschil|beter dan|slechter dan|ten opzichte')],
  ['streak', w('streak|streaks|in a row|consecutive|reeks|reeksen|op rij|achter elkaar|achtereen')],
  ['last', w('last time|when did i last|when was the last|when was my last|most recent|most recently|latest|laatste keer|voor het laatst|meest recente|wanneer voor het laatst|laatst gedaan')],
  ['next', w('next|upcoming|coming up|volgende|aankomende|eerstvolgende|binnenkort|komende')],
  ['late', w('late|overdue|past due|behind|te laat|achterstallig|verlopen|achter')],
  ['skipped', w('skip|skipped|skips|skipping|overgeslagen|overslaan|geskipt|oversloeg')],
  ['missed', w('miss|missed|missing|misses|failed|fail|blew|gemist|mis|misgelopen|mislukt|gefaald|misser|missers')],
  ['not-done', w('forgot|forget|forgotten|forgetting|didnt|did not|havent|have not|hasnt|wasnt|not done|not do|not finished|not completed|not completing|undone|without|never|no entry|under my|below my|under goal|below target|short of|fell short|vergeten|vergat|niet|geen|nooit|zonder|onder mijn|onder het doel|onder doel|te weinig')],
  ['best', w('best|most|highest|biggest|largest|longest|strongest|top|record|closest|nearest|beste|meeste|meest|hoogste|grootste|langste|sterkste|dichtst|dichtste')],
  ['worst', w('worst|least|lowest|fewest|weakest|shortest|smallest|furthest|farthest|slechtste|minste|minst|laagste|kortste|zwakste|kleinste|verst|verste')],
  ['average', w('average|avg|mean|typical|typically|usually|per day|a day|per night|a night|gemiddeld|gemiddelde|meestal|per dag|per nacht')],
  ['trend', w('trend|trending|going up|going down|over time|improving|improved|getting better|getting worse|changed|change|progress|progressing|up or down|stijgt|daalt|vooruitgang|verloop|ontwikkeling|veranderd|verandering|omhoog|omlaag|vooruit gegaan')],
  ['open', w('left|open|remaining|still|pending|to go|need to|have to|outstanding|due|to pay|have to pay|betalen|nog|over|resterend|openstaand|openstaande|moet ik|te gaan|te doen')],
  ['done', w('done|did|completed|complete|finished|finish|hit|reached|reach|checked off|ticked|made|kept|gedaan|gehaald|afgerond|voltooid|klaar|afgevinkt|gelukt|volgehouden')],
  ['total', w('total|sum|altogether|in all|totaal|bij elkaar|in totaal|opgeteld|alles bij elkaar')],
  ['status', w('how am i doing|how is|how are|hows|how was|how were|how did|how do|going|doing|overview|summary|status|update|recap|hoe gaat|hoe gaan|hoe staat|hoe staan|hoe lopen|hoe loopt|hoe was|hoe waren|hoe ging|hoe gingen|hoe is|hoe zijn|hoe doe ik|hoe sta ik|hoe heb ik|overzicht|samenvatting|stand van zaken')],
];
/** The shape of the answer the words ask for. */
export const SHAPE_WORDS: readonly [Shape, RegExp][] = [
  ['dates', w('what day|what days|which day|which days|what date|what dates|which dates|on what days|on which days|when|welke dag|welke dagen|welke datum|welke data|welke datums|op welke dag|op welke dagen|wanneer')],
  ['count', w('how many times|how often|how many days|how many nights|on how many days|number of|count|hoe vaak|hoeveel keer|hoeveel dagen|op hoeveel dagen|hoeveel nachten|aantal|hoe dikwijls|hoeveel workouts|hoeveel sessies|hoeveel focus sessies|hoeveel focussessies|hoeveel taken|hoeveel gewoontes|hoeveel doelen|hoeveel notities|hoeveel rekeningen|hoeveel budgetten')],
  ['amount', w('how much|how long|how many minutes|how many hours|how many steps|how many glasses|how many calories|how many kilos|how far|how heavy|hoeveel|hoe lang|hoe ver|hoe zwaar|hoeveel minuten|hoeveel uur|hoeveel stappen|hoeveel glazen')],
  ['count', w('how many')],
  ['list', w('which|what|list|show|welke|welk|wat|toon|laat zien|noem')],
  // Yes or no only where the question opens with it ("how did I sleep" is not a yes-or-no question).
  ['yes-no', /^(?:and |so |ok |okay |nova |zigi |en |dus )?(?:did i|have i|am i|was i|do i|is my|are my|is there|are there|any|heb ik|ben ik|was ik|is mijn|zijn mijn|is er|zijn er|staat er|doe ik)\b/],
];
/** Words a person uses for a habit, as the word a habit is usually called (Dutch and loose English → the habit's own word). */
export const HABIT_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  mediteren: ['meditate'], gemediteerd: ['meditate'], mediteer: ['meditate'], meditatie: ['meditate'], meditation: ['meditate'], meditated: ['meditate'], meditating: ['meditate'],
  lezen: ['read'], gelezen: ['read'], lees: ['read'], reading: ['read'], boek: ['read'],
  wandelen: ['walk'], gewandeld: ['walk'], wandeling: ['walk'], wandel: ['walk'], gelopen: ['walk'], lopen: ['walk'], walked: ['walk'], walking: ['walk'],
  sporten: ['exercise', 'workout'], gesport: ['exercise', 'workout'], sport: ['exercise', 'workout'], trainen: ['exercise', 'workout'], getraind: ['exercise', 'workout'], training: ['exercise', 'workout'], gym: ['exercise', 'workout'], workout: ['exercise'], workouts: ['exercise'], exercised: ['exercise'], bewegen: ['exercise'], bewogen: ['exercise'],
  gedronken: ['drink'], drinken: ['drink'], drank: ['drink'], drunk: ['drink'],
  snack: ['snacks'], gesnackt: ['snacks'], snacken: ['snacks'], snacked: ['snacks'], snacking: ['snacks'],
  bijdragen: ['contribute'], bijgedragen: ['contribute'], gestort: ['contribute'], storten: ['contribute'], inleggen: ['contribute'], ingelegd: ['contribute'], contributed: ['contribute'], contribution: ['contribute'],
  rekken: ['stretch'], stretchen: ['stretch'], gestretcht: ['stretch'], stretched: ['stretch'], stretching: ['stretch'],
  rennen: ['run'], gerend: ['run'], hardlopen: ['run'], hardgelopen: ['run'], running: ['run'],
  schrijven: ['journal', 'write'], geschreven: ['journal', 'write'], studeren: ['study'], gestudeerd: ['study'], leren: ['study'], geleerd: ['study'],
  koken: ['cook'], gekookt: ['cook'], flossen: ['floss'], geflost: ['floss'], bidden: ['pray'], gebeden: ['pray'], yoga: ['yoga'], zwemmen: ['swim'], gezwommen: ['swim'], fietsen: ['cycle'], gefietst: ['cycle'],
};
/**
 * Session AU (ADR-044 D-ETA): words people use for a goal in Dutch when the goal is named in English ("noodfonds" for an
 * Emergency fund), as the words of that name. Read only for goals (lib/ai/local-answers/exact/understand.ts).
 */
export const GOAL_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  noodfonds: ['emergency', 'fund'], noodfondsje: ['emergency', 'fund'], noodpot: ['emergency', 'fund'], noodpotje: ['emergency', 'fund'], noodbuffer: ['emergency', 'fund'],
};
/**
 * Session AU (ADR-044 D-ETA): when a goal will be reached, at the pace so far ("when will I reach my emergency fund", "how
 * long until it is done", "wanneer haal ik mijn noodfonds"). A goal's own target date ("what is its deadline", "when is it
 * due") and when it was reached ("wanneer heb ik … gehaald") are not this. Runs on folded text.
 */
export const GOAL_ETA = /\b(?:when (?:will|would|do|can|could|am) i (?:going to |gonna )?(?:reach|hit|get to|finish|complete|achieve|make|be done with|have)|when (?:will|would) (?:my |the |it )(?:\w+ ){0,6}?(?:be )?(?:done|reached|finished|complete|completed|full|funded)|how long (?:until|till|untill|til|before|to reach|to hit|to finish|will it take|does it take|is it until)|how much longer (?:until|till|before|for)|wanneer (?:haal|bereik) ik|wanneer (?:zal|ga) ik (?:\w+ ){1,6}?(?:halen|bereiken)|wanneer is (?:mijn |het )(?:\w+ ){0,6}?(?:klaar|vol|af)|hoe ?lang (?:nog |duurt het (?:nog )?)?(?:tot|voordat|voor ik)|hoeveel tijd (?:nog )?(?:tot|voordat))\b/;
/** Not a question the device answers from records: an action to take, a line to log, advice. */
export const NOT_A_LOOKUP = {
  action: /^(?:please |can you |could you |ok |okay |kun je |wil je |graag )?(?:log|add|track|record|mark|skip|create|make|set|remind|start|stop|delete|remove|plan|schedule|change|update|edit|rename|move|buy|sell|send|transfer|undo|turn|write|draft|tick|check off|open|go to|go back to|take me to|navigate to|switch to|run|estimate|scan|summarize|summarise|review|suggest|give me a|give me an|export|import|connect|voeg|zet|maak|vink|sla|noteer|registreer|verwijder|wijzig|verander|herinner|stuur|schrijf|ga naar|ga terug naar|breng me naar|geef me een|vat|exporteer)\b|^(?:nova |zigi )?(?:open|toon de pagina|ga naar)\b|\b(?:page|pagina|screen|scherm|tab) ?$|\b(?:openen|open doen)$/,
  /** A sentence about oneself ("I didn't drink water today", "ik heb gesport") is a line to log or a remark, not a question. */
  statement: /^(?:i|ive|im|we|ik|wij) (?!wonder|want to know|would like to know|vraag me af|wil weten)|^\d/,
  mixed: /(?:,|;|\band\b|\bthen\b|\balso\b|\ben\b|\bdan\b|\book\b) (?:please |also |ook |even )?(?:log|add|track|record|mark|tick|skip|create|make|set|remind|start|stop|delete|remove|note|put|save|zet|voeg|noteer|vink|sla|registreer|verwijder|maak|plan)\b/,
  /** A food's own figures ("how many calories in a banana") ask about the food, not the diary. */
  food: /\b(?:calories|calorie|kcal|calorieen|protein|eiwit|carbs|koolhydraten) (?:are |is |zitten er |zit er )?in\b|\bfrom a photo\b|\bvan een foto\b/,
  /** Another language than English or Dutch: the layers that say so answer it. */
  other: /\b(?:steht|meiner|meinem|wieviel|wie viel|habe ich|heute|gestern|gewohnheiten|combien|quelle|quels|aujourdhui|coche|comme|pour|avec|cuanto|cuantos|cuantas|habitos|ayer|est ce que)\b/,
  /** What is still to come, or a standing fact ("when do I get paid"): not something the records of past days answer. */
  ahead: /\b(?:when do i|when will|when should|when is my next pay|wanneer krijg|wanneer moet|wanneer ga|wanneer word)\b|^(?:alert|notify|warn|waarschuw|meld)\b/,
  advice: /\b(?:should|suggest|recommend|advice|advise|tips|tip|help me|how can i|how do i|how to|what if|motivate|motivation|is that good|is that bad|is that ok|is that enough|is it good|is it bad|too much|too little|zou ik|wat moet ik|moet ik doen|advies|adviseer|aanraden|hoe kan ik|help me|is dat goed|is dat slecht|is dat genoeg|te veel|te weinig|normal|for my age|other people|compared to others|someone like me|average person|good enough|healthy enough|normaal|voor mijn leeftijd|andere mensen|iemand zoals ik|goed genoeg|gezond genoeg)\b/,
};
/** Words that are never a record's name by themselves (so "this" or "days" never names a habit). */
export const GENERIC = new Set('habit habits goal goals today done left open all and also only with the for this that what how many much are your did miss missed days day week month times time last have was were not which when showcase data fund plan gewoonte gewoontes doel doelen vandaag dag dagen week maand keer niet welke wanneer mijn deze heb ik'.split(' '));

const sources = [...DOMAIN_WORDS, ...ASK_WORDS, ...SHAPE_WORDS].map(([, re]) => re.source).join(' ') + ' ' + Object.entries(HABIT_SYNONYMS).flat(2).join(' ') + ' ' + Object.keys(GOAL_SYNONYMS).join(' ')
  + ' today yesterday week month year monday tuesday wednesday thursday friday saturday sunday january february march april june july august september october november december vandaag gisteren maand jaar maandag dinsdag woensdag donderdag vrijdag zaterdag zondag januari februari maart augustus oktober mondays tuesdays wednesdays thursdays fridays saturdays sundays maandagen dinsdagen woensdagen donderdagen vrijdagen zaterdagen zondagen anything something everything payment entry betaling days times dagen keer this last since deze vorige afgelopen sinds what which when where have many much often welke hoeveel wanneer habits tasks goals bills notes';
/** Every word of four letters or more the tables hold: what a misspelt word may be set right to. */
export const VOCABULARY: ReadonlySet<string> = new Set(sources.match(/[a-z]{4,}/g) ?? []);
/** The few short words a four-letter slip may be set right to ("wgat" → "what"): question words only, never a record's word. */
export const SHORT_WORDS: ReadonlySet<string> = new Set('what when many much days week this last have does were welk heeft keer'.split(' '));
