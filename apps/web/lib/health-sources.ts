/**
 * The names people know for where a sleep night or a meditation session came from (Session X P2.1: lists showed the
 * stored code, "From fitbit", "From oura-link"). Display only; the stored source codes are unchanged.
 */
const NAMES: Record<string, string> = {
  'apple-health': 'Apple Health', fitbit: 'Fitbit', garmin: 'Garmin', samsung: 'Samsung Health', oura: 'Oura',
  'oura-link': 'Oura (linked)', 'withings-link': 'Withings (linked)', 'polar-link': 'Polar (linked)', 'strava-link': 'Strava (linked)',
};
export const sourceName = (source: string): string => NAMES[source] ?? source;
