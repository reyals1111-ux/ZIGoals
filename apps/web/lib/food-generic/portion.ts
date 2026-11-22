/**
 * Session AV (q3 #28; Cronometer's Oracle ranks foods people eat): which library foods are not eaten as a food at all
 * (dried herbs and spices, seaweed and algae powders, baking agents, chewing gum, tea leaves), and a rough usual portion
 * in grams for the rest, from the food's own name ("Almonds" 30 g, "Milk" 250 g, "Lentils, boiled" 150 g; 100 g when
 * nothing fits). Household amounts, not advice. Pure; names are the library's English names.
 */
const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
const NOT_A_FOOD = new RegExp([
  // seaweed and algae
  'seaweed', 'kelp', 'kombu', 'wakame', '\\bnori\\b', 'dulse', '\\blaver\\b', 'wrack', 'rockweed', 'gut weed', 'sea lettuce', 'sea thong', 'sea belt', '\\btangle\\b', 'gracilaria', 'lithothamn', 'chlorella', 'spirulina', 'carrag', '\\bagar\\b',
  // dried herbs and spices
  '\\bthyme\\b', '\\bbasil\\b', '\\bmint, dried', 'marjoram', 'oregano', '\\bsavory\\b', '\\bdill\\b', 'parsley, dried', 'tarragon', '\\bsage\\b', 'rosemary', 'chervil', '\\bbay\\b', 'chive, dried', 'herbes', 'mixed herbs', 'coriander (leaves, dried|seed)', 'molokhia',
  '\\bcumin\\b', 'turmeric', '\\bcurry (powder|spices)|curry, powder|mixed curry', 'cinnamon', 'paprika', 'pepper, (black|white|cayenne)', 'chilli powder', 'nutmeg', 'ginger, ground', 'garam masala', '5 spice', 'five spice', 'cardamom', '\\bcloves?\\b', '\\banise\\b', 'saffron', 'fenugreek', 'caraway', '(celery|fennel|dill|mustard|coriander) seeds?', 'liquorice powder', 'vanilla',
  // dried vegetables nobody eats as such, powders, agents and other non-foods
  '(spinach|courgette|green beans|onions?|carrot|mushrooms?|celery)\\b.*\\b(dried|dehydrated)', '(shrimps?|prawns?|fish), dried', '\\bmilk\\b.*\\bdried\\b', 'dried or dehydrated', '\\bdehydrated\\b', 'as purchased', 'concentrate', 'undiluted', '\\b(baby|infant|premature)\\b', 'bicarbonate', 'spice\\b', 'aspic', 'asafoetida', 'curry leaves', 'stuffing mix', '\\bgravy\\b', '\\bstock\\b', '\\bextract\\b', 'soup\\b.*\\bdried', 'sweetener', '\\bpowder\\b', 'powdered', 'baking', 'raising agent', 'cream of tartar', 'chewing gum', 'tea leaf', 'coffee, ground', '^blood\\b', '\\byeast\\b', '\\bgelatine?\\b', '\\bsalt\\b', 'stock cube', 'bouillon',
].join('|'));
export function notEatenAsFood(name: string): boolean { return NOT_A_FOOD.test(fold(name)); }
const PORTIONS: [RegExp, number][] = [
  // the solid foods whose names also hold a drink's word ("cheese, from cow's milk", "milk chocolate", "cereal bar with milk") first
  [/\b(cheese|cheddar|parmesan|pecorino|gouda|edam|emmental|brie|camembert|feta|mozzarella|mascarpone|roquefort|burrata|ricotta|halloumi|paneer)\b/, 30],
  [/\b(sugar|fructose|glucose|dextrose)\b/, 5],
  [/\bcondensed milk|milk, condensed/, 30],
  [/\bcream\b/, 15],
  [/\b(chocolate|crisps|chips)\b/, 25],
  [/\b(cereal bar|breakfast cereals?|muesli|granola|cornflakes|porridge oats|oat flakes)\b/, 40],
  [/\b(biscuits?|cookies?|crackers?|crispbread)\b/, 20],
  [/\b(oil|butter|butteroil|margarine|ghee|lard|dripping|suet|fat)\b/, 10],
  [/\b(jam|honey|syrup|treacle|molasses|marmalade|ketchup|mayonnaise|sauce|dressing|pesto|mustard|vinegar)\b/, 15],
  [/\b(yeast extract|marmite)\b/, 5],
  [/\b(bran|wheatgerm|wheat germ)\b/, 10],
  [/\b(almonds?|walnuts?|hazelnuts?|peanuts?|cashews?|pistachios?|pecans?|brazil nuts?|macadamias?|nuts?|seeds?|tahini|peanut butter)\b/, 30],
  [/\b(apricots?|figs?|dates?|prunes?|raisins?|sultanas?|currants?|cranberries|banana|bananas|mango|coconut|tomato|tomatoes)\b.*\bdried\b|\b(raisins?|sultanas?|prunes?)\b/, 30],
  [/\byogh?urt\b/, 125],
  [/\b(milk|juice|drink|smoothie|soup|kefir|buttermilk|lassi|cola|lemonade|beer|tea|coffee)\b/, 250],
  [/\bflour\b/, 30],
  [/\b(bread|toast|roll|bagel|pitta|pita)\b/, 50],
  [/\begg\b|\beggs\b/, 50],
  [/\b(liver|kidney|heart|black pudding)\b/, 100],
  [/\b(beef|pork|lamb|veal|chicken|turkey|duck|fish|salmon|tuna|cod|mackerel|sardines?|herring|trout|mussels?|prawns?|shrimps?|oysters?|clams?|cockles?|crab|steak|mince|sausages?|ham)\b/, 120],
  [/\b(lentils?|beans?|chickpeas?|peas)\b.*\b(boiled|cooked|canned|tinned)\b/, 150],
  [/\b(lentils?|beans?|chickpeas?|split peas?)\b.*\b(dried|raw)\b|\bsplit peas?\b/, 60],
  [/\b(rice|pasta|spaghetti|macaroni|noodles|couscous|quinoa|bulgur)\b.*\b(boiled|cooked)\b/, 180],
  [/\b(rice|pasta|spaghetti|macaroni|noodles|couscous|quinoa|bulgur|frik|freekeh)\b/, 75],
  [/\b(potato|potatoes|sweet potato)\b/, 150],
  [/\b(spinach|kale|broccoli|cabbage|lettuce|carrots?|tomato|tomatoes|peppers?|courgette|onions?|leeks?|mushrooms?|beetroot|cauliflower|green beans|sprouts|asparagus|cucumber|celery|watercress|rocket|chard)\b/, 80],
  [/\b(apple|banana|orange|pear|peach|plum|kiwi|mango|grapes|melon|pineapple|berries|strawberries|raspberries|blueberries|cherries|apricot|avocado)\b/, 120],
];
export function usualPortionGrams(name: string): number {
  const n = fold(name);
  return PORTIONS.find(([re]) => re.test(n))?.[1] ?? 100;
}
