(() => {
  const menu = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const close = () => { menu.setAttribute('aria-expanded', 'false'); links.classList.remove('open'); };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    links.classList.toggle('open', open);
  });
  links.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && links.classList.contains('open')) { close(); menu.focus(); } });
  matchMedia('(max-width:650px)').addEventListener('change', close);
})();
