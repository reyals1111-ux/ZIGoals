'use client';
import {useEffect, useState} from 'react';
import {useDeviceRecord, type DeviceRecordState} from '../ai/use-device-record';
import {BACKUP_REMINDER, copyOfferDue, type BackupReminder} from '../../lib/backup-reminder';
import {appleContext, keepCard, recordCount, type KeepCard} from '../../lib/keep-data/rules';
import {localDate} from '../../lib/local-date';
import {getAppStorage} from '../../lib/showcase-storage';
import {whatsNewSeen} from '../../lib/whats-new';

/**
 * Session AV Part 3 (ADR-045 D-KEEP): which keep-your-records card Today shows now, if any (components/keep-data). Read on
 * the device after the page is drawn; never in the Showcase. While the one-time "What's new" card is on Today this waits
 * (one notice at a time), the Home Screen app's restore offer excepted (a brand-new app shows no "What's new").
 */
export type KeepEnv = {apple: 'home-screen' | 'tab' | null; count: number; whatsNew: boolean; narrow: boolean};
export function useKeepCard(showcase: boolean): {card: KeepCard; env: KeepEnv | null; record: DeviceRecordState<BackupReminder>} {
  const record = useDeviceRecord(BACKUP_REMINDER);
  const [env, setEnv] = useState<KeepEnv | null>(null);
  useEffect(() => {
    if (showcase) return;
    const media = (q: string) => typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
    let whatsNew = false; try { whatsNew = !whatsNewSeen(getAppStorage()); } catch { whatsNew = false; }
    setEnv({apple: appleContext(navigator as Navigator & {standalone?: boolean}, media('(display-mode: standalone)')), count: recordCount(window.localStorage), whatsNew, narrow: media('(max-width: 600px)')});
  }, [showcase]);
  if (showcase || !record.loaded || !env) return {card: null, env, record};
  const today = localDate(), card = keepCard(record.data, {today, count: env.count, apple: env.apple, copyDue: copyOfferDue(record.data, today, env.count)});
  return {card: env.whatsNew && card !== 'ios-restore' ? null : card, env, record};
}
