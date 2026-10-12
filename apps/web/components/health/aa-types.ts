import type {HealthData} from '../../lib/health';
/** The Health page's own save helper, as its views receive it (health-app.tsx `Perform`). */
export type HealthPerform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
