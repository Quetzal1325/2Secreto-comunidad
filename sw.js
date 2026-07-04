// sw.js - Service Worker Básico Obligatorio para Instalación de PWA
const CACHE_NAME = "2secreto-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/ui.js",
  "/firebase.js",
  "/secrets.js",
  "/comments.js"
];

// Instalar el Service Worker
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activar y limpiar cachés viejos
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Responder peticiones (Estrategia: Red con caída a Caché para que Firebase jale al 100% en vivo)
self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});