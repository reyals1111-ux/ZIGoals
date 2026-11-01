'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOVA_SETUP, setupProgress} from '../../lib/nova/setup';
import {NOVA_HERMES, hermesProgress} from '../../lib/nova/hermes-record';
import {NovaIcon} from './icons';
import {NovaOrb} from './orb';
import './guide-band.css';

/**
 * Session AK P3 (NOVA_DESIGN_REVIEW.md ND-19): the planet guides keep the app's page (its sidebar, Help and wallet), and
 * gain a slim strip of NOVA's night across their top, so "Start the guide" does not feel like leaving NOVA: the small
 * still orb, the guide's progress in planets lit, and "Back to NOVA" as the first control of the page's content. In Light
 * the strip is one of the theme's dark islands (it wears `.nova-root`'s night tokens); the rest of the page stays light.
 */
export function NovaGuideBand({guide}: {guide: 'nova' | 'hermes'}) {
  const setup = useDeviceRecord(NOVA_SETUP), hermes = useDeviceRecord(NOVA_HERMES);
  const progress = guide === 'nova' ? (setup.loaded && !setup.unreadable ? setupProgress(setup.data) : null) : (hermes.loaded && !hermes.unreadable ? hermesProgress(hermes.data) : null);
  return <nav className="nova-root nova-guide-band" aria-label="NOVA">
    <Link className="nova-guide-band-back" href="/app/nova" prefetch={false}><NovaIcon name="left" size={20}/>Back to NOVA</Link>
    <span className="nova-guide-band-orb" aria-hidden="true"><NovaOrb size={36}/></span>
    <p className="nova-guide-band-progress">{progress ? <><strong>{progress.done} of {progress.total}</strong> {guide === 'nova' ? 'planets lit' : 'Hermes planets lit'}</> : ' '}</p>
  </nav>;
}
