# Random Forest integration work log

Date: 2026-10-13 (Asia/Singapore). This log records inspected evidence, implementation, checks and unresolved research decisions for the project leader. It contains no API keys or private student answers.

## Authorized work

Connect the team's trained Random Forest to NorthStar's existing objective assessment for testing. Inspect the artifact, document and test student mapping, and prepare adviser review. No student validation is claimed from job-posting evaluation alone. Interest and work style remain supplementary context under the current research rules.

## Existing system inspected

- Node server, deterministic practical/knowledge grading, Gemini written grading, and encrypted record storage already exist.
- Expanded v3 collects 36 knowledge questions, six practical tasks and six written scenarios, plus exposure, 18 interests and five work-style questions.
- The server reports each career's knowledge /6, practical /4 and written /4 separately. Missing, pending and failed grading have null scores rather than zero.
- Results currently let students choose up to three paths. The 35 exported assessment fields are proposed features rather than verified RF inputs.

## Model source and evidence

- Source: the local `ITCareerPath_rf` repository corresponding to `antiyaa/ITCareerPath_rf`.
- Model output files were deleted in that working checkout. Copies of `final_model.joblib`, `rf_model_domain.joblib`, `results_domain.txt` and `holdout_metrics_domain.csv` were recovered from committed Git history into `models/team-rf`. The RF checkout was not modified.
- Training code defines two representations: 284 binary specific-skill columns, or six domain shares summing to one (all-zero posting rows remain zero).
- Domain report: 504 postings, 156 companies, six career classes; company-grouped holdout has 404 training and 100 test rows. Reported domain RF accuracy 0.89, macro-F1 0.891 and top-three accuracy 0.99. Grouped five-fold results: accuracy 0.893, macro-F1 0.897 ± 0.028, top-three accuracy 0.974.
- These numbers are from the supplied training report, not an independent rerun or student recommendation evaluation. Software Development holdout recall is 0.722, lower than the other reported classes.
- Final report describes 200 trees, minimum leaf size 4, max_features 0.3, max_depth 20 and fitting on all 504 rows after grouped tuning. Reported final tuning macro-F1 is 0.899; that is not a separate final-model holdout score.
- Artifact inspection and runtime compatibility checks are in progress. The bundled Python initially had no scikit-learn. Serialized bytes contain version `1.9.1`; confirm it by loading in a matching isolated runtime.

## Mapping decision still required

Job features express a posting's share of detected domain skills. Student inputs express demonstrated performance and experience. Matching six names does not establish measurement equivalence. The former tier-based mapping described in the training script is not present locally, and v3 uses objective component scores instead of self-rated tiers.

Before student recommendations are enabled, document the component combination, exposure contribution and all-zero handling. Do not silently substitute missing scores, invent a validated proficiency scale, or change rankings with interests/work style.

## Adviser validation

Prepare synthetic assessment cases for technical checks. Separately collect adviser rankings from consented student examples and compare top-three overlap, disagreements and stability. Synthetic checks and posting metrics do not establish student validity. Team review of the bank/rubrics remains pending.

## Confirmed artifact and implementation

