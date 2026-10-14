"""Make a numeric job-skill feature matrix for experimental classification.

Only employer postings have descriptions. Career labels stay provisional until
human review; the output is not an approved model training set.
"""

import csv
import json
import re
from collections import Counter
from pathlib import Path

from importlib.util import module_from_spec, spec_from_file_location


ROOT = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"
SOURCE = PROCESSED / "northstar-job-postings-review-v1.csv"
OUTPUT = PROCESSED / "northstar-skill-features-v1.csv"
MANIFEST = PROCESSED / "northstar-skill-features-v1-manifest.json"

spec = spec_from_file_location("northstar_skill_extractor", Path(__file__).with_name("extract-job-skills.py"))
extractor = module_from_spec(spec)
spec.loader.exec_module(extractor)


def column_name(prefix, name):
    return prefix + re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def main():
    # A term may occur in two broad areas; represent it only once in the model.
    terms = list(dict.fromkeys(term for group in extractor.SKILLS.values() for term in group))
    area_columns = {area: column_name("area_", area) for area in extractor.SKILLS}
    term_columns = {term: f"term_{index:03d}_{column_name('', term)}" for index, term in enumerate(terms, 1)}
    feature_columns = list(area_columns.values()) + list(term_columns.values())
    fields = ["record_id", "posting_url", "candidate_label", "approved_label", "label_status", "training_eligible"] + feature_columns
    counts = Counter()
    feature_counts = Counter()
    with SOURCE.open(encoding="utf-8-sig", newline="") as source, OUTPUT.open("w", encoding="utf-8-sig", newline="") as destination:
        reader = csv.DictReader(source)
        writer = csv.DictWriter(destination, fieldnames=fields, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        for posting in reader:
            description = posting["description"]
            if not description.strip():
                raise ValueError(f"Missing description: {posting['posting_url']}")
            approved = posting["reviewed_path"] if posting["review_status"] == "keep" else ""
            row = {
                "record_id": posting["record_id"],
                "posting_url": posting["posting_url"],
                "candidate_label": posting["candidate_path"],
                "approved_label": approved,
                "label_status": "approved" if approved else "unreviewed",
                "training_eligible": 1 if approved else 0,
            }
            term_present = {term: int(extractor.mentions(description, term)) for term in terms}
            for area, column in area_columns.items():
                row[column] = int(any(term_present[term] for term in extractor.SKILLS[area]))
            for term, column in term_columns.items():
                row[column] = term_present[term]
            writer.writerow(row)
            counts["rows"] += 1
            counts[posting["candidate_path"]] += 1
            counts["approved"] += bool(approved)
            counts["no_detected_terms"] += not any(term_present.values())
            feature_counts.update({column: row[column] for column in feature_columns})
    manifest = {
        "rows": counts["rows"],
        "candidate_counts_by_path": {
            key: value for key, value in counts.items()
            if key not in {"rows", "approved", "no_detected_terms"}
        },
        "approved_label_rows": counts["approved"],
        "rows_without_detected_terms": counts["no_detected_terms"],
        "numeric_feature_count": len(feature_columns),
        "area_features": area_columns,
        "specific_term_features": term_columns,
        "feature_posting_counts": dict(feature_counts),
        "limitations": [
            "Candidate labels are title-based and not approved training labels.",
            "Features indicate term mentions, not confirmed required proficiency.",
            "LinkedIn link-only survey rows are excluded because they have no descriptions.",
            "The student assessment does not currently collect all specific term features.",
        ],
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Created {OUTPUT}: {counts['rows']} jobs, {len(feature_columns)} numeric features, {counts['approved']} approved labels")


if __name__ == "__main__":
    main()
