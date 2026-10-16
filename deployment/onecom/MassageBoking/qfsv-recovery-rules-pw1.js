export function recoveryLink(href){
  const url=new URL(href);
  const hash=new URLSearchParams(url.hash.slice(1));
  if(url.searchParams.has('error')||url.searchParams.has('error_code')||hash.has('error')||hash.has('error_code')){
    return {kind:'invalid'};
  }
  if(url.searchParams.get('type')==='recovery'&&url.searchParams.get('token_hash')){
    return {kind:'token_hash',token:url.searchParams.get('token_hash')};
  }
  if(url.searchParams.get('code'))return {kind:'pkce'};
  if(hash.get('type')==='recovery'&&hash.get('access_token')&&hash.get('refresh_token')){
    return {kind:'implicit'};
  }
  return {kind:'missing'};
}

export function passwordError(password,confirmation){
  if(password.length<8)return 'Använd minst 8 tecken.';
  if(password.length>128)return 'Använd högst 128 tecken.';
  if(password!==confirmation)return 'Lösenorden stämmer inte överens.';
  return '';
}

export function updateError(error){
  if(error?.name==='AuthSessionMissingError'||error?.status===401||error?.status===403||
    ['session_not_found','refresh_token_not_found','otp_expired'].includes(error?.code)){
    return 'expired';
  }
  if(error?.code==='same_password'){
    return 'Välj ett lösenord som skiljer sig från det gamla.';
  }
  if(error?.code==='weak_password'){
    return 'Lösenordet uppfyller inte säkerhetskraven. Välj ett starkare lösenord.';
  }
  return 'Kunde inte spara lösenordet. Kontrollera anslutningen och försök igen.';
}
