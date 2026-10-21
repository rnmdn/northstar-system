# Database operations and recovery

## Verified on 22 October 2026

An application snapshot of project `mncmpsuwclksayfiayqv` was exported before the history/reporting migration. Checksums passed. An isolated PGlite restore reproduced 107 encrypted records, one editor membership, one draft version, 12 questions, 12 private scoring rows and zero soft-skills attempts. All 107 records decrypted with the existing production storage key. No live records were restored, overwritten or deleted. Auth credential recovery was not tested by this check.

Private recovery files are outside the repository and OneDrive at `C:\Users\medin\AppData\Local\NorthStar\Backups`. The directory ACL permits the Windows account and SYSTEM. `recovery-secrets.env` contains the existing storage key and a field for the operator's database password. Never commit, upload or screenshot that file. This local folder alone does not protect against device loss; the operator should keep an additional approved, access-controlled copy on another device or institutional backup service.

## Application snapshot workflow

1. Run `node scripts/database-backup.cjs export-sql <new-query.sql>`.
2. Run that query as the trusted database operator in Supabase SQL Editor. It creates a temporary read-only export function and returns one consistent application snapshot.
3. Use **Export → Copy as JSON** and save the result directly in the private recovery folder. Do not paste its contents into chat or a repository file.
4. Run `node scripts/database-backup.cjs pack <export.json> <new-private-backup.json>`.
5. Run `node scripts/database-backup.cjs verify <backup.json>`.
6. Set `NORTHSTAR_PGLITE_PATH` to the temporary `@electric-sql/pglite@0.5.11` package directory. Run `node --env-file=<private-recovery.env> scripts/database-backup.cjs restore-check <backup.json>`.

The restore check creates an isolated in-memory database, imports the bundled schema migrations and rows, verifies every restored table, and checks decryption when the storage key is provided. It never connects to or restores the live Supabase project. Timestamp comparison preserves microseconds while allowing equivalent UTC formatting across Postgres versions. File checksums still cover the original export exactly.

Snapshots contain application tables and Auth user-ID references. They exclude live leases, Supabase Auth passwords/identities/sessions, external provider settings, Storage files and the storage encryption key. Auth ID placeholders in the test database exist only to verify foreign keys; they do not recreate functioning user logins. The application snapshot is **not a full Supabase project backup**.

For full project recovery, follow the official [Supabase backup and restore procedure](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Keep its role/schema/data exports and project configuration in protected storage. The database password is entered privately; never embed it in committed commands or terminal output. Validate a full restore in a separate project before relying on it for account recovery. The database backup does not include Storage file contents; see [Supabase backup limitations](https://supabase.com/docs/guides/platform/backups).

## Editor history

Migration `202610220001_history_reporting.sql` records successful editor RPC create/save/publish operations atomically. Each entry includes the verified account ID, time, action, before/after documents and revision. Failed or stale edits do not create entries. History begins when the migration is installed; earlier changes are not invented.

Snapshots include private rubrics, so the history table stays in `northstar_private`. Students cannot read it. Question editors can open **Editing history** in the editor and expand an event and question to inspect the before/after values. Entries cannot be updated/deleted through normal roles. A database owner can change schema controls; this is an application audit trail, not a tamper-proof external compliance log. Direct operator SQL edits do not go through the editor RPC and are not included in this history.

## Structured technical reporting

- `northstar_technical_attempts`: account ID, record ID, bank version, source revision, submission time and last sync time.
- `northstar_technical_items`: question ID, career area, component, response status, grading status, points and maximum. No raw answers, names, emails, code or feedback.
- `northstar_technical_report`: one progress row per account-linked technical attempt.
- `northstar_technical_area_report`: component scores grouped by career. A component stays null until all its items are graded.

These are derived indexes. The encrypted record store remains authoritative. The trusted Node server projects validated answers and server-produced cached scores after load, save and grading. The service-only RPC rejects an owner change and stale source revisions; a delayed sync cannot downgrade a graded item to pending within the same source revision. RLS lets students query only their own reports. Question-editor membership does not grant access to other students' reports.

Existing anonymous technical records are not guessed onto an account. They can be linked through the existing recovery-code flow; their next load/save then creates the account-linked projection. Local file storage does not write production reporting rows. To rebuild existing linked metadata from a verified backup, run `node --env-file=<private-recovery.env> scripts/rebuild-technical-report.cjs <backup.json> <new-private-import.sql>`. It reads authoritative encrypted grade caches; supply the matching `GEMINI_MODEL` when recovering written-grade cache metadata. Review and apply the generated SQL through the trusted database operator.

Reporting never changes grading, submitted-answer locks or Random Forest inputs/rankings. A projection failure leaves the saved assessment intact and retries on a later load/save/grading request. Check `source_revision` and `synced_at` before using reports. Set `NORTHSTAR_TECHNICAL_REPORTS=false` to pause projection updates while preserving records. Do not disable RLS or delete assessment tables to roll back the feature.

## Tests

`npm test` covers the existing assessment/account flows. Run `node --test --test-isolation=none tests/question-bank.test.cjs tests/technical-report.test.cjs tests/cloud-storage.test.cjs` for RPC/report integration. With PGlite configured, run `node --test --test-isolation=none tests/question-database.test.cjs tests/database-backup.test.cjs` for SQL permissions, audit immutability, reporting isolation/concurrency, corruption detection and isolated restore/decryption checks.
