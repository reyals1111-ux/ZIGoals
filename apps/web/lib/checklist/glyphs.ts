import {GLYPHS} from '../../components/path/glyph-paths';

/**
 * Session AF (L3b): the mark a planet wears on the full-screen path, from the item's own words when its page gives only a
 * generic one (a habit's sliders, a custom item's sparkle, a timed habit's clock): "Read 5 pages" a book, "Play piano"
 * a note, "Do 100 push-ups" a dumbbell, "Take vitamins" a pill. Presentation only: nothing is stored and the item's
 * record, colour and state are untouched. Pure.
 */
const GENERIC = new Set(['habits', 'sparkle', 'focus']);
const WORDS: [RegExp, string][] = [
  [/vitamin|supplement|creatine|capsule|tablet|\bpills?\b|omega|magnesium|zinc|probiotic|medic/i, 'pill'],
  [/meditat|breath|yoga|mindful|\bcalm\b|pray/i, 'lotus'],
  [/push-?ups?|pull-?ups?|squat|\bgym\b|workout|weights?|lift|plank|sit-?ups?|exercise|training|\bpilates\b/i, 'dumbbell'],
  [/\brun\b|running|\bjog|walk|steps|hike|cycl|\bbike\b|\bswim/i, 'run'],
  [/\bread|book|pages?\b|study/i, 'book'],
  [/piano|guitar|violin|music|\bsing|drum|instrument|\bsong/i, 'note'],
  [/journal|\bwrite|writing|diary|gratitude/i, 'pen'],
  [/water|\bdrink|hydrat/i, 'drop'],
  [/\bsleep|\bbed\b|\bnap\b/i, 'moon'],
  [/\bsun\b|sunlight|wake|sunrise/i, 'sun'],
  [/\beat|meal|vegg|fruit|salad|\bcook|breakfast|lunch|dinner/i, 'meal'],
  [/stretch|mobility|posture/i, 'leaf'],
];
export function itemGlyph(item: {glyph: string; label: string}): string {
  if (!GENERIC.has(item.glyph)) return item.glyph;
  for (const [re, glyph] of WORDS) if (re.test(item.label)) return glyph;
  return item.glyph;
}

/**
 * Session AG (owner pointer 2, "1b MORE GLYPHS"): the mark a node wears on the orbit path — one line glyph per item, in
 * the footer banner's line style. The item's own words first (walk → footsteps, "Play piano" → piano, "Save €10" → a
 * savings jar …), then its Health input or kind (water → drop, a goal → target), then its page's own mark, then a star.
 * One ordered table: specific phrases sit above the broad words they contain ("brush teeth" above "brush", "heart
 * rate" above "heart", "no coffee" above "drink"); word edges keep "breakfast" from fasting, "brunch" from running,
 * "start" from art, "embedded" from bed and "Sunday" from the sun. Every mark it gives is a key of the path's own glyph
 * table. Its words cover everything `itemGlyph`'s do, so the page's mark is read as given (not through `itemGlyph`'s
 * looser words, where "ready" would read as a book and "No drinking" as water). Pure.
 */
