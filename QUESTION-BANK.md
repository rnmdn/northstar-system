# Soft-skills question bank

## Open locally

Run `npm run start:local`, sign in with an authorized editor account, then open http://127.0.0.1:8766/question-editor.html. Students use http://127.0.0.1:8766/soft-skills-assessment.html. The original `soft-skills.html` remains an unscored UI preview.

## Database layout

| Table | Purpose |
| --- | --- |
| `auth.users` | Supabase account identity; passwords remain managed by Supabase Auth |
| `public.northstar_question_editors` | Explicit editor membership, managed by a trusted database operator |
| `public.northstar_assessment_versions` | Draft/published versions and recorded review reference |
| `public.northstar_questions` | Scenarios, areas and answer choices for each version |
| `northstar_private.soft_scoring` | Private choice points and scoring explanations |
| `public.northstar_soft_attempts` | Account ID, fixed question version, answers, flags and submitted scores |

The existing encrypted-record table still stores technical assessments and server sessions. It is not an account table and must not be deleted. This release adds account-linked soft-skills attempts; it does not migrate or remove technical records.

## Editing and publishing

1. Choose a draft or create a draft copy of a published version.
2. Edit the scenario, four choices and skill area. Keep question IDs stable within the version.
3. Enter reviewed whole-number points from 0 to 3 for A–D, and a scoring explanation. Blank keys are allowed in drafts.
4. Save the draft. Concurrent edits are rejected rather than silently overwritten.
5. Obtain faculty review, record the reviewer/reference, and confirm the completed review.
6. Publish. The database requires exactly 12 questions, three per area, and complete keys and explanations.

Publishing records the editor's review declaration; the software cannot verify that an external faculty review actually happened. Researcher-written seed scenarios are drafts, with no invented scoring key or approval. The 12-item structure and 0–3 rubric require expert review and student piloting; they are not a validated personality instrument.

Published versions are immutable. Existing attempts retain their original questions and scoring. Submission locks answers and computes four scores out of 9 in Postgres. Soft-skills scores do not change the technical assessment or Random Forest inputs/ranking.

## Installation and access

Apply `supabase/migrations/202610210001_soft_skills_bank.sql`, then `supabase/seeds/soft-skills-draft.sql`, through a trusted database session. The migration is additive and intended to run once. The seed can be repeated safely.

Apply `202610220001_history_reporting.sql` afterward to enable append-only editor history and account-linked technical reporting. The editor's **Editing history** section shows who saved a draft and the before/after question changes. See DATABASE-OPERATIONS.md for backup scope, verified restore results and reporting permissions.

After verifying the exact registered account, a trusted operator grants editor membership by inserting its `auth.users.id` into `public.northstar_question_editors`. Never expose a service key in frontend JavaScript. The Node server forwards the signed-in user's verified JWT; database functions enforce editor membership and account ownership. Tables have row-level security; scoring keys are in a private schema. Browser clients cannot write tables directly.

Required server configuration: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (or the existing server-only `SUPABASE_SECRET_KEY`), plus the existing account-session configuration. Local setup is documented in README.md. Production deployment of the new Node routes is required before these pages work on Vercel.

## Verification

Run `node --test --test-isolation=none tests/question-bank.test.cjs` and `npm run test:accounts`.

The SQL integration test runs a disposable PostgreSQL-compatible PGlite database, never the live Supabase project. Install `@electric-sql/pglite@0.5.11` temporarily outside application dependencies and set `NORTHSTAR_PGLITE_PATH` to its absolute package folder. Then run `node --test --test-isolation=none tests/question-database.test.cjs`. It checks RLS, private keys, editor permissions, invalid choices, concurrency, version pinning, scoring and submission locks. Its test-only scoring key is never imported into the real question bank.

If the pilot must be paused, remove the student entry link or disable the new API routes; preserve versions and attempts. Do not roll back by deleting assessment data.
