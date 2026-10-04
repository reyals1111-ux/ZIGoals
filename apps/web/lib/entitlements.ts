/**
 * What is premium in ZIGoals and whether it is unlocked (ADR-012). During the Alpha every premium feature is free for
 * everyone, so this is a label and a switch, not a paywall: there is no payment code, no account tier, no check against
 * a server. A later session decides how premium is unlocked; the UI only ever reads `label` and `unlocked`.
 */
export type Entitlement = {id: 'your-ai'; name: string; tier: 'premium'; unlocked: boolean; label: string; note: string};
export const ENTITLEMENTS: Record<Entitlement['id'], Entitlement> = {
  'your-ai': {id: 'your-ai', name: 'ZIGi · your AI', tier: 'premium', unlocked: true, label: 'Premium · free during Alpha', note: 'Your own AI, connected by you, billed by your provider. Free in ZIGoals while the Alpha lasts.'},
};
export const entitlement = (id: Entitlement['id']): Entitlement => ENTITLEMENTS[id];
export const isUnlocked = (id: Entitlement['id']): boolean => ENTITLEMENTS[id].unlocked;
