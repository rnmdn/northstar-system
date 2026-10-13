(() => {
  const skills = ['Programming','Networks','Security','Data analysis','Databases','Interface design','Problem solving','Systems','Software design','Troubleshooting'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = value => typeof value === 'string' ? value : '';
  const normalize = rows => Array.isArray(rows) ? rows.slice(0, 8).filter(row => row && typeof row === 'object').map(row => ({
    type: ['course','project','certification'].includes(row.type) ? row.type : 'course',
    title: text(row.title).slice(0, 120), skill: skills.includes(row.skill) ? row.skill : '',
    provider: text(row.provider).slice(0, 120), reference: text(row.reference).slice(0, 300),
    earned: text(row.earned).slice(0, 12), maximum: text(row.maximum).slice(0, 12),
    grading: ['higher','lower'].includes(row.grading) ? row.grading : 'higher',
    note: text(row.note).slice(0, 500)
  })) : [];
  const active = row => [row.title,row.skill,row.provider,row.reference,row.earned,row.maximum,row.note].some(value => String(value ?? '').trim());
  function validate(rows) {
    const errors = [];
    normalize(rows).forEach((row, index) => {
      if (!active(row)) return;
      const add = (field, message) => errors.push({ index, field, message: `Evidence ${index + 1}: ${message}` });
      if (!row.title.trim()) add('title', 'enter a course, project or certification name.');
      if (!row.skill) add('skill', 'choose the related skill.');
      if (row.type === 'course') {
        if (!row.earned.trim() || !Number.isFinite(Number(row.earned))) add('earned', 'enter a numeric grade.');
        if (!row.maximum.trim() || !Number.isFinite(Number(row.maximum)) || Number(row.maximum) <= 0) add('maximum', 'enter a positive grading scale maximum.');
        if (row.earned.trim() && Number.isFinite(Number(row.earned)) && (Number(row.earned) < 0 || (Number(row.maximum) > 0 && Number(row.earned) > Number(row.maximum)))) add('earned', 'grade must be between zero and the scale maximum.');
      }
      if (/^https?:/i.test(row.reference)) {
        try { const url = new URL(row.reference); if (!url.hostname) throw new Error(); } catch { add('reference', 'enter a valid http or https link.'); }
      } else if (/^[a-z][a-z0-9+.-]*:/i.test(row.reference)) add('reference', 'use an http/https link or a plain evidence reference.');
    });
    return errors;
  }
  function renderRow(row, index) {
    const id = field => `evidence-${index}-${field}`;
    const input = (field, label, limit) => `<label for="${id(field)}">${label}<input id="${id(field)}" data-field="${field}" maxlength="${limit}" value="${escape(row[field])}"></label>`;
    return `<fieldset class="evidence-row" data-evidence-row="${index}"><legend>Evidence ${index + 1}</legend><div class="evidence-fields"><label for="${id('type')}">Evidence type<select id="${id('type')}" data-field="type">${[['course','Course performance'],['project','Project'],['certification','Certification']].map(([value,label])=>`<option value="${value}" ${row.type===value?'selected':''}>${label}</option>`).join('')}</select></label>${input('title','Name',120)}<label for="${id('skill')}">Related skill<select id="${id('skill')}" data-field="skill"><option value="">Choose a skill</option>${skills.map(skill=>`<option ${row.skill===skill?'selected':''}>${skill}</option>`).join('')}</select></label>${input('provider','School, issuer or project context (optional)',120)}<div class="course-fields" ${row.type!=='course'?'hidden':''}>${input('earned','Grade received',12)}${input('maximum','Grading scale maximum',12)}<label for="${id('grading')}">Grade direction<select id="${id('grading')}" data-field="grading"><option value="higher" ${row.grading==='higher'?'selected':''}>Higher is better</option><option value="lower" ${row.grading==='lower'?'selected':''}>Lower is better</option></select></label></div>${input('reference','Evidence link or reference (optional)',300)}<label class="evidence-note" for="${id('note')}">What does this demonstrate? (optional)<textarea id="${id('note')}" data-field="note" maxlength="500">${escape(row.note)}</textarea></label></div><button class="evidence-remove" type="button" data-remove="${index}">Remove evidence ${index+1}</button></fieldset>`;
  }
  function mount(root, initial, onChange) {
    let rows = normalize(initial);
    const collect = () => { rows = [...root.querySelectorAll('[data-evidence-row]')].map(fieldset => Object.fromEntries([...fieldset.querySelectorAll('[data-field]')].map(input => [input.dataset.field,input.value]))); return normalize(rows); };
    const notify = () => onChange(collect());
    const render = () => {
      root.innerHTML = `<h3>Supporting skill evidence <span class="optional-chip">Optional</span></h3><p>Add relevant course grades, projects or certifications. If you do not have evidence available, continue without it. These are your declarations, not verified credentials. Use references rather than uploading transcripts or personal documents.</p><p>Record grades in their original scale, including whether higher or lower is better. Supporting evidence is shown separately from objective scores until the research scoring method is finalized.</p><div id="evidence-rows">${rows.map(renderRow).join('')}</div><button class="evidence-add" type="button" ${rows.length>=8?'disabled':''}>Add course, project or certification</button><p class="evidence-error" role="alert" hidden></p>`;
      root.querySelector('.evidence-add').addEventListener('click', () => { collect(); rows.push(normalize([{}])[0]); render(); root.querySelector(`[data-evidence-row="${rows.length-1}"] select`).focus(); });
      root.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { collect(); rows.splice(Number(button.dataset.remove),1); render(); onChange(normalize(rows)); root.querySelector('.evidence-add').focus(); }));
    };
    root.addEventListener('input', notify);
    root.addEventListener('change', event => { if (event.target.dataset.field==='type') { const fieldset=event.target.closest('[data-evidence-row]'); fieldset.querySelector('.course-fields').hidden=event.target.value!=='course'; if(event.target.value!=='course')fieldset.querySelectorAll('[data-field="earned"],[data-field="maximum"]').forEach(input=>input.value=''); } notify(); });
    render();
    return { collect, check() { const errors=validate(collect()); root.querySelectorAll('[aria-invalid]').forEach(input=>input.removeAttribute('aria-invalid')); const error=root.querySelector('.evidence-error'); error.hidden=!errors.length; error.textContent=errors.map(item=>item.message).join(' '); errors.forEach(item=>root.querySelector(`#evidence-${item.index}-${item.field}`).setAttribute('aria-invalid','true')); if(errors.length)root.querySelector(`#evidence-${errors[0].index}-${errors[0].field}`).focus(); return !errors.length; } };
  }
  function summary(rows) {
    const entries = normalize(rows).filter(active);
    if (!entries.length) return '<p>No supporting evidence provided.</p>';
    return `<ul class="evidence-review-list">${entries.map(row=>`<li><strong>${escape(row.title)}</strong><span>${escape(row.type)} · ${escape(row.skill)}${row.provider?` · ${escape(row.provider)}`:''}</span>${row.type==='course'?`<span>Grade: ${escape(row.earned)} on a scale up to ${escape(row.maximum)} (${row.grading==='lower'?'lower':'higher'} is better)</span>`:''}${row.reference?`<span>Reference: ${escape(row.reference)}</span>`:''}${row.note?`<p>${escape(row.note)}</p>`:''}</li>`).join('')}</ul>`;
  }
  window.AstraEvidence = { normalize, validate, active, mount, summary };
})();
