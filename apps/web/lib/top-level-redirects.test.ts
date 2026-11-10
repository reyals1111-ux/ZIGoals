import {expect, test} from 'vitest';
import nextConfig from '../next.config';

// Session AL (P-NB-08; NB-002, NB-033): /welcome, /onboarding, /start and /setup at the top level open the welcome.
test('P-NB-08: the top-level setup addresses redirect (temporary) to /app/welcome; nothing else is redirected', async () => {
  const redirects = await nextConfig.redirects!();
  expect(redirects).toEqual(['welcome', 'onboarding', 'start', 'setup'].map(word => ({source: `/${word}`, destination: '/app/welcome', permanent: false})));
});
