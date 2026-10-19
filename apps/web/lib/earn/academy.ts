import type {PathModel, PathStep} from '../path/model';
import {ACADEMY_LESSON_IDS, ACADEMY_LESSON_XP, type AcademyLessonId} from './academy-ids';
import {lessonScore, type EarnAcademy} from './records';
import {DECOY_ZIG_DENOM} from './options';

/**
 * Session AF chunk 2 (P1.27, H43): the Earn Academy, eight short lessons in plain words, each with a 3-question quiz, as a
 * mini path on the shared engine. Progress lives on this device in `zigoals:earn-academy:v1` (read, score, passedAt); a
 * lesson is passed with all three answers right, and a pass earns XP once, only while the game layer is on (derived in
 * lib/game/xp.ts, never stored). Lessons explain; they never recommend an option, and they name no rate as a promise.
 * The custody lesson uses Zignaly's closure as its example, neutrally, with its dates and source (amendment 10).
 */
export {ACADEMY_LESSON_IDS, ACADEMY_LESSON_XP, type AcademyLessonId};
export type Question = {q: string; options: readonly [string, string, string]; answer: 0 | 1 | 2; why: string};
export type Lesson = {id: AcademyLessonId; title: string; short: string; minutes: number; glyph: string; colour: PathStep['colour']; body: readonly string[]; quiz: readonly [Question, Question, Question]};

