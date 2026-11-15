/**
 * Session AM-2 (owner's step 4b; Q14, Q16): did a reply read Health? A deterministic answer from what the conversation
 * keeps about each reply — the lookups it ran (by name) and the labels of the records that went with the question —
 * never from reading the reply's words. Used for one rule: while NOVA's Health permission or this device's Health gate
 * is off, an answer that read Health is not shared or copied, and a model's hand-off is not made in a conversation that
 * read Health. (While both are on, Health may go into a hand-off the person approves, like any other answer.)
 */
export type ReplyFacts = {
  /** The lookups the reply ran, by tool name (the conversation's own record of the turn, this session's lookups, an on-device answer's calls). */
  tools?: readonly string[];
  /** The labels of the records that went with the question ("Health: sleep, weight", "Today's page"); never their values. */
  records?: readonly string[];
};
/** Record labels that name Health's own areas (the labels the context pack writes; lib/ai/records-sent.ts). */
const HEALTH_LABEL = /\b(?:health|sleep|weight|water|hydration|steps|activity|workouts?|exercise|nutrition|food|meals?|calories|macros|fasting|mood|energy|meditation|vitals?|blood|heart|cycle|symptoms?|supplements?|vitamins?|medication|measurements?|body|nap|coach)\b/i;
export function readHealth(facts: ReplyFacts, isHealthTool: (name: string) => boolean): boolean {
  return (facts.tools ?? []).some(isHealthTool) || (facts.records ?? []).some(label => HEALTH_LABEL.test(label));
}
