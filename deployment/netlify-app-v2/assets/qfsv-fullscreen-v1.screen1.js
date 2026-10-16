export function FullscreenSettings({React:R}){
 const h=R.createElement,root=document.documentElement;
 const isFull=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
 const supported=!!((root.requestFullscreen&&document.fullscreenEnabled!==false)||(root.webkitRequestFullscreen&&document.webkitFullscreenEnabled!==false));
 const [active,setActive]=R.useState(isFull),[busy,setBusy]=R.useState(false),[error,setError]=R.useState('');
 const pending=R.useRef(false),alive=R.useRef(true);

 R.useEffect(()=>{
  alive.current=true;
  const update=()=>{setActive(isFull());setError('')};
  document.addEventListener('fullscreenchange',update);
  document.addEventListener('webkitfullscreenchange',update);
  return()=>{
   alive.current=false;
   document.removeEventListener('fullscreenchange',update);
   document.removeEventListener('webkitfullscreenchange',update);
  };
 },[]);

 const toggle=async()=>{
  if(pending.current||!supported)return;
  pending.current=true;setBusy(true);setError('');
  try{
   if(isFull()){
    const exit=document.exitFullscreen||document.webkitExitFullscreen;
    if(!exit)throw new Error('unsupported');
    await exit.call(document);
   }else{
    if(root.requestFullscreen)await root.requestFullscreen({navigationUI:'hide'});
    else await root.webkitRequestFullscreen();
   }
   if(alive.current)setActive(isFull());
  }catch{
   if(alive.current)setError('Webbläsaren kunde inte ändra helskärmsläget. Prova igen eller använd webbläsarens helskärmsval.');
  }finally{
   pending.current=false;
   if(alive.current)setBusy(false);
  }
 };

 return h('section',{className:'qfsv-screen-card','aria-label':'Helskärmsinställningar'},
  h('div',null,
   h('h3',null,'Visning'),
   h('p',null,supported
    ?'Välj helskärm för mer plats. Du kan när som helst återgå till vanligt läge.'
    :'Den här webbläsaren stöder inte helskärm för sidan. På iPhone kan du lägga till appen på hemskärmen via Safari för att öppna den utan vanliga webbläsarfält.')
  ),
  h('button',{
   type:'button',
   onClick:toggle,
   disabled:busy||!supported,
   'aria-pressed':active
  },supported
   ?(active?'Avsluta helskärm':'Aktivera helskärm')
   :'Helskärm stöds inte'),
  supported&&h('p',{className:'qfsv-screen-note'},active
   ?'Helskärm är på. På dator kan du även trycka Esc för att lämna läget.'
   :'Helskärm är frivilligt och kräver ingen installation.'),
  error&&h('p',{role:'alert'},error)
 );
}