export const ACADEMY_LESSONS: readonly Lesson[] = Object.freeze([
  {id: 'staking', title: 'Staking, in plain words', short: 'Who runs the network', minutes: 5, glyph: 'sparkle', colour: 'gold', body: [
    'ZIGChain is run by validators: computers that check and add every block. The network chooses who runs it by counting how much ZIG stands behind each validator.',
    'When you stake (delegate), you put your ZIG behind a validator. It stays yours, in your own account: the validator cannot spend it, and only your signature can move it.',
    'In return the network pays new ZIG to staked ZIG with every block. The validator keeps a share of your rewards, its commission, and you get the rest.',
    'If a validator misbehaves — signs two different blocks, or is offline for too long — the network takes a small part of the stake behind it. That is slashing, and it is why a reliable validator matters.',
  ], quiz: [
    {q: 'When you stake ZIG with a validator, who can spend it?', options: ['The validator', 'Only you', 'ZIGoals'], answer: 1, why: 'Staked ZIG stays in your own account; only your signature can move it.'},
    {q: 'What is a validator’s commission?', options: ['A share of your rewards the validator keeps', 'A fee ZIGoals charges', 'The ZIG you lose when you leave'], answer: 0, why: 'The commission is the validator’s cut of the rewards your stake earns.'},
    {q: 'What can happen to your stake if your validator misbehaves?', options: ['Nothing at all', 'It doubles', 'A small part can be slashed'], answer: 2, why: 'Slashing takes a small part of the stake behind a validator that double-signs or stays offline too long.'},
  ]},
  {id: 'apr-apy', title: 'APR and APY', short: 'Two ways to say a rate', minutes: 4, glyph: 'scale', colour: 'gold', body: [
    'APR is a simple yearly rate: 5 % APR on 1,000 ZIG is 50 ZIG over a year, if nothing changes.',
    'APY assumes the rewards are added back as you go (compounding), so for the same rate it reads a little higher than the APR.',
    'Staking rewards are not added back by themselves: you claim them and stake them again, each time with a small network fee. That is why ZIGoals shows the APR.',
    'Rates move with how much ZIG is staked and how fast blocks come; a rate today is not a promise for next year. And ZIG’s price can move far more than any rate.',
  ], quiz: [
    {q: 'At a 5 % APR, what do 1,000 ZIG earn in a year if nothing changes?', options: ['5 ZIG', '50 ZIG', '500 ZIG'], answer: 1, why: '5 % of 1,000 is 50.'},
    {q: 'Why is an APY higher than the APR for the same rate?', options: ['It counts rewards being added back', 'It is measured over a longer time', 'It includes ZIG’s price'], answer: 0, why: 'APY assumes compounding: rewards that earn rewards.'},
    {q: 'Does a rate shown today promise what you will earn?', options: ['Yes, it is fixed for a year', 'Only on the real network', 'No, it moves with the network'], answer: 2, why: 'Staking rates change with the network; nothing here is a promise.'},
  ]},
  {id: 'unbonding', title: 'Unbonding: the way out', short: 'Three weeks to leave', minutes: 4, glyph: 'hourglass', colour: 'cyan', body: [
    'When you unstake, your ZIG enters unbonding. On ZIGChain that took 21 days when this lesson was written (the Native staking section shows today’s figure, read live).',
    'During unbonding your ZIG earns nothing and cannot be moved. When it ends, the ZIG is back in your balance by itself.',
    'Moving your stake to another validator (redelegating) is instant and keeps earning, but the network limits how many moves can wait at once.',
    'So stake only what you can leave alone for weeks, and keep some ZIG unstaked for fees and surprises.',
  ], quiz: [
    {q: 'During unbonding, does your ZIG earn rewards?', options: ['Yes, double', 'No', 'Only half'], answer: 1, why: 'Unbonding ZIG earns nothing until it is back in your balance.'},
    {q: 'What is the quickest way to change validator without waiting?', options: ['Redelegate', 'Unstake and stake again', 'Ask ZIGoals to move it'], answer: 0, why: 'Redelegating moves stake straight to another validator and keeps it earning.'},
    {q: 'Which money suits staking?', options: ['Money you need next week', 'Money you borrowed', 'Money you can leave for weeks'], answer: 2, why: 'Leaving takes the unbonding time, so stake what can wait.'},
  ]},
  {id: 'liquid-staking', title: 'Liquid staking', short: 'Stake and keep a token', minutes: 5, glyph: 'drop', colour: 'cyan', body: [
    'With liquid staking you give ZIG to a contract (on ZIGChain, Valdora’s) that stakes it for you and gives you a token in return: stZIG.',
    'stZIG is worth more ZIG over time as rewards come in. You can keep it, move it, or sell it.',
    'There are two ways back to ZIG: redeem through the contract (the unbonding time plus a few days, and it cannot be cancelled), or sell stZIG on an exchange at once, usually for a little less.',
    'The trade: a contract now holds the ZIG. A fault in it, or a change by whoever controls it, can cost you. You give up some safety for flexibility.',
  ], quiz: [
    {q: 'What do you hold after liquid staking ZIG on Valdora?', options: ['A receipt from ZIGoals', 'Nothing', 'stZIG'], answer: 2, why: 'You receive stZIG, which stands for your staked ZIG.'},
    {q: 'What is the fastest way from stZIG back to ZIG?', options: ['Sell stZIG on an exchange', 'Wait for unbonding', 'There is none'], answer: 0, why: 'A swap is instant, usually at a small discount; redeeming takes weeks.'},
    {q: 'Compared with staking yourself, what risk does liquid staking add?', options: ['None at all', 'Contract risk', 'Higher network fees'], answer: 1, why: 'A contract holds the ZIG, so its faults and its controllers matter.'},
  ]},
  {id: 'pools', title: 'Liquidity pools and impermanent loss', short: 'Swap fees, and the catch', minutes: 6, glyph: 'focus', colour: 'magenta', body: [
    'A liquidity pool holds two tokens, ZIG and USDC for example. People swap one for the other through it and pay a small fee that goes to the pool’s providers.',
    'To provide liquidity you add equal values of both tokens and receive LP tokens: your share of the pool and its fees.',
    'Impermanent loss: when one token’s price moves, swappers trade against the pool, which ends up holding more of the cheaper token and less of the dearer one. When you take your share out, you can have less value than if you had simply kept both tokens.',
    'The fees can make up for it, or not. In a small pool a large swap also moves the price a lot (price impact).',
  ], quiz: [
    {q: 'Where does a pool’s income come from?', options: ['New ZIG from the network', 'Swap fees', 'ZIGoals'], answer: 1, why: 'Providers earn a share of the fee on every swap through the pool.'},
    {q: 'ZIG’s price rises fast. What does a ZIG / USDC pool end up holding?', options: ['Less ZIG and more USDC', 'More ZIG', 'Exactly the same'], answer: 0, why: 'Swappers buy the cheaper ZIG from the pool until its price matches the market.'},
    {q: 'What is impermanent loss?', options: ['A fee for leaving', 'Losing your LP tokens', 'Having less than if you had kept both tokens'], answer: 2, why: 'It is the gap between your pool share and simply holding the two tokens.'},
  ]},
  {id: 'custody', title: 'Copy trading and custody', short: 'Who holds the keys', minutes: 6, glyph: 'heart', colour: 'magenta', body: [
    'Copy trading: a trader manages money for many people, and the trader’s results are copied into each person’s account. Profits are shared with the trader.',
    'On a copy-trading platform the platform usually holds the money (it is custodial): you have an account there, not your own keys. The platform decides what is possible, and when.',
    'An example, as its own notice states it: Zignaly, the company ZIG first came from and a copy-trading platform, is closing. New investments stopped on 15 October 2026, trading closed on 16 October, and the last day to withdraw is 1 December 2026, in USDT on BNB Smart Chain only. Its customers withdraw in the way, and by the date, it sets.',
    'With your own wallet (non-custodial) nobody can close your access — and nobody can recover a lost recovery phrase either. Know which kind you are using before you put money in.',
  ], quiz: [
    {q: 'On a custodial platform, who holds your money?', options: ['You', 'The blockchain', 'The platform'], answer: 2, why: 'Custodial means the platform holds the money; you hold an account.'},
    {q: 'What did Zignaly’s closure mean for its customers?', options: ['Withdraw by its date, in the way it sets', 'Nothing changed', 'Their money moved to their wallets by itself'], answer: 0, why: 'Its notice sets the dates and the one way to withdraw.'},
    {q: 'What does non-custodial mean?', options: ['It is insured', 'You hold the keys yourself', 'Nobody can see it'], answer: 1, why: 'You hold the keys; nobody else can move or freeze the money, or recover the keys for you.'},
  ]},
  {id: 'scams', title: 'Spotting scams', short: 'Decoys and copies', minutes: 5, glyph: 'flag', colour: 'purple', body: [
    'Copies of real sites are the commonest trap. Use links you trust: every outside link on ZIGoals’ Earn page carries the “verified link” mark and the day it was checked.',
    `Decoy tokens: anyone can create a token named “ZIG”. One with 6 decimals exists on ZIGChain (${DECOY_ZIG_DENOM}); real ZIG is azig, with 18 decimals. Check a token’s full name before you swap or send.`,
    'Your recovery phrase is your money. Real support never asks for it — not Keplr, not ZIGoals, not anyone.',
    'A signing window you did not start: reject it. Read what you sign. And anyone who promises a sure, high profit is a warning sign, not a deal.',
  ], quiz: [
    {q: 'A token in your wallet is called “ZIG”. Is it real ZIG?', options: ['Always', 'If its logo looks right', 'Only if its full name is azig'], answer: 2, why: 'The name can be copied; the full denom cannot.'},
    {q: 'Someone from “support” asks for your recovery phrase. What do you do?', options: ['Never share it', 'Share it if they seem real', 'Share half of it'], answer: 0, why: 'Nobody genuine ever asks; anyone with the words can take everything.'},
    {q: 'A signing window opens that you did not start. What do you do?', options: ['Approve it quickly', 'Reject it', 'Leave it open'], answer: 1, why: 'Sign only what you started and understand.'},
  ]},
  {id: 'fees', title: 'Gas and fees', short: 'Why you keep a little ZIG', minutes: 4, glyph: 'pill', colour: 'purple', body: [
    'Every transaction on ZIGChain pays a small network fee in ZIG to the validators who process it.',
    'Gas is the work a transaction needs; the fee is the gas times the gas price. Your wallet shows the fee before you sign, and may let you raise it.',
    'ZIGChain takes its fees in ZIG only: with only USDC or ATOM in your wallet you cannot even swap until you have a little ZIG.',
    'So keep a little ZIG for fees when you stake: “Max” can leave nothing for the next step.',
  ], quiz: [
    {q: 'In what does ZIGChain take its network fees?', options: ['Any token', 'Dollars', 'ZIG'], answer: 2, why: 'Fees on ZIGChain are paid in ZIG only.'},
    {q: 'When do you see the fee?', options: ['In your wallet, before you sign', 'After it is paid', 'Never'], answer: 0, why: 'Your wallet shows the fee on its review screen.'},
    {q: 'Why keep a little ZIG after staking?', options: ['It earns more', 'To pay the next fees', 'ZIGoals requires it'], answer: 1, why: 'Every next step — claiming, unstaking, swapping — needs a fee.'},
  ]},
] satisfies Lesson[]);

