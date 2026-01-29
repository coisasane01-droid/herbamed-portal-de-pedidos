
const CACHE_NAME = 'herbamed-v3';

const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './admin/manifest.json',
  './assets/',
  './images/',
  './static/'
];

// Instala e salva os arquivos estáticos iniciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE).catch(err => {
        console.warn('Alguns diretórios/arquivos não puderam ser pré-cacheados:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Estratégia Network-First para garantir persistência de atualizações
self.addEventListener('fetch', event => {
  // EXCEÇÃO PARA WEBHOOK DO MAKE - PERMITE ENVIO BINÁRIO DIRETO
  if (event.request.url.includes("hook.eu1.make.com")) return;

  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const isCritical = event.request.mode === 'navigate' || event.request.url.includes('manifest.json');

  if (isCritical) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        return caches.match(event.request);
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});

// Manipulador de cliques na notificação
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
