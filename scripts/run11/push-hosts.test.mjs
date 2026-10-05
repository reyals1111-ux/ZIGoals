// workers/push-reminders/hosts.mjs (Session U Part 6): the only hosts the push Worker posts a reminder to. Each vendor host
// is cited in the file and was read again on 2026-10-05; these tests pin what is accepted and what is refused.
import {expect,test} from 'vitest';
import {VERIFIED_HOSTS,allowedEndpoint,hostAllowed,parseExtraHosts} from '../../workers/push-reminders/hosts.mjs';

test('the built-in list is exactly the four cited vendor hosts',()=>{
 expect(VERIFIED_HOSTS).toEqual(['*.push.apple.com','fcm.googleapis.com','*.notify.windows.com','updates.push.services.mozilla.com']);
});
test('real endpoint shapes of each vendor are accepted and come back normalised',()=>{
 for(const endpoint of [
  'https://web.push.apple.com/QGuQyavXutnMH9inACMMHZHqCzkp9qB-JmTBR7MhmVuS',
  'https://api.push.apple.com/3/device/fixture',
  'https://fcm.googleapis.com/fcm/send/fixture-token:APA91b',
  'https://fcm.googleapis.com/wp/fixture-token',
  'https://wns2-par02p.notify.windows.com/w/?token=fixture%2Btoken',
  'https://db5p.notify.windows.com/w/?token=fixture',
  'https://updates.push.services.mozilla.com/wpush/v2/gAAAAAfixture',
  'HTTPS://FCM.GOOGLEAPIS.COM/wp/fixture',
  'https://fcm.googleapis.com:443/wp/fixture',
 ])expect(allowedEndpoint(endpoint),endpoint).toBe(new URL(endpoint).href);
});
test('look-alikes, other schemes, credentials, fragments, ports and oversized endpoints are refused',()=>{
 for(const endpoint of [
  'http://fcm.googleapis.com/wp/fixture',
  'wss://fcm.googleapis.com/wp/fixture',
  'https://fcm.googleapis.com.attacker.invalid/wp/fixture',
  'https://attacker-fcm.googleapis.com/wp/fixture',
  'https://googleapis.com/wp/fixture',
  'https://push.apple.com/fixture',
  'https://push.apple.com.attacker.invalid/fixture',
  'https://webpush.apple.com/fixture',
  'https://notify.windows.com/w/?token=x',
  'https://notify.windows.com.attacker.invalid/w',
  'https://attackernotify.windows.com/w',
  'https://push.services.mozilla.com/wpush/v2/x',
  'https://updates.push.services.mozilla.com.attacker.invalid/x',
  'https://user:pass@fcm.googleapis.com/wp/fixture',
  'https://user@web.push.apple.com/fixture',
  'https://fcm.googleapis.com/wp/fixture#fragment',
  'https://fcm.googleapis.com:8443/wp/fixture',
  'https://web.push.apple.com:2197/fixture',
  'https://updates.push.services.mozilla.com:80/x',
  'https://127.0.0.1/wp',
  'https://[::1]/wp',
  'https://fcm.googleapis.com/'+'x'.repeat(2048),
  'not a url','',null,undefined,42,{href:'https://fcm.googleapis.com/wp/x'},
 ])expect(allowedEndpoint(endpoint),String(endpoint).slice(0,80)).toBeNull();
});
test('a "*.suffix" pattern needs a real subdomain; an exact host matches only itself',()=>{
 expect(hostAllowed('a.push.apple.com',['*.push.apple.com'])).toBe(true);
 expect(hostAllowed('a.b.push.apple.com',['*.push.apple.com'])).toBe(true);
 expect(hostAllowed('push.apple.com',['*.push.apple.com'])).toBe(false);
 expect(hostAllowed('.push.apple.com',['*.push.apple.com'])).toBe(false);
 expect(hostAllowed('xpush.apple.com',['*.push.apple.com'])).toBe(false);
 expect(hostAllowed('FCM.googleapis.com',['fcm.googleapis.com'])).toBe(true);
 expect(hostAllowed('a.fcm.googleapis.com',['fcm.googleapis.com'])).toBe(false);
});
test('PUSH_ALLOWED_HOSTS adds exact hosts or "*.suffix" patterns and refuses anything else',()=>{
 expect(parseExtraHosts(undefined)).toEqual([]);expect(parseExtraHosts('')).toEqual([]);
 expect(parseExtraHosts(' jmt17.google.com, *.Push.Example.net ,')).toEqual(['jmt17.google.com','*.push.example.net']);
 expect(allowedEndpoint('https://jmt17.google.com/fcm/send/x')).toBeNull();
 expect(allowedEndpoint('https://jmt17.google.com/fcm/send/x',parseExtraHosts('jmt17.google.com'))).toBe('https://jmt17.google.com/fcm/send/x');
 for(const value of ['*','*.com','*.','https://jmt17.google.com','jmt17.google.com:443','jmt17.google.com/path','*.*.example.net','exa mple.net','-bad.example.net','bad-.example.net','localhost','127.0.0.1','10.0.0.1','*.0.0.1','a..b.net','x'.repeat(2049),42,{}])
  expect(()=>parseExtraHosts(value),String(value).slice(0,40)).toThrow('PUSH_ALLOWED_HOSTS');
});
