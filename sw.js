/* Ice Ice Bebé service worker: the whole game is cached, so it plays offline once it's opened. */
const VERSION = "iib-v1";
const FILES = ["./", "index.html", "css/app.css", "js/game.js", "js/app.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon.svg", "icons/favicon-32.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  // network first (so updates show up), the cache when offline
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(r, copy)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || (r.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
