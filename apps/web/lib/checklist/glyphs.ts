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
