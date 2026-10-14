"""Combine the two Northstar review sources into one clearly marked CSV."""

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"
EMPLOYER = PROCESSED / "northstar-job-postings-review-v1.csv"
LINKEDIN = PROCESSED / "northstar-linkedin-survey-v1.csv"
OUTPUT = PROCESSED / "northstar-combined-review-v1.csv"

FIELDS = [
    "record_id", "record_type", "source_platform", "candidate_path", "title",
    "employer_board", "location", "posting_url", "source_date",
    "source_date_meaning", "checked_at", "page_status",
    "availability_evidence", "posting_date_as_shown", "relative_age_as_shown",
    "category_evidence", "description", "description_word_count",
    "review_status", "reviewed_path", "review_notes", "training_ready",
]


def read_rows(path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def main():
    seen_urls = set()
    counts = {"employer_posting": 0, "linkedin_survey_link": 0}
    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, quoting=csv.QUOTE_ALL)
        writer.writeheader()

        for path, record_type in (
            (EMPLOYER, "employer_posting"),
            (LINKEDIN, "linkedin_survey_link"),
        ):
            for source in read_rows(path):
                url = source["posting_url"]
                if url in seen_urls:
                    raise ValueError(f"Duplicate posting URL: {url}")
                seen_urls.add(url)
                row = {field: source.get(field, "") for field in FIELDS}
                row["record_type"] = record_type
                row["source_platform"] = source.get("source_platform", "LinkedIn")
                row["title"] = source.get("title") or source.get("page_title", "")
                row["review_status"] = source.get("review_status", "unreviewed")
                row["training_ready"] = "no"
                writer.writerow(row)
                counts[record_type] += 1

    print(f"Created {OUTPUT} with {sum(counts.values())} rows: {counts}")


if __name__ == "__main__":
    main()
