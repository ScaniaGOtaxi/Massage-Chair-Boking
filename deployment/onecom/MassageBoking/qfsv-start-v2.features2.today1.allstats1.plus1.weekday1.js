(() => {
 const splash=document.getElementById('qfsv-splash');if(!splash)return;
 let timer;
 const observer=new MutationObserver(()=>{
  const root=document.getElementById('root');
  if(root?.querySelector('.qfsv-reset')||root?.textContent.startsWith('Kunde inte ladda sidan.'))done();
 });
 function done(){splash.remove();observer.disconnect();clearTimeout(timer);window.removeEventListener('qfsv:ready',done);}
 window.addEventListener('qfsv:ready',done);
 observer.observe(document.getElementById('root'),{childList:true,subtree:true});
 timer=setTimeout(()=>{
  const message=splash.querySelector('p');
  message.textContent='Det tar längre tid än väntat. Kontrollera anslutningen och ladda om sidan.';
  const button=document.createElement('button');button.textContent='Ladda om';button.onclick=()=>location.reload();
  message.after(button);
 },15000);
})();