- Loaded `final_model.joblib` with matching scikit-learn 1.9.1. Confirmed: domain mode, six ordered features, six classes, 200-tree RandomForestClassifier, trained on 504 postings. Source Git commit: `5202e1ca026aadc1eb25ae41562050143476a8e7`. Source artifact SHA-256: `4e8d8a29f5d6d437f14f1b0ec675396e264d6c37cb159c55054f5d78db770458`.
- Artifact label status is explicitly `DRAFT labels unless the team has verified them in the workbook`. No independent label review was inferred from the existence of a trained model.
- Matching Python libraries were installed in ignored `.rf-venv/packages`, without replacing the bundled runtime. The initial sandbox install and ensurepip failed; installing in the isolated folder with network access succeeded. Protected ML paths required elevated tool execution. No permissions were weakened.
- `ml/export-team-rf.py` exports the fitted trees into private server-side `models/team-rf/forest.json`. This avoids a Python dependency for ordinary Node predictions. It does not retrain or approximate a different classifier. Original joblib artifacts remain ignored by Git.
- `ml/student-mapping.cjs` implements the documented experimental proposal in STUDENT-MAPPING.md, with null/incomplete/zero checks and explicit feature ordering.
- `ml/team-rf.cjs` validates the exported model and evaluates its trees using float32 inputs, matching scikit-learn prediction behavior. It maps class outputs by name rather than assuming feature order equals class order.
- A gated POST `/api/v3/recommend` reads the student's saved profile and authoritative server grades. Client feature arrays and claimed scores do not determine predictions. Suggestions are cached in that student's encrypted storage with model, mapping, bank, rubric, answer and exposure fingerprints. A changed response blocks old grades; changed exposure produces a new result.
- Testing requires an explicit `NORTHSTAR_RF_TESTING=true` server flag. It is disabled by default while mapping approval is pending. The current running student server and browser UI were not restarted or changed.

## Verification completed

- Three focused RF tests passed. Exported inference agrees with scikit-learn within 1e-12 on 807 vectors: six single-domain cases, one uniform case, 200 seeded mixed cases and 600 cases around learned split boundaries.
- Tested: missing vs zero grades, EX-NONE vs missing exposure, invalid score ranges, feature order, exclusion of preferences, all-zero evidence and malformed vectors.
- HTTP tests use synthetic grading only. They confirm pending grades block suggestions, browser-forged features are ignored, different student sessions cannot retrieve the result, changed exposure invalidates cache, changed answers require fresh grades, saved results are encrypted, private model files return 404 and the default gate returns 503.
- These checks establish technical behavior, not live AI calibration, student recommendation accuracy or adviser agreement.
- Full `npm test` regression suite passed after rerunning outside the sandbox's child-process restriction. `git diff --check` passed. Run `npm run check:rf` for the three RF-specific checks.

## Uploaded workbook review (2026-10-13)

User supplied `banko_sentral (1).xlsx` for an unbiased review. It was inspected read-only, without editing or replacing its contents.

- Seven sheets contain the four assessment parts, scoring/mapping and protected skill keys. Skills has 48 items (36 knowledge, six practical, six written). Interests has 18 items and work style five. Exposure is one checklist with six domain options plus exclusive None.
- Strengths: demonstrated-performance questions, clearly separated constructs, explicit missing-vs-zero rules, per-criterion written rubrics and 0/2/4 reference responses.
- Mapping remains unfinished: all confirmed RF name/order/transformation cells (`Scoring and mapping!J7:L41`) are blank and statuses are Unverified. The workbook's 35 fields cannot be passed directly to the six-feature artifact.
- Version mismatch: Overview identifies workbook/bank 3.1 (A2/A16), while Skills A4 identifies bank 3.0 and key rubric versions remain objective-skills-v3.0. Workbook, bank and rubric versions may legitimately differ, but their relationship needs explicit documentation.
- Uneven difficulty is a pilot risk: data knowledge includes simple mean/median calculations; networking includes /27 subnet reasoning; programming requires implementation. Likewise, applying supplied permission rules differs from coding/SQL execution. Equal maxima do not establish equivalent difficulty or construct coverage.
- Potential preference overlap: WS01 and WS04 both contrast evidence/planning with exploratory trials. WS05 also concerns learning approach. Review whether each adds distinct information.
- The pilot bank supports introductory evidence, not a comprehensive demonstration of readiness in all six professions. Labels, question difficulty, distractor behavior, grading agreement and completion time still need team/pilot review.

## Current status

Technical testing connection implemented and focused checks passed. The user subsequently authorized the revised assessment and pilot mapping implementation described below. Student/adviser validation has not been performed. No retraining, public deployment, new database or live student recommendation release has occurred during this work.

## Authorized revision of the workbook and application

