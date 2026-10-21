# Private assessment storage

For current signed-in accounts, see ACCOUNTS.md. Online Vercel storage uses Supabase with application-level encryption; DATABASE-OPERATIONS.md documents its backup scope, verified restore checks, editor audit history and structured reporting. The local-file and anonymous recovery workflows below remain supported. References to self-rating recommendations describe the legacy flow; current preliminary RF mapping is documented in STUDENT-MAPPING.md.

## Student workflow

Run the Node server. Assessment pages show a real save status and save responses,
course/project/certification evidence, objective results, matching written grades,
recommendations, certificate details and exploration plans. Tab storage is a working
cache; the server record is the persistent copy. Navigation attempts pending saves. When the server is unavailable, Review can still open the tab’s draft and the save status clearly states that it has not reached the server.
Existing tab-only work is imported once into an empty server record.

Open **Recovery options → Create a new recovery code** and keep the code privately.
It is shown once. A new code revokes the previous code. Use **Resume assessment**
to restore the record from another browser. Anyone holding the code has access to
that assessment. The record ID on a certificate is not a recovery credential.
The HttpOnly session lasts up to 30 days; a recovery code remains valid until rotated.
There is no email recovery. Lost sessions and lost recovery codes require researcher
assistance through the protected host, rather than an unauthenticated lookup endpoint.

**Leave this assessment** saves pending work, revokes that browser session, clears
the tab cache and returns home. Use it on shared computers. **Start a separate
assessment** retains the old server record; keep its code before starting again.

An older tab cannot overwrite a newer revision or a different assessment selected
in another tab. When saving is paused, download that tab's answers before choosing
**Load saved answers**. Failures remain visible. Internal navigation preserves pending drafts; closing the tab triggers the browser's unsaved-work prompt. Recovery controls live on resume.html rather than in a large assessment panel.

## What is stored and trusted

Default directory: `.astra-data`. New records use AES-256-GCM with a random 256-bit
key in `storage.key`; records are replaced atomically. Existing plaintext grade files
are encrypted when accessed, or together using the initialize command below.
Recovery codes use 192 random bits and are stored as hashes. Session tokens are
also hashed; they are not exposed to JavaScript or included in links.

Student endpoints select records from the server session, never from a submitted
owner ID. Saves require the current record ID and revision. Server validation
limits fields and sizes, discards client grades, recalculates complete objective
results, and associates AI grades only with their matching answers and rubric/model.
Incomplete drafts are allowed. Completed navigation requires completed answers;
an optional evidence row may be incomplete while being edited.

The persisted top three recommendations currently use `profile_ranking_v1`: three
related self-ratings plus declared exposure, maximum 11 points. They are not Random
Forest predictions. Knowledge, coding and written scores retain their separate
versions; course evidence has not been assigned an invented scoring weight.

The Gemini key stays in the server environment. Avoid personal details in scenario
answers: those six answers are sent to Gemini for grading. A certificate name is
optional and is now saved with the private assessment. Store evidence references,
not identity documents or transcripts. Choose an approved retention period and
research consent process before collecting actual student records.

## Researcher access and Windows setup

There are no HTTP endpoints for exporting all records, editing datasets, publishing
models, or making/restoring backups. `grading`, `storage`, `models`, `datasets`,
`outputs`, dot folders and server files cannot be served as static assets. Symlink
assets are rejected. Dataset/model updates are performed by the research operator
on the host, using the operating system's file permissions.

From the Astra folder, with the server stopped:

```powershell
npm run storage:protect
node scripts/storage-admin.cjs initialize
npm run storage:backup
```

The Windows permission command protects the data, backup and existing restored,
grading, dataset and model folders for the current Astra operator, SYSTEM and
Windows administrators. It removes inherited and explicit student access grants.
Run it again after adding dataset/model folders or restoring records. Additional
research-team accounts must be granted deliberately by the host administrator;
ordinary student accounts should have browser access only. For a custom
`ASTRA_DATA_DIR`, apply equivalent permissions to that directory separately.

Use one Node server process per storage directory. A lock prevents a second process
or backup operation from sharing active storage. This file store suits the current
single-server implementation; multiple application instances need a transactional
database and shared session storage.

## Backups and restoration

Stop the server and run `npm run storage:backup` at least daily while collecting
student records, and before dataset/model releases. The command makes a timestamped
snapshot under `.astra-backups`, including the encryption key and record files. A
SHA-256 manifest detects missing or corrupted files. It never deletes older backups.
Copy approved snapshots to a separate, access-controlled device or institutional
backup service. A backup on the same disk alone does not survive disk failure.

```powershell
node scripts/storage-admin.cjs verify .astra-backups/backup-EXACT-NAME
node scripts/storage-admin.cjs restore .astra-backups/backup-EXACT-NAME
```

Restore validates the manifest and writes only into a **new** `.astra-restored`
directory; it refuses to overwrite existing storage. With the server stopped:

```powershell
npm run storage:protect
$env:ASTRA_DATA_DIR = (Resolve-Path .astra-restored).Path
$env:PORT = '8767'
node server.js
```

Do not lose `storage.key`: existing encrypted records cannot be recovered without
it. Backups contain that key, so backup-folder permissions are essential. Do not
commit records, keys or backups. The default workspace is under OneDrive; use an
institution-approved private storage location via `ASTRA_DATA_DIR` for student
collection rather than relying on a personal synced project folder.

## Online deployment

The default server is bound to `127.0.0.1` for local use. Put the application behind
HTTPS before exposing student access over a network. Set `ASTRA_HTTPS=true` only
when HTTPS is actually configured; it enables Secure cookies. Keep API secrets in
the deployment environment, keep data/backups out of the public document root,
apply researcher-only host permissions, and plan backup retention. Cross-site
writes, non-JSON requests and excessive requests are rejected. Rate limits are
per connection IP; a reverse proxy may group students under one IP until trusted
proxy handling is configured. No public deployment was performed in this task.

## Verification

`npm test` checks separate-student isolation, changed-record and revision conflicts,
recovery-code rotation, restart recovery, authoritative grades, private paths,
cross-site writes, encrypted files, single-process locking, backup verification,
safe restore and restored-record recovery. Browser testing covers real autosave,
course evidence, leaving/resuming and question-position restoration. These checks
do not claim that live Gemini grading or adviser score agreement has passed.
