/**
 * Session AL Part 14 (lane P14-B): the mock eval cases for the answers this lane added, decided on the device with no
 * model, against the Showcase fixtures (`g6-p14b.test.ts`, 100 % held on every build). G15: a broken streak said kindly from
 * the habit engine's own figures. HE17: a meal photo asked of the device gets the card that opens Health's photo tools,
 * never a food named "Log a photo of my". The same asks go to the owner's real-model round (REAL_MODEL_TODO.md, "Session
 * AL Part 14") for the model's own wording.
 */
export type P14bExpect = {notMealPhoto: true} | {answer: true; mustContain?: string[]; mustNot?: string[]; noCard?: boolean} | {card: string; fields?: Record<string, unknown>; mustContain?: string[]};
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
];
