import {zigiPrefs, type ZigiRecord} from '../store/records';

/**
 * The knock, offered once (Session V Part 13, the owner's wording): after ZIGi is connected and its first chat has
 * ended, or on the first panel open of a later day, whichever comes first, ZIGi asks one question. The answer is kept in
 * `zigoals:zigi:v1` (`knock.offer`) and the question never comes back after either answer, nor once knocking was turned
 * on in Customize. Never on a sensitive screen.
 */
export const KNOCK_OFFER = 'Want me to knock when a habit or check-in is due? You can change this anytime in Customize.';
export function offerDue({record, connected, sensitive, chatEnded, today, connectedOn}: {record: ZigiRecord; connected: boolean; sensitive: boolean; chatEnded: boolean; today: string; connectedOn: string | null}): boolean {
  const knock = zigiPrefs(record).knock;
  if (!connected || sensitive || knock.offer !== null || knock.enabled) return false;
  return chatEnded || (!!connectedOn && connectedOn < today);
}
