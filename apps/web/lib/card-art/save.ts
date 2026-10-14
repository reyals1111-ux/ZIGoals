import type {CardArt} from './catalog';

/**
 * Session AB-Design (owner request 17, ADR-024 owner edit 5): saving a chosen artwork goes through AB-Cloud's
 * `setGoalCardArt` mutator in lib/goal-extras/store.ts once it is on origin/feature/session-ab-cloud. Until then the
 * picker previews and says "Soon" on Save — it never writes a field AB-Cloud has not defined. The switch is one line:
 * replace `null` with `(key, art) => updateGoalExtras(getAppStorage(), e => setGoalCardArt(e, key, art))`.
 */
export const saveCardArt: null | ((goalKey: string, art: CardArt | null) => Promise<void>) = null;
