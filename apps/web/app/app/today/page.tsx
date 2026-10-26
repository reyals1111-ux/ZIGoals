import {redirect} from 'next/navigation';
/** Session AH (TO1, M-095): /app/today is Today's own address too (it had been a 404); it opens Today at /app (with a hash: a deliberate link, so a chosen start page does not move it). */
export default function TodayAlias(): never { redirect('/app#today'); }
