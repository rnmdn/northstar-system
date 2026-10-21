const crypto = require('node:crypto');

// A projection of validated responses and server-produced grades. Never put raw
// answers, code, feedback, names, emails or authentication tokens into the index.
function projectTechnical(record, bankVersion, scoreSet) {
  if (!record.accountUserId || !record.recordId) return null;
  const grader = require('../grading/v3').forVersion(bankVersion);
  const store = require('./v3').forVersion(bankVersion);
  if (!record.state?.[store.key]) return null;
  const assessment = store.validate(JSON.parse(record.state[store.key]));
  const items = grader.bank.items.map(item => {
    const answer = assessment.responses[item.id];
    const answered = grader.nonempty(answer);
    const grade = scoreSet?.grades?.[item.id];
    const validGrade = grade?.status === 'graded' && Number.isInteger(grade.points) && grade.points >= 0 && grade.points <= item.maximum;
    return {
      id: item.id, career: item.career,
      component: item.type === 'Knowledge MCQ' ? 'knowledge' : item.type === 'Written scenario' ? 'written' : 'practical',
      responseStatus: grader.isNotLearned(answer) ? 'not_learned' : answered ? 'answered' : assessment.skipped.includes(item.id) ? 'skipped' : 'unanswered',
      gradingStatus: validGrade ? 'graded' : !answered ? 'unanswered' : grade?.status === 'grading_error' ? 'grading_error' : 'pending',
      points: validGrade ? grade.points : null, maximum: item.maximum
    };
  });
  return {
    userId: record.accountUserId, recordId: record.recordId, bankVersion,
    sourceRevision: record.revision, submittedAt: assessment.submittedAt,
    stateFingerprint: crypto.createHash('sha256').update(JSON.stringify({revision:record.revision,items,submittedAt:assessment.submittedAt})).digest('hex'),
    items
  };
}

async function syncTechnical(record, write, scoreSets = {}) {
  if (!write || !record.accountUserId) return 'disabled';
  for (const bankVersion of ['3.0','4.0']) {
    const payload = projectTechnical(record, bankVersion, scoreSets[bankVersion]);
    if (payload) await write(payload);
  }
  return 'synced';
}
module.exports = { projectTechnical, syncTechnical };
