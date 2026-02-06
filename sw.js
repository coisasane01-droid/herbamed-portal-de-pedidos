
const CACHE_NAME = 'herbamed-v4';

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
            console.log('Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Estratégia Híbrida Inteligente
self.addEventListener('fetch', event => {
  // EXCEÇÃO PARA WEBHOOK DO MAKE - PERMITE ENVIO BINÁRIO DIRETO
  if (event.request.url.includes("hook.eu1.make.com")) return;

  // Ignora requisições que não sejam GET ou não sejam HTTP
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const isNavigation = event.request.mode === 'navigate';
  const isManifest = event.request.url.includes('manifest.json');

  if (isNavigation || isManifest) {
    // ESTRATÉGIA: NETWORK-FIRST
    // Prioriza a rede para garantir que o HTML e o Manifesto sejam sempre os mais recentes.
    // Se falhar (offline), usa o cache.
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // ESTRATÉGIA: STALE-WHILE-REVALIDATE
    // Para imagens, scripts e estilos: entrega o cache IMEDIATAMENTE (rápido)
    // mas busca na rede em segundo plano para atualizar o cache para a próxima vez.
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Silenciosamente falha o fetch se estiver offline
            });

          return cachedResponse || fetchPromise;
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
