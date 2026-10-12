import {TemplateLibrary} from '../../../../components/goals/template-library';
import type {Metadata} from 'next';
// Session AA-Cloud Part 2 (G6): the template library.
export const metadata: Metadata = {title: 'Goal templates'};
export default function Page() { return <TemplateLibrary />; }