The user requested action on the unfinished RF mapping, uneven task difficulty, instruction-following practical tasks, overlapping work-style prompts and inconsistent versions. The user’s source workbook was preserved. Revised deliverable: `outputs/assessment-revision-v4/Assessment_Item_Bank_Revised_v4.xlsx`.

- Versions are explicit: workbook 4.0, bank 4.0, rubric objective-skills-v4.0, mapping objective-domain-pilot-v1, model team-domain-rf-v1. `/api/v3/` remains the API transport route and does not determine bank version.
- All 35 mapping rows now contain a six-domain destination/order/transformation or an explicit context-only exclusion. A new Student mapping sheet provides the exact ordered six inputs, editable synthetic examples, live guarded calculations, input validation, and model provenance. Three components contribute per career plus its exposure flag; interests and work style remain context.
- The implemented experimental rule is `3 * objective_points/14 + 0.5 * exposure`, normalized over six domains. Each rubric point has equal weight (knowledge 6/14, practical 4/14, written 4/14). These weights are explicit pilot assumptions, not validated tiers or measurement equivalence.
- Knowledge uses a shared 2-interpret / 2-apply / 2-diagnose blueprint per career. Replaced the basic mean/median tasks with missing-value/zero reasoning and outlier-summary choice. Revised the contrast item to apply a supplied acceptance rule. Difficulty still requires empirical student piloting.
- Replaced all six practical tasks with repair-oriented prompts. Programming repairs a faulty function; networking diagnoses settings and selects recovery checks; security repairs authorization decisions and selects denial tests; data repairs duplicate/missing/zero handling; SQL repairs aggregation/filtering; HTML repairs a reported interaction. The structured network/security tasks remain simulations, not real administration or execution of a student-authored security function.
- Replaced WS01/WS04/WS05 with WS06 feedback detail, WS07 breadth of focus and WS08 work rhythm. Retained WS02 collaboration and WS03 structure. These descriptive items earn no points and do not change RF ranking. Distinct prompt topics do not prove psychometric independence.
- Replaced skill IDs: SD09→SD10, NW09→NW10, CS09→CS10, DA09→DA10, DB03→DB10, UX03→UX10, DA01→DA11, DA06→DA12, UX06→UX11.
- Added version-specific grader/storage instances rather than reinterpreting saved answers. Bank 3.0 remains under astra-item-bank-v3; 4.0 uses astra-item-bank-v4. Existing v3 tabs keep their bank. Fresh assessments use v4; an explicit `?bank=v4` opens the revised bank. Both private answer-key sets stay blocked from static access.
- The recommendation endpoint now selects the submitted bank version and verifies every response is complete before using authoritative scores. Caches already fingerprint bank/source/rubric/mapping/model and responses/exposure. Server defaults still leave RF testing gated.

### Revision checks

- Workbook was rendered before and after edits with the bundled spreadsheet tool. Formula calculation verified six shares sum to 1, missing input blocks all shares, out-of-range scores block all shares, all-zero evidence is insufficient, and exposure-only evidence produces a valid one-domain vector. Restored the synthetic example after testing. Export contains no detected formula errors.
- Independently inspected the saved XLSX with openpyxl read-only. Original Exposure and Interests values are preserved. Overview total formula remains `SUM(B7:B10)` with cached total 72; mapping shares total 1. Confirmed mapping cells J7:L41 are populated. Workbook SHA-256 matches the server/browser bank metadata. Native Excel recalculation was not exercised.
- Four focused v4 tests passed: shared blueprint and IDs; all six practical 0/2/4 anchor scores; bank/rubric-specific HTTP/storage/RF operation; every task/page DOM rendering and v3-answer preservation. An initial test shared nested response fixtures between checks; cloning the synthetic fixtures fixed that test isolation issue.
- Final `npm test` passed with the existing regressions and four v4 checks. Final `npm run check:rf` passed all three RF checks, including all 807 reference vectors. The final workbook hash was synchronized before these runs. `git diff --check` passed.
- Manual browser check used an isolated Node server on port 8768 and fresh test storage. Completed the exposure/interests/work-style profile, opened Review, started the v4 bank, submitted the revised security repair choices and received 4/4 from the real deterministic grader, then reloaded and confirmed response restoration. No mock AI grades were used in the browser check. The temporary tab was closed and only the created test process was stopped. The user’s port-8766 server and records were not changed.
- Research/adviser validation remains pending. ASSESSMENT-V4.md records the pilot protocol, including item difficulty, completion times, distractor behavior, criterion-level live AI agreement and adviser-versus-RF comparisons.

