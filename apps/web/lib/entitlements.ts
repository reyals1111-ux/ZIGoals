/**
 * What is premium in ZIGoals and whether it is unlocked (ADR-012). During the Alpha every premium feature is free for
 * everyone, so this is a label and a switch, not a paywall: there is no payment code, no account tier, no check against
 * a server. A later session decides how premium is unlocked; the UI only ever reads `label` and `unlocked`.
 */
/**
 * Session V Part 17: `hosted`, ZIGoals hosted (an AI run by ZIGoals, owner decision D2). It is not unlocked by this
 * table: only the relay's answer for one account (lib/ai/hosted.ts, GET /api/zigi) opens it, in a build that has it.
 * There is still no payment code; the label says it is invite-only and free during the Alpha.
 */
export type Entitlement = {id: 'your-ai' | 'hosted'; name: string; tier: 'premium'; unlocked: boolean; label: string; note: string};
export const ENTITLEMENTS: Record<Entitlement['id'], Entitlement> = {
  'your-ai': {id: 'your-ai', name: 'ZIGi · Your Personal AI Companion', tier: 'premium', unlocked: true, label: 'Premium · free during the Alpha', note: 'Your own AI, connected by you, billed by your provider. Free in ZIGoals while the Alpha lasts.'},
  hosted: {id: 'hosted', name: 'ZIGoals hosted', tier: 'premium', unlocked: false, label: 'Invite only · free during Alpha', note: 'An AI ZIGoals runs and pays for, for invited accounts, when a build has it. Off in every build so far.'},
};
/**
 * Session AL Part 12 (owner decision O2): the placeholder prices (one-time, euros only) and the line every price surface
 * carries. There is still no payment code, checkout, buy button or account requirement anywhere; during the Alpha
 * everything is free and ZIGoals bills nothing. The Plans page is /app/plans (components/plans/*).
 */
export const PLANS_HREF = '/app/plans';
export const PLAN_PRICES = {base: {name: 'ZIGoals', eur: 20}, premium: {name: 'ZIGoals Premium', eur: 50}} as const;
export const PLAN_PLACEHOLDER_LINE = 'Placeholder prices · nothing is charged during the Alpha · prices may change';
export const entitlement = (id: Entitlement['id']): Entitlement => ENTITLEMENTS[id];
export const isUnlocked = (id: Entitlement['id']): boolean => ENTITLEMENTS[id].unlocked;
