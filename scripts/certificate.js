(() => {
  let state;
  try { state = JSON.parse((window.AstraStorage?.cache || sessionStorage).getItem('astra-research-pilot-v0-1')); } catch { return; }
  const ready = state?.quizVersion === 'skill_quiz_pilot_v0_1'
    && Array.from({ length: 50 }, (_, index) => state.answers?.[`Q${String(index + 1).padStart(2, '0')}`]).every(value => Number.isInteger(value) && value >= 0 && value <= 3)
    && Array.from({ length: 6 }, (_, index) => state.practical?.[`P${index + 1}`]).every(value => typeof value === 'string' && value.trim())
    && state.coding?.lastRun && state.certificate?.name?.trim();
  if (!ready) return;
  const date = new Date(state.certificate.issuedAt);
  if (!Number.isFinite(date.getTime())) return;
  document.getElementById('certificate-empty').hidden = true;
  document.getElementById('certificate').hidden = false;
  document.getElementById('print-certificate').hidden = false;
  document.getElementById('print-tip').hidden = false;
  const name = document.getElementById('participant-name');
  name.textContent = state.certificate.name.slice(0, 80);
  if (name.textContent.length > 35) name.classList.add('long-name');
  document.getElementById('completion-date').textContent = new Intl.DateTimeFormat('en-SG', { dateStyle: 'long', timeZone: 'Asia/Singapore' }).format(date);
  document.getElementById('record-id').textContent = state.certificate.recordId || state.participantCode;
  document.getElementById('print-certificate').addEventListener('click', () => window.print());
})();
