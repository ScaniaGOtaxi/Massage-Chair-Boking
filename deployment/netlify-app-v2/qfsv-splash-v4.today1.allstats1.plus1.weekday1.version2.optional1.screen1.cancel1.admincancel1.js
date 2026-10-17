(() => {
 const splash=document.getElementById('qfsv-splash'),root=document.getElementById('root');
 if(!splash||!root)return;
 const duration=4000,started=performance.now();
 const bar=splash.querySelector('[role="progressbar"]'),fill=splash.querySelector('.qfsv-intro-fill');
 const percent=splash.querySelector('.qfsv-intro-percent'),status=splash.querySelector('.qfsv-intro-status');
 let appReady=false,finished=false,frame,gateTimer,slowTimer,lastPercent=-1;

 const observer=new MutationObserver(()=>{
  if(root.querySelector('.qfsv-reset')||root.textContent.startsWith('Kunde inte ladda sidan.'))close();
 });

 function close(){
  if(finished)return;finished=true;
  cancelAnimationFrame(frame);clearTimeout(gateTimer);clearTimeout(slowTimer);
  observer.disconnect();window.removeEventListener('qfsv:ready',ready);splash.remove();
 }

 function paint(){
  if(finished)return;
  const elapsed=performance.now()-started;
  const value=Math.min(100,Math.floor(elapsed/duration*100));
  if(value!==lastPercent){
   lastPercent=value;fill.style.transform=`scaleX(${value/100})`;
   percent.textContent=value+'%';bar.setAttribute('aria-valuenow',String(value));
  }
  if(elapsed>=duration){
   if(appReady)close();
   else if(elapsed<15000)status.textContent='Startvyn är klar. Väntar på appen…';
  }else frame=requestAnimationFrame(paint);
 }

 function ready(){
  appReady=true;
  if(performance.now()-started>=duration)paint();
 }

 window.addEventListener('qfsv:ready',ready);
 observer.observe(root,{childList:true,subtree:true});
 gateTimer=setTimeout(paint,duration);

 slowTimer=setTimeout(()=>{
  if(finished)return;
  status.textContent='Det tar längre tid än väntat. Kontrollera anslutningen och ladda om sidan.';
  const button=document.createElement('button');
  button.type='button';button.textContent='Ladda om';
  button.addEventListener('click',()=>window.location.reload());
  status.after(button);
 },15000);

 paint();
})();
