import type {ReactNode} from 'react';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): the page is a client component, so its title, "Goal · ZIGoals Alpha", is set here.
export const metadata: Metadata = {title: 'Goal'};
export default function Layout({children}: {children: ReactNode}) { return children; }
