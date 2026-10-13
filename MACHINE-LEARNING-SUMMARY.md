# NorthStar machine learning components

Updated 13 October 2026 for the research team.

## Model and source

NorthStar uses the existing team Random Forest from https://github.com/antiyaa/ITCareerPath_rf. The source artifact is final_model.joblib, recovered from repository commit 5202e1ca026aadc1eb25ae41562050143476a8e7. It contains 200 trees and was trained on 504 job postings. We have not retrained it using student records.

The source training environment uses Python and scikit-learn. NorthStar serves an exported representation of the same forest through Node.js. The model export is models/team-rf/forest.json; the prediction implementation is ml/team-rf.cjs. The export was checked against scikit-learn on 807 reference inputs.

## Student mapping

Mapping version: objective-domain-pilot-v1. Implementation: ml/student-mapping.cjs.

For each career, add knowledge points out of 6, practical points out of 4 and written points out of 4. Calculate evidence = 3 × (points / 14) + 0.5 × declared exposure, where exposure is either 0 or 1. Divide each evidence value by the total evidence across all six careers.

The six model features in exact order are:

1. Software development
2. Networking
3. Cybersecurity
4. Data science & analytics
5. Database administration
6. UI/UX & web development

Interests and work style are displayed as context and currently do not alter the RF ranking. All required grades must be complete. Missing grades do not become zero. All-zero evidence produces an insufficient-evidence result.

## Output and separate grading service

The forest returns category probabilities, which NorthStar uses to display the top three career suggestions. These values represent model support for a category, not a student's proficiency percentage or chance of career success.

Gemini grades written scenarios against the rubric; it is separate from the Random Forest. Knowledge and practical scoring are deterministic server checks. The live six-reference check used gemini-flash-lite-latest, which returned provider version gemini-3.5-flash-lite. All six fictional full-credit references received 4/4. This does not establish partial-credit calibration.

## Validation limits

The team's reported job-posting holdout accuracy is approximately 89%. This is not measured student recommendation accuracy. Student mapping constants remain provisional; comparable assessment difficulty, adviser agreement and student recommendation validity still need testing. Source model metadata also describes labels as draft unless the team has verified them.

See NorthStar_Student_Mapping.docx in outputs for the formula and a worked example, and RF-INTEGRATION-LOG.md for implementation and check records.
