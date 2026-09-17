# Local Workers relay correction

- The first OpenNext build, dry run and 28 browser/security checks passed, but a real synthetic-account relay probe returned HTTP 502 on both networks. Browser mocks alone did not exercise the upstream fetch runtime.
- A temporary localhost-only Worker probe exposed the cause: Workers rejects `redirect: "error"`; it supports only `follow` or `manual`.
- Native server reads now use `redirect: "manual"`. Every non-2xx response, including redirects, is rejected before parsing; requests never follow an arbitrary Location.
- A regression first reproduced the Workers TypeError, then passed after the one-option correction. It also verifies a 302 is rejected after exactly one fetch.
- The fixed local probe read mainnet block 12209616 with matching height evidence on every response. Final full relay results, rebuilt source identity and security gate are recorded in validation.json.
- No production change or financial transaction occurred; probes used the existing synthetic zero-balance address.