export const lessonOf = (id: string) => ACADEMY_LESSONS.find(l => l.id === id);
/** How many of the three answers are right (an unanswered question is wrong). */
export function scoreQuiz(lesson: Lesson, answers: readonly (number | null)[]): 0 | 1 | 2 | 3 {
  return lesson.quiz.filter((q, i) => answers[i] === q.answer).length as 0 | 1 | 2 | 3;
}
/** A lesson's state on this device: passed (3 of 3 once), read, or not started. */
export function lessonState(record: EarnAcademy, id: AcademyLessonId): {passed: boolean; read: boolean; best: 0 | 1 | 2 | 3 | undefined} {
  const entry = record.lessons?.[id];
  return {passed: !!entry?.passedAt, read: entry?.read === true, best: lessonScore(record, id)};
}
export function academyProgress(record: EarnAcademy): {passed: number; total: number} {
  return {passed: ACADEMY_LESSON_IDS.filter(id => lessonState(record, id).passed).length, total: ACADEMY_LESSON_IDS.length};
}
/** The mini path: two orbits of four lessons, a chest half way and one at the end. */
export function academyModel(record: EarnAcademy): PathModel {
  const step = (l: Lesson): PathStep => {
    const s = lessonState(record, l.id);
    return {id: `lesson-${l.id}`, label: l.title, note: s.passed ? 'Passed' : s.best !== undefined ? `Quiz: ${s.best} of 3` : s.read ? 'Read' : `${l.minutes} min`, colour: l.colour, state: s.passed ? 'done' : 'undone', glyph: l.glyph, intent: 'value', ...(s.read && !s.passed ? {partial: .5} : {})};
  };
  return {id: 'earn-academy', label: 'Earn Academy', sections: [
    {id: 'academy-basics', label: 'The basics', eyebrow: 'Lessons 1–4', colour: 'gold', steps: ACADEMY_LESSONS.slice(0, 4).map(step)},
    {id: 'academy-beyond', label: 'Beyond staking', eyebrow: 'Lessons 5–8', colour: 'magenta', steps: ACADEMY_LESSONS.slice(4).map(step)},
  ], milestones: [
    {id: 'academy-half', at: 'half', label: 'Half way', reachedLabel: 'Half the Academy passed'},
    {id: 'academy-done', at: 'end', label: 'Earn Academy', reachedLabel: 'Every lesson passed'},
  ]};
}
