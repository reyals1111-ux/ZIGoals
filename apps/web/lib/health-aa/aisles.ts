import * as z from 'zod';
import {AISLES_KEY} from '../aa-device-keys';
import type {DeviceRecordSpec} from '../device-record';

/** N5: grocery aisles. A keyword default per ingredient name, overridden by the person's own choice (device-only). */
export const AISLES = ['Produce', 'Dairy & eggs', 'Meat & fish', 'Bakery', 'Pantry', 'Frozen', 'Drinks', 'Other'] as const;
export type Aisle = (typeof AISLES)[number];
const KEYWORDS: [Aisle, RegExp][] = [
  ['Produce', /\b(apple|banana|berr|tomato|onion|garlic|lemon|lime|lettuce|spinach|kale|carrot|potato|pepper|cucumber|avocado|broccoli|herb|basil|parsley|cilantro|coriander|ginger|mushroom|courgette|zucchini|aubergine|eggplant|salad|greens|fruit|orange|pear|grape|mango|celery|leek|cabbage|squash|pumpkin|beet)/i],
  ['Dairy & eggs', /\b(milk|cheese|yogurt|yoghurt|butter|cream|egg|kefir|mozzarella|parmesan|feta|ricotta)/i],
  ['Meat & fish', /\b(chicken|beef|pork|lamb|turkey|salmon|tuna|cod|shrimp|prawn|fish|steak|mince|sausage|bacon|ham|tofu|tempeh)/i],
  ['Bakery', /\b(bread|bun|roll|bagel|tortilla|wrap|pita|naan|croissant|baguette)/i],
  ['Frozen', /\b(frozen|ice cream|peas)/i],
  ['Drinks', /\b(water|juice|coffee|tea|wine|beer|soda|kombucha)/i],
  ['Pantry', /\b(rice|pasta|oat|flour|sugar|salt|oil|vinegar|bean|lentil|chickpea|quinoa|nut|almond|seed|spice|cumin|paprika|honey|syrup|sauce|stock|broth|can|tin|noodle|cereal|chocolate|cocoa|coconut|peanut|tahini|soy|miso)/i],
];
export function defaultAisle(name: string): Aisle { for (const [aisle, re] of KEYWORDS) if (re.test(name)) return aisle; return 'Other'; }
export const aislesSchema = z.looseObject({version: z.literal(1), overrides: z.record(z.string().min(1).max(120), z.enum(AISLES)).optional()});
export type Aisles = z.infer<typeof aislesSchema>;
export const emptyAisles = (): Aisles => ({version: 1});
export const AISLES_RECORD: DeviceRecordSpec<Aisles> = {key: AISLES_KEY, schema: aislesSchema, empty: emptyAisles};
const norm = (name: string) => name.trim().toLowerCase().slice(0, 120);
export const aisleOf = (r: Aisles, name: string): Aisle => r.overrides?.[norm(name)] ?? defaultAisle(name);
export const setAisle = (r: Aisles, name: string, aisle: Aisle | null): Aisles => { const overrides = {...(r.overrides ?? {})}; if (aisle) overrides[norm(name)] = aisle; else delete overrides[norm(name)]; return aislesSchema.parse({...r, overrides: Object.keys(overrides).length ? overrides : undefined}); };
export function groupByAisle<T extends {name: string}>(rows: readonly T[], r: Aisles): {aisle: Aisle; rows: T[]}[] {
  const groups = new Map<Aisle, T[]>();
  for (const row of rows) { const a = aisleOf(r, row.name); groups.set(a, [...(groups.get(a) ?? []), row]); }
  return AISLES.filter(a => groups.has(a)).map(aisle => ({aisle, rows: groups.get(aisle)!}));
}
