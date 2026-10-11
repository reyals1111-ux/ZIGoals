import {expect,test} from 'vitest';
import {trustedOrigin} from './trusted-origin';

// Session U Part 6 (FIX_PLAN D2): the layout's canonical and social-card origin comes only from this list.
test('only the public Alpha, the acceptance app and loopback origins are used; anything else gives no origin at all', () => {
  for (const origin of ['https://alpha.zigoals.app', 'https://accounts-test.zigoals.app', 'http://127.0.0.1:3100', 'http://localhost:3100', 'http://127.0.0.1:8788', 'https://localhost:8443', 'http://[::1]:3100'])
    expect(trustedOrigin(origin), origin).toBe(origin);
  for (const origin of ['https://attacker.invalid', 'https://alpha.zigoals.app.attacker.invalid', 'http://alpha.zigoals.app', 'https://alpha.zigoals.app/', 'https://alpha.zigoals.app/app', 'https://user@alpha.zigoals.app',
    'https://zigoals-alpha.fictional.workers.dev', 'https://accounts-test.zigoals.app.attacker.invalid', 'http://accounts-test.zigoals.app', 'javascript:alert(1)', 'file:///etc/passwd', 'ftp://127.0.0.1', 'http://127.0.0.1.attacker.invalid', 'not a url', '', null, undefined])
    expect(trustedOrigin(origin as string|null|undefined), String(origin)).toBeNull();
});
