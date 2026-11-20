import {BACKUP_REMINDER, BACKUP_REMINDER_KEY} from '../backup-reminder';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {browserStorage, requestKeep} from '../install/persist';
import {localDate} from '../local-date';
import {getAppStorage, isShowcase} from '../showcase-storage';
import {persistNeverPrompts, recordCount} from './rules';

/**
 * Session AV Part 3 (ADR-045 D-KEEP; owner amendment 5 supersedes owner decision L3 "only on a tap"): once a person has
 * saved a record, this site asks the browser once to keep its data (the Storage API's persistence), only in a browser that
 * answers without asking the person (Chromium, Safari). Firefox asks the person, so there it stays Settings' "Keep my data
 * on this device" tap. Called after the person's own save, never on view; never in the Showcase; the answer is kept on the
 * device record so it is asked once. A granted request keeps the browser from clearing this site's data when the device
 * runs low on space; it does not stop anyone from clearing site data themselves.
 */
export async function keepDataOnce(win: Window, today = localDate()): Promise<void> {
  if (isShowcase()) return;
  const storage = getAppStorage();
  if (readDeviceRecord(storage, BACKUP_REMINDER).data.persistAskedOn) return;
  if (recordCount(win.localStorage) < 1 || !persistNeverPrompts(win.navigator.userAgent ?? '')) return;
  const result = await requestKeep(browserStorage());
  updateDeviceRecord(storage, BACKUP_REMINDER, r => ({...r, persistAskedOn: today, persistResult: result === 'unknown' ? 'error' : result}));
}
export {BACKUP_REMINDER_KEY};
