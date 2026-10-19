import type {Metadata} from 'next';
import {GovernanceView} from '../../../components/governance/governance-view';
// Session AF chunk 3 (lane L2a): its own title, "Governance · ZIGoals Alpha" (app/layout.tsx's template; no layout here).
export const metadata: Metadata = {title: 'Governance'};
/** ZIGChain governance in plain words, and votes signed in the person's own wallet (components/governance/governance-view.tsx). */
export default function Page() { return <GovernanceView/>; }
