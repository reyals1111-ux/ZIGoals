import type {ReactNode} from 'react';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): the page is a client component, so its title, "Settings · ZIGoals Alpha", is set here.
// Session AC (the owner's hosted check on #41 failed on "Reminders"): a layout's plain title stops the root template for
// the pages under it (Reminders, Your data), so this one carries the template on, as the Goals layout does.
export const metadata: Metadata = {title: {default: 'Settings', template: '%s · ZIGoals Alpha'}};
export default function Layout({children}: {children: ReactNode}) { return children; }
