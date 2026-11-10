/**
 * Session AL Part 14 (lane P14-B): the mock eval cases for the answers this lane added, decided on the device with no
 * model, against the Showcase fixtures (`g6-p14b.test.ts`, 100 % held on every build). G15: a broken streak said kindly from
 * the habit engine's own figures. HE17: a meal photo asked of the device gets the card that opens Health's photo tools,
 * never a food named "Log a photo of my". The same asks go to the owner's real-model round (REAL_MODEL_TODO.md, "Session
 * AL Part 14") for the model's own wording.
 */
export type P14bExpect = {notMealPhoto: true} | {notCard: string} | {answer: true; mustContain?: string[]; mustNot?: string[]; noCard?: boolean} | {card: string; fields?: Record<string, unknown>; mustContain?: string[]; mustNot?: string[]};
export type P14bCase = {id: string; row: string; ask: string; expect: P14bExpect};
const c = (id: string, row: string, ask: string, expect: P14bExpect): P14bCase => ({id: `p14b-${id}`, row, ask, expect});
const NOT_LIST = 'Until you give me a brain';
export const G6_P14B: P14bCase[] = [
  c('streak-broke', 'G15', 'I broke my streak', {answer: true, mustNot: [NOT_LIST, 'fail', 'should'], noCard: true}),
  c('streak-lost', 'G15', 'I missed my habit yesterday and lost my streak', {answer: true, mustNot: [NOT_LIST], noCard: true}),
  c('streak-named-running', 'G15', 'My Read streak broke', {answer: true, mustContain: ['Read streak is still going', 'never breaks it'], noCard: true}),
  c('streak-nl', 'G15', 'Mijn reeks is kwijt', {answer: true, mustNot: [NOT_LIST], noCard: true}),
  c('photo-lunch', 'HE17', 'Log a photo of my lunch', {card: 'scan-food', fields: {mode: 'meal-photo'}, mustContain: ['range', 'saving the middle']}),
  c('photo-estimate', 'HE17', 'Estimate the calories in my meal from a photo', {card: 'scan-food', fields: {mode: 'meal-photo'}}),
  c('photo-nl', 'HE17', 'Schat mijn maaltijd van een foto', {card: 'scan-food', fields: {mode: 'meal-photo'}}),
  c('label-not-meal', 'HE17', 'Read the food label from a photo', {notMealPhoto: true}),
  // Session AL third pass (lane L7): the open findings this lane left for L7 (P14-B.md, "Seen while probing").
  // The week: the weekly review's own figures, the Life review's card; never the examples list.
  c('week-how', 'P14-B week', 'How was my week?', {card: 'open-review', fields: {period: 'week'}, mustContain: ['Your week,', 'check-ins', 'Busiest day'], mustNot: [NOT_LIST, 'should', 'only']}),
  c('week-recap', 'P14-B week', 'weekly recap', {card: 'open-review', fields: {period: 'week'}, mustContain: ['Habits:', 'Goals:'], mustNot: [NOT_LIST]}),
  c('week-summarize', 'P14-B week', 'Summarize my week', {card: 'open-review', mustContain: ['Your week,'], mustNot: ['needs your own AI']}),
  c('week-review-not-task', 'P14-B week', 'review my week', {card: 'open-review', mustNot: ['A task for your list']}),
  c('week-nl', 'P14-B week', 'Hoe was mijn week?', {card: 'open-review', fields: {period: 'week'}, mustContain: ['Je week,', 'Gewoontes:', 'dagen met maaltijden'], mustNot: ['Tot je me een brein geeft']}),
  c('week-agenda-kept', 'P14-B week', 'What does my week look like?', {answer: true, mustContain: ['agenda'], mustNot: ['Your week,']}),
  // A food's calories: the food library and search filled in, never today's total.
  c('food-pasta', 'P14-B food', 'How many calories in my plate of pasta?', {card: 'open-search', fields: {query: 'pasta'}, mustContain: ['not about today', 'food library'], mustNot: ['Energy today', 'kcal from']}),
  c('food-pasta-plain', 'P14-B food', 'how many calories are in pasta', {card: 'open-search', fields: {query: 'pasta'}, mustNot: ['Energy today']}),
  c('food-banana', 'P14-B food', 'How many kcal in a banana?', {card: 'open-search', fields: {query: 'banana'}, mustNot: ['Energy today']}),
  c('food-library-hit', 'P14-B food', 'calories in 200g rice', {card: 'open-search', fields: {query: 'rice'}, mustContain: ['per serving', 'Salmon, rice and greens', '690 kcal'], mustNot: ['Energy today']}),
  c('food-nl', 'P14-B food', 'Hoeveel calorieën zitten er in een bord pasta?', {card: 'open-search', fields: {query: 'pasta'}, mustContain: ['voedingsmiddel', 'niet over je totaal'], mustNot: ['log-food']}),
  c('food-today-kept', 'P14-B food', 'How many calories did I eat today?', {answer: true, mustContain: ['kcal'], mustNot: ['food library'], noCard: true}),
  c('food-lunch-not-a-food', 'P14-B food', 'calories in my lunch', {notCard: 'log-food'}),
  // The Checklist's own edits (LA-008, P-LA-11), and a habit's rename as its edit card.
  c('rename-habit', 'P-LA-11', 'Rename Drink water to Hydrate', {card: 'edit-habit', fields: {habit: 'Drink water', title: 'Hydrate'}}),
  c('move-planet', 'P-LA-11', 'Move Stretch to the morning', {card: 'open-page', fields: {page: 'checklist'}, mustContain: ['Move to another orbit'], mustNot: ['A task for your list']}),
  c('remove-planet', 'P-LA-11', 'Remove Floss from my checklist', {card: 'open-page', fields: {page: 'checklist'}, mustContain: ['Take off the path']}),
  c('rename-unknown', 'P-LA-11', 'Rename Stretch 5 min to Stretch 10 min', {answer: true, mustContain: ['Nothing called “Stretch 5 min”'], mustNot: [NOT_LIST], noCard: true}),
  c('task-move-kept', 'P-LA-11', 'Move Call the dentist to tomorrow', {card: 'move-task'}),
  // A check-off of something that is not there offers to add it (P-LA-10, LA-039); a real one still ticks.
  c('tick-unknown', 'P-LA-10', 'mark push-ups done', {card: 'checklist-add-custom', fields: {text: 'Push-ups'}, mustContain: ['Nothing called “Push-ups”', 'Add it to your Checklist?']}),
  c('tick-unknown-nl', 'P-LA-10', 'vink jongleren af', {card: 'checklist-add-custom', fields: {text: 'Jongleren'}, mustContain: ['Op je Checklist zetten?']}),
  c('tick-known-kept', 'P-LA-10', 'mark read done', {card: 'checklist-tick', fields: {item: 'Read'}}),
];
