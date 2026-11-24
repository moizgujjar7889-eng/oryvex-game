const CACHE="oryvex-v16";
const ASSETS=["./","./index.html","./manifest.json","./logo.png","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./apple-touch-icon.png","./favicon.ico","./favicon-32.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
/* Fast start: serve from cache instantly, refresh the cache in the background (new version shows on the next open). */
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET"||!e.request.url.startsWith(self.location.origin))return;
  e.respondWith(caches.match(e.request).then(m=>{
    const net=fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}return r;}).catch(()=>m||caches.match("./index.html"));
    if(m){e.waitUntil(net.catch(()=>{}));return m;}
    return net;
  }));
});
