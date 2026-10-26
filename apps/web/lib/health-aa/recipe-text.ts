/**
 * N6: a basic recipe parser for pasted text. It finds the ingredient lines (a quantity, an optional unit, a name) between
 * an "Ingredients" heading and the next heading (or the whole text when there is none), the servings ("serves 4",
 * "4 portions", "yield: 6") and a title (the first line). Every parsed line is shown to the person to confirm before
 * anything becomes a food or recipe; nothing is fetched, nothing is guessed about nutrition.
 */
export type ParsedIngredient = {raw: string; name: string; quantity: number | null; unit: string | null; grams: number | null};
export type ParsedRecipe = {title: string; servings: number | null; ingredients: ParsedIngredient[]; steps: number};
const UNITS: Record<string, number | null> = {g: 1, gram: 1, grams: 1, kg: 1000, kilogram: 1000, ml: 1, millilitre: 1, milliliter: 1, l: 1000, litre: 1000, liter: 1000, tbsp: 15, tablespoon: 15, tablespoons: 15, tsp: 5, teaspoon: 5, teaspoons: 5, cup: 240, cups: 240, oz: 28, ounce: 28, ounces: 28, lb: 454, pound: 454, pounds: 454, pinch: 1, clove: null, cloves: null, slice: null, slices: null, piece: null, pieces: null, can: null, cans: null, bunch: null, handful: null};
const FRACTIONS: Record<string, number> = {'½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125};
const HEADING = /^(ingredients?|method|instructions?|directions?|steps?|preparation|notes?)\b[:\s]*$/i;
export function parseQuantity(text: string): {quantity: number | null; rest: string} {
  let s = text.trim();
  for (const [f, v] of Object.entries(FRACTIONS)) if (s.startsWith(f)) return {quantity: v, rest: s.slice(f.length).trim()};
  const m = /^(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*\d+(?:[.,]\d+)?)?(?:\s+(\d)\/(\d))?(?:\s*\/\s*(\d+))?\s*(.*)$/.exec(s);
  if (!m) return {quantity: null, rest: s};
  let q = Number(m[1]!.replace(',', '.'));
  if (m[2] && m[3]) q += Number(m[2]) / Number(m[3]); else if (m[4]) q = q / Number(m[4]);
  s = m[5] ?? '';
  for (const [f, v] of Object.entries(FRACTIONS)) if (s.startsWith(f)) { q += v; s = s.slice(f.length).trim(); }
  return {quantity: q, rest: s.trim()};
}
export function parseIngredientLine(raw: string): ParsedIngredient | null {
  const line = raw.replace(/^[-•*·\s]+/, '').replace(/\s+/g, ' ').trim();
  if (!line || line.length > 200 || HEADING.test(line)) return null;
  let {quantity, rest} = parseQuantity(line);
  // Session AH (HE14, L-038): a line led by its name ("Flour, 200 g", "Milk 300 ml", "Eggs 2") keeps its amount.
  const tail = quantity === null ? /^(.*?[a-zA-Z].*?)[,:\s]+(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?\.?$/.exec(rest) : null;
  if (tail && (!tail[3] || Object.prototype.hasOwnProperty.call(UNITS, tail[3].toLowerCase()))) { quantity = Number(tail[2]!.replace(',', '.')); rest = tail[3] ? `${tail[3]} ${tail[1]}` : tail[1]!; }
  const um = /^([a-zA-Z]+)\.?\s+(?:of\s+)?(.+)$/.exec(rest);
  let unit: string | null = null, name = rest;
  if (um && Object.prototype.hasOwnProperty.call(UNITS, um[1]!.toLowerCase())) { unit = um[1]!.toLowerCase(); name = um[2]!; }
  // A trailing preparation note (", rinsed", ", finely chopped") is not part of the name; a comma inside a quantity is.
  name = name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/,\s*[^,\d]{0,40}$/, '').trim();
  if (!name) return null;
  const perUnit = unit ? UNITS[unit] : null;
  const grams = quantity !== null && unit && perUnit ? Math.round(quantity * perUnit) : null;
  return {raw, name, quantity, unit, grams};
}
const SERVINGS_LINE = /^(?:(?:serves|servings?|portions?|yield|makes|voor)\s*:?\s*\d{1,3}\s*(?:servings?|portions?|people|persons|personen|porties)?|\d{1,3}\s*(?:servings?|portions?|people|persons|personen|porties))\.?$/i;
export function parseRecipeText(text: string): ParsedRecipe {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  // The first line is the title unless it reads as an ingredient (an amount at either end, as in "Butter 50 g").
  const title = lines[0] && !HEADING.test(lines[0]) && parseIngredientLine(lines[0])?.quantity == null ? lines[0].slice(0, 100) : 'Pasted recipe';
  const servingsMatch = /(?:serves|servings?|portions?|yield)s?\s*:?\s*(\d{1,3})|(\d{1,3})\s*(?:servings?|portions?)/i.exec(text);
  const servings = servingsMatch ? Number(servingsMatch[1] ?? servingsMatch[2]) : null;
  const start = lines.findIndex(l => /^ingredients?\b/i.test(l));
  const body = start >= 0 ? lines.slice(start + 1) : lines.slice(title === 'Pasted recipe' ? 0 : 1);
  const ingredients: ParsedIngredient[] = [];
  let steps = 0, inSteps = false;
  for (const l of body) {
    if (HEADING.test(l)) { inSteps = !/^ingredients?/i.test(l); continue; }
    if (inSteps) { steps++; continue; }
    if (SERVINGS_LINE.test(l)) continue; // "Serves 4" on a line of its own is the yield, never an ingredient
    if (/^\d+\.\s/.test(l) && !/\d\s*(g|ml|kg|tbsp|tsp|cup)/i.test(l)) { steps++; continue; }
    const p = parseIngredientLine(l); if (p && (p.quantity !== null || ingredients.length < 40)) ingredients.push(p);
  }
  return {title, servings: servings && servings > 0 && servings <= 100 ? servings : null, ingredients: ingredients.slice(0, 100), steps};
}
/** The shape of a schema.org Recipe as the URL import returns it (lib/server/recipe-import.ts), parsed into the same confirmable list. */
export function fromSchemaRecipe(r: {name: string; ingredients: string[]; servings: number | null}): ParsedRecipe {
  return {title: r.name.slice(0, 100), servings: r.servings, ingredients: r.ingredients.map(parseIngredientLine).filter((x): x is ParsedIngredient => !!x).slice(0, 100), steps: 0};
}
