'use client';
import {isCloudTarget} from '../../../../lib/ai/privacy-mode';
import {readAiSettings} from '../../../../lib/ai/settings';
import {setPrivacyMode} from '../../../../lib/nova/setup';
import {NOVA_PHONE_QUERY} from '../../../../lib/nova/phone-path';
import {checkMeet} from '../../../../lib/nova/setup-checks';
import {novaAndZigi} from '../../../../lib/nova/one-line';
import {STAGE_EXAMPLES, STAGE_INTRO, STAGE_KEEP, STAGE_NO_BRAIN} from '../../../../lib/nova/setup-guide';
import {localDate} from '../../../../lib/local-date';
import {getAppStorage} from '../../../../lib/showcase-storage';
import {CheckRow} from '../check-row';
import type {SetupState} from '../use-setup';

/** Everything this browser keeps, as text, for the plain-key check (read only; nothing leaves the page). */
function storedValues(): string[] {
  const out: string[] = [];
  for (const store of [globalThis.localStorage, globalThis.sessionStorage]) {
    try { for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k) out.push(store.getItem(k) ?? ''); } } catch { /* a blocked store holds nothing to read */ }
  }
  return out;
}
/** Planet 1: what stays private, said plainly, and a check of this browser's own storage. */
export default function MeetStep({setup}: {setup: SetupState}) {
  const run = () => {
    const result = checkMeet(storedValues());
    // A new NOVA setup starts Strict when no cloud model is connected: nothing changes for the person, and the safe default holds.
    if (result.ok && !setup.record.data.privacyMode) {
      let cloud = true; try { const s = readAiSettings(getAppStorage()).data; cloud = s.enabled && isCloudTarget(s.provider, false, s.model); } catch { /* unknown: leave the choice to step 2 */ }
      // Session AK P4 (FR-5): not on a phone, which cannot run the local model Strict needs; step 2 suggests Guarded there.
      const phone = !!globalThis.matchMedia?.(NOVA_PHONE_QUERY).matches;
      if (!cloud && !phone) setup.record.update(r => setPrivacyMode(r, 'strict', localDate()));
    }
    return result;
  };
  return <>
    <p>NOVA is your own assistant inside ZIGoals: it reads your goals, habits, health and money records with your permission and helps you act on them. You build its brain yourself.</p>
    {/* Release review 2 (R2-4): the one sentence that tells NOVA and ZIGi apart, the same words everywhere. */}
    <p>{novaAndZigi()} They share one engine, one history and one memory.</p>
    {/* Session AM (ADR-038 D2, D3, D6): the stage as it is now: ask, an answer and a widget made for it; pin, hide, close. */}
    <p><b>Ask, and NOVA shows you.</b> {STAGE_INTRO}</p>
    <p>Three to try:</p>
    <ul className="nova-promises">{STAGE_EXAMPLES.map(q => <li key={q}>“{q}”</li>)}</ul>
    <p>{STAGE_KEEP} {STAGE_NO_BRAIN}</p>
    <p><b>What NOVA keeps private:</b></p>
    <ul className="nova-promises">
      <li><b>Everything stays on this device.</b> Your records, chats, memory and settings live in this browser. ZIGoals has no server for NOVA.</li>
      <li><b>Keys never leave it.</b> An API key is sealed in this browser’s own key store, never synced and never sent to ZIGoals; only your provider receives it, with each request.</li>
      <li><b>Nothing is trained on.</b> ZIGoals trains no model. A local model keeps everything on your computer; a cloud provider’s own terms apply to what you send it.</li>
      <li><b>Money never moves.</b> NOVA proposes; you confirm each card. Nothing is signed, sent or moved by NOVA or ZIGi.</li>
    </ul>
    <CheckRow id="meet" setup={setup} run={run} label="I understand — check this device"/>
  </>;
}
