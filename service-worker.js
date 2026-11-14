
const CACHE_NAME = "vinted-v1";

const FICHIERS = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js"
];

// Installation et mise en cache
self.addEventListener("install", function(event) {

    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(FICHIERS);
        })
    );

    self.skipWaiting();
});

// Activation
self.addEventListener("activate", function(event) {

    event.waitUntil(
        caches.keys().then(function(noms) {
            return Promise.all(
                noms
                    .filter(nom => nom !== CACHE_NAME)
                    .map(nom => caches.delete(nom))
            );
        })
    );

    self.clients.claim();
});

// Gestion des requêtes
self.addEventListener("fetch", function(event) {

    event.respondWith(
        caches.match(event.request).then(function(reponse) {

            if (reponse) {
                return reponse;
            }

            return fetch(event.request);
        })
    );
});
