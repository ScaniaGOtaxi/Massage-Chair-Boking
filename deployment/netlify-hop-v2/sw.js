
const TARGET='https://zdeb.se/MassageBoking/';

const destination=address=>{
 const source=new URL(address);
 const target=new URL(TARGET);
 const path=source.pathname.replace(/^\/+/, '');
 target.pathname+=path==='index.html'?'':path;
 target.search=source.search;
 target.hash=source.hash;
 return target.href;
};

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
 if(event.request.mode==='navigate' &&
    new URL(event.request.url).origin===self.location.origin){
  event.respondWith(
   Response.redirect(destination(event.request.url),302)
  );
 }
});

self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(self.clients.openWindow(TARGET));
});
