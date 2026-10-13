# North Star: instructions for AI agents

## Project overview

North Star is a student-facing IT career exploration site for BSIT students. Its current journey is a landing page, a four-part profile assessment (skills, prior exposure, interests, and work style), answer review, an objective skills-assessment pilot, top-three career results, and suggested practice steps. The six paths are software development, networking, cybersecurity, data science and analytics, database administration, and UI/UX or web development. Results are guidance for exploration, not a prediction of career success.

The **current implementation** uses NorthStar's blue student UI with the migrated Node server, Gemini written grading, deterministic practical scoring and encrypted file storage. New assessments use revised bank v4; existing v3 answers retain their original version. Components remain separately displayed. The team's six-domain Random Forest is enabled for preliminary student suggestions, with an experimental objective-score/exposure mapping. Set `NORTHSTAR_RF_ENABLED=false` and restart to disable it. No adviser/student recommendation validation is claimed. Legacy self-rating/evidence/certificate features remain accessible under `?bank=legacy`. See README.md, ASSESSMENT-V4.md, STUDENT-MAPPING.md, STORAGE.md and ITEM-BANK-V3.md. GitHub Pages alone cannot run storage or grading.

The supplied research paper describes the **target system**: a Random Forest classifier trained on labeled real IT job postings, with skill extraction, student-to-feature mapping, class probabilities, a top-three ranking, skill-gap analysis, and learning resources. The posting's stated career category is the training label. Student skill proficiency and prior exposure are mapped to classifier inputs; interest and work style are supplementary context. Preserve this distinction between the existing prototype and planned research implementation. Some paper passages describe refining rankings with interest and work style, while its architecture section explicitly says they do not change ranking; resolve that research requirement with the project team before implementing such refinement.

## Project structure

- `index.html`: landing page and career-path overview.
- `assessment.html` -> `review.html` -> `skills-assessment.html` -> `results.html` -> `next-steps.html`: current student flow.
- `styles/student.css` and `styles/skills-assessment.css`: shared site and skills-assessment styles.
- `scripts/student.js`: profile questions, session state, current scoring, results, and next-step content.
- `scripts/skills-assessment.js`: objective skills-assessment pilot and its browser state.
- `scripts/skills-navigation.js` and `scripts/journey.js`: assessment stages and progress/navigation state.
- `scripts/research-code-runner.html`: isolated browser runner for coding tasks in the skills assessment.
- `assets/`: logo and landing video.
- `README.md`: brief layout and publishing instructions.

Keep browser UI code in the root HTML pages, `styles/`, and `scripts/`. Backend scoring is in `grading/`, encrypted persistence in `storage/`, and HTTP routes in `server.js`. Private records and backups stay under ignored `.astra-data/` and `.astra-backups/`. For future ML work, use a dedicated `ml/` area for preprocessing, shared feature definitions, training, evaluation, and prediction code; use `data/raw/` for source job postings, `data/processed/` for labeled feature tables, and `models/` for versioned trained artifacts and feature metadata. These paths are proposed homes, not existing components. Do not put private student data, restricted posting content, or large generated datasets into the public GitHub Pages site.

## Coding guidelines

- Read the relevant pages and scripts before editing. Follow the existing plain JavaScript, HTML, and CSS approach unless a requested feature warrants a deliberate architecture change.
- Write clear, small, beginner-friendly functions and descriptive names. Keep assessment state and UI behavior understandable. Reuse existing helpers and avoid duplicate logic.
- Add dependencies only when they have a clear purpose. Do not rewrite working features or change unrelated files for a narrow task.
- Keep the six career labels, question-to-skill mapping, scoring or model feature schema, and result text consistent across the assessment and results flow.
- Preserve keyboard access, form validation, and the site's explanation that recommendations support student decisions.

## Machine learning and data

- The planned algorithm is **Random Forest** for classifying the six IT career categories. The present scoring function is a prototype and must remain labeled as such until a trained and evaluated model actually replaces it.
- Collect real job postings with source, collection date, stated category, skills, and qualifications where permitted. Document category-label rules and data provenance. Keep raw records in `data/raw/` and cleaned, normalized, labeled features in `data/processed/` when those directories are introduced.
- Put skill extraction and preprocessing in `ml/` and define one versioned feature schema shared by job-posting preprocessing and student prediction. Explicitly test how posting skill tallies correspond to student skill and exposure values; do not assume unlike scales are interchangeable.
- Keep model training and evaluation separate from user-facing prediction. Training should create a reproducible model artifact and record dataset version, feature order, label mapping, parameters, and evaluation results. Evaluate on held-out postings, including per-class results and a confusion matrix; watch for duplicate postings and source leakage across splits.
- Prediction should load an evaluated artifact, apply the same feature schema, and return class probabilities and up to three ranked categories. Probabilities indicate the model's association with a category, not a student's chance of career success.
- Derive career skill profiles from the processed job-posting data for skill-gap analysis, and keep learning-resource matching traceable to identified gaps. Interest and work style are displayed as context unless the research requirements are explicitly revised.
- Treat student responses and any personally identifiable information as sensitive. Collect or retain only what the task requires, and do not commit real student records or secrets.

## Development rules

1. Inspect relevant code, `README.md`, and any new configuration or tests before changing behavior.
2. Make the smallest changes needed for the requested task; preserve unrelated files and working behavior.
3. Ask before major architectural changes, such as adding a backend, database, new deployment platform, or changing the research model's input and ranking rules. Bring a concrete proposal based on inspected code.
4. Explain important changes, their rationale, and how to run or test them. Distinguish implemented features from planned research features in documentation and UI copy.

## Testing and validation

- Run available tests relevant to the change. The migrated package defines `npm test` for grading, storage and DOM regression checks.
- For UI changes, manually check the affected page and the full assessment -> review -> skills assessment -> results -> next steps flow as appropriate, including incomplete answers, navigation, browser-tab state, and restart behavior.
- For ML changes, validate input schemas, reproducible training, held-out evaluation, model loading, category order, prediction probabilities, and student-to-feature mapping. Check for errors and regressions in existing pages before finishing.

## Instructions for AI agents

Read this file before working on North Star and follow it throughout the task. If these instructions conflict with the user's latest explicit request, follow the user while preserving the project's requirements and clearly explain any material trade-off.

## Clean checkout
This NorthStar-System checkout contains the runtime and verification files. Offline dataset collectors, model export scripts, workbook generators, prototype backups and generated reports remain in the original north-star working folder and earlier Git history. Do not recreate or copy them into this checkout unless required by a specific task. Private local records and secrets were not transferred.
