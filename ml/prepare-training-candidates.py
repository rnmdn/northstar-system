"""Export both review sources, marking links without descriptions as ineligible.

Candidate paths are title-based suggestions, not approved ground-truth labels.
"""

import csv
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "processed" / "northstar-combined-review-v1.csv"
OUTPUT = ROOT / "data" / "processed" / "northstar-training-candidates-v1.csv"
FIELDS = ["record_id", "record_type", "posting_url", "job_text", "candidate_label", "label_status", "approved_label", "training_eligible"]


def main():
    counts = Counter()
    with SOURCE.open(encoding="utf-8-sig", newline="") as source, OUTPUT.open(
        "w", encoding="utf-8-sig", newline=""
    ) as destination:
        reader = csv.DictReader(source)
        writer = csv.DictWriter(destination, fieldnames=FIELDS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        for row in reader:
            description = row["description"].strip()
            approved = row["reviewed_path"].strip() if row["review_status"] == "keep" else ""
            eligible = bool(description and approved)
            status = "approved" if eligible else "needs_review" if description else "needs_description"
            writer.writerow({
                "record_id": row["record_id"],
                "record_type": row["record_type"],
                "posting_url": row["posting_url"],
                "job_text": description,
                "candidate_label": row["candidate_path"],
                "label_status": status,
                "approved_label": approved,
                "training_eligible": int(eligible),
            })
            counts["rows"] += 1
            counts[status] += 1
    print(f"Created {OUTPUT}: {dict(counts)}")


if __name__ == "__main__":
    main()
