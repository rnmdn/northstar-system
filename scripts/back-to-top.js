(() => {
  const button=document.getElementById('back-to-top');
  if(!button)return;
  const update=()=>{button.hidden=window.scrollY<400;};
  window.addEventListener('scroll',update,{passive:true});
  update();
  button.addEventListener('click',()=>{
    window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    const brand=document.querySelector('.nav .brand');
    brand?.focus({preventScroll:true});
  });
})();
