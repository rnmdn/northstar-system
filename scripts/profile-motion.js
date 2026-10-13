(() => {
 let context;
 window.NorthStarProfileMotion = () => {
  context?.revert();
  if(!window.gsap || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  context=gsap.context(()=>{
   gsap.fromTo('.profile-intro',{opacity:.65,y:7},{opacity:1,y:0,duration:.35,ease:'power2.out'});
   gsap.fromTo('.experience-option',{opacity:.75,scale:.99},{opacity:1,scale:1,duration:.3,stagger:.025,ease:'power2.out',clearProps:'transform,opacity'});
  },document.querySelector('.v3-panel'));
 };
})();
