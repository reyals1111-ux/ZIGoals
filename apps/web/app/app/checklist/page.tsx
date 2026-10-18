import type {Metadata} from 'next';
import {ChecklistPage} from '../../../components/checklist/checklist-page';
// Session AF (L3, ADR-028 H67): the Checklist, full-bleed inside the app shell, its own route chunk (the path engine
// loads with it, never on Today).
export const metadata: Metadata = {title: 'Checklist'};
export default function Checklist() { return <ChecklistPage />; }
