"""Build Northstar's review dataset from the supplied CSVs and original records.

The uploaded employer CSV was re-exported with empty columns and six broken
description fragments. Its intact URLs select records from the original,
well-formed Greenhouse/Lever collection. No title-based label is approved here.
"""

import csv
import hashlib
import html
import json
import re
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "user-supplied"
PROCESSED = ROOT / "data" / "processed"
EMPLOYER_SELECTION = RAW / "toCheckUlet.csv"
LINKEDIN_AUDIT = RAW / "toCheck.csv"
EMPLOYER_POOL = PROCESSED / "employer-job-candidates.csv"
EMPLOYER_OUTPUT = PROCESSED / "northstar-job-postings-review-v1.csv"
EXCLUDED_OUTPUT = PROCESSED / "northstar-excluded-postings-v1.csv"
SURVEY_OUTPUT = PROCESSED / "northstar-linkedin-survey-v1.csv"
MANIFEST_OUTPUT = PROCESSED / "northstar-dataset-v1-manifest.json"

PATHS = (
    "Software development",
    "Networking",
    "Cybersecurity",
    "Data science & analytics",
    "Database administration",
    "UI/UX & web development",
)


class TextFromHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.skip_depth += 1
        elif tag in {"p", "div", "li", "br", "h1", "h2", "h3", "h4"}:
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in {"script", "style"} and self.skip_depth:
            self.skip_depth -= 1
        elif tag in {"p", "div", "li", "h1", "h2", "h3", "h4"}:
            self.parts.append(" ")

    def handle_data(self, data):
        if not self.skip_depth:
            self.parts.append(data)


def plain_text(value):
    parser = TextFromHTML()
    parser.feed(html.unescape(value or ""))
    return re.sub(r"\s+", " ", html.unescape("".join(parser.parts))).strip()


