import type {Metadata} from 'next';
import {GuidedView} from '../../../components/guided/guided-view';
// Session AJ (item 34, D13, A7): Guided journeys, its own route chunk (components/guided/guided-view.tsx). No sidebar entry:
// Goals, Habits, My Universe and search link here (components/guided/guided-link.tsx).
export const metadata: Metadata = {title: 'Guided journeys'};
export default function Guided() { return <GuidedView />; }