## Working recommendation flow — 2026-10-13

The user authorized enabling the existing RF now for the October 15 deadline, with later professor-directed changes. This supersedes the earlier testing-only gate described above.

- RF is enabled by default. NORTHSTAR_RF_ENABLED=false disables it after restart.
- Completed, reviewed answers and authoritative grades feed the six-feature mapping. Pending grades remain pending; they are not converted to zero.
- Results show the actual forest's top three categories, model-match values and separate evidence/context. Students can change exploration choices before generating practice plans.
- Cached recommendations are encrypted and tied to current grades, responses, exposure, model, bank and mapping settings. Changed inputs invalidate old recommendations.
- The real local server is running at http://127.0.0.1:8766. No public hosting or retraining was performed.
- Desktop and 390px mobile browser checks used a fictional profile, synthetic written grades and the actual RF. Ranking, plan navigation, reload persistence and mobile width were checked. Screenshots: outputs/rf-results-desktop.png and outputs/rf-results-mobile.png.
- Automatic approval review initially rejected sending private reference answers to Gemini. The user then explicitly approved the six-reference-answer check. All six full-credit v4 references received 4/4, with criterion scores [1,1,1,1]. Requested alias gemini-flash-lite-latest returned provider version gemini-3.5-flash-lite. Sanitized report: outputs/live-ai-v4-six-reference-check.json. No student records or API key were included in the answer text.
- This demonstrates a working technical flow and successful live full-credit grading. Partial-credit calibration, comparable item difficulty and student/adviser recommendation validation remain pending. Suggestions stay labelled preliminary.

Final verification: npm test and npm run check:rf passed; git diff --check found no whitespace errors. The isolated synthetic preview server was stopped; the real server on port 8766 remains running.

Review UI refinement: experience checkmarks, interest bars with exact /5 labels in assessment order, work preference definition rows, section Edit links, and larger text. The five v4 regression checks passed. Added MACHINE-LEARNING-SUMMARY.md for the leader. Browser inspection found the current v4 profile unanswered, so no fabricated answers were saved to the student's record for visual QA.

Final assessment submission now saves and checks objective work, then batches all six written responses automatically before opening skill results. AI failure preserves saved responses and offers retry submission; existing server fingerprint caching avoids charging again for unchanged successful grades. Research test routes retain their individual controls. The normal results page shows written grading retry only when grades are pending.

## Coding feedback and limited AI fallback

User authorized test-based correctness scores, Gemini coding feedback, and AI assessment for valid solutions using unsupported checker features. Coding/SQL/HTML responses now join the written answers in the final AI batch. Supported and invalid submissions retain authoritative test scores; AI feedback cannot replace those points. Only recognised JavaScript interpreter limitations are eligible for AI criterion scoring. Forbidden names, infinite execution and infrastructure errors do not qualify. AI fallback records include gradingMethod=ai-fallback, executionVerified=false and reviewRequired=true; results label them AI assessed — execution not verified. Missing AI grades remain pending. These provisional AI grades currently contribute to the skill total and RF input like other rubric grades, and require research review.

