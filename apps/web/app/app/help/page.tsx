import {HelpPage} from '../../../components/help/help-page';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: 'Help'};

/** Help (Session L), linked once from Settings. */
export default function Page() { return <HelpPage/>; }
