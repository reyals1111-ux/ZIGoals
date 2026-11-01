'use client';
import {localDate} from '../../../lib/local-date';
import {NOVA_BRIEFS, unreadCount} from '../../../lib/nova/briefs';
import {useDeviceRecord} from '../../ai/use-device-record';

/** NOVA's unread briefs of today and yesterday, for the dashboard's widget and status chip (lane NA); 0 until read. */
export function useNovaBriefsUnread(): number {
  const record = useDeviceRecord(NOVA_BRIEFS);
  return record.loaded && !record.unreadable ? unreadCount(record.data, localDate()) : 0;
}
