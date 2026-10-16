const pending=new WeakMap();
export function logOut(client,redirect=()=>window.location.assign('/MassageBoking/')){
 if(pending.has(client))return pending.get(client);
 const request=Promise.resolve().then(async()=>{
  const {error}=await client.auth.signOut({scope:'local'});
  if(error)throw error;
  redirect();return {error:null};
 }).finally(()=>pending.delete(client));
 pending.set(client,request);return request;
}
