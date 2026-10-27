/* Offline cache: serve from cache, refresh in the background. Version changes on every build. */
const V = "jacq-6268b6cb10";
const PRE = ["./", "index.html", "data/basemap.json", "data/osmpois.json", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(PRE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const ok = u.origin === location.origin || /cdnjs\.cloudflare\.com/.test(u.host);
  if (!ok) return;
  const isPage = e.request.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith(".html");
  if (isPage) {  // the page: fresh when online, saved copy when offline
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request, {ignoreSearch: true}).then(h => h || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch: u.origin === location.origin});
    const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
