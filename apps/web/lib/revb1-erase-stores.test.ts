import {describe, expect, it} from 'vitest';
import {OTHER_STORES, STORE_NAMES, listAreas, storesOf} from './erase-areas';
import {KNOWN_DATABASES} from './erase-everything';

/** Session AV lane 2 (review b1 #11): Erase everything names the stores it erases, not only the records' areas. */
describe('Erase names each store in plain words', () => {
  it('every store Erase knows has a name; photos and recordings come first; an unknown one is "Other stores"', () => {
    for (const db of KNOWN_DATABASES) expect(STORE_NAMES[db], db).toBeTruthy();
    const names = storesOf(['zigoals-ai-chats-v1', 'zigoals-journal-media-v1', 'zigoals-notify-v1', 'zigoals-notify-actions-v1', 'zigoals-something-new-v9', 'zigoals-task-attachments-v1']);
    expect(names).toEqual(['Journal photos and voice notes', 'Task photos and voice notes', 'ZIGi’s conversations', 'Notifications', OTHER_STORES]);
    expect(listAreas(storesOf(['zigoals-journal-media-v1']))).toBe('Journal photos and voice notes');
    expect(storesOf([])).toEqual([]);
  });
});
