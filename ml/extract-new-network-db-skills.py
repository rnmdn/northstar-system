"""Extract reviewable specific skill mentions from the new two-path postings."""

import csv
from collections import Counter
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "processed" / "new-network-database-50-each.csv"
OUTPUT = ROOT / "data" / "processed" / "new-network-database-50-each-skills.csv"
spec = spec_from_file_location("northstar_skill_extractor", Path(__file__).with_name("extract-job-skills.py"))
extractor = module_from_spec(spec)
spec.loader.exec_module(extractor)

# These terms make the network and database detail visible beyond the site's
# ten broad assessment areas. Every value is still checked against job text.
EXTRA_TERMS = [
    "Oracle", "RMAN", "PL/SQL", "T-SQL", "MariaDB", "Cassandra", "Elasticsearch",
    "ClickHouse", "DB2", "DynamoDB", "RDS", "Aurora", "SQL Clustering",
    "replication", "backup", "recovery", "failover", "high availability",
    "disaster recovery", "query tuning", "database tuning", "indexing",
    "Cisco Meraki", "Meraki", "Aruba", "Palo Alto", "CCNA", "CCNP", "MPLS",
    "SDN", "IPv4", "IPv6", "routing", "wireless", "network automation",
    "NAT", "VoIP", "QoS", "Zero Trust", "IPsec", "Wireshark",
    "network operations", "network performance", "change management",
]
TERMS = list(dict.fromkeys(term for terms in extractor.SKILLS.values() for term in terms))
known_terms = {term.casefold() for term in TERMS}
for term in EXTRA_TERMS:
    if term.casefold() not in known_terms:
        TERMS.append(term)
        known_terms.add(term.casefold())


def main():
    counts = Counter()
    with SOURCE.open(encoding="utf-8-sig", newline="") as source, OUTPUT.open("w", encoding="utf-8-sig", newline="") as output:
        reader = csv.DictReader(source)
        fields = [*reader.fieldnames, "detected_specific_skills", "detected_skill_count", "skills_review_status"]
        writer = csv.DictWriter(output, fieldnames=fields, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        for row in reader:
            found = sorted((term for term in TERMS if extractor.mentions(row["description"], term)), key=str.casefold)
            row.update({
                "detected_specific_skills": "; ".join(found),
                "detected_skill_count": len(found),
                "skills_review_status": "needs_review",
            })
            writer.writerow(row)
            counts[row["candidate_path"]] += 1
            counts["zero_skills"] += not found
    print(f"Created {OUTPUT}: {dict(counts)}")


if __name__ == "__main__":
    main()
