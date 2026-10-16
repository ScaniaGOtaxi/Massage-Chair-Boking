
self.addEventListener('install',event=>{
 event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(
   names.filter(name=>name.startsWith('massage-chair-booking-'))
    .map(name=>caches.delete(name))
  );

  await self.clients.claim();

  const windows=await self.clients.matchAll({
   type:'window',
   includeUncontrolled:true
  });

  for(const client of windows){
   if(new URL(client.url).origin===self.location.origin)
    client.navigate(client.url).catch(()=>{});
  }
 })());
});

self.addEventListener('fetch',event=>{
 if(event.request.method==='GET' &&
    new URL(event.request.url).origin===self.location.origin){
  event.respondWith(fetch(event.request,{cache:'no-store'}));
 }
});
