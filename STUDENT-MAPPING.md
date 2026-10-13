# Student mapping — experimental pilot

Status: authorized for implementation and testing by the user on 2026-10-13. Adviser approval and student validation remain pending. Bank 4.0; workbook 4.0; rubric objective-skills-v4.0; mapping objective-domain-pilot-v1.

The model is the team's `final_model.joblib`, confirmed as a six-domain RandomForestClassifier with 200 trees, fitted on 504 job postings. Its labels are recorded as DRAFT in the artifact metadata. Its SHA-256 is `4e8d8a29f5d6d437f14f1b0ec675396e264d6c37cb159c55054f5d78db770458`.

## Pilot calculation

For each career, use server-verified knowledge points /6, practical points /4 and written points /4:

```text
objective_fraction = (knowledge + practical + written) / 14
evidence_value = 3 * objective_fraction + (prior_exposure ? 0.5 : 0)
domain_share = evidence_value / sum(all six evidence_values)
```

The 0–3 value is continuous, not a proficiency tier. This gives each rubric point the same weight: knowledge contributes 6/14, practical 4/14 and written 4/14. The exposure bonus adapts the older assessment proposal; its suitability for objective scores has not been established. The constants are explicit pilot assumptions requiring adviser review. Exposure is a declaration, not a verified credential.

Example: 4/6 knowledge, 3/4 practical and 3/4 written total 10/14. With exposure, `3 * 10/14 + 0.5 = 2.642857`. If the six evidence values total 10, this career's model input is `0.2642857`. Normalization measures relative domain mix, not overall ability: multiplying every evidence value by the same constant gives the same model inputs.

## Exact feature order

| Position | Model feature | Assessment career | Exposure response |
| --- | --- | --- | --- |
| 1 | Software development | Software Development | EX-SD |
| 2 | Networking | Networking | EX-NW |
| 3 | Cybersecurity | Cybersecurity | EX-CS |
| 4 | Data science & analytics | Data Science and Analytics | EX-DA |
| 5 | Database administration | Database Administration | EX-DB |
| 6 | UI/UX & web development | UI/UX and Web Development | EX-UX |

This is the feature order, not the model's class order. Output labels must be matched by name before ranking.

## Rules

- Predict only when every component in all six careers has a real grade. Pending AI, missing answers and checker errors block prediction rather than becoming zero.
- An explicitly graded zero remains zero. Missing exposure blocks prediction; EX-NONE means six exposure zeros.
- If all evidence values are zero, return insufficient evidence without a ranked result.
- All six shares must be finite, nonnegative and sum to one.
- Interests, work style and optional course/project evidence do not enter the six-domain RF vector under this proposal.
- Grade values must come from the server, not a browser-supplied score or feature array. Changing responses or exposure invalidates prior suggestions.
- RF output describes the model's association with job categories. It does not measure career-success probability, mastery or admission eligibility.

## Review needed

Approve/revise component weighting and exposure bonus; compare mappings against adviser-reviewed examples; check ranking stability; confirm source labels were reviewed. Record student validation separately from the supplied job-classification metrics. No adviser accuracy has been measured yet.

See [RF-INTEGRATION-LOG.md](RF-INTEGRATION-LOG.md) for the ongoing work and verification evidence.

## Technical testing connection

The pilot is implemented in `ml/student-mapping.cjs`. `npm run check:rf` verifies it and compares the exported forest against 807 scikit-learn reference inputs. The `/api/v3/recommend` endpoint reads saved server grades and caches results in encrypted student storage. It is enabled by default for preliminary suggestions. Set `NORTHSTAR_RF_ENABLED=false` and restart to disable recommendations. Request bank version 4.0; the API transport path remains v3 for compatibility. No browser feature vector or browser-reported grade controls this endpoint.

The revised bank is opened with `assessment.html?bank=v4`. Earlier v3 assessments retain their own bank, key set and stored answers; they are not silently converted to v4. See ASSESSMENT-V4.md for the revision and pilot protocol.
