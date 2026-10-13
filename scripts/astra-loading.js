const astraLoader = document.querySelector('.astra-loader');
const loaderReducedMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;
const loaderStarted = performance.now();
let loaderFinished = false;
const loaderContent = [...document.querySelectorAll('body > header, body > main, body > footer, body > #landing')];
loaderContent.forEach(element => element.inert = true);
function finishAstraLoading() {
  if (loaderFinished) return;
  loaderFinished = true;
  const restoreFocus = astraLoader.contains(document.activeElement);
  astraLoader.classList.add('is-leaving');
  loaderContent.forEach(element => element.inert = false);
  document.documentElement.classList.remove('astra-loading');
  if (restoreFocus) document.querySelector('.brand')?.focus();
  astraLoader.remove();
  document.dispatchEvent(new Event('astra-ready'));
}
function fadeAstraLoading() {
  astraLoader.classList.add('is-leaving');
  setTimeout(finishAstraLoading, loaderReducedMotion ? 0 : 500);
}
function scheduleAstraOpening() {
  setTimeout(fadeAstraLoading, Math.max(0, (loaderReducedMotion ? 2000 : 1500) - (performance.now() - loaderStarted)));
}
scheduleAstraOpening();
setTimeout(finishAstraLoading, 4500);
