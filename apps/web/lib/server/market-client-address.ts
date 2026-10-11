/** The address group that the market's per-client limits count against: an IPv4 address as is, an IPv4-mapped
 * IPv6 address as IPv4, any other IPv6 address by its /48. Loopback, unspecified and unparsable values give no
 * group: Cloudflare's edge never delivers them, and local runtimes must not share one artificial client.
 * The value only travels to the market coordinator, which stores no address or group (market-client-limits.ts). */
export function marketClientGroup(raw:string|null|undefined):string|null{
 const value=(raw??'').trim().toLowerCase();if(!value||value.length>64)return null;
 const v4=(text:string)=>{const parts=text.split('.');if(parts.length!==4||parts.some(p=>!/^\d{1,3}$/.test(p)||Number(p)>255))return null;const bytes=parts.map(Number);return bytes[0]===127||bytes[0]===0?null:'v4:'+bytes.join('.');};
 if(!value.includes(':'))return v4(value);
 let text=value;const dotted=/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
 if(dotted){if(/^(?:(?:0{1,4}:){5}|::)ffff:$/.test(dotted[1]!))return v4(dotted[2]!);const four=v4(dotted[2]!);if(!four)return null;const [a,b,c,d]=four.slice(3).split('.').map(Number) as [number,number,number,number];text=dotted[1]+((a<<8)|b).toString(16)+':'+((c<<8)|d).toString(16);}
 if(!/^[0-9a-f:]+$/.test(text)||text.split('::').length>2)return null;
 const [head,tail]=text.includes('::')?text.split('::') as [string,string]:[text,null],left=head?head.split(':'):[],right=tail?tail.split(':'):[];
 if([...left,...right].some(h=>!/^[0-9a-f]{1,4}$/.test(h)))return null;
 const missing=8-left.length-right.length;if(tail===null?missing!==0:missing<1)return null;
 const groups=[...left,...Array(tail===null?0:missing).fill('0'),...right].map(h=>h.padStart(4,'0'));
 if(groups.every(h=>h==='0000'))return null;if(groups.slice(0,7).every(h=>h==='0000')&&groups[7]==='0001')return null;
 return 'v6:'+groups.slice(0,3).join(':')+'::/48';
}
/** What the coordinator accepts from the app in `x-market-client`. */
export const MARKET_CLIENT_GROUP=/^(?:v4:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}|v6:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}::\/48)$/;
