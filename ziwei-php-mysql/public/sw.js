const CACHE='ziwei-shell-v1.1.0';
const SHELL=[
  './','./index.php','./manifest.webmanifest','./assets/style.css?v=1.1.0','./assets/app.js?v=1.1.0',
  './assets/icons/icon-192.png','./assets/icons/icon-512.png'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  // API must always be network fresh. The app shell can fall back to cache.
  if(url.pathname.endsWith('/api.php')) return;
  if(url.origin!==self.location.origin) return;
  event.respondWith(fetch(req).then(res=>{
    if(res && res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
    return res;
  }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.php'))));
});
