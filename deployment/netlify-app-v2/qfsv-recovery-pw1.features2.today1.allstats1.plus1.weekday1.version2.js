import { createClient, AUTH_URL, PUBLIC_KEY } from './qfsv-auth-config-pw1.features2.today1.allstats1.plus1.weekday1.version2.js';
import { recoveryLink, passwordError, updateError } from './qfsv-recovery-rules-pw1.features2.today1.allstats1.plus1.weekday1.version2.js';

const root=document.getElementById('root');
const home='/';
const link=recoveryLink(window.location.href);
let client;
const cleanUrl=()=>window.history.replaceState({},'',home+'reset-password');

function message(title,text){
  root.innerHTML=`<main class="qfsv-reset"><h1></h1><p role="status"></p><a href="${home}">Till inloggningen</a></main>`;
  root.querySelector('h1').textContent=title;
  root.querySelector('p').textContent=text;
}

function expired(){
  cleanUrl();
  message(
    'Länken kunde inte användas',
    'Begär en ny återställningslänk via ”Forgot your password?”. Öppna länken i samma webbläsare som du använde när du begärde den.'
  );
}

function showForm(){
  root.innerHTML=`<main class="qfsv-reset">
    <h1>Välj ett nytt lösenord</h1>
    <form novalidate>
      <label>Nytt lösenord<input id="new-password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>
      <label>Bekräfta lösenordet<input id="confirm-password" type="password" autocomplete="new-password" maxlength="128" required></label>
      <p id="password-error" role="alert" aria-live="polite"></p>
      <button type="submit">Spara nytt lösenord</button>
    </form>
    <p>Använd minst 8 tecken. Ett långt, unikt lösenord är bäst.</p>
  </main>`;

  const form=root.querySelector('form');
  const button=form.querySelector('button');
  const errorBox=document.getElementById('password-error');
  let busy=false;

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy)return;

    const password=document.getElementById('new-password').value;
    const confirmation=document.getElementById('confirm-password').value;
    const validation=passwordError(password,confirmation);
    errorBox.textContent=validation;
    if(validation)return;

    busy=true;
    button.disabled=true;
    button.textContent='Sparar…';

    try{
      const {error}=await client.auth.updateUser({password});
      if(error){
        const text=updateError(error);
        if(text==='expired'){expired();return;}
        errorBox.textContent=text;
        return;
      }

      message('Lösenordet är uppdaterat','Du kan nu logga in med ditt nya lösenord.');
      const back=root.querySelector('a');
      back.addEventListener('click',async event=>{
        event.preventDefault();
        try{
          const {error}=await client.auth.signOut({scope:'local'});
          if(error)throw error;
          window.location.assign(home);
        }catch{
          root.querySelector('p').textContent='Lösenordet är uppdaterat, men utloggningen misslyckades. Tryck på länken igen för att försöka på nytt.';
        }
      });
    }catch{
      errorBox.textContent='Kunde inte spara lösenordet. Kontrollera anslutningen och försök igen.';
    }finally{
      busy=false;
      button.disabled=false;
      button.textContent='Spara nytt lösenord';
    }
  });
}

async function start(){
  if(['invalid','missing'].includes(link.kind)){expired();return;}

  if(link.kind==='pkce'){
    try{
      if(!localStorage.getItem('sb-auth-token-code-verifier')){
        expired();return;
      }
    }catch{expired();return;}
  }

  message('Kontrollerar länken…','Vänta medan återställningslänken kontrolleras.');

  try{
    client=createClient(AUTH_URL,PUBLIC_KEY,{auth:{
      autoRefreshToken:true,
      persistSession:true,
      storageKey:'sb-auth-token',
      flowType:link.kind==='implicit'?'implicit':'pkce',
      detectSessionInUrl:true
    }});

    const {error:initError}=await client.auth.initialize();
    if(initError){expired();return;}

    if(link.kind==='token_hash'){
      const {error}=await client.auth.verifyOtp({
        token_hash:link.token,type:'recovery'
      });
      if(error){expired();return;}
    }

    const {data:{session},error}=await client.auth.getSession();
    if(error||!session){expired();return;}

    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user){expired();return;}

    cleanUrl();
    showForm();
  }catch{expired();}
}

void start();
