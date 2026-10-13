# Revised assessment and student mapping

Revised on 2026-10-13. Workbook version **4.0**, assessment bank **4.0**, rubric **objective-skills-v4.0**, student mapping **objective-domain-pilot-v1**, trained model export **team-domain-rf-v1**. API paths retain `/api/v3/` as the transport contract; this does not select the question-bank version. Requests must declare their bank version.

## What changed

- Knowledge blueprint: each career has two interpretation, two application and two diagnosis items. The simple data mean/median questions now examine missing-vs-zero handling and the effect of an extreme value. A contrast item applies a supplied acceptance rule. This blueprint documents the intended cognitive work, not experimentally equal difficulty.
- Six practical tasks now repair faulty examples: a JavaScript summary, network configuration and recovery test, access-control decisions and isolation tests, data cleaning with conflicting repeated IDs and a real zero, a SQL aggregation/filter, and an inaccessible form interaction. Networking/security are simulated diagnostic decisions, not direct execution against a real system.
- WS01, WS04 and WS05 are replaced by WS06 (feedback detail), WS07 (breadth of focus) and WS08 (work rhythm). WS02 (collaboration) and WS03 (structure) remain. Each option is descriptive and earns no points. The five preferences are not a validated psychometric scale.
- The workbook maps every assessment field to an RF domain or marks it as context-only. A separate Student mapping sheet has editable synthetic scores, guarded live formulas, the exact six-feature order and artifact provenance.

## Versions and existing answers

Replaced skill IDs: SD09→SD10, NW09→NW10, CS09→CS10, DA09→DA10, DB03→DB10, UX03→UX10, DA01→DA11, DA06→DA12 and UX06→UX11. Unchanged items retain their IDs, but grade requests still include bank and rubric versions.

Bank 4.0 stores under `astra-item-bank-v4`. Bank 3.0 remains under `astra-item-bank-v3`; existing answers are not converted, reinterpreted or deleted. A tab with an older bank keeps that bank unless the student explicitly opens the revised bank. New tabs without older answers use v4.

Restart the Node server after updating its code, then open `assessment.html?bank=v4`. The original v3 remains available at `assessment.html?bank=v3`. Recovery loads each saved assessment's bank. The older self-rating flow remains under `?bank=legacy`.

## RF pilot

Per career: `evidence = 3 * (knowledge + practical + written) /14 + 0.5 * exposure`. Normalize six evidence values to obtain the six model shares. Each rubric point has equal weight: knowledge 6/14, practical 4/14, written 4/14. Display component scores separately. These constants are explicit experimental assumptions, not validated proficiency bands. Exposure is self-declared. Interests and work style remain contextual and do not rerank the RF output.

The model is the team's existing 200-tree six-domain `final_model.joblib`, trained on 504 job postings. It was not retrained. Its metadata still describes source labels as DRAFT unless verified by the team. Job-domain composition and student demonstrated performance differ in meaning, even after normalization. The model's probability is an association with a job category, not a student's probability of career success.

RF suggestions are enabled by default following the user's authorization for the October 15 working system. Set `NORTHSTAR_RF_ENABLED=false` and restart to disable them. `/api/v3/recommend` with `{bankVersion:"4.0"}` uses saved responses and authoritative scores. Missing responses, unfinished grades, invalid exposure or all-zero evidence block prediction. Client-supplied scores/features do not control predictions. Results are saved in encrypted per-student storage with model, mapping, rubric, answer and exposure fingerprints.

## Pilot required before treating scores as comparable

1. Ask subject reviewers to judge construct coverage, ambiguous options, expected difficulty and the repair-task scope for each career. Record decisions beside items in the workbook.
2. Pilot across the intended BSIT cohort. Record item completion, correct-answer rates, rubric-point distributions and time per task. Check differences by year level and prior exposure without collecting unnecessary identifiers.
3. Inspect floor/ceiling effects, weak distractors and fatigue by section. Replace/revise items based on observed evidence. A shared blueprint alone does not establish equal difficulty or a common proficiency scale.
4. Independently score written answers using each criterion. Include 0/1/2/3/4-point answers, correct paraphrases, plausible incorrect reasoning and irrelevant answers. Measure criterion agreement and disagreements with live AI. Mock HTTP grades prove transport behavior only.
5. Have advisers review student profiles without seeing the model ranking first. Compare their career lists with RF results, document disagreements and test sensitivity to the exposure bonus/component weights. No student/adviser agreement has yet been measured.

## Checks

`npm test` covers existing behavior and v4 bank/fixture/HTTP/DOM checks. `npm run check:rf` compares the exported forest with scikit-learn on 807 reference vectors and tests mapping/ownership/cache rules. The workbook formulas were tested by changing a required input to blank, entering all zeros and changing exposure, then restoring the synthetic example. Formula recalculation in Microsoft Excel itself has not been tested.

Live Gemini check on 2026-10-13: all six fictional full-credit written reference answers received 4/4 with all four criteria passed. Requested alias: gemini-flash-lite-latest; returned provider version: gemini-3.5-flash-lite. Report: outputs/live-ai-v4-six-reference-check.json. This checks successful live grading and full-credit anchors; partial-credit calibration and student/adviser agreement remain pending.
