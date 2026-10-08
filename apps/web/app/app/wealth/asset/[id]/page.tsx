import {AssetDetail} from '../../../../../components/platform/asset-detail';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: 'Asset'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AssetDetail id={decodeURIComponent(id)}/>;}
