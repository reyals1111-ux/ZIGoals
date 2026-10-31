import type {Metadata} from 'next';
import {AgendaPage} from '../../../components/agenda/agenda-page';
// Session AK (F5d): the agenda, its own route chunk (its export loads on use). Reached from Today, Help and Search; no navigation entry.
export const metadata: Metadata = {title: 'Agenda'};
export default function Agenda() { return <AgendaPage />; }
