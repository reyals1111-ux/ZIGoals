import type {FoodKey} from '../diet-templates/templates';

/**
 * Session AV lane 2 (food, LEDGER #91; MyFitnessPal's Plan tab recipes, Yazio's recipes): a small built-in recipe
 * collection, written in the repository in English and Dutch, made only of generic foods of the offline library (the
 * diet templates' foods, lib/diet-templates/templates.ts TEMPLATE_FOODS, whose ids are checked against the shipped file).
 * Amounts are the whole recipe in grams of the food as eaten; nutrition comes from the library when it loads, never
 * typed here. Plain home cooking, a starting point to change, never advice. `styles` are what the recipe is by its
 * foods (vegetarian, vegan, Mediterranean); high protein and low carb are worked out from its nutrition
 * (lib/food-plus/recipe-book-apply.ts), never claimed by hand.
 */
export type BookStyle = 'vegetarian' | 'vegan' | 'mediterranean';
export type BookRecipe = {
  id: string; en: string; nl: string; servings: number; minutes: number; styles: readonly BookStyle[];
  items: readonly (readonly [FoodKey, number])[];
  steps: {en: readonly string[]; nl: readonly string[]};
};
const r = (recipe: BookRecipe) => recipe;
export const RECIPE_BOOK: readonly BookRecipe[] = [
  r({id: 'overnight-oats', en: 'Overnight oats with blueberries', nl: 'Overnight oats met blauwe bessen', servings: 2, minutes: 5, styles: ['vegetarian', 'mediterranean'],
    items: [['oats', 100], ['milk', 300], ['blueberries', 150], ['honey', 20]],
    steps: {en: ['Stir the oats into the milk in a bowl or two jars.', 'Cover and leave in the fridge overnight, or at least four hours.', 'Top with the blueberries and a little honey before eating.'],
      nl: ['Roer de havermout door de melk in een kom of twee potten.', 'Dek af en zet een nacht in de koelkast, of minstens vier uur.', 'Leg er voor het eten de blauwe bessen en wat honing op.']}}),
  r({id: 'yogurt-walnuts', en: 'Greek yogurt with strawberries and walnuts', nl: 'Griekse yoghurt met aardbeien en walnoten', servings: 1, minutes: 5, styles: ['vegetarian', 'mediterranean'],
    items: [['greekYogurt', 200], ['strawberries', 100], ['walnuts', 20], ['honey', 10]],
    steps: {en: ['Spoon the yogurt into a bowl.', 'Slice the strawberries and break the walnuts over the top.', 'Finish with a thread of honey.'],
      nl: ['Schep de yoghurt in een kom.', 'Snijd de aardbeien en breek de walnoten erover.', 'Maak af met een straaltje honing.']}}),
  r({id: 'spinach-omelette', en: 'Spinach and feta omelette', nl: 'Omelet met spinazie en feta', servings: 1, minutes: 10, styles: ['vegetarian', 'mediterranean'],
    items: [['egg', 150], ['spinach', 60], ['feta', 30], ['oliveOil', 5]],
    steps: {en: ['Beat the eggs with a pinch of pepper.', 'Warm the oil in a small pan and wilt the spinach for a minute.', 'Pour in the eggs and cook gently until nearly set.', 'Crumble the feta over one half, fold and serve.'],
      nl: ['Klop de eieren los met een snuf peper.', 'Verwarm de olie in een kleine pan en laat de spinazie een minuut slinken.', 'Giet de eieren erbij en bak zachtjes tot ze bijna gestold zijn.', 'Verkruimel de feta over één helft, vouw dicht en serveer.']}}),
  r({id: 'mushroom-eggs', en: 'Scrambled eggs with mushrooms and spinach', nl: 'Roerei met champignons en spinazie', servings: 1, minutes: 10, styles: ['vegetarian'],
    items: [['egg', 150], ['mushrooms', 100], ['spinach', 50], ['oliveOil', 5]],
    steps: {en: ['Slice the mushrooms and fry them in the oil until golden.', 'Add the spinach and let it wilt.', 'Pour in the beaten eggs and stir slowly over a low heat until just set.'],
      nl: ['Snijd de champignons en bak ze in de olie goudbruin.', 'Voeg de spinazie toe en laat slinken.', 'Giet de losgeklopte eieren erbij en roer langzaam op laag vuur tot ze net gestold zijn.']}}),
  r({id: 'lentil-soup', en: 'Lentil and tomato soup', nl: 'Linzen-tomatensoep', servings: 4, minutes: 35, styles: ['vegetarian', 'vegan', 'mediterranean'],
    items: [['lentils', 400], ['cannedTomato', 400], ['onion', 150], ['carrot', 150], ['oliveOil', 20]],
    steps: {en: ['Chop the onion and carrot and soften them in the oil for five minutes.', 'Add the tomatoes and about 800 ml of water and bring to the boil.', 'Add the cooked lentils and simmer for fifteen minutes.', 'Blend half of the soup for a thicker bowl, season and serve.'],
      nl: ['Snipper de ui, snijd de wortel en fruit ze vijf minuten in de olie.', 'Voeg de tomaten en ongeveer 800 ml water toe en breng aan de kook.', 'Doe de gekookte linzen erbij en laat vijftien minuten zachtjes koken.', 'Pureer de helft van de soep voor een dikkere soep, breng op smaak en serveer.']}}),
  r({id: 'chickpea-salad', en: 'Chickpea salad with feta', nl: 'Kikkererwtensalade met feta', servings: 2, minutes: 15, styles: ['vegetarian', 'mediterranean'],
    items: [['chickpeas', 300], ['cucumber', 150], ['tomato', 200], ['pepper', 100], ['feta', 60], ['oliveOil', 15]],
    steps: {en: ['Rinse and drain the chickpeas.', 'Dice the cucumber, tomato and pepper.', 'Toss everything with the oil, crumble the feta over and season.'],
      nl: ['Spoel de kikkererwten af en laat uitlekken.', 'Snijd de komkommer, tomaat en paprika in blokjes.', 'Hussel alles met de olie, verkruimel de feta erover en breng op smaak.']}}),
  r({id: 'three-bean-chilli', en: 'Bean chilli', nl: 'Bonenchili', servings: 4, minutes: 40, styles: ['vegetarian', 'vegan'],
    items: [['kidneyBeans', 400], ['chickpeas', 200], ['cannedTomato', 400], ['onion', 150], ['pepper', 200], ['oliveOil', 15]],
    steps: {en: ['Chop the onion and pepper and soften them in the oil.', 'Add a teaspoon each of cumin and paprika if you like, and stir for a minute.', 'Add the tomatoes, beans and chickpeas and simmer for twenty-five minutes.', 'Season and serve on its own or with rice.'],
      nl: ['Snipper de ui, snijd de paprika en fruit ze in de olie.', 'Voeg naar smaak een theelepel komijn en paprikapoeder toe en roer een minuut.', 'Doe de tomaten, bonen en kikkererwten erbij en laat vijfentwintig minuten pruttelen.', 'Breng op smaak en serveer los of met rijst.']}}),
  r({id: 'tofu-stir-fry', en: 'Tofu and vegetable stir-fry with brown rice', nl: 'Roerbak van tofu en groente met zilvervliesrijst', servings: 2, minutes: 25, styles: ['vegetarian', 'vegan'],
    items: [['tofu', 300], ['broccoli', 200], ['pepper', 150], ['carrot', 100], ['brownRice', 300], ['oliveOil', 15]],
    steps: {en: ['Press the tofu dry and cut it into cubes.', 'Fry the tofu in the oil until golden on all sides, then set it aside.', 'Stir-fry the broccoli, pepper and carrot for five minutes.', 'Return the tofu, add a splash of soy sauce if you like, and serve on the cooked rice.'],
      nl: ['Dep de tofu droog en snijd in blokjes.', 'Bak de tofu in de olie rondom goudbruin en zet apart.', 'Roerbak de broccoli, paprika en wortel vijf minuten.', 'Doe de tofu terug, naar smaak een scheut sojasaus, en serveer op de gekookte rijst.']}}),
  r({id: 'salmon-potatoes', en: 'Salmon with potatoes and broccoli', nl: 'Zalm met aardappelen en broccoli', servings: 2, minutes: 30, styles: ['mediterranean'],
    items: [['salmon', 260], ['potatoes', 400], ['broccoli', 300], ['oliveOil', 10]],
    steps: {en: ['Boil the potatoes until tender, about twenty minutes.', 'Steam the broccoli for the last five minutes.', 'Brush the salmon with the oil and pan-fry it for about four minutes a side.', 'Serve together with a squeeze of lemon.'],
      nl: ['Kook de aardappelen gaar, ongeveer twintig minuten.', 'Stoom de broccoli de laatste vijf minuten mee.', 'Bestrijk de zalm met de olie en bak hem ongeveer vier minuten per kant.', 'Serveer samen met een kneepje citroen.']}}),
  r({id: 'chicken-quinoa', en: 'Chicken and quinoa bowl', nl: 'Bowl met kip en quinoa', servings: 2, minutes: 25, styles: [],
    items: [['chicken', 250], ['quinoa', 300], ['courgette', 200], ['pepper', 150], ['oliveOil', 15]],
    steps: {en: ['Slice the chicken and fry it in half of the oil until cooked through.', 'Fry the courgette and pepper in the rest of the oil.', 'Divide the cooked quinoa over two bowls and top with the chicken and vegetables.'],
      nl: ['Snijd de kip in reepjes en bak gaar in de helft van de olie.', 'Bak de courgette en paprika in de rest van de olie.', 'Verdeel de gekookte quinoa over twee kommen en leg de kip en groente erop.']}}),
  r({id: 'chicken-vegetables', en: 'Chicken with roasted vegetables', nl: 'Kip met geroosterde groente', servings: 2, minutes: 40, styles: ['mediterranean'],
    items: [['chicken', 300], ['eggplant', 200], ['courgette', 200], ['pepper', 150], ['oliveOil', 15]],
    steps: {en: ['Heat the oven to 200 °C.', 'Cut the vegetables into chunks, toss with the oil and roast for twenty minutes.', 'Add the chicken pieces and roast for another fifteen to twenty minutes, until cooked through.'],
      nl: ['Verwarm de oven voor op 200 °C.', 'Snijd de groente in stukken, hussel met de olie en rooster twintig minuten.', 'Leg de stukken kip erbij en rooster nog vijftien tot twintig minuten, tot ze gaar zijn.']}}),
  r({id: 'tuna-pasta', en: 'Tuna and tomato pasta', nl: 'Pasta met tonijn en tomaat', servings: 2, minutes: 20, styles: ['mediterranean'],
    items: [['pasta', 300], ['tuna', 150], ['cannedTomato', 300], ['onion', 80], ['oliveOil', 10]],
    steps: {en: ['Cook the pasta.', 'Meanwhile soften the chopped onion in the oil and add the tomatoes; simmer ten minutes.', 'Flake in the tuna and warm through.', 'Toss with the drained pasta.'],
      nl: ['Kook de pasta.', 'Fruit intussen de gesnipperde ui in de olie en voeg de tomaten toe; laat tien minuten pruttelen.', 'Verdeel de tonijn erdoor en warm mee.', 'Meng met de uitgelekte pasta.']}}),
  r({id: 'cod-peas', en: 'Cod with peas and couscous', nl: 'Kabeljauw met doperwten en couscous', servings: 2, minutes: 20, styles: ['mediterranean'],
    items: [['cod', 300], ['peas', 200], ['couscous', 300], ['oliveOil', 10]],
    steps: {en: ['Prepare the couscous with boiling water as the packet says.', 'Cook the peas for three minutes.', 'Pan-fry the cod in the oil for three to four minutes a side.', 'Serve the fish on the couscous with the peas.'],
      nl: ['Bereid de couscous met kokend water volgens de verpakking.', 'Kook de doperwten drie minuten.', 'Bak de kabeljauw in de olie drie à vier minuten per kant.', 'Serveer de vis op de couscous met de doperwten.']}}),
  r({id: 'sardine-toast', en: 'Sardines on wholemeal toast', nl: 'Sardientjes op volkorentoast', servings: 1, minutes: 10, styles: ['mediterranean'],
    items: [['sardines', 90], ['wholemealBread', 70], ['tomato', 100], ['lettuce', 30]],
    steps: {en: ['Toast the bread.', 'Lay the lettuce and sliced tomato on the toast.', 'Top with the sardines and a twist of pepper.'],
      nl: ['Rooster het brood.', 'Leg de sla en plakjes tomaat op de toast.', 'Leg de sardientjes erop en wat versgemalen peper.']}}),
  r({id: 'salmon-salad', en: 'Salmon salad', nl: 'Salade met zalm', servings: 1, minutes: 15, styles: ['mediterranean'],
    items: [['salmon', 130], ['lettuce', 80], ['cucumber', 100], ['tomato', 100], ['oliveOil', 10]],
    steps: {en: ['Pan-fry the salmon for about four minutes a side and let it cool a little.', 'Arrange the lettuce, cucumber and tomato on a plate.', 'Flake the salmon over and drizzle with the oil.'],
      nl: ['Bak de zalm ongeveer vier minuten per kant en laat iets afkoelen.', 'Leg de sla, komkommer en tomaat op een bord.', 'Verdeel de zalm in stukjes erover en besprenkel met de olie.']}}),
  r({id: 'bulgur-salad', en: 'Bulgur salad with feta', nl: 'Bulgursalade met feta', servings: 2, minutes: 20, styles: ['vegetarian', 'mediterranean'],
    items: [['bulgur', 300], ['cucumber', 150], ['tomato', 150], ['onion', 50], ['feta', 80], ['oliveOil', 15]],
    steps: {en: ['Cook the bulgur and let it cool.', 'Dice the cucumber and tomato and chop the onion finely.', 'Mix everything with the oil and crumble the feta over.'],
      nl: ['Kook de bulgur en laat afkoelen.', 'Snijd de komkommer en tomaat in blokjes en snipper de ui fijn.', 'Meng alles met de olie en verkruimel de feta erover.']}}),
  r({id: 'mozzarella-toast', en: 'Rye toast with mozzarella and tomato', nl: 'Roggetoast met mozzarella en tomaat', servings: 1, minutes: 10, styles: ['vegetarian', 'mediterranean'],
    items: [['ryeBread', 70], ['mozzarella', 60], ['tomato', 150], ['oliveOil', 5]],
    steps: {en: ['Toast the bread.', 'Top with slices of tomato and mozzarella.', 'Drizzle with the oil and add basil if you have it.'],
      nl: ['Rooster het brood.', 'Beleg met plakjes tomaat en mozzarella.', 'Besprenkel met de olie en voeg basilicum toe als je dat hebt.']}}),
  r({id: 'hummus-plate', en: 'Hummus plate with vegetables', nl: 'Bord met hummus en groente', servings: 1, minutes: 5, styles: ['vegetarian', 'vegan', 'mediterranean'],
    items: [['hummus', 100], ['wholemealBread', 60], ['cucumber', 100], ['carrot', 100]],
    steps: {en: ['Cut the cucumber and carrot into sticks.', 'Serve with the hummus and the bread.'],
      nl: ['Snijd de komkommer en wortel in staafjes.', 'Serveer met de hummus en het brood.']}}),
  r({id: 'quark-banana', en: 'Quark with banana and peanut butter', nl: 'Kwark met banaan en pindakaas', servings: 1, minutes: 5, styles: ['vegetarian'],
    items: [['quark', 250], ['banana', 120], ['peanutButter', 15]],
    steps: {en: ['Spoon the quark into a bowl.', 'Slice the banana over it.', 'Add the peanut butter on top.'],
      nl: ['Schep de kwark in een kom.', 'Snijd de banaan erover.', 'Leg de pindakaas erop.']}}),
  r({id: 'apple-almonds', en: 'Apple with almonds', nl: 'Appel met amandelen', servings: 1, minutes: 2, styles: ['vegetarian', 'vegan'],
    items: [['apple', 150], ['almonds', 25]],
    steps: {en: ['Slice the apple.', 'Eat with the almonds.'], nl: ['Snijd de appel in partjes.', 'Eet met de amandelen.']}}),
];
export const BOOK_STYLES: readonly {id: BookStyle | 'high-protein' | 'low-carb'; en: string; nl: string}[] = [
  {id: 'vegetarian', en: 'Vegetarian', nl: 'Vegetarisch'}, {id: 'vegan', en: 'Vegan', nl: 'Veganistisch'}, {id: 'mediterranean', en: 'Mediterranean', nl: 'Mediterraan'},
  {id: 'high-protein', en: 'High protein', nl: 'Eiwitrijk'}, {id: 'low-carb', en: 'Low carb', nl: 'Koolhydraatarm'},
];
