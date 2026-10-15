# Answer status and submission policy

## Final answers and temporary review states

- An attempted answer keeps its original format and scoring rubric.
- Explicit "I haven’t learned this yet" is stored as `{ "status": "not_learned" }` in that item's response. It is a final answer worth zero points. The grader records `responseStatus: not_learned` and does not send it to AI providers.
- "Skip for now" is stored separately in `skipped`, preserves any existing draft answer, and is unresolved. All skips and unanswered items must be resolved before final submission. Students may resolve a skip by answering or selecting not learned.
- `flagged` is independent of answer completeness. Flags appear in the priority review list but do not block submission when an answer is complete.
- Review first lists unresolved and flagged items, then six expandable career groups with direct review actions. Submitted answers have a separate read-only overview.

## Submission and grading

Draft answers can be edited. Successful submission locks answers on the server. Available knowledge and practical scores are shown before AI grading completes. The results view distinguishes submitted/pending, grading in progress, grading temporarily unavailable, and grading complete. AI errors offer Retry AI grading; they do not unlock answers. Career suggestions require complete grading across all required components.

If the submission request itself fails, the client cannot confirm submission. Retrying submission is idempotent on the server. An ambiguous network failure is not reported as a confirmed submission.

## Mapping limitation

Not learned and incorrect attempts both contribute zero numeric points to the current student mapping. They remain distinct in saved responses and grading records for analysis, but the Random Forest does not distinguish their reasons. All-zero scores combined with no reported exposure produce insufficient evidence; students can choose a foundational learning direction themselves. Reported exposure can still contribute to the existing mapping.

This is a response-policy change, not a retrained model or a changed question rubric. Existing answers and locked submissions are retained.

## Returning to work

The homepage offers Resume assessment. Profile review prompts once to keep a recovery code before the skills assessment; students may explicitly defer it. The code can also be created from persistent Recovery options. Anyone with a recovery code can open the record. Creating another code replaces the previous one. Save confirmation means a server write succeeded, not that cross-device retrieval is possible without a recovery code.

No completion-time estimate is advertised until real student sessions are measured.

## Career suggestions, loading and learning progress

Career cards prioritize the career, assessment evidence and first activity. Numeric RF support is retained only inside the evidence/model breakdown, with its interpretation explained. Initial plan selection requires one deliberate direction; existing selected directions are retained and more may be added afterward.

Activity completion is self-reported, stored per career in `activityProgress` with an ISO `completedAt` date, and can be unchecked. It does not change assessment scores, model inputs, or the recommendation ranking. Completion guidance suggests reflection or exploring another direction.

Assessment loading uses a real live status and marks main content busy. Required module failures, runtime failures and loading timeouts keep the unfinished content hidden and offer Retry loading. The arbitrary 20-second reveal was removed. A storage outage can still reveal a usable local draft after application scripts initialize, with server-save status shown separately.

Question Back, Next and jump transitions focus the current heading. Structured field errors have individual descriptions and reduced-motion-aware scrolling.
