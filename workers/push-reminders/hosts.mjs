/**
 * Push-service hosts a reminder may be sent to (ADR-010 "Limits"): the Worker posts only to https endpoints whose
 * host is on this list, so a forged endpoint cannot turn it into a request to anything else. Verified hosts come
 * from the vendors' own pages (URL and date beside each); hosts without such a page are not built in. The owner adds
 * further exact hosts or "*.suffix" patterns through the PUSH_ALLOWED_HOSTS var, with their source recorded in STATUS.
 */
export const VERIFIED_HOSTS=[
 // Apple, "Sending web push notifications in web apps and browsers", https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
 // (read 2026-10-04, again 2026-10-05): "If your network infrastructure limits which URLs your server can access, allow access for https://*.push.apple.com".
 '*.push.apple.com',
 // Google, Chromium source https://chromium.googlesource.com/chromium/src/+/main/components/push_messaging/push_messaging_constants.cc (read 2026-10-04, again 2026-10-05):
 // kPushMessagingGcmEndpoint "https://fcm.googleapis.com/fcm/send/" and kPushMessagingWebpushEndpoint "https://fcm.googleapis.com/wp/".
 // The staging Web Push endpoint is fcm.googleapis.com too ("/preprod/wp/"); only the staging GCM endpoint, jmt17.google.com, is
 // elsewhere. It is not built in and can be added through PUSH_ALLOWED_HOSTS.
 'fcm.googleapis.com',
 // Microsoft, Edge policy "ForceBuiltInPushMessagingClient" (Edge connects to the Windows Push Notification Service),
 // https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/forcebuiltinpushmessagingclient, and the WNS overview,
 // https://learn.microsoft.com/en-us/windows/apps/develop/notifications/push-notifications/wns-overview (both read 2026-10-04; WNS again 2026-10-05): "the channel URI uses the
 // domain "notify.windows.com". The service should never push notifications to a channel on any other domain. [...] The subdomain of the channel URI is subject to change".
 '*.notify.windows.com',
 // Mozilla, autopush documentation, https://mozilla-services.github.io/autopush-rs/ (read 2026-10-04, again 2026-10-05): "Endpoint: https://updates.push.services.mozilla.com/".
 'updates.push.services.mozilla.com',
];
const HOST=/^(\*\.)?[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$/;
/** The PUSH_ALLOWED_HOSTS var: comma-separated exact hosts or "*.suffix" patterns; anything else is refused. @param {unknown} value */
export function parseExtraHosts(value){
 if(value===undefined||value==='')return [];if(typeof value!=='string'||value.length>2048)throw Error('PUSH_ALLOWED_HOSTS');
 const hosts=value.split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
 // An all-numeric last label is an IPv4 address, never a push service's host name (Session U Part 6).
 for(const host of hosts)if(!HOST.test(host)||/\.\d+$/.test(host))throw Error('PUSH_ALLOWED_HOSTS');
 return hosts;
}
/** @param {string} hostname @param {readonly string[]} patterns */
export function hostAllowed(hostname,patterns){const host=hostname.toLowerCase();return patterns.some(p=>p.startsWith('*.')?host.endsWith(p.slice(1))&&host.length>p.length-1:host===p);}
/**
 * The normalised endpoint the Worker may post to (https, no credentials, fragment or explicit port, at most 2 KB, host on
 * the list), or null. A port is refused (Session U Part 6): no vendor's endpoint names one, and a forged endpoint must
 * not reach another service on an allowed host. https://host:443/ normalises to no port and stays allowed.
 * @param {unknown} endpoint @param {readonly string[]} [extra]
 */
export function allowedEndpoint(endpoint,extra=[]){
 if(typeof endpoint!=='string'||endpoint.length>2048)return null;
 let url;try{url=new URL(endpoint);}catch{return null;}
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port!==''||!hostAllowed(url.hostname,[...VERIFIED_HOSTS,...extra]))return null;
 return url.href;
}