Grading policy is now v3-grading-3; bank 4.0 and its existing four-criterion rubric are unchanged. Cache fingerprints include the new policy and coding responses, preserving old cached files without reusing them. Test-based coding retains its score and gets aiFeedback. Focused checks proved that AI cannot replace a failed test or invalid submission, unavailable fallback stays pending, and written/coding review shares a single request. Full automated suite and RF regression checks passed. No live coding-fallback calibration has been performed yet.

Score feedback UX: every career/component score now opens its own accessible native dialog with meaningful criterion labels, answer evidence and submitted response. Duplicated coding feedback and bare criterion-number lists were removed. Gemini feedback is prompted to address the student directly; feedback caches carry student-v1. OB-SD10 was investigated: user confirmed submitting dsa, so the zero for a missing required function is correct. UI now explains this once in plain language. Focused dialog-click, grading and fallback checks passed.

## Final submission lock and SQL invalid-answer correction

Final submission now records a server-owned submittedAt timestamp before grading. Serialized storage transactions reject changes to submitted profile/responses and retain the timestamp even if a client removes it. Scoring/grading rejects changed responses after submission; unchanged retries remain allowed. The browser blocks profile/answer editing after lock and acknowledges the new server revision. Historical practice records can be finalized from results without changing answers. No existing records were silently marked submitted. Career selections and reflections remain editable for practice planning.

The user showed SQL source dsadsa. The worker previously returned all SQL errors as checker failures. Known invalid submissions (missing SELECT, syntax/unknown-field/authorization errors) now carry invalidSubmission and receive zero; infrastructure/time limits stay pending. Grading policy v3-grading-4 invalidates old grading caches without deleting them. Focused tests verified invalid SQL zero, submitted-answer/profile locks, forged lock removal rejection, changed grading rejection and allowed unchanged persistence/retry.

## Career podium and AI result explanation

Implemented rank-based fixed podium heights, with #1 centre, #2 left and #3 right; mobile stacks in semantic ranking order #1/#2/#3. Career descriptions, model-match help, score-breakdown dialogs and the plan action are shown without exposing mapping formulas in the main content.

Summary policy career-summary-v1 sends aggregate RF outputs, domain scores, exposure flags and interest ratings to Gemini, excluding submitted answer text, names and recovery codes. Rules require direct student language, no invented facts, no numerical claims or promises, no ranking/score changes, and explicit separation between interest and RF ranking. A fixed caveat is appended for AI-assessed code. Outputs are length checked, escaped, and screened for numeric/markup/guaranteed-fit claims; unavailable, malformed or rejected output uses a deterministic template. Semantic factuality is not fully guaranteed by those checks; professor review remains necessary.

The summary and provider/version metadata are encrypted with the recommendation. Cache fingerprints include summary version and interests; unchanged results reuse the saved summary. A new summary normally costs one additional Gemini request beyond the assessment grading batch. No live-summary calibration has yet been performed; mocked tests verified acceptance, fallback, prohibited claims and no score mutation.

Results refinement: replaced podium with equal 1–2–3 cards, top model match chip, visible preliminary banner, shared model-match explanation, actual evidence lines, introductory activities, explicit plan checkboxes and selected-career CTA summary. US English standardized in this surface. Six v4 checks passed including checkbox synchronization and DOM order. Browser verified desktop, 390px mobile (no horizontal overflow), and career breakdown dialog using a fictional profile with synthetic written grades and actual RF. Screenshots: outputs/equal-career-cards-desktop.png and outputs/equal-career-cards-mobile.png. Temporary preview server and tab were closed; real server remains running.

Score-based next steps implemented as learning-start-v1: Foundations 0–5, Build your skills 6–10, Explore a challenge 11–14, with a normalized component-based focus, curated provider links, varied practice activities and optional saved reflection. Pending grades do not become zero; AI code-assessment caveats are shown. Resource selection does not change RF inputs or scores and uses no AI calls. Eight focused checks passed. Desktop/mobile browser checks used fictional records; the preview server/tab were cleaned up. Sources and limitations are documented in LEARNING-RESOURCES.md.
