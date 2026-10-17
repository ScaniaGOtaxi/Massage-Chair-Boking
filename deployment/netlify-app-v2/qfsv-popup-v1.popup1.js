(()=>{
 const queue=[];let busy=false;
 const translations={
  'Booking cancelled successfully':'Bokningen är avbokad. Tiden är tillgänglig igen.',
  'Booking updated successfully':'Bokningen har uppdaterats.',
  'Failed to cancel booking. Please try again.':'Bokningen kunde inte avbokas. Försök igen.',
  'Failed to update booking. Please try again.':'Bokningen kunde inte uppdateras. Försök igen.',
  'You can only delete your own bookings':'Du kan bara avboka dina egna bokningar.',
  'User data not available':'Dina användaruppgifter kunde inte hämtas. Logga in igen.',
  'Failed to fetch users':'Användarna kunde inte hämtas. Försök igen.',
  'This time slot has just been booked by someone else. Please choose another time.':'Tiden har just bokats av någon annan. Välj en annan tid.'
 };
 function message(value){
  let s=String(value??'');s=translations[s]||s;
  return s.replace('Booking successful!','Bokningen är bekräftad!').replace('Time:','Tid:').replace('Duration:','Längd:').replace('minutes','minuter');
 }
 function show(){
  if(busy||!queue.length)return;
  busy=true;
  const task=queue.shift(),previous=document.activeElement;
  const text=message(task.text),danger=task.confirm;
  const error=!danger&&/failed|error|kunde inte|kan bara|misslyck|fel|not available|inte tillåtet|ogiltig|saknas|utgången/i.test(text);
  const success=!danger&&!error&&/bekräftad|uppdaterats|avbokad|successful|sparad/i.test(text);
  const kind=danger?'danger':error?'error':success?'success':'info';
  const title=danger?'Bekräfta avbokning':error?'Något gick fel':success?'Klart!':'Information';
  const dialog=document.createElement('dialog');dialog.className='qfsv-popup';dialog.dataset.kind=kind;
  dialog.setAttribute('aria-labelledby','qfsv-popup-title');dialog.setAttribute('aria-describedby','qfsv-popup-text');
  const icon=document.createElement('div');icon.className='qfsv-popup-icon';icon.setAttribute('aria-hidden','true');icon.textContent=danger?'?':error?'!':success?'✓':'i';
  const heading=document.createElement('h2');heading.id='qfsv-popup-title';heading.textContent=title;
  const body=document.createElement('p');body.id='qfsv-popup-text';body.textContent=text;
  const actions=document.createElement('div');actions.className='qfsv-popup-actions';
  let finished=false;
  function finish(result){
   if(finished)return;finished=true;
   dialog.remove();busy=false;
   if(previous?.isConnected)previous.focus({preventScroll:true});
   task.resolve(result);setTimeout(show,0);
  }
  if(danger){
   const cancel=document.createElement('button');cancel.type='button';cancel.className='qfsv-popup-secondary';cancel.textContent='Behåll bokningen';cancel.autofocus=true;
   cancel.onclick=()=>finish(false);actions.append(cancel);
  }
  const ok=document.createElement('button');ok.type='button';ok.className='qfsv-popup-primary';ok.textContent=danger?'Ja, avboka':'OK';ok.autofocus=!danger;ok.onclick=()=>finish(true);actions.append(ok);
  dialog.append(icon,heading,body,actions);document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false)});
  dialog.addEventListener('close',()=>finish(false));
  dialog.showModal();(danger?actions.firstElementChild:ok).focus();
 }
 const open=(text,confirm)=>new Promise(resolve=>{queue.push({text,confirm,resolve});show()});
 window.QFSVPopup={alert:text=>open(text,false),confirm:text=>open(text,true)};
})();
