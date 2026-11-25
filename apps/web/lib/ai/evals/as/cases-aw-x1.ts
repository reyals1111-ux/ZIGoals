import type {Intent} from './cases';

/**
 * Session AW (X1, LEDGER #438–#440; Due): the questions round 7's "Due" rows raise — the named timers running and when one
 * ends, reminders that remind again until done, and the snooze choices — answered on the device by
 * lib/ai/local-answers/aw-x1-due.ts (awX1Answer, wired in engine.ts) in English and Dutch. The lead adds them to the
 * corpus (CORPUS, expected.json). A question about "timers" also names the tasks being timed (round 6's `av2-timers`,
 * whose questions this answer takes in the browser, deliberately, so a pasta timer is never answered with "no timer").
 * `never`: an answer never claims a timer was started or changed, nor gives a number for
 * an unknown.
 */
export const AW_X1: readonly Intent[] = [
  {id: 'awx1-timers', pillar: 'tasks', en: ['what timers are running', 'how long is left on my timers'], nl: ['welke timers lopen er', 'loopt er een timer?'], never: ['started your', 'I started', 'ik heb gestart']},
  {id: 'awx1-timer-end', pillar: 'tasks', en: ['when does my pasta timer end', 'when is my laundry timer done'], nl: ['wanneer is mijn pastatimer klaar', 'wanneer gaat de timer van de was af'], never: ['I started', 'ik heb gestart']},
  {id: 'awx1-again', pillar: 'tasks', en: ['how do I make a reminder repeat until it is done', 'can a reminder keep reminding me'], nl: ['hoe laat ik een herinnering herhalen tot het klaar is', 'kan ik een herinnering laten herhalen tot ik hem afvink']},
  {id: 'awx1-snooze', pillar: 'tasks', en: ['what are my snooze choices', 'can I set my own snooze times'], nl: ['wat zijn mijn snoozekeuzes', 'kan ik eigen snooze tijden kiezen']},
];
