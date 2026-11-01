'use client';
import Link from 'next/link';
import {useAiSettings} from '../ai/use-ai-settings';
import {useDeviceRecord} from '../ai/use-device-record';
import {AI_MEMORY, AI_OPTIONS} from '../../lib/ai/store/records';
import {usingNotes} from '../../lib/ai/memory';
import {PROVIDERS} from '../../lib/ai/providers';
import {NOVA_SETUP} from '../../lib/nova/setup';
import {PRIVACY_WORDS} from '../../lib/nova/privacy-mode';
import {NOVA_HERMES, isHermesBase} from '../../lib/nova/hermes-record';
import {useOnline} from './use-nova';
import {NovaIcon} from './icons';

/**
 * Session AK (owner follow-up 2, N2; lane NA): NOVA's status chips, read from ZIGi's own engine settings (one engine, Q28):
 * the brain (on-device answers, a model on this computer, the person's own cloud key, Chrome's on-device model), the privacy
 * mode (NC's lib/nova/privacy-mode.ts), memory on or off, the pillars NOVA may read, and offline. Each chip opens the step
 * of the setup guide where it changes. "Test my setup" opens the guide's checks.
 */
export type Brain = {kind: 'none' | 'local' | 'cloud' | 'device' | 'app' | 'hosted' | 'hermes'; words: string};
const short = (model: string | null) => !model ? '' : model.length > 26 ? `${model.slice(0, 25)}…` : model;
export function useBrain(): {brain: Brain; loaded: boolean} {
  const settings = useAiSettings(), options = useDeviceRecord(AI_OPTIONS), hermes = useDeviceRecord(NOVA_HERMES);
  const s = settings.data, route = options.data.route;
  let brain: Brain = {kind: 'none', words: 'On-device answers'};
  if (route === 'on-device') brain = {kind: 'device', words: 'Chrome’s on-device model'};
  else if (route === 'hosted') brain = {kind: 'hosted', words: 'ZIGoals hosted'};
  else if (s.enabled && s.mode === 'local' && hermes.loaded && !hermes.unreadable && isHermesBase(s.baseUrl, hermes.data)) brain = {kind: 'hermes', words: `Hermes Agent${s.model ? ` · ${short(s.model)}` : ''}`};
  else if (s.enabled && s.mode === 'local') brain = {kind: 'local', words: `Local · ${short(s.model) || 'your model'}`};
  else if (s.enabled && s.mode === 'api' && s.provider) brain = {kind: 'cloud', words: `Cloud · ${PROVIDERS[s.provider].name}${s.model ? ` · ${short(s.model)}` : ''}`};
  else if (s.enabled && s.mode === 'subscription') brain = {kind: 'app', words: 'Your AI app'};
  return {brain, loaded: settings.loaded && options.loaded && hermes.loaded};
}
export const SETUP_HREF = '/app/nova/setup';
export function StatusChips({brain}: {brain: Brain}) {
  const settings = useAiSettings(), options = useDeviceRecord(AI_OPTIONS), memory = useDeviceRecord(AI_MEMORY), setup = useDeviceRecord(NOVA_SETUP), online = useOnline();
  const share = settings.data.pageShare, pillars = [share.today, share.goals, share.habits, share.wealth, share.health && settings.data.includeHealth];
  const granted = pillars.filter(Boolean).length, mode = setup.loaded && !setup.unreadable ? setup.data.privacyMode ?? null : null;
  const notes = memory.data.notes?.length ?? 0, remembering = options.loaded && memory.loaded && !memory.unreadable && usingNotes(options.data, memory.data);
  return <ul className="nova-chips" aria-label="NOVA’s status">
    <li><Link className="nova-chip" data-kind={brain.kind} href={SETUP_HREF} prefetch={false}><span className="nova-chip-dot" aria-hidden="true"/><span><span className="nova-chip-key">Brain</span> {brain.words}</span></Link></li>
    {setup.loaded && <li><Link className="nova-chip" data-kind={mode ?? 'unset'} href={`${SETUP_HREF}#privacy`} prefetch={false}><span className="nova-chip-dot" aria-hidden="true"/><span><span className="nova-chip-key">Privacy</span> {mode ? PRIVACY_WORDS[mode].label : 'not chosen yet'}</span></Link></li>}
    {memory.loaded && <li><Link className="nova-chip" data-kind={remembering ? 'on' : 'off'} href={`${SETUP_HREF}#memory`} prefetch={false}><span className="nova-chip-dot" aria-hidden="true"/><span><span className="nova-chip-key">Memory</span> {remembering ? `on · ${notes} ${notes === 1 ? 'note' : 'notes'}` : 'off'}</span></Link></li>}
    {settings.loaded && <li><Link className="nova-chip" data-kind="scopes" href={`${SETUP_HREF}#scopes`} prefetch={false}><span className="nova-chip-dot" aria-hidden="true"/><span><span className="nova-chip-key">Sees</span> {granted} of 5 pillars{share.health && settings.data.includeHealth ? '' : ' · Health off'}</span></Link></li>}
    {!online && <li><span className="nova-chip" data-kind="offline" role="status"><span className="nova-chip-dot" aria-hidden="true"/><span><span className="nova-chip-key">Offline</span> on-device answers still work</span></span></li>}
    <li><Link className="nova-chip nova-chip-test" href={`${SETUP_HREF}?test=1`} prefetch={false}><NovaIcon name="test" size={18}/><span>Test my setup</span></Link></li>
  </ul>;
}
