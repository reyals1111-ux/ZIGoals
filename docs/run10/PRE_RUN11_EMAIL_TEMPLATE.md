# Owner email-code smoke test — LIVE_DELIVERY_NOT_RUN

Supabase Dashboard → **Authentication → Email Templates → Magic Link**: replace that template's subject/body with the approved OTP content below. Supabase sends an email code when the template contains `{{ .Token }}`; the existing app accepts 6–10 digits. Keep provider rate limits and expiration as configured by the owner. See [Supabase passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

Subject: `Your ZIGoals sign-in code`

Plain text:

```text
Your ZIGoals sign-in code is {{ .Token }}

Enter this code only in the ZIGoals sign-in screen. If you did not request it, ignore this email.
```

HTML:

```html
<p>Your ZIGoals sign-in code is <strong>{{ .Token }}</strong></p>
<p>Enter this code only in the ZIGoals sign-in screen. If you did not request it, ignore this email.</p>
```

After owner setup, privately put `ZIGOALS_ALLOWED_AUTH_ORIGIN` (exactly equal to `ZIGOALS_AUTH_ORIGIN`) and `ZIGOALS_TEST_RECIPIENTS` (comma-separated controlled inboxes) in ignored, mode-0600 `apps/web/.env.local`. Do not put a service-role key there. These commands prompt privately for one allowlisted recipient and then its code; each invocation makes at most one provider request and does not print/store returned tokens:

```sh
node --env-file=apps/web/.env.local scripts/pre-run11-setup.mjs --auth-only
node --env-file=apps/web/.env.local scripts/pre-run11-email.mjs request
node --env-file=apps/web/.env.local scripts/pre-run11-email.mjs verify
```

The first command checks only local email configuration; `AUTH_CONFIGURATION: PASS` does not establish delivery or application readiness. Run the request/verify pair separately for each controlled inbox. The helper prompts in a private terminal; actual app use enters the code on the ZIGoals sign-in screen. Each explicit `request` sends one OTP request with `create_user:true`, which can create a user in the selected nonproduction Supabase project. There is no automatic retry or unattended OTP wait. `CODE_VERIFIED` would prove provider authentication only; it would not prove phone/desktop encrypted sync or app runtime exposure. This preparation used offline fixtures only and sent no real email. Local key classification accepts supported publishable and legacy anon shapes, but cannot verify a signature, project ownership or live validity.
