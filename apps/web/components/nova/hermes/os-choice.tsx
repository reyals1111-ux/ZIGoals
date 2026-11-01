'use client';
import {useState, useSyncExternalStore} from 'react';
import {detectOs, OS_LABELS, type Os} from '../../../lib/nova/setup-guide';
import {Choice} from '../setup/steps/brain';

const subscribeNothing = () => () => undefined;
/** The person's computer, detected and changeable (macOS, Windows, Linux tabs). */
export function useOs(): [Os, (os: Os) => void] {
  const ua = useSyncExternalStore(subscribeNothing, () => navigator.userAgent, () => '');
  const [os, setOs] = useState<Os | null>(null);
  return [os ?? detectOs(ua), setOs];
}
export function OsChoice({os, onChange}: {os: Os; onChange: (os: Os) => void}) {
  return <Choice label="Your computer" value={os} options={(['mac', 'windows', 'linux'] as const).map(o => ({id: o, label: OS_LABELS[o]}))} onChange={onChange}/>;
}
/** This page's origin, for the commands (the hosted Alpha's before the page has one). */
export const useOrigin = () => useSyncExternalStore(subscribeNothing, () => window.location.origin, () => 'https://alpha.zigoals.app');
