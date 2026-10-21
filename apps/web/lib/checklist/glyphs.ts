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
 * Session AG (owner pointer 2): the mark a node wears on the orbit path — one line glyph per item, in the footer banner's
 * line style. The item's own words first (walk → footsteps, focus → target, savings → coin …), then its page's own mark,
 * then a mark for its kind; a custom item with no telling words is a star. One table, a sensible default. Pure.
 */
const ORBIT_WORDS: [RegExp, string][] = [
  [/\bwalk|steps\b|\bhike|stroll/i, 'footsteps'],
  [/\bfocus|deep work|\bpomodoro|concentrat/i, 'target'],
  [/sav(e|ing)|invest|budget|wealth|money|contribut|€|\$|\bdca\b|stak(e|ing)|\bzig\b/i, 'coin'],
  [/\bapple|fruit/i, 'apple'],
  [/\bheart|blood pressure|cardio|health check/i, 'heart'],
];
/** Generic page marks the orbit path replaces with a kind's own glyph. */
const ORBIT_KIND: Record<string, string> = {sparkle: 'star', habits: 'orbit', focus: 'clock', flag: 'target'};
export function orbitGlyph(item: {glyph: string; label: string}): string {
  for (const [re, glyph] of ORBIT_WORDS) if (re.test(item.label)) return glyph;
  const mark = itemGlyph(item);
  return ORBIT_KIND[mark] ?? mark;
}
