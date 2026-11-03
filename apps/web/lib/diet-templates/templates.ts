/**
 * Session AK (COMPETITORS.md N6, item 20): three authored 7-day meal plan templates, plain meals made only of generic
 * foods from the offline library (CIQUAL 2025, ANSES; ids checked against the shipped file in the tests). Amounts are
 * ordinary single portions in grams of the food as eaten; they are a starting point to edit, never advice, and carry no
 * calorie target. Weekdays run Monday first, like the planner.
 */
export type TemplateMeal = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
/** A food of the offline library: its source and id there. */
export type TemplateFood = {source: 'ciqual'; id: string};
export const TEMPLATE_FOODS = {
  oats: {source: 'ciqual', id: '9310'}, greekYogurt: {source: 'ciqual', id: '19860'}, quark: {source: 'ciqual', id: '19644'},
  milk: {source: 'ciqual', id: '19033'}, walnuts: {source: 'ciqual', id: '15005'}, almonds: {source: 'ciqual', id: '15000'},
  honey: {source: 'ciqual', id: '31008'}, peanutButter: {source: 'ciqual', id: '15202'},
  banana: {source: 'ciqual', id: '13005'}, apple: {source: 'ciqual', id: '13039'}, orange: {source: 'ciqual', id: '13034'},
  blueberries: {source: 'ciqual', id: '13028'}, strawberries: {source: 'ciqual', id: '13014'},
  egg: {source: 'ciqual', id: '22010'}, wholemealBread: {source: 'ciqual', id: '7110'}, ryeBread: {source: 'ciqual', id: '7106'},
  lentils: {source: 'ciqual', id: '20360'}, chickpeas: {source: 'ciqual', id: '20507'}, kidneyBeans: {source: 'ciqual', id: '20503'},
  hummus: {source: 'ciqual', id: '25621'}, feta: {source: 'ciqual', id: '12066'}, mozzarella: {source: 'ciqual', id: '19590'},
  tofu: {source: 'ciqual', id: '20904'},
  tomato: {source: 'ciqual', id: '20385'}, cannedTomato: {source: 'ciqual', id: '20048'}, cucumber: {source: 'ciqual', id: '20019'},
  pepper: {source: 'ciqual', id: '20041'}, lettuce: {source: 'ciqual', id: '20171'}, spinach: {source: 'ciqual', id: '20059'},
  broccoli: {source: 'ciqual', id: '20057'}, courgette: {source: 'ciqual', id: '20021'}, eggplant: {source: 'ciqual', id: '20002'},
  carrot: {source: 'ciqual', id: '20009'}, onion: {source: 'ciqual', id: '20034'}, mushrooms: {source: 'ciqual', id: '20056'}, peas: {source: 'ciqual', id: '20037'},
  oliveOil: {source: 'ciqual', id: '17270'},
  salmon: {source: 'ciqual', id: '26038'}, cod: {source: 'ciqual', id: '25997'}, sardines: {source: 'ciqual', id: '26040'}, tuna: {source: 'ciqual', id: '26039'},
  chicken: {source: 'ciqual', id: '36018'},
  brownRice: {source: 'ciqual', id: '9103'}, quinoa: {source: 'ciqual', id: '9341'}, bulgur: {source: 'ciqual', id: '9691'},
  pasta: {source: 'ciqual', id: '9811'}, couscous: {source: 'ciqual', id: '9685'}, potatoes: {source: 'ciqual', id: '4003'},
} as const satisfies Record<string, TemplateFood>;
export type FoodKey = keyof typeof TEMPLATE_FOODS;
export type AuthoredMeal = {name: string; items: readonly (readonly [FoodKey, number])[]};
export type DietTemplate = {
  id: 'mediterranean' | 'high-protein' | 'vegetarian'; name: string; about: string;
  breakfasts: readonly AuthoredMeal[]; lunches: readonly AuthoredMeal[]; dinners: readonly AuthoredMeal[]; snacks: readonly AuthoredMeal[];
  /** For each weekday, Monday first: the index of its breakfast, lunch, dinner and snack. */
  week: readonly (readonly [number, number, number, number])[];
};
const WEEK = [[0, 0, 0, 0], [1, 1, 1, 0], [2, 2, 2, 0], [0, 0, 3, 0], [1, 1, 0, 0], [2, 2, 1, 0], [0, 1, 3, 0]] as const;

