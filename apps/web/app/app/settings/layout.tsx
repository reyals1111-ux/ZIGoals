import type {ReactNode} from 'react';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): the page is a client component, so its title, "Settings · ZIGoals Alpha", is set here.
export const metadata: Metadata = {title: 'Settings'};
export default function Layout({children}: {children: ReactNode}) { return children; }
