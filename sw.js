const STATIC_CACHE="dz-air-sea-static-v2";
const PRECACHE=["./","./index.html","./airports.html","./ports.html","./about.html","./favorites.html","./assets/css/style.css","./assets/js/site.js","./assets/js/places.js","./assets/js/directory.js","./assets/js/radar.js","./assets/js/marine.js","./assets/js/marine-config.js","./assets/js/air-config.js","./assets/js/weather.js","./assets/icons/radar.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("dz-air-sea-")&&k!==STATIC_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==self.location.origin||url.pathname.includes("/api/"))return;
 if(req.mode==="navigate"){
  event.respondWith(fetch(req).then(r=>{if(r.ok){const clone=r.clone();event.waitUntil(caches.open(STATIC_CACHE).then(c=>c.put(req,clone)));}return r;}).catch(()=>caches.match(req).then(r=>r||caches.match("./index.html"))));return;
 }
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(r=>{if(r.ok){const clone=r.clone();event.waitUntil(caches.open(STATIC_CACHE).then(c=>c.put(req,clone)));}return r;})));
});
