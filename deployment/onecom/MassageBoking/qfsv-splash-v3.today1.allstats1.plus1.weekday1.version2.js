(() => {
 const splash=document.getElementById('qfsv-splash');
 const root=document.getElementById('root');
 if(!splash||!root)return;
 let timer,finished=false;
 const observer=new MutationObserver(()=>{
  if(root.querySelector('.qfsv-reset')||root.textContent.startsWith('Kunde inte ladda sidan.'))done(true);
 });
 function done(immediate=false){
  if(finished)return;finished=true;
  observer.disconnect();clearTimeout(timer);
  window.removeEventListener('qfsv:ready',ready);
  if(immediate||window.matchMedia('(prefers-reduced-motion: reduce)').matches){splash.remove();return;}
  splash.setAttribute('aria-hidden','true');
  splash.classList.add('qfsv-splash-closing');
  splash.addEventListener('transitionend',()=>splash.remove(),{once:true});
  setTimeout(()=>splash.remove(),350);
 }
 const ready=()=>done();
 window.addEventListener('qfsv:ready',ready);
 observer.observe(root,{childList:true,subtree:true});
 timer=setTimeout(()=>{
  splash.querySelector('.qfsv-splash-status').textContent='Det tar längre tid än väntat. Kontrollera anslutningen och ladda om sidan.';
  const button=document.createElement('button');
  button.type='button';button.textContent='Ladda om';
  button.addEventListener('click',()=>window.location.reload());
  splash.querySelector('.qfsv-splash-status').after(button);
 },15000);
})();
