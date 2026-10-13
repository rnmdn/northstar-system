# Assessment scoring policy v1

Knowledge is scored on the server against the versioned 50-question bank. Each correct answer earns one point; every domain has five questions. The domain knowledge score is `correct / 5 × 100`. It describes this brief knowledge sample, not demonstrated professional proficiency.

Coding is independently parsed and interpreted on the server for the restricted numeric JavaScript task. Eight deterministic checks award one point each. Client-supplied totals are ignored. Unsupported syntax remains unscored rather than being assigned an invented mark. No student code is evaluated as host JavaScript.

Each written scenario has three independent binary criteria. AI must return the individual criterion marks and their sum; inconsistent grades are rejected. Relevant alternative solutions and tests are accepted. The rubric version is `written_rubric_v2_criterion_scores`. Saved records include requested model, provider model version, rubric version, timestamp, content hash and record ID.

## Contribution by skill

| Skill | Numeric knowledge score | Additional assessment evidence |
| --- | --- | --- |
| Programming | Q01–Q05 | Coding checks and P1 |
| Networks | Q06–Q10 | P2 |
| Security | Q11–Q15 | P3 |
| Data analysis | Q16–Q20 | P4 |
| Databases | Q21–Q25 | P5 |
| Interface design | Q26–Q30 | P6 |
| Problem solving | Q31–Q35 | No dedicated scored task |
| Systems | Q36–Q40 | No dedicated scored task |
| Software design | Q41–Q45 | No dedicated scored task |
| Troubleshooting | Q46–Q50 | No dedicated scored task |

Written and coding marks remain separate evidence, rather than silently changing domain knowledge scores. Self-ratings, course grades, projects and certifications do not award objective points. Original evidence scales and provenance are retained. A combined proficiency formula needs a research-method decision before ML feature mapping; this policy does not manufacture validated weights.

## Reliability checks

`node scripts/check-ai-grading.cjs http://127.0.0.1:8767` evaluates 18 development reference answers: six complete, six partial, and six irrelevant/instruction-injection responses. It checks exact point agreement, mean absolute error and restored server-cache records. Its development gate is at least 90% exact agreement and MAE no greater than 0.25. A failed or unavailable provider is a failed live check, never a mocked success. The small author-scored set is not an independently adjudicated research validation set; adviser review and a broader set are still needed for research claims.

## Storage and retries

Grades and objective reports are stored under `.astra-data` in owner directories derived from an HttpOnly session cookie. That directory, server modules, dependencies and test outputs are not served as static files. Identical written answers with the same requested model and rubric restore the saved grade. Concurrent identical requests share one provider call. Quotas return a cooldown, timeouts are reported, and invalid results remain unscored. The browser displays retries and never substitutes a fake score.

These records are a local persistence foundation. They do not replace student accounts, deployment access controls, or the full assessment database planned separately.
