"""Build one ten-skill review table for all North Star posting candidates.

Automatically detected features are provisional. A row is training eligible only
after the checklist confirms its link, career path, skills, and keep decision.
"""

import csv
import re
from collections import Counter
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"
SOURCE = PROCESSED / "northstar-combined-review-v1.csv"
CHECKLIST = PROCESSED / "northstar-review-checklist-v1.csv"
OUTPUT = PROCESSED / "northstar-all-review-features-v1.csv"

spec = spec_from_file_location("northstar_skill_extractor", Path(__file__).with_name("extract-job-skills.py"))
extractor = module_from_spec(spec)
spec.loader.exec_module(extractor)

PATHS = {
    "Software development", "Networking", "Cybersecurity",
    "Data science & analytics", "Database administration",
    "UI/UX & web development",
}
AREAS = list(extractor.SKILLS)
AREA_COLUMNS = {area: "skill_" + re.sub(r"[^a-z0-9]+", "_", area.lower()).strip("_") for area in AREAS}
TERM_AREAS = {}
for area, terms in extractor.SKILLS.items():
    for term in terms:
        TERM_AREAS.setdefault(term.casefold(), set()).add(area)


def read_rows(path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def approved_areas(value, record_id):
    areas = set()
    for raw_term in value.split(";"):
        term = raw_term.strip()
        if not term:
            continue
        matches = TERM_AREAS.get(term.casefold())
        if matches:
            areas.update(matches)
        elif term.casefold() in {area.casefold() for area in AREAS}:
            areas.add(next(area for area in AREAS if area.casefold() == term.casefold()))
        else:
            raise ValueError(f"Unknown approved skill for {record_id}: {term}")
    return areas


def main():
    reviews = {row["record_id"]: row for row in read_rows(CHECKLIST)}
    fields = [
        "record_id", "record_type", "source_platform", "posting_url",
        "candidate_path", "approved_path", "review_status", "feature_source",
        "training_eligible", *AREA_COLUMNS.values(),
    ]
    counts = Counter()
    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        for posting in read_rows(SOURCE):
            record_id = posting["record_id"]
            review = reviews.get(record_id)
            if review is None:
                raise ValueError(f"Missing checklist row: {record_id}")
            description = posting["description"].strip()
            decision = review["decision"].strip().lower()
            approved_path = review["approved_path"].strip()
            approved_skills = review["approved_skills"].strip()
            reviewed = all((
                review["link_status"].strip().lower() == "checked",
                review["career_path_checked"].strip().lower() == "yes",
                review["skills_checked"].strip().lower() == "yes",
                decision == "keep",
                approved_path in PATHS,
                bool(approved_skills),
                bool(description),
            ))
            if reviewed:
                areas = approved_areas(approved_skills, record_id)
                feature_source = "reviewed_skills"
                status = "approved"
            elif decision == "reject":
                areas = set()
                feature_source = "none"
                status = "rejected"
            elif description:
                areas = {
                    area for area, terms in extractor.SKILLS.items()
                    if any(extractor.mentions(description, term) for term in terms)
                }
                feature_source = "auto_detected"
                status = "needs_review"
            else:
                areas = set()
                feature_source = "none"
                status = "needs_description"
            row = {
                "record_id": record_id,
                "record_type": posting["record_type"],
                "source_platform": posting["source_platform"],
                "posting_url": posting["posting_url"],
                "candidate_path": posting["candidate_path"],
                "approved_path": approved_path if reviewed else "",
                "review_status": status,
                "feature_source": feature_source,
                "training_eligible": int(reviewed),
            }
            for area, column in AREA_COLUMNS.items():
                row[column] = int(area in areas) if description and status != "rejected" else ""
            writer.writerow(row)
            counts[status] += 1
    print(f"Created {OUTPUT}: {dict(counts)}")


if __name__ == "__main__":
    main()
