"""Create an editable review checklist and report verified review progress.

Re-running the create step keeps all existing reviewer answers unchanged.
"""

import csv
import sys
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"
SOURCE = PROCESSED / "northstar-extracted-skills-v1.csv"
LINKEDIN = PROCESSED / "northstar-linkedin-survey-v1.csv"
CHECKLIST = PROCESSED / "northstar-review-checklist-v1.csv"
PATHS = {
    "Software development", "Networking", "Cybersecurity",
    "Data science & analytics", "Database administration",
    "UI/UX & web development",
}
REVIEW_FIELDS = [
    "link_status", "career_path_checked", "skills_checked", "decision", "approved_path",
    "approved_skills", "review_status", "review_notes",
]
FIELDS = [
    "record_id", "record_type", "posting_url", "title", "candidate_path",
    "detected_skill_areas", "detected_specific_skills", *REVIEW_FIELDS,
]


def rows(path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def create():
    previous = {row["record_id"]: row for row in rows(CHECKLIST)} if CHECKLIST.exists() else {}
    output = []
    sources = [
        {
            **extracted,
            "record_type": "Employer posting",
            "detected_skills": extracted["detected_skills"],
            "specific_skills": extracted["specific_skills"],
        }
        for extracted in rows(SOURCE)
    ]
    sources.extend({
        **survey,
        "record_type": "LinkedIn survey link",
        "title": survey["page_title"],
        "detected_skills": "",
        "specific_skills": "",
    } for survey in rows(LINKEDIN))
    for extracted in sources:
        record_id = extracted["record_id"]
        if record_id in previous:
            row = previous[record_id].copy()
        else:
            row = {field: "" for field in FIELDS}
            row.update({"link_status": "Pending", "career_path_checked": "no", "skills_checked": "no", "decision": "pending", "review_status": "pending"})
        row["link_status"] = row.get("link_status") or "Pending"
        row.update({
            "record_id": record_id,
            "record_type": extracted["record_type"],
            "posting_url": extracted["posting_url"],
            "title": extracted["title"],
            "candidate_path": extracted["candidate_path"],
            "detected_skill_areas": extracted["detected_skills"],
            "detected_specific_skills": extracted["specific_skills"],
        })
        output.append(row)
    with CHECKLIST.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(output)
    print(f"Checklist: {CHECKLIST} ({len(output)} rows; {len(previous)} prior reviews preserved)")


def progress():
    counts = Counter()
    problems = []
    for row in rows(CHECKLIST):
        counts["total"] += 1
        label = row["record_id"]
        career = row["career_path_checked"].strip().lower() == "yes"
        skills = row["skills_checked"].strip().lower() == "yes"
        link = row.get("link_status", "").strip().lower() == "checked"
        decision = row["decision"].strip().lower()
        marked_done = row["review_status"].strip().lower() == "done"
        if career:
            counts["career_path_checked"] += 1
        if skills:
            counts["skills_checked"] += 1
        if link:
            counts["links_checked"] += 1
        if decision in {"keep", "reject"}:
            counts["decided"] += 1
        valid_path = decision == "reject" or row["approved_path"].strip() in PATHS
        valid_skills = decision == "reject" or bool(row["approved_skills"].strip())
        complete = link and career and skills and decision in {"keep", "reject"} and valid_path and valid_skills
        if complete:
            counts["complete"] += 1
        if marked_done and not complete:
            problems.append(label)
    print(f"Completed: {counts['complete']} / {counts['total']}")
    print(f"Links checked: {counts['links_checked']} / {counts['total']}")
    print(f"Career path checked: {counts['career_path_checked']} / {counts['total']}")
    print(f"Skills checked: {counts['skills_checked']} / {counts['total']}")
    print(f"Keep/reject decided: {counts['decided']} / {counts['total']}")
    if problems:
        print(f"Marked done but incomplete: {len(problems)} (first IDs: {', '.join(problems[:10])})")
        return 1
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"create", "progress"}:
        raise SystemExit("Usage: python ml/review-checklist.py create|progress")
    if sys.argv[1] == "create":
        create()
    else:
        raise SystemExit(progress())
