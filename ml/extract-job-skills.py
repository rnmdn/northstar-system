"""Extract explicit IT skill mentions from Northstar employer job descriptions.

This is a transparent keyword baseline. Mentions are evidence to review, not a
claim that every skill is required or that all possible skills were found.
"""

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / "data" / "processed" / "northstar-job-postings-review-v1.csv"
OUTPUT = ROOT / "data" / "processed" / "northstar-extracted-skills-v1.csv"
SUMMARY = ROOT / "data" / "processed" / "northstar-skill-summary-v1.json"

# Keys are Northstar's existing ten student skill areas. Values are concrete
# terms searched as whole phrases, ignoring case. Review false positives.
SKILLS = {
    "Programming": ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Golang", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R programming", "Bash", "PowerShell", "HTML", "CSS", "React", "Angular", "Vue", "Node.js", ".NET", "Django", "Flask", "Spring Boot", "Express.js", "Git", "API development", "REST API", "GraphQL", "unit testing", "test automation"],
    "Networks": ["TCP/IP", "DNS", "DHCP", "BGP", "OSPF", "VLAN", "VPN", "subnetting", "network routing", "switching", "firewall", "load balancing", "network architecture", "network monitoring", "Wi-Fi", "LAN", "WAN", "Cisco", "Juniper", "Fortinet", "SD-WAN", "network protocols"],
    "Security": ["cybersecurity", "information security", "application security", "cloud security", "network security", "penetration testing", "vulnerability assessment", "threat modeling", "threat detection", "incident response", "SIEM", "SOC", "IAM", "identity and access management", "zero trust", "encryption", "cryptography", "OWASP", "SAST", "DAST", "DevSecOps", "security monitoring", "risk assessment", "security compliance", "security audit", "EDR", "SOC 2", "ISO 27001"],
    "Data analysis": ["data analysis", "data analytics", "data visualization", "data cleaning", "data modeling", "statistics", "statistical analysis", "machine learning", "deep learning", "predictive modeling", "A/B testing", "business intelligence", "Power BI", "Tableau", "Looker", "Excel", "pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch", "ETL", "data pipeline", "data warehousing", "Spark", "dbt"],
    "Databases": ["SQL", "PostgreSQL", "MySQL", "SQL Server", "Oracle Database", "MongoDB", "Redis", "DynamoDB", "Snowflake", "BigQuery", "Redshift", "database administration", "database design", "database optimization", "query optimization", "stored procedures", "database backup", "database recovery", "relational database", "NoSQL", "schema design", "data migration"],
    "Interface design": ["UI design", "UX design", "user experience", "user interface", "user research", "usability testing", "interaction design", "wireframing", "prototyping", "design systems", "visual design", "responsive design", "accessibility", "WCAG", "Figma", "Sketch", "Adobe XD", "Adobe Illustrator", "Adobe Photoshop", "information architecture", "front-end development", "frontend development", "web design"],
    "Problem solving": ["problem solving", "problem-solving", "analytical thinking", "root cause analysis", "critical thinking", "debugging", "diagnostic skills"],
    "Systems": ["Linux", "Windows Server", "Unix", "system administration", "systems administration", "cloud infrastructure", "AWS", "Azure", "Google Cloud", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible", "CI/CD", "DevOps", "virtualization", "VMware", "containers", "server management", "infrastructure as code", "observability", "Prometheus", "Grafana"],
    "Software design": ["software architecture", "system design", "design patterns", "object-oriented programming", "microservices", "distributed systems", "scalability", "clean architecture", "software design", "technical design", "API design", "domain-driven design", "event-driven architecture", "code review"],
    "Troubleshooting": ["troubleshooting", "troubleshoot", "incident management", "fault isolation", "root cause analysis", "technical support", "performance tuning", "production support", "diagnose issues", "resolve incidents"],
}


def mentions(text, term):
    flags = 0 if term in {"Go", "Excel"} else re.IGNORECASE
    return bool(re.search(r"(?<!\w)" + re.escape(term) + r"(?!\w)", text, flags))


def main():
    skill_columns = ["skill_" + re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_") for name in SKILLS]
    fields = ["record_id", "posting_url", "candidate_path", "review_status", "reviewed_path", "title", "detected_skills", "specific_skills", "skill_area_count", "needs_skill_review"] + skill_columns
    area_counts = Counter()
    term_counts = Counter()
    path_counts = defaultdict(Counter)
    row_count = 0
    zero_count = 0
    with INPUT.open(encoding="utf-8-sig", newline="") as source, OUTPUT.open("w", encoding="utf-8-sig", newline="") as destination:
        reader = csv.DictReader(source)
        writer = csv.DictWriter(destination, fieldnames=fields, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        for source_row in reader:
            text = source_row["description"]
            found = {area: [term for term in terms if mentions(text, term)] for area, terms in SKILLS.items()}
            areas = [area for area, terms in found.items() if terms]
            terms = sorted({term for matches in found.values() for term in matches}, key=str.casefold)
            row = {field: source_row.get(field, "") for field in fields}
            row["detected_skills"] = "; ".join(areas)
            row["specific_skills"] = "; ".join(terms)
            row["skill_area_count"] = len(areas)
            row["needs_skill_review"] = "yes"
            for area, column in zip(SKILLS, skill_columns):
                row[column] = int(bool(found[area]))
            writer.writerow(row)
            area_counts.update(areas)
            term_counts.update(terms)
            path_counts[source_row["candidate_path"]].update(areas)
            row_count += 1
            zero_count += not bool(areas)
    summary = {
        "rows": row_count,
        "rows_with_no_detected_skill_area": zero_count,
        "method": "Case-insensitive whole-phrase matching of job descriptions; all matches require review.",
        "skill_areas": list(SKILLS),
        "terms_in_lexicon": sum(map(len, SKILLS.values())),
        "detected_skill_area_posting_counts": dict(area_counts),
        "detected_specific_skill_posting_counts": dict(term_counts.most_common()),
        "detected_area_counts_by_candidate_path": {path: dict(counts) for path, counts in path_counts.items()},
        "lexicon": SKILLS,
    }
    SUMMARY.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Extracted skills from {row_count} postings; {zero_count} had no detected skill area")
    print(OUTPUT)
    print(SUMMARY)


if __name__ == "__main__":
    main()
