import type {Metadata} from 'next';
import {EarnView} from '../../../components/earn/earn-view';
// Session AF (L1): the Earn hub. Its own title, "Earn · ZIGoals Alpha" (app/layout.tsx's template; no layout here).
export const metadata: Metadata = {title: 'Earn'};
/** The ways to earn on ZIGChain that ZIGoals reads, with live numbers, risks and guide mode (components/earn/earn-view.tsx). */
export default function Page() { return <EarnView/>; }
