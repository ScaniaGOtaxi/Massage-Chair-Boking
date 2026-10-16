(()=>{
 const bar=document.getElementById('qfsv-install'),button=document.getElementById('qfsv-install-button'),status=document.getElementById('qfsv-install-status'),dialog=document.getElementById('qfsv-install-help'),instructions=document.getElementById('qfsv-install-instructions');
 if(!bar||!button||!dialog)return;
 const media=matchMedia('(display-mode: standalone)'),key='qfsv-install-dismissed-v1';
 let pending=null,busy=false,installed=false,dismissed=false,opener=null;
 try{dismissed=localStorage.getItem(key)==='yes'}catch{}
 const standalone=()=>installed||media.matches||navigator.standalone===true;
 const update=()=>{bar.hidden=dismissed||standalone();button.disabled=busy;document.body.classList.toggle('qfsv-is-installed',standalone())};
 const dismiss=()=>{dismissed=true;try{localStorage.setItem(key,'yes')}catch{}update()};
 const help=()=>{
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  instructions.textContent=ios?'På iPhone eller iPad: öppna sidan i Safari. Tryck på Dela och välj Lägg till på hemskärmen. Tryck Lägg till. Det är frivilligt att installera appen.':'I Chrome eller Edge: öppna menyn med tre punkter och välj Installera app eller Appar → Installera den här webbplatsen som en app. Det är frivilligt att installera appen. Du kan fortsätta använda den i webbläsaren.';
  if(!dialog.open)dialog.showModal();
 };
 const install=async()=>{
  if(busy||standalone())return;
  opener=document.activeElement;
  if(!pending){help();return}
  const event=pending;pending=null;busy=true;update();
  try{await event.prompt();const choice=await event.userChoice;if(choice.outcome==='dismissed')dismiss();else status.textContent='Följ webbläsarens anvisningar för att slutföra installationen.'}
  catch{help()}
  finally{busy=false;update()}
 };
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();pending=e;update()});
 window.addEventListener('appinstalled',()=>{installed=true;pending=null;if(dialog.open)dialog.close();update()});
 window.addEventListener('qfsv-install-request',install);
 media.addEventListener('change',update);
 button.addEventListener('click',install);
 document.getElementById('qfsv-install-dismiss').addEventListener('click',dismiss);
 document.getElementById('qfsv-install-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus()});
 update();
})();
