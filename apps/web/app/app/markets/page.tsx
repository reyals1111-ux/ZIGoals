import {MarketsView} from '../../../components/platform/markets-view';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: 'Markets'};
export default function Page(){return <MarketsView/>;}
