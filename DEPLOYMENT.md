# Render Free + Supabase Free

## Vercel migration

`vercel.json` publishes only generated `public/` pages/assets to the CDN and routes `/api/*` and `/healthz` to `api/index.js`. The Node function reuses the backend and Supabase adapter, with a 60-second duration and Singapore region. `scripts/build-vercel.cjs` explicitly excludes backend files from the public output. Node 24 is required for the SQL checker; its worker is included in the function bundle.

Import the repository as **Other**, not a Python application or multi-service project. The Python tools are offline research tools, not deployed services. Use Node 24.x. Copy the existing server environment variables from Render, including the exact same NORTHSTAR_STORAGE_KEY and Supabase project configuration. Never generate a replacement encryption key for existing data. Vercel supplies VERCEL_URL and VERCEL_PROJECT_PRODUCTION_URL; optional NORTHSTAR_PUBLIC_URL overrides the canonical public origin for a custom domain.

Browser cookies are domain-specific. Existing users need their recovery code from the Render site to open the same assessment on the Vercel domain. The database and encryption format remain unchanged. The original Render deployment remains available during verification. Vercel does not remove Gemini/Groq quota limits; grading still uses the provider fallback and pending/error behavior documented below. No durable background grading queue is introduced by this hosting change.

## Deployment record — October 13, 2026

- Public site: https://northstar-x96p.onrender.com
- Render service: `srv-db72vtaj9qps73b1e4u0`, Node 24.19.0, Free, Singapore.
- Supabase project: `mncmpsuwclksayfiayqv`, NorthStar, rnmdn's Org, Free, Singapore.
- Verified live: HTTPS and health check, private server paths blocked, encrypted cloud save/reload, recovery after replacement deployments, submitted-answer edits rejected. SQL checks confirmed RLS and denied table/function access for anon and authenticated roles. All 15 records at verification were encrypted envelopes.
- Local assessment, RF, and cloud-adapter regression checks passed.
- Gemini initially returned high-demand HTTP 503 and timeouts. After adding the Groq backup, the saved fictional assessment successfully graded using Groq `openai/gpt-oss-120b` with `fallbackUsed=true`, and the trained RF returned three suggestions. Recovery after replacement deployments and submitted-answer locks passed again. The repeat check reused cached grades. This verifies the live integration; independent grading calibration remains pending.
- Secrets were entered only in Render configuration; no credentials or student records were committed. The temporary transfer file was removed.

The existing Render service is connected to the private `rnmdn/north-star-app` repository. A public source snapshot can coexist with that deployment repository.

The production server uses Supabase for encrypted assessment records. Render's local disk is ephemeral and is never used for production records. Local development continues to use the existing encrypted file store.

## Initial deployment

1. Create NorthStar in rnmdn's Org on Supabase Free, Singapore. Enable Data API and RLS; disable automatic table exposure.
2. Apply `supabase/migrations/202610130001_storage.sql` in the SQL editor. It creates two private tables and server-only storage functions. The migration is repeatable.
3. Connect Render to the private GitHub repository `rnmdn/north-star-app`. Create a Blueprint using `render.yaml`, or a Node web service with the same settings. Select Free and Singapore.
4. Configure server environment variables:
   - `SUPABASE_URL`: project URL.
   - `SUPABASE_SECRET_KEY`: server-only secret key, never the publishable key.
   - `GEMINI_API_KEY`: grading key.
   - `GEMINI_MODEL=gemini-3.5-flash-lite`: explicit model matching the project's free quota; avoid a moving alias.
   - `GROQ_API_KEY`: optional server-only Groq key, enabling the automatic backup.
   - `GROQ_MODEL=openai/gpt-oss-120b`: backup model with strict JSON schema support.
   - `NORTHSTAR_STORAGE_KEY`: a stable base64-encoded 32-byte encryption key (the Blueprint generates it). Save a private backup of this key; losing it makes existing encrypted records unreadable.
   - `NORTHSTAR_STORAGE=supabase`, `ASTRA_HTTPS=true`, `NODE_ENV=production`, `NODE_VERSION=24.19.0`.
5. Build `npm ci`, start `npm start`, health path `/healthz`. Render supplies `PORT` and `RENDER_EXTERNAL_URL`. For a custom domain, set `NORTHSTAR_PUBLIC_URL` to its HTTPS origin.
6. Verify a synthetic assessment saves, reloads after a deployment, resumes with its recovery code, and cannot edit submitted answers. Verify public/publishable Supabase access cannot read records. Verify grading and RF results before inviting students.

## Data and access

### Grading fallback

When a Groq key is configured, Gemini has a 15-second attempt and Groq has a 20-second backup attempt, fitting the existing 40-second browser grading timeout. Backup runs on timeout, connection failure, quota, provider unavailability/configuration rejection, or invalid grading evidence. Input validation errors never trigger backup. Both providers receive the same rubric and submitted responses, and both pass the same ID, points, criteria and answer-bound evidence checks. Groq additionally uses strict JSON schema output. Neither provider replaces deterministic coding-test points. Successful grades retain the actual provider/model and fallback metadata in the existing encrypted cache; no regrading occurs merely because the backup was enabled. If neither provider succeeds, incomplete scores remain pending.

Groq's free token limits still apply to long answers and busy periods. Confirm grading agreement against independently reviewed responses before treating a provider switch as validated. Live backup verification requires the key to be configured in Render.

Repeated-failure investigation on October 13 found Gemini HTTP 503/timeouts followed by Groq HTTP 429. The fallback now preserves Retry-After, shares a Groq cooldown across sessions on the running server, and returns a specific rate-limit message. The HTTP route enforces the retry delay and the submission button remains disabled during that delay. Only fixed rate-limit categories are logged; raw provider responses, secrets and answers are excluded. Free daily limits may require waiting beyond a short retry delay; adding a backup does not remove either provider's quota.

Only encrypted AES-256-GCM envelopes and hashed record keys are stored. Student browsers communicate with NorthStar, not Supabase. Existing session ownership, revision checks, recovery codes, and submitted-answer locks are preserved. A database lease serializes mutations across overlapping server deployments; writes verify the lease inside the database transaction. Provider failures return an error without falling back to temporary files.

Existing local student records are retained in the original working folder and are not uploaded automatically. Keep the old local server available until the new deployment is verified. Rolling back the Git commit does not delete Supabase records; older code without the adapter must not be deployed to production.

## Free-service limits

Render Free may sleep after inactivity; the first request can take time. Supabase Free may pause inactive projects. Keep encrypted database exports and the encryption key separately; this configuration does not provide an automated backup schedule. Do not rotate the storage encryption key without re-encrypting existing records.

## Verification

Run `npm test`, `npm run check:rf`, and `npm run test:cloud`. Cloud tests use a fake REST service and verify encryption, persistence between instances, concurrency, and fail-closed configuration. Actual provider provisioning, RLS and restart checks must also pass on the deployed service.
