import { PositionsView } from '../../../components/platform/positions-view';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: 'Staking'};
/** Staking (Session I; formerly "Stake / Positions" at /app/goals/positions): the watch-only ZIG staking tracker and the Positions behind Wealth and Goals. */
export default function Page(){return <PositionsView/>;}