export const DIET_TEMPLATES: readonly DietTemplate[] = [
  {
    id: 'mediterranean', name: 'Mediterranean', about: 'Vegetables, legumes, whole grains, fish twice or more and olive oil.',
    breakfasts: [
      {name: 'Greek yogurt with walnuts and honey', items: [['greekYogurt', 150], ['walnuts', 15], ['honey', 10]]},
      {name: 'Oats with milk and blueberries', items: [['oats', 40], ['milk', 200], ['blueberries', 80]]},
      {name: 'Wholemeal toast with tomato, olive oil and an egg', items: [['wholemealBread', 80], ['tomato', 100], ['oliveOil', 10], ['egg', 60]]},
    ],
    lunches: [
      {name: 'Lentil salad with feta', items: [['lentils', 150], ['tomato', 100], ['cucumber', 100], ['feta', 40], ['oliveOil', 10]]},
      {name: 'Chickpea and bulgur salad', items: [['chickpeas', 120], ['bulgur', 150], ['pepper', 80], ['oliveOil', 10]]},
      {name: 'Hummus with wholemeal bread and vegetables', items: [['hummus', 80], ['wholemealBread', 80], ['carrot', 100], ['cucumber', 100]]},
    ],
    dinners: [
      {name: 'Salmon with potatoes and broccoli', items: [['salmon', 140], ['potatoes', 200], ['broccoli', 150], ['oliveOil', 5]]},
      {name: 'Cod with couscous and courgette', items: [['cod', 150], ['couscous', 180], ['courgette', 150], ['oliveOil', 5]]},
      {name: 'Sardines with tomato, potatoes and bread', items: [['sardines', 100], ['tomato', 150], ['potatoes', 200], ['wholemealBread', 50]]},
      {name: 'Pasta with tomato and eggplant', items: [['pasta', 200], ['cannedTomato', 150], ['eggplant', 150], ['oliveOil', 10]]},
    ],
    snacks: [{name: 'An orange and almonds', items: [['orange', 150], ['almonds', 20]]}],
    week: WEEK,
  },
  {
    id: 'high-protein', name: 'High-protein', about: 'A protein food at every meal: eggs, dairy, fish, chicken, legumes and tofu.',
    breakfasts: [
      {name: 'Quark with strawberries and oats', items: [['quark', 200], ['strawberries', 100], ['oats', 30]]},
      {name: 'Boiled eggs on rye bread with spinach', items: [['egg', 120], ['ryeBread', 60], ['spinach', 40]]},
      {name: 'Greek yogurt with almonds and banana', items: [['greekYogurt', 200], ['almonds', 20], ['banana', 100]]},
    ],
    lunches: [
      {name: 'Chicken, quinoa and spinach bowl', items: [['chicken', 150], ['quinoa', 150], ['spinach', 60], ['oliveOil', 5]]},
      {name: 'Tuna and bean salad', items: [['tuna', 120], ['kidneyBeans', 120], ['lettuce', 60], ['tomato', 100], ['oliveOil', 5]]},
      {name: 'Lentils with a boiled egg, spinach and rye bread', items: [['lentils', 150], ['egg', 60], ['spinach', 60], ['ryeBread', 60]]},
    ],
    dinners: [
      {name: 'Salmon with brown rice and broccoli', items: [['salmon', 150], ['brownRice', 150], ['broccoli', 150]]},
      {name: 'Chicken with potatoes and peas', items: [['chicken', 150], ['potatoes', 200], ['peas', 100]]},
      {name: 'Cod with lentils and carrots', items: [['cod', 150], ['lentils', 150], ['carrot', 100]]},
      {name: 'Tofu with brown rice and peppers', items: [['tofu', 150], ['brownRice', 150], ['pepper', 100], ['oliveOil', 5]]},
    ],
    snacks: [{name: 'A glass of milk and a banana', items: [['milk', 250], ['banana', 120]]}],
    week: WEEK,
  },
  {
    id: 'vegetarian', name: 'Vegetarian', about: 'No meat or fish; eggs and dairy, legumes, tofu and whole grains.',
    breakfasts: [
      {name: 'Oats with milk and banana', items: [['oats', 50], ['milk', 200], ['banana', 100]]},
      {name: 'Greek yogurt with blueberries and walnuts', items: [['greekYogurt', 150], ['blueberries', 80], ['walnuts', 15]]},
      {name: 'Eggs and spinach on wholemeal toast', items: [['egg', 120], ['spinach', 60], ['wholemealBread', 60]]},
    ],
    lunches: [
      {name: 'Chickpea salad with feta', items: [['chickpeas', 150], ['cucumber', 100], ['tomato', 100], ['feta', 30], ['oliveOil', 10]]},
      {name: 'Hummus, pepper and wholemeal bread', items: [['hummus', 60], ['pepper', 100], ['wholemealBread', 70]]},
      {name: 'Quinoa with courgette and pepper', items: [['quinoa', 180], ['courgette', 100], ['pepper', 100], ['oliveOil', 10]]},
    ],
    dinners: [
      {name: 'Lentil and tomato stew with brown rice', items: [['lentils', 180], ['cannedTomato', 150], ['onion', 50], ['brownRice', 150]]},
      {name: 'Tofu with broccoli and brown rice', items: [['tofu', 150], ['broccoli', 150], ['brownRice', 150]]},
      {name: 'Bean chili with potatoes', items: [['kidneyBeans', 150], ['cannedTomato', 150], ['onion', 50], ['pepper', 80], ['potatoes', 200]]},
      {name: 'Pasta with mushrooms and mozzarella', items: [['pasta', 200], ['mushrooms', 100], ['cannedTomato', 100], ['mozzarella', 50]]},
    ],
    snacks: [{name: 'An apple and peanut butter', items: [['apple', 150], ['peanutButter', 20]]}],
    week: WEEK,
  },
];