const ORBIT_WORDS: [RegExp, string][] = [
  [/\bfloss|\bbrush(ing)?\s+(my\s+|your\s+|the\s+)?teeth|\bteeth\b|\btooth|tandenpoetsen|\bdental|mouthwash/i, 'tooth'],
  [/heart\s*rate|\bpulse\b|\bhrv\b|\bbpm\b|resting\s+hr\b/i, 'heart-rate'],
  [/gratitude|grateful|thankful|\bthanks\b|dankbaar|appreciat/i, 'gratitude'],
  [/\bno\s+(more\s+)?coffee|coffee[- ]?free|without\s+coffee|quit\s+coffee|less\s+coffee|caffeine|\bdecaf/i, 'no-coffee'],
  [/\bno\s+(added\s+)?sugar|sugar[- ]?free|\bsugar\b|\bsweets\b|\bcandy|no\s+snack|\bsnoep/i, 'no-sugar'],
  [/\bphones?\b|screen[- ]?time|\bscreens?\b|social\s+media|doom-?scroll|instagram|tiktok|digital\s+detox|telefoon/i, 'phone-off'],
  [/vitamin|supplement|creatine|capsule|tablet|\bpills?\b|omega|magnesium|\bzinc\b|probiotic|medic|\bmeds\b|collagen|\biron\b|calcium/i, 'pill'],
  [/\bstak(e|es|ed|ing)\b|\bzig\b/i, 'stake'],
  [/budget/i, 'budget'],
  [/\bbills?\b|invoice|\bpay\s+(the\s+|my\s+|off\s+)?(rent|debt|tax|credit|card)|\brent\b|\btax(es)?\b|\bdebt\b/i, 'bill'],
  [/invest|portfolio|\bstocks?\b|\betfs?\b|index\s+fund|dividend|\bchart/i, 'chart'],
  [/\bsav(e|es|ed|ing|ings)\b|piggy|emergency\s+fund|\bsparen\b|spaar/i, 'savings-jar'],
  [/wallet|\bspending\b|no[- ]spend|\bspend\s+(less|nothing|under|max)|expenses?\b/i, 'wallet'],
  [/money|wealth|contribut|€|\$|£|\bdca\b|crypto|bitcoin|\bbtc\b|\bearn\b|income/i, 'coin'],
  [/language|spanish|french|dutch|german|italian|portuguese|japanese|chinese|mandarin|korean|arabic|duolingo|vocab|learn\s+(\d+\s+|new\s+)?words|flashcards?|\banki\b|\bspaans|\bfrans\b|\bduits\b|\bengels\b/i, 'language'],
  [/piano|keyboard|klavier/i, 'piano'],
  [/guitar|gitaar|ukulele|\bbass\b/i, 'guitar'],
  [/violin|music|\bsing(ing)?\b|\bdrums?\b|drumming|instrument|\bsongs?\b|\bcello|\bflute|saxophone|\bchoir|muziek|zingen/i, 'note'],
  [/\bcod(e|ing)\b|programming|leetcode|\bpython\b|javascript|typescript|github/i, 'code'],
  [/chess|schaken/i, 'chess'],
  [/\bpaint|\bdraw(ing|s)?\b|\barts?\b|sketch|watercolou?r|illustrat|doodle|calligraph|tekenen|schilder|\bbrush\b/i, 'brush'],
  [/journal|diary|dagboek|\bwrit(e|es|ing)\b|morning\s+pages|\bblog/i, 'journal'],
  [/\bread(s|ing)?\b|\bbooks?\b|\bstudy|\blezen\b|\bboek|\bnovel|kindle|audiobook/i, 'book'],
  [/\bpages?\b/i, 'pages'],
  [/\byoga\b/i, 'yoga'],
  [/meditat|mediteren|\bbreath|ademhaling|mindful|\bcalm\b|\bpray/i, 'lotus'],
  [/stretch|mobility|\bposture|foam\s*roll|rekken/i, 'stretch'],
  [/\bswim|zwemmen|\blaps\b/i, 'swim'],
  [/\bbikes?\b|\bbiking|\bcycl(e|es|ing)\b|spin\s+class|fietsen|peloton/i, 'bike'],
  [/\bwalk|\bsteps\b|\bhik(e|es|ing)\b|stroll|wandel|\bstappen\b/i, 'footsteps'],
  [/\bruns?\b|\brunning|\bjog|\bsprint|hardlopen|\b5k\b|\b10k\b|marathon/i, 'run'],
  [/push-?ups?|pull-?ups?|\bsquats?\b|\bgym\b|work-?out|work\s+out|weights\b|weight\s+training|\blift|\bplanks?\b|sit-?ups?|exercise|training|pilates|strength|\bsport|crossfit|burpee|\babs\b/i, 'dumbbell'],
  [/\bweigh(s|ing)?\b|weigh-?in|\bweight\b|\bscale\b|body\s*fat|\bbmi\b|\bwegen\b/i, 'scale'],
  [/\bheart\b|cardio|blood\s+pressure|health\s+check|\bhiit\b/i, 'heart'],
  [/shower|douche|ice\s+bath|cold\s+plunge|\bbath\b/i, 'shower'],
  [/\bbed(time)?\b|naar\s+bed/i, 'bed'],
  [/sleep|\bnaps?\b|slapen|\bslaap/i, 'moon'],
  [/\bsun\b|sunlight|sunrise|sunshine|sunscreen|morning\s+light|daylight|\boutside\b|outdoors|\bwake|\bwaking/i, 'sun'],
  [/\bfast(s|ed|ing)?\b|intermittent|\bomad\b|\bvasten\b/i, 'hourglass'],
  [/\bfocus|deep\s+work|\bpomodoro|concentrat|\bprioriti/i, 'target'],
  [/salad|\bveg|\bgreens\b|broccoli|spinach|groente|\bkale\b|plant[- ]based/i, 'salad'],
  [/\bapples?\b|fruit|\bbananas?\b|\bberr(y|ies)\b|\bappel/i, 'apple'],
  [/\bmeals?\b|\beat(ing)?\b|breakfast|lunch|dinner|\bcook|calorie|protein|food\s+(diary|log)/i, 'meal'],
  [/\bglass(es)?\b/i, 'glass'],
  [/water|hydrat|\bdrink(?!ing\b)|\bh2o\b/i, 'drop'],
];
/** A Health favourite's input, then a goal's kind, when its words tell nothing. */
const ORBIT_INPUT: Record<string, string> = {water: 'drop', sleep: 'moon', meditation: 'lotus', fast: 'hourglass', weight: 'scale', diary: 'meal', meal: 'meal'};
const ORBIT_KIND_OF: Record<string, string> = {goal: 'target', 'goal-step': 'target'};
/** Generic page marks the orbit path replaces with a kind's own glyph. */
const ORBIT_KIND: Record<string, string> = {sparkle: 'star', habits: 'orbit', focus: 'clock', flag: 'target'};
const drawn = (name: string | undefined): name is string => name !== undefined && Object.hasOwn(GLYPHS, name);
export function orbitGlyph(item: {glyph: string; label: string; kind?: string; input?: string}): string {
  for (const [re, glyph] of ORBIT_WORDS) if (re.test(item.label)) return glyph;
  const byInput = item.input ? ORBIT_INPUT[item.input] : undefined;
  if (drawn(byInput)) return byInput;
  const byKind = item.kind ? ORBIT_KIND_OF[item.kind] : undefined;
  if (drawn(byKind)) return byKind;
  const remapped = ORBIT_KIND[item.glyph] ?? item.glyph;
  return drawn(remapped) ? remapped : 'star';
}
