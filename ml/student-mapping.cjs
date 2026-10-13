// Experimental proposal: see STUDENT-MAPPING.md. No student validation claimed.
const domains = [
  ['Software development', 'Software Development', 'EX-SD'],
  ['Networking', 'Networking', 'EX-NW'],
  ['Cybersecurity', 'Cybersecurity', 'EX-CS'],
  ['Data science & analytics', 'Data Science and Analytics', 'EX-DA'],
  ['Database administration', 'Database Administration', 'EX-DB'],
  ['UI/UX & web development', 'UI/UX and Web Development', 'EX-UX']
];
const version = 'objective-domain-pilot-v1';
const OBJECTIVE_SCALE=3, EXPOSURE_BONUS=0.5; // Review these two assumptions together with the mapping version.
function mapStudent(assessment, scores) {
  const exposure = assessment?.profile?.exposure;
  const allowed = ['EX-NONE', ...domains.map(d => d[2])];
  if (!Array.isArray(exposure) || !exposure.length || new Set(exposure).size !== exposure.length ||
      exposure.some(id => !allowed.includes(id)) || exposure.includes('EX-NONE') && exposure.length !== 1) {
    return {status: 'incomplete', reason: 'Complete the prior-exposure question.'};
  }
  const evidence = [];
  for (const [feature, career, id] of domains) {
    const rows = scores?.careers?.filter(row => row.career === career);
    if (rows?.length !== 1) return {status: 'incomplete', reason: 'All six career scores are required.'};
    const parts = [['knowledge', 6], ['practical', 4], ['written', 4]];
    let points = 0;
    for (const [name, maximum] of parts) {
      const part = rows[0][name];
      if (!part || part.maximum !== maximum || part.graded !== part.total || part.total !== (name === 'knowledge' ? 6 : 1) ||
          !Number.isInteger(part.points) || part.points < 0 || part.points > maximum) {
        return {status: 'incomplete', reason: `Complete grading for ${career}: ${name}.`};
      }
      points += part.points;
    }
    const reportedExposure = exposure.includes(id);
    evidence.push({feature, career, points, maximum: 14, reportedExposure,
      value: OBJECTIVE_SCALE * points / 14 + (reportedExposure ? EXPOSURE_BONUS : 0)});
  }
  const total = evidence.reduce((sum, row) => sum + row.value, 0);
  if (total === 0) return {status: 'insufficient_evidence', reason: 'All graded scores and exposure values are zero.'};
  return {status: 'ready', version, parameters:{objectiveScale:OBJECTIVE_SCALE,exposureBonus:EXPOSURE_BONUS}, validation: 'Experimental; pending adviser review',
    features: domains.map(d => d[0]), values: evidence.map(row => row.value / total), evidence};
}
module.exports = {mapStudent, domains, version};
