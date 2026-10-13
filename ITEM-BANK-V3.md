# Expanded v3 integration

Source: `outputs/assessment-item-bank-20261011/Assessment_Item_Bank_Expanded_v3.xlsx`.
The extracted bank records its SHA-256, bank version `3.0`, rubric version
`objective-skills-v3.0`, original item IDs, and draft review status.

## Student flow

Open `assessment.html?bank=v3`. The profile asks one exposure checklist,
18 interest questions on the original 1–5 scale, and five categorical A/B work-style
questions. Review is followed by 48 skill items: 36 MCQs, six practical tasks,
and six written scenarios. The response schema therefore represents 72 question
units and 77 response fields. Old assessments remain under their existing keys;
`assessment.html?bank=legacy` opens the previous flow. Version switching does not
convert, reinterpret, or delete previous answers.

The existing Dusty lavender theme, wordmark and result bars are retained. Forward
actions sit on the right. Assessment screens use ordinary scrolling and responsive
forms, without celestial animation. Results show knowledge /6, practical /4 and
written /4 separately per career. Missing, pending and checker errors have null
scores; a genuine graded zero remains zero. All components must be graded before
their component percentage is available.

## Grading and storage

- MCQs: server-only keys; one point for the correct letter.
- JavaScript: bounded Acorn AST interpreter, never eval or execution in Node's
  host context. Supports the subset described beside the task. Four two-case
  groups score independently. Unsupported code remains unscored.
- Networking, permissions and cleaning: independent structured-field checks.
- SQL: four fresh in-memory SQLite fixtures, read-only authorizer, one SELECT,
  restricted functions, bounded results and a child-process deadline.
- HTML: parsed DOM/attributes via htmlparser2; no scripts run and no URLs fetched.
- Written scenarios: server-side Gemini request, four binary criteria, validated
  item/rubric IDs and sums, quoted answer evidence, failure left pending, retries
  and version/model/answer-specific caching.

Answer keys and reference anchors are in the non-public `grading` directory.
V3 answers use `astra-item-bank-v3` inside the existing encrypted private record.
Server enrichment strips client grades and restores only matching authoritative
scores. Changing written answers invalidates the written cache; changing objective
answers invalidates objective cache reuse. Older records and recovery codes keep
the original version. Starting a new assessment still creates a separate record.

The export includes 35 *proposed* features: 18 separate skill component percentages,
six binary exposure indicators, six interest means, and five work-style categories.
Unanswered exposure is null, while explicitly choosing none produces six zeros.
No combined score, proficiency bands, RF input mapping or career weighting is
invented. Until those policies and a model are approved, students choose up to three
career directions from their evidence and receive corresponding practice plans.

## Running and verification

Use **Node 24.19 or newer**, then `npm install` and `npm start` (port 8766).
The SQL authorizer requires the newer Node SQLite API; a Python static server
cannot provide assessment storage or grading. Set `GEMINI_API_KEY` on the server
to enable written grading; do not put it in browser files.

`npm test` runs legacy regressions and focused v3 tests, including all six
practical 0/2/4 reference sets, MCQ totals, prohibited host/SQL operations,
missing-vs-zero states, forged grades, cache invalidation, encrypted-storage HTTP
round trips, and DOM rendering using the actual HTML pages.
`npm run check:ai:v3` checks 18 written development anchors with live Gemini.
It fails on unavailable grading or mismatched totals and writes an output report.
Mock success does not establish live grading quality. All source review statuses
remain Pending; independent subject review and pilot calibration are still needed.
