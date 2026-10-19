import type {Metadata} from 'next';
import {StoriesPage} from '../../../components/stories/stories-page';
// Session AF (L5b; P9.3, ADR-028 H78, H79): Stories, its own route chunk (the player loads with it, never on Today).
export const metadata: Metadata = {title: 'Stories'};
export default function Stories() { return <StoriesPage />; }
