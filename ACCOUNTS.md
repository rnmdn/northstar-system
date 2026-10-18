# Student accounts

Supabase Auth manages email/password credentials, email confirmation and password resets. NorthStar never stores passwords. Native server requests call the documented Supabase Auth API; there is no new client SDK or separate credential database.

## What is saved

The existing encrypted assessment record remains unchanged in location. An encrypted account-to-owner pointer links the verified Supabase user ID to it. Opaque, HttpOnly, SameSite cookies identify encrypted server sessions containing access/refresh tokens. Every account request verifies identity with Supabase; expired access tokens refresh on the server. No service key or Auth token is returned to browser JavaScript.

Profile answers, skill responses, grades, career selections and completed learning activities use the existing autosave and revision checks. Submitted answers remain locked. Login does not submit, regrade, overwrite, or unlock an assessment.

## Existing assessments

1. Before signing in, open **Recovery options** and keep a recovery code. Save/download any pending draft first.
2. Create and verify an account, then sign in.
3. On **My assessment**, open **Link an earlier assessment** and enter its code.

An assessment can belong to only one account. Linking refuses to replace an account that already has saved answers. After linking, anonymous browser cookies and the recovery code alone cannot open it; sign in to its account. Account sign-out leaves server records intact.

## Deployment

Existing `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NORTHSTAR_STORAGE_KEY` and Supabase storage configuration remain required. Prefer `SUPABASE_PUBLISHABLE_KEY` for Auth requests; if omitted, the server-only Supabase key is used. Never expose the service key in public files.

In Supabase Authentication:

- Keep email confirmation enabled.
- Set Site URL to `https://northstar-system-one.vercel.app`.
- Allow exactly `https://northstar-system-one.vercel.app/auth-callback.html` as an email redirect. Local tests need their own exact localhost callback when using real Supabase.
- Configure custom SMTP and verify the sender. Supabase's default email sender is restricted to project-team recipients and is unsuitable for student registration.

Set `NORTHSTAR_AUTH_EMAIL_READY=true` only after testing real signup and reset email delivery. In production, registration and reset remain unavailable until that flag is set, with a clear notice and Recovery options. Existing anonymous assessments remain usable while email setup is incomplete. Sign-in works for existing confirmed accounts.

Production requires sign-in for assessment API access by default. Existing anonymous students can link saved records using an existing recovery code after signing in. `NORTHSTAR_AUTH_REQUIRED=false` is an explicit migration-only opt-out. The UI offers **Sign in** on Home and **My assessment** throughout the journey.

Email confirmation/reset use PKCE with a server-held verifier and a one-hour flow cookie. Links must open in the browser that requested them. A reset session permits one password update within 15 minutes. On another device, request a fresh reset there. Passwords require at least 10 characters; Supabase may enforce stronger project rules.

## Verification

Run `npm run test:accounts` and `npm test`. Account tests use a fake Auth provider and disposable local encrypted records, never real student accounts. They cover account isolation, recovery claiming, anonymous access revocation, persistence through restart, session logout, PKCE and reset authorization. Live email delivery and cross-device user acceptance still need an SMTP sender and a person completing the email flow.

Current scope is one saved assessment per account. Retakes, account deletion/export workflows, an account privacy policy and institution-specific retention rules require a separate product decision before a wider student rollout.
