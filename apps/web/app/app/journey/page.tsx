import type {Metadata} from 'next';
import {JourneyPage} from '../../../components/game/journey';
// Session AA-Local Part 2 (H7): the Journey page, its own route chunk (components/game/journey.tsx).
export const metadata: Metadata = {title: 'Journey'};
export default function Journey() { return <JourneyPage />; }
