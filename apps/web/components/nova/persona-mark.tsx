'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {ZIGI, zigiPrefs} from '../../lib/ai/store/records';
import type {NovaOrbState} from '../../lib/nova/orb';
import type {PersonaAvatar} from '../../lib/nova/store';
import {ZigiAvatar, type ZigiState} from '../zigi/zigi-avatar';
import {NovaOrb} from './orb';

const ZIGI_STATE: Record<NovaOrbState, ZigiState> = {idle: 'idle', listening: 'listening', thinking: 'thinking', speaking: 'speaking'};
/**
 * NOVA's avatar: the NOVA orb, or ZIGi exactly as the person dressed ZIGi (the locked ZIGi look and their chosen skin;
 * components/zigi/zigi-avatar.tsx, unchanged). Decorative: whoever shows it names it in words.
 */
export function PersonaMark({avatar, size = 64, state = 'idle'}: {avatar: PersonaAvatar; size?: number; state?: NovaOrbState}) {
  const zigi = useDeviceRecord(ZIGI);
  if (avatar === 'zigi') return <span className="nova-persona-zigi" style={{width: size, height: size}}><ZigiAvatar state={ZIGI_STATE[state]} size={size} skin={zigiPrefs(zigi.data).skin} decorative/></span>;
  return <NovaOrb state={state} size={size}/>;
}