def read_dict_rows(path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        yield from reader


def write_rows(path, fields, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main():
    csv.field_size_limit(100_000_000)
    selection = {}
    broken_fragments = 0
    with EMPLOYER_SELECTION.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        next(reader)
        for row in reader:
            if len(row) < 11 or row[3] not in PATHS or not row[2].startswith("https://"):
                broken_fragments += 1
                continue
            url = row[2].strip()
            if url in selection:
                raise ValueError(f"Duplicate employer selection URL: {url}")
            selection[url] = {
                "candidate_path": row[3],
                "review_status": row[8] or "unreviewed",
                "reviewed_path": row[9],
                "review_notes": row[10],
            }

    pool = {row["posting_url"]: row for row in read_dict_rows(EMPLOYER_POOL)}
    missing = sorted(set(selection) - set(pool))
    if missing:
        raise ValueError(f"{len(missing)} selected URLs missing from original pool")

    employer_rows = []
    for url, review in selection.items():
        source = pool[url]
        if source["candidate_path"] != review["candidate_path"]:
            raise ValueError(f"Conflicting path for {url}")
        description = plain_text(source["description"])
        if len(description) < 150:
            raise ValueError(f"Description is too short for {url}")
        source_date = source["source_date"]
        datetime.strptime(source_date, "%Y-%m-%d")
        platform = source["source"]
        if platform not in {"Greenhouse", "Lever"}:
            raise ValueError(f"Unexpected source platform: {platform}")
        employer_rows.append({
            "record_id": hashlib.sha256(url.encode()).hexdigest()[:16],
            "source_platform": platform,
            "source_date": source_date,
            "source_date_meaning": "last_updated" if platform == "Greenhouse" else "created_at",
            "posting_url": url,
            "candidate_path": review["candidate_path"],
            "title": plain_text(source["title"]),
            "employer_board": source["board_token"],
            "location": plain_text(source["location"]),
            "description": description,
            "description_word_count": len(description.split()),
            "review_status": review["review_status"],
            "reviewed_path": review["reviewed_path"],
            "review_notes": review["review_notes"],
        })
    selected_count = len(employer_rows)
    by_description = {}
    for row in employer_rows:
        fingerprint = hashlib.sha256(row["description"].casefold().encode()).hexdigest()
        by_description.setdefault(fingerprint, []).append(row)
    unique_rows = []
    excluded_rows = []
    for fingerprint, group in by_description.items():
        paths_in_group = {row["candidate_path"] for row in group}
        if len(paths_in_group) > 1:
            for row in group:
                excluded_rows.append({
                    "posting_url": row["posting_url"],
                    "candidate_path": row["candidate_path"],
                    "reason": "identical_description_conflicting_paths",
                    "duplicate_of": "",
                    "description_hash": fingerprint,
                })
            continue
        group.sort(key=lambda row: (row["source_date"], row["record_id"]), reverse=True)
        unique_rows.append(group[0])
        for row in group[1:]:
            excluded_rows.append({
                "posting_url": row["posting_url"],
                "candidate_path": row["candidate_path"],
                "reason": "identical_description_duplicate",
                "duplicate_of": group[0]["posting_url"],
                "description_hash": fingerprint,
            })
    employer_rows = sorted(unique_rows, key=lambda row: (PATHS.index(row["candidate_path"]), row["record_id"]))

    survey_rows = []
    survey_urls = set()
    for source in read_dict_rows(LINKEDIN_AUDIT):
        url = source["posting_url"].strip()
        path = source["candidate_path"]
        if not url.startswith("https://") or path not in PATHS or url in survey_urls:
            raise ValueError(f"Invalid or duplicate LinkedIn survey row: {url}")
        survey_urls.add(url)
        survey_rows.append({
            "record_id": hashlib.sha256(url.encode()).hexdigest()[:16],
            "candidate_path": path,
            "posting_url": url,
            "checked_at": source["checked_at"],
            "page_status": source["page_status"],
            "availability_evidence": source["availability_evidence"],
            "posting_date_as_shown": source["posting_date_as_shown"],
            "relative_age_as_shown": source["relative_age_as_shown"],
            "category_evidence": source["category_evidence"],
            "page_title": source["page_title"],
            "review_notes": source["review_notes"],
        })
    survey_rows.sort(key=lambda row: (PATHS.index(row["candidate_path"]), row["record_id"]))

    write_rows(EMPLOYER_OUTPUT, list(employer_rows[0]), employer_rows)
    write_rows(EXCLUDED_OUTPUT, ["posting_url", "candidate_path", "reason", "duplicate_of", "description_hash"], excluded_rows)
    write_rows(SURVEY_OUTPUT, list(survey_rows[0]), survey_rows)
    manifest = {
        "dataset_version": "northstar-v1-2026-09-27",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "employer_postings_file": str(EMPLOYER_OUTPUT.relative_to(ROOT)),
        "employer_postings_count": len(employer_rows),
        "employer_selected_before_deduplication": selected_count,
        "employer_counts_by_path": dict(Counter(row["candidate_path"] for row in employer_rows)),
        "employer_counts_by_platform": dict(Counter(row["source_platform"] for row in employer_rows)),
        "excluded_postings_file": str(EXCLUDED_OUTPUT.relative_to(ROOT)),
        "excluded_postings_count": len(excluded_rows),
        "excluded_reasons": dict(Counter(row["reason"] for row in excluded_rows)),
        "linkedin_survey_file": str(SURVEY_OUTPUT.relative_to(ROOT)),
        "linkedin_survey_count": len(survey_rows),
        "linkedin_counts_by_path": dict(Counter(row["candidate_path"] for row in survey_rows)),
        "linkedin_availability_evidence": dict(Counter(row["availability_evidence"] for row in survey_rows)),
        "invalid_employer_csv_fragments_ignored": broken_fragments,
        "source_sha256": {
            "toCheck.csv": sha256_file(LINKEDIN_AUDIT),
            "toCheckUlet.csv": sha256_file(EMPLOYER_SELECTION),
            "employer-job-candidates.csv": sha256_file(EMPLOYER_POOL),
        },
        "limitations": [
            "Employer career paths are title-based candidate labels and require human description review.",
            "Greenhouse source_date is the last update date; Lever source_date is creation date.",
            "LinkedIn survey rows contain no job description and are not suitable for model training.",
            "A visible Apply control does not independently prove that the employer is accepting applications.",
            "No records are approved training labels until review_status is set to keep and reviewed_path is filled.",
        ],
    }
    MANIFEST_OUTPUT.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "employer_postings": len(employer_rows),
        "employer_counts_by_path": manifest["employer_counts_by_path"],
        "linkedin_survey_links": len(survey_rows),
        "invalid_fragments_ignored": broken_fragments,
        "outputs": [str(EMPLOYER_OUTPUT), str(EXCLUDED_OUTPUT), str(SURVEY_OUTPUT), str(MANIFEST_OUTPUT)],
    }, indent=2))


if __name__ == "__main__":
    main()
