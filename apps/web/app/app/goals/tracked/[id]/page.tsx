import { TrackedDetail } from '../../../../../components/platform/tracked-detail';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: 'Goal'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <TrackedDetail id={id}/>;}
