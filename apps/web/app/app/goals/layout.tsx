import type {ReactNode} from 'react';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): the Goals page is a client component, so its title, "Goals · ZIGoals Alpha", is set
// here. A layout's plain title would stop the root template for the pages under it (Create a goal, a Goal), so this
// one carries the template on.
export const metadata: Metadata = {title: {default: 'Goals', template: '%s · ZIGoals Alpha'}};
export default function Layout({children}: {children: ReactNode}) { return children; }
