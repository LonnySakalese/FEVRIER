// Service Worker pour Warrior Habit Tracker

// --- CONFIGURATION DU CACHE ---

// Nom du cache. Changer cette valeur invalidera le cache existant et en créera un nouveau.
const CACHE_NAME = 'warrior-tracker-v3';

// Liste des fichiers essentiels à mettre en cache pour que l'application fonctionne hors ligne.
const urlsToCache = [
  './',             // La racine de l'application (souvent index.html)
  './index.html',
  './style.css',
  './favicon.svg',
  './manifest.json', // Le manifeste de la PWA
  // Modules JS
  './src/app.js',
  './src/config/firebase.js',
  './src/core/badges.js',
  './src/core/habits.js',
  './src/core/ranks.js',
  './src/core/scores.js',
  './src/pages/groups.js',
  './src/pages/motivation.js',
  './src/pages/profile.js',
  './src/pages/stats.js',
  './src/pages/today.js',
  './src/services/notifications.js',
  './src/services/state.js',
  './src/services/storage.js',
  './src/ui/calendar.js',
  './src/ui/charts.js',
  './src/ui/confetti.js',
  './src/ui/modals.js',
  './src/ui/sounds.js',
  './src/ui/theme.js',
  './src/ui/toast.js',
  './src/ui/tutorial.js',
  // Firebase SDK
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore-compat.js'
];


// --- ÉVÉNEMENTS DU SERVICE WORKER ---

/**
 * Événement 'install' : se déclenche lorsque le service worker est installé.
 * C'est le moment idéal pour mettre en cache les ressources statiques de l'application.
 */
self.addEventListener('install', event => {
  // waitUntil attend que la promesse soit résolue avant de terminer l'installation.
  event.waitUntil(
    // Ouvre le cache spécifié par CACHE_NAME.
    caches.open(CACHE_NAME)
      .then(cache => {
        // Ajoute toutes les URLs de la liste urlsToCache au cache.
        console.log('Fichiers mis en cache lors de l\'installation');
        return cache.addAll(urlsToCache);
      })
  );
});

/**
 * Événement 'fetch' : se déclenche pour chaque requête réseau (ex: chargement d'une page, d'une image, d'un script).
 * Ici, on implémente une stratégie "Cache First" (cache d\'abord).
 */
self.addEventListener('fetch', event => {
  // respondWith intercepte la requête et fournit sa propre réponse.
  event.respondWith(
    // Tente de trouver une correspondance pour la requête dans le cache.
    caches.match(event.request)
      .then(response => {
        // Si une réponse est trouvée dans le cache...
        if (response) {
          // ...la retourner directement sans passer par le réseau.
          return response;
        }
        // Si la ressource n'est pas dans le cache, effectuer la requête réseau.
        return fetch(event.request).catch(error => {
          // Gestion silencieuse des erreurs réseau (Firebase, API externes)
          // Ces erreurs sont normales et ne doivent pas polluer la console
          console.debug('Fetch failed for:', event.request.url);
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

/**
 * Événement 'activate' : se déclenche lorsque le service worker est activé.
 * C'est le bon moment pour nettoyer les anciens caches qui ne sont plus utilisés.
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    // Récupère les noms de tous les caches existants.
    caches.keys().then(cacheNames => {
      return Promise.all(
        // Filtre la liste pour ne garder que les caches qui ne correspondent pas au CACHE_NAME actuel.
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
          // Supprime chacun des anciens caches.
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
});