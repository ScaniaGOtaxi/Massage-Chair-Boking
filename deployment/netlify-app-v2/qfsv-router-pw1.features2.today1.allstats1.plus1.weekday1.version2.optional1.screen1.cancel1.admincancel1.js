const path=window.location.pathname.replace(/\/+$/, '');
const hash=new URLSearchParams(window.location.hash.slice(1));
const query=new URLSearchParams(window.location.search);
const recovery=path==='/reset-password'||hash.get('type')==='recovery'||query.get('type')==='recovery';
try{
  if(recovery){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href=new URL('./qfsv-recovery-pw1.css',import.meta.url).href;
    document.head.append(style);
    await import('./qfsv-recovery-pw1.features2.today1.allstats1.plus1.weekday1.version2.optional1.screen1.cancel1.admincancel1.js');
  }else{
    await import('./assets/index-D0UV-BkB.timefix1.pwfix1.features2.today1.allstats1.plus1.weekday1.version2.optional1.screen1.cancel1.admincancel1.js');
  }
}catch{
  document.getElementById('root').textContent='Kunde inte ladda sidan. Ladda om och försök igen.';
}
