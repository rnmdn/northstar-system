# NorthStar System

NorthStar is a Node.js IT career exploration system. This clean checkout contains the runtime, reference fixtures, tests, and handover documentation. The original working folder is preserved separately.

## Run locally

Use Node 24.19 or newer:

```text
npm ci
npm start
```

Open http://127.0.0.1:8766/. Run only one server on that port. To run beside the original server in PowerShell, set `$env:PORT=8767` before `npm start`.

For Gemini, set GEMINI_API_KEY in the server environment or use the Windows launcher:

```text
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-ai.ps1
```

The repository contains no API keys or student records. A new local checkout starts with empty storage. Keep your existing storage and recovery data in the original folder until an explicit migration is performed.

## Included

- Root HTML pages, styles, scripts and required assets for the student flow.
- Bank v4 and its scoring rubrics; prior bank v3 and legacy runtime dependencies remain for compatibility.
- Server grading, final submission locks, encrypted persistence and recovery.
- Actual 200-tree RF export, student mapping, cached result explanation and score-based learning resources.
- Tests and reference vectors required to verify the runtime.

## Folder map

| Folder | Purpose |
| --- | --- |
| assets | Required logos, fonts, video and existing profile media |
| scripts and styles | Student interface and browser behavior |
| grading | Server answer keys, rubric scoring and practical checkers |
| storage | Encrypted records, recovery and maintenance |
| ml | Student mapping, RF prediction and result explanation |
| models/team-rf | Runtime forest, parity references and model evaluation provenance |
| tests | Assessment, storage, RF and UI regression checks |

Offline dataset collectors, workbook generators, sample training datasets, prototype backups, unused logo assets, generated outputs, virtual environments and downloaded dependencies were excluded. Those files remain recoverable in the original folder and earlier Git history. The original Python model is referenced in the documentation; Node predictions use the included forest.json.

## Verify

```text
npm test
npm run check:rf
```

## Research status

The mapping and learning-start thresholds are preliminary. Job-posting classification accuracy does not establish student recommendation accuracy. See ASSESSMENT-V4.md, STUDENT-MAPPING.md, LEARNING-RESOURCES.md and RF-INTEGRATION-LOG.md.

## Hosting status

NorthStar is deployed at https://northstar-system-one.vercel.app using Vercel Hobby and encrypted Supabase storage. The previous Render deployment remains available. Existing Render assessments can be opened on Vercel using their recovery codes. Live recovery, submitted-answer locks, SQL grading, cached grades and RF recommendations passed using fictional assessments. Gemini is the primary grader, with Groq as backup; hosting changes do not remove provider quotas. Independent grading calibration is still pending. Local development retains encrypted file storage. See DEPLOYMENT.md for configuration and verification details. GitHub Pages alone cannot run the server.
