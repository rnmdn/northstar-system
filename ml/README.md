# Machine learning code

- student-mapping.cjs: objective-domain-pilot-v1, converting graded scores and declared exposure into six normalized inputs.
- team-rf.cjs: validates and runs the team's exported forest in Node.js.
- result-summary.cjs: generates a constrained result explanation, with a cached template fallback.

The deployed forest is models/team-rf/forest.json. Tests compare predictions with models/team-rf/prediction-reference.json. The website runs this exported forest in Node.js; Python is used offline for dataset preparation, training and export.

## Python tools

| File | Purpose |
| --- | --- |
| train_rf.py | Team Random Forest training, company-grouped evaluation, and fitted model export |
| export-team-rf.py | Convert a trusted fitted Python model into the Node forest and parity references |
| build-northstar-dataset.py | Prepare posting review datasets from supplied CSVs |
| extract-job-skills.py | Extract explicit skill mentions from posting descriptions |
| extract-new-network-db-skills.py | Extract skills from the additional networking/database collection |
| build-skill-feature-dataset.py | Build skill feature tables |
| build-review-feature-table.py | Build features for reviewed postings |
| combine-northstar-datasets.py | Combine review datasets |
| prepare-training-candidates.py | Prepare candidate rows for training review |
| review-checklist.py | Inspect review completeness |

The training script is copied from the team's `ITCareerPath_rf/initial_rf_backend_softeng/train_rf.py` (source repository `antiyaa/ITCareerPath_rf`, recovered source commit recorded in the model metadata). It does not establish student recommendation accuracy. This upload does not retrain or replace the deployed model.

## Setup and training

Run from the repository root with a Python version supported by the pinned packages:

```text
python -m venv .rf-venv
python -m pip install -r ml/requirements.txt
python ml/train_rf.py --workbook /path/to/Job_Posting_Review_Workbook.xlsx --features domain --outdir outputs/team-training
```

Activate the virtual environment before installing and running. On Windows PowerShell use `.\\.rf-venv\\Scripts\\Activate.ps1`; on macOS/Linux use `source .rf-venv/bin/activate`.

The workbook must contain Review, Skill Matrix and Career Skill Profiles sheets, with approved labels and cached formula values. Open and save it in Excel or LibreOffice first. Add `--final` only when intentionally fitting a final model on the reviewed rows. Generated outputs stay under ignored `outputs/`.

## Export and data prerequisites

`export-team-rf.py` expects the trusted team bundle at `models/team-rf/final_model.joblib`, using the original scikit-learn version. The fitted Python bundle and training workbook are not included in this source upload. Never load an untrusted pickle/joblib file. Running the exporter overwrites forest.json and prediction-reference.json; preserve the deployed artifact before deliberately replacing it and run `npm run check:rf` afterward.

The preprocessing tools expect input files under `data/raw/` and `data/processed/`; their paths are defined at the top of each script. Those source datasets and generated files are excluded from Git. Most preprocessing tools use only the Python standard library; the requirements file supplies the training/export libraries. Syntax verification does not substitute for running the pipeline with its reviewed inputs.

No student recommendation validity is claimed. See STUDENT-MAPPING.md and RF-INTEGRATION-LOG.md.
