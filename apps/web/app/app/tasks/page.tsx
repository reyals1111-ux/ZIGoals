import type {Metadata} from 'next';
import {TasksPage} from '../../../components/tasks/tasks-page';
// Session AK (T1): every task in one place, its own route chunk (the Pomodoro loads on use). The lead adds the navigation entries.
export const metadata: Metadata = {title: 'Tasks'};
export default function Tasks() { return <TasksPage />; }
