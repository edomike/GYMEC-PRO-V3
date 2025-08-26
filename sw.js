const CACHE = "gymec-pro-v3"; // <- subimos versión

const ASSETS = [
  "./",
  "index.html",
  "app.jsx",
  "manifest.webmanifest",
  "assets/icon-192.png",
  "assets/icon-512.png"
];

// Activación inmediata y control de clientes
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});
self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

