(() => {
  const pages = ['assessment.html', 'review.html', 'skills-assessment.html', 'results.html', 'next-steps.html'];
  const flags = ['astra-review-complete', 'astra-skills-complete', 'astra-results-complete'];
  const rated = value => Number.isInteger(value) && value >= 0 && value <= 3;
  const completion = () => {
    let profile = {};
    try { profile = JSON.parse((window.AstraStorage?.cache || sessionStorage).getItem('astra-student-profile-v1')) || {}; }
    catch { /* Invalid saved answers count as incomplete. */ }
    const profileDone = Array.from({ length: 10 }, (_, i) => rated(profile.skills?.[i])).every(Boolean)
      && Array.from({ length: 6 }, (_, i) => rated(profile.interest?.[i])).every(Boolean)
      && Array.from({ length: 3 }, (_, i) => Number.isInteger(profile.style?.[i]) && profile.style[i] >= 0 && profile.style[i] <= 1).every(Boolean);
    const evidenceValid = !window.AstraEvidence || window.AstraEvidence.validate(profile.evidence).length === 0;
    const done = [profileDone && evidenceValid];
    flags.forEach(key => done.push(done.at(-1) && (window.AstraStorage?.cache || sessionStorage).getItem(key) === 'true'));
    return done;
  };
  const firstOpen = completion().findIndex(value => !value);
  const unlocked = firstOpen === -1 ? 4 : firstOpen;
  const route = location.pathname.split('/').pop();
  const current = pages.indexOf(route === 'skills-results.html' ? 'skills-assessment.html' : route);
  if (current > unlocked) {
    location.replace(pages[unlocked]);
    return;
  }

  const nav = document.querySelector('.flow-nav');
  const render = () => {
    const complete = completion();
    const firstOpen = complete.findIndex(value => !value);
    const allowed = firstOpen === -1 ? 4 : firstOpen;
    [...nav.children].forEach(step => {
      const index = pages.indexOf(step.dataset.step);
      if (index < 0) return;
      const available = index <= allowed;
      const tag = available && index !== current ? 'A' : 'SPAN';
      if (step.tagName !== tag) {
        const replacement = document.createElement(tag.toLowerCase());
        replacement.textContent = step.textContent;
        replacement.dataset.step = step.dataset.step;
        step.replaceWith(replacement);
        step = replacement;
      }
      if (tag === 'A') step.href = pages[index];
      step.classList.toggle('active', index === current);
      step.classList.toggle('completed', !!complete[index]);
      if (index === current) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
      if (!available) step.setAttribute('aria-disabled', 'true');
      else step.removeAttribute('aria-disabled');
      const state = index === current ? 'current' : complete[index] ? 'completed' : available ? 'available' : 'locked';
      step.setAttribute('aria-label', `Step ${index + 1} of ${pages.length}: ${step.textContent.trim()}, ${state}`);
    });
  };
  window.updateJourney = render;
  render();

  const destinations = { 1: 'skills-assessment.html', 2: 'results.html', 3: 'next-steps.html' };
  if (destinations[current]) document.querySelectorAll(`a[href="${destinations[current]}"]:not(.flow-nav a)`).forEach(link => {
    link.addEventListener('click', () => (window.AstraStorage?.cache || sessionStorage).setItem(flags[current - 1], 'true'));
  });
})();
