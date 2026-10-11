import type {Metadata} from 'next';
import {MeetZigi} from '../../../components/zigi/meet-zigi';

/** The page's own document title (X-Cloud's H4, WCAG 2.4.2): the tab, the history entry and the screen reader name it. */
export const metadata: Metadata = {title: 'Meet ZIGi'};

/** Meet ZIGi (Session V Part 12): every state of every skin, linked from Customize; not in the navigation. */
export default function Page() { return <MeetZigi/>; }
