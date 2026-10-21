'use client';
import Link from 'next/link';
import {useState, type ReactNode} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showToast} from '../ui/undo-toast';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {formatNumber} from '../../lib/visual-format';
import {STORIES_ROUTE, TIMELINE_ROUTE, UNIVERSE_ROUTE} from '../../lib/af-extras-keys';
import {UNIVERSE} from '../../lib/universe/store';
import {DAY_TIMELINE} from '../../lib/timeline/store';
import {STORIES} from '../../lib/stories/store';
import type {DeviceRecordState} from '../ai/use-device-record';
import '../universe/extras-setting.css';

/**
 * Session AF (L5b; ADR-028 H73, H76–H78): what My Universe, the Day Timeline and Stories keep on this device, and a way
 * to clear each — for the lead to mount in Settings (beside "Your data" or "Your pages & buttons"). Each record is device
 * only, never synced, in Export everything and erased with the account. Clearing is the person's choice and has Undo;
 * reading the counts writes nothing.
 */
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
function Row<T>({record, title, count, cleared, button, children}: {record: DeviceRecordState<T>; title: string; count: number; cleared: string; button: string; children: ReactNode}) {
  const [error, setError] = useState('');
  const usable = record.loaded && !record.unreadable;
  const clear = () => {
    const previous = record.data;
    try { record.clear(); setError(''); showToast({message: cleared, undo: () => record.update(() => previous), undone: 'Put back as it was.'}); }
    catch (cause) { setError(deviceSettingFailureMessage(cause)); }
  };
  return <div className="af-extras-row">
    <p><strong>{title}</strong><small>{children}</small></p>
    <button type="button" className="secondary" disabled={!usable || count === 0} onClick={clear}>{button}</button>
    {record.unreadable && <p className="fine">This record could not be read on this device; it is left as it is.</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
export function AfExtrasSection() {
  const universe = useDeviceRecord(UNIVERSE), timeline = useDeviceRecord(DAY_TIMELINE), stories = useDeviceRecord(STORIES);
  const celebrated = Object.keys(universe.data.celebrated).length, moved = Object.keys(timeline.data.times).length, opened = Object.keys(stories.data.seen).length;
  return <div className="af-extras-setting">
    <Row record={universe} title="My universe" count={celebrated} cleared="Celebrated milestones forgotten on this device." button="Forget celebrated milestones">
      {plural(celebrated, 'milestone')} celebrated on this device. The planets come from your records; forgetting only lets a milestone of the last week celebrate again. <Link className="text-link" href={UNIVERSE_ROUTE}>Open my universe →</Link>
    </Row>
    <Row record={timeline} title="Day timeline" count={moved} cleared="Every block is back at its own time." button="Put every time back">
      {plural(moved, 'time')} you moved, kept on this device only; your habits and reminders keep their own. <Link className="text-link" href={TIMELINE_ROUTE}>Open the timeline →</Link>
    </Row>
    <Row record={stories} title="Stories" count={opened} cleared="Which stories you opened is forgotten on this device." button="Forget opened stories">
      {plural(opened, 'story', 'stories')} opened. The stories themselves are drawn from your records each time. <Link className="text-link" href={STORIES_ROUTE}>Open your stories →</Link>
    </Row>
    <p className="fine">All three stay on this device: never synced, in Export everything, erased with your account.</p>
  </div>;
}
export default AfExtrasSection;
