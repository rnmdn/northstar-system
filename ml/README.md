# Runtime machine learning modules

- student-mapping.cjs: objective-domain-pilot-v1, converting graded scores and declared exposure into six normalized inputs.
- team-rf.cjs: validates and runs the team's exported forest in Node.js.
- result-summary.cjs: generates a constrained result explanation, with a cached template fallback.

The trained forest is models/team-rf/forest.json. Tests compare predictions with models/team-rf/prediction-reference.json. Dataset collection, offline exports and retraining tools remain in the original north-star working folder and previous Git history.

No student recommendation validity is claimed. See STUDENT-MAPPING.md and RF-INTEGRATION-LOG.md.
