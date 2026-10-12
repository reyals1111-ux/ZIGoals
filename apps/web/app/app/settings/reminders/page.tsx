import type {Metadata} from 'next';
import {RemindersPlanPage} from '../../../../components/reminders/reminders-plan';
// Session AA-Local Part 4 (S7): the Reminders page under Settings (a new file only; the link from Settings is AA-Cloud's).
export const metadata: Metadata = {title: 'Reminders'};
export default function Reminders() { return <RemindersPlanPage />; }
