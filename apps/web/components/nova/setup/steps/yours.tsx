'use client';
import Link from 'next/link';
import {AI_USAGE} from '../../../../lib/ai/store/records';
import {NOVA_STORE} from '../../../../lib/nova/store';
import {checkYours} from '../../../../lib/nova/setup-checks';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {CheckRow} from '../check-row';
import type {SetupState} from '../use-setup';

/** Planet 10: layout, widgets, persona, custom instructions, a cost cap and "Share my NOVA setup" (no personal data). */
export default function YoursStep({setup}: {setup: SetupState}) {
  const nova = useDeviceRecord(NOVA_STORE), usage = useDeviceRecord(AI_USAGE);
  return <>
    <p>Make NOVA yours: a layout (Orbit, Bento, Focus or Minimal), the widgets on its orbits, its name and avatar, your own instructions, and a daily cost cap for a cloud model. Share your setup as a small file with no personal data in it.</p>
    <div className="ai-card-actions"><Link className="primary" href="/app/nova">Make it yours on NOVA</Link><Link className="secondary" href="/app/settings#zigi-usage">Cost cap in Settings</Link></div>
    <CheckRow id="yours" setup={setup} run={() => checkYours(nova.data, usage.data)} disabled={!nova.loaded || !usage.loaded}/>
  </>;
}
