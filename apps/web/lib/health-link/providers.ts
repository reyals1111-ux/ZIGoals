/**
 * The health services ZIGoals can link through its health-link Worker (Session W Part 8; official documentation read
 * 2026-10-07, docs/run11/HEALTH_LINK_ACTIVATION.md). Each needs ZIGoals' own registration and client secret, so they are
 * off until the owner sets them up; this list says what each would bring and its own limits, in plain words.
 */
export type LinkProvider = 'oura' | 'withings' | 'polar' | 'strava';
export type ProviderInfo = {id: LinkProvider; label: string; authorize: string; scopes: string[]; scopeSeparator: ' ' | ','; pkce: boolean; syncOnOpen: boolean; brings: string; limits: string; instead: string};
export const LINK_PROVIDERS: readonly ProviderInfo[] = [
  {id: 'oura', label: 'Oura', authorize: 'https://cloud.ouraring.com/oauth/authorize', scopes: ['daily', 'workout', 'session'], scopeSeparator: ' ', pkce: true, syncOnOpen: true,
    brings: 'Sleep with stages and naps, steps, active energy, resting heart rate, workouts and meditation sessions.',
    limits: 'Oura serves 10 people per app until it approves the app, and an expired Oura membership can block access.',
    instead: 'Export from Oura’s Membership Hub and import it (Settings → Switch to ZIGoals).'},
  {id: 'withings', label: 'Withings', authorize: 'https://account.withings.com/oauth2_user/authorize2', scopes: ['user.activity', 'user.metrics'], scopeSeparator: ',', pkce: false, syncOnOpen: true,
    brings: 'Weight, sleep with stages, steps, active and resting energy, workouts and meditation sessions.',
    limits: 'From 12 October 2026 Withings requires Withings+ for new Withings accounts on its free API plan, and serves 10 people until it reviews the app.',
    instead: 'Withings can share with Apple Health; import its export from there.'},
  {id: 'polar', label: 'Polar', authorize: 'https://flow.polar.com/oauth2/authorization', scopes: ['accesslink.read_all'], scopeSeparator: ' ', pkce: false, syncOnOpen: true,
    brings: 'Sleep with stages, daily steps and energy, and exercises uploaded after you connect.',
    limits: 'Polar shares exercises uploaded after you connect, from the last 30 days.',
    instead: 'Polar Flow can share with Apple Health; import its export from there.'},
  {id: 'strava', label: 'Strava', authorize: 'https://www.strava.com/oauth/authorize', scopes: ['activity:read'], scopeSeparator: ',', pkce: false, syncOnOpen: false,
    brings: 'Workouts, when you tap Sync now (Strava limits requests for the whole app, so ZIGoals never syncs it on its own).',
    limits: 'Creating a Strava app needs a Strava subscription, and a new app serves one athlete until Strava reviews it.',
    instead: 'Strava can share with Apple Health; import from there.'},
];
export const providerInfo = (id: LinkProvider) => LINK_PROVIDERS.find(p => p.id === id)!;
export const isLinkProvider = (v: unknown): v is LinkProvider => typeof v === 'string' && LINK_PROVIDERS.some(p => p.id === v);
