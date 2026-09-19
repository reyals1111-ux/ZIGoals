import { TrackedDetail } from '../../../../../components/platform/tracked-detail';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <TrackedDetail id={id}/>;}
