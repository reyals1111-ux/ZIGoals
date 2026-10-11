import { redirect } from 'next/navigation';
/**
 * The Staking page moved to /app/staking (Session I). Old links, bookmarks and pinned Today cards keep working: this is a
 * temporary (307) redirect, so no browser caches it and a rollback stays clean. The query is kept; browsers keep the hash.
 */
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=new URLSearchParams();
 for(const [key,value] of Object.entries(await searchParams))for(const item of Array.isArray(value)?value:value===undefined?[]:[value])query.append(key,item);
 const rest=query.toString();
 redirect(`/app/staking${rest?`?${rest}`:''}`);
}
