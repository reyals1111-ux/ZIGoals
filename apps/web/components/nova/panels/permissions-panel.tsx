'use client';
import {useState} from 'react';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, visibleDomains} from '../../../lib/dashboard-settings';
import {DEFAULT_NOVA_SCOPES, NOVA_SCOPES, NOVA_SCOPE_LABELS, type NovaScope} from '../../../lib/ai/context-pack/nova';
import {AI_OPTIONS} from '../../../lib/ai/store/records';
import {JOURNAL} from '../../../lib/journal/schema';
import {NOVA_SETUP, type NovaSetup} from '../../../lib/nova/setup';
import {resetScopes, scopesOf, setScope} from '../../../lib/nova/scopes';
import {Switch} from '../../ai/ai-switch';
import {useAiSettings} from '../../ai/use-ai-settings';
import {useHealthConsent} from '../../ai/use-health-consent';
import {useDeviceRecord} from '../../ai/use-device-record';
import {usePrivateStore} from '../../use-private-store';
import {useChainChoice} from '../../chain/use-chain-choice';
import '../../ai/ai.css';
import {WeatherChoice} from './weather-choice';
import './panels.css';

/**
 * NOVA's Permissions (Session AK, owner follow-up 2 N2/N4): the eight scopes lane NE's context pack reads (`NovaScopes`,
 * stored by lib/nova/scopes.ts in `zigoals:nova-setup:v1`), Health, Notes and the Journal off by default. Health also needs
 * ZIGi's own three-part Health gate, shown here as a view of ZIGi's switches (`zigoals:ai:v1`, the same ones as Settings),
 * not a second store; "Use my memory" is ZIGi's "Use my notes"; the journal's own sharing switch is read here and changed in
 * Journal. Briefs, workflows, NOVA's chat and its "What NOVA can see" all follow these.
 */
const NOTES: Record<NovaScope, string> = {
  today: 'Your Checklist, agenda, tasks, focus, music and chess.', goals: 'Goals, their pace and planned steps.', habits: 'Habits, streaks and check-ins.',
  health: 'Off by default. Also needs ZIGi\'s Health gate below.', wealth: 'Never a key or a wallet secret.', notes: 'Your notes and the notes inbox. Off by default.',
  journal: 'Read on this device; sent to a model only with the journal\'s own sharing switch. Off by default.', earn: 'Only once you chose the chain.',
};
export default function PermissionsPanel() {
  const settings = useAiSettings(), setup = useDeviceRecord(NOVA_SETUP), options = useDeviceRecord(AI_OPTIONS), journal = useDeviceRecord(JOURNAL);
  const dashboard = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings), consent = useHealthConsent();
  const [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null), chain = useChainChoice();
  const data = settings.data, scopes = scopesOf(setup.unreadable ? {version: 1} : setup.data);
  const layoutHasHealth = dashboard.loaded && !dashboard.error && visibleDomains(dashboard.data).includes('health');
  const gateOpen = data.pageShare.health && data.includeHealth && layoutHasHealth && (!consent.accountActive || consent.accountHealthPermitted === true);
  const fail = (error: unknown) => setMessage({text: `Not saved on this device. ${error instanceof Error ? error.message : ''}`.trim(), failed: true});
  const scope = (change: (r: NovaSetup) => NovaSetup, text: string) => { try { setup.update(change); setMessage({text}); } catch (error) { fail(error); } };
  const zigi = (change: (s: typeof data) => typeof data, text: string) => { try { settings.update(change); setMessage({text}); } catch (error) { fail(error); } };
  if (!settings.loaded || !setup.loaded) return <p className="ai-note" role="status">Reading your choices…</p>;
  const changed = NOVA_SCOPES.some(s => scopes[s] !== DEFAULT_NOVA_SCOPES[s]);
  return <div className="nova-permissions">
    <p className="ai-note">What NOVA may read, pillar by pillar. {data.enabled ? 'With your model connected, this is also what may go with a message (in Guarded mode after redaction on this device); ZIGi\'s page switches in Settings still apply.' : 'No model is connected, so nothing leaves this device: NOVA reads these here only.'}</p>
    {setup.unreadable && <p role="alert">Your NOVA choices could not be read on this device, so the defaults apply (Health, Notes and the Journal off).</p>}
    <div className="ai-switch-list">
      {/* Session AL (DV-065, P-DV-99): Earn is read only once a chain is chosen (context-pack scopeOpen); until then its switch
          says so instead of a plain "On" that NOVA does not act on. */}
      {NOVA_SCOPES.map(s => <Switch key={s} checked={scopes[s]} onChange={next => scope(r => setScope(r, s, next), `${NOVA_SCOPE_LABELS[s]}: ${next ? (s === 'earn' && !chain.chosen ? 'on once a chain is chosen' : 'NOVA may read it') : 'NOVA does not read it'}.`)} label={NOVA_SCOPE_LABELS[s]}
        note={s === 'earn' && scopes.earn && !chain.chosen ? 'On once a chain is chosen. No chain is chosen on this device yet, so NOVA reads nothing from Earn.' : NOTES[s]}/>)}
    </div>
    {changed && <div className="ai-card-actions"><button type="button" className="text-link" onClick={() => scope(resetScopes, 'Back to the defaults: Health, Notes and the Journal off.')}>Back to the defaults</button></div>}
    <h4>ZIGi&rsquo;s Health gate</h4>
    <div className="ai-switch-list">
      <Switch checked={data.pageShare.health} onChange={next => zigi(s => ({...s, pageShare: {...s.pageShare, health: next}}), next ? 'Health page data is on; Include Health decides the rest.' : 'Health page data is off.')} label="Health page data" note="The same switch as Settings → ZIGi → What each page may share."/>
      <Switch checked={data.includeHealth} disabled={!layoutHasHealth} onChange={next => zigi(s => ({...s, includeHealth: next}), next ? 'Include Health is on.' : 'Include Health is off.')} label="Include Health" note={layoutHasHealth ? 'With an account open, the account\'s Health permission is needed as well.' : 'Health is not on your Today layout on this device, so it cannot be shared. Add it to Today first.'}/>
    </div>
    <p className="ai-note nova-status-line" role="status">{scopes.health && gateOpen ? 'Health is open to NOVA now.' : `Health is closed to NOVA now${scopes.health ? ' (ZIGi\'s Health gate is closed' + (consent.accountActive && consent.accountHealthPermitted !== true ? ': the account\'s Health permission is off on this device)' : ')') : ''}: nothing from Health is read, remembered or sent.`}</p>
    <h4>Memory and journal</h4>
    <div className="ai-switch-list">
      <Switch checked={options.data.useNotes !== false} onChange={next => { try { options.update(c => ({...c, useNotes: next})); setMessage({text: next ? 'Your memory is used again.' : 'Your memory stays here and goes to no AI.'}); } catch (error) { fail(error); } }} label="Use my memory" note="Your remembered notes go with a message, pinned ones first. Off: they stay on this device and go nowhere."/>
    </div>
    <p className="ai-note">Journal sharing (Journal&rsquo;s own switch) is {journal.loaded && journal.data.shareWithAi ? 'on' : 'off'}: {journal.loaded && journal.data.shareWithAi ? 'with Journal allowed above, entries may go to your model.' : 'entries never go to a model; with Journal allowed above, NOVA still reads them on this device.'}</p>
    {message && <p role={message.failed ? 'alert' : 'status'} className="ai-note">{message.text}</p>}
    {/* Session AM (ADR-038 D13, A2): the one switch for outside data, with what the service sees. */}
    <WeatherChoice/>
  </div>;
}
