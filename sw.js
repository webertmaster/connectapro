// ==========================================
// ZERO LABS - SERVICE WORKER INTELIGENTE
// sw.js - Cache dinâmico com Salvo-Conduto para APIs
// ==========================================

const CACHE_NAME = 'connecta-pro-v3';

self.addEventListener('install', event => {
    self.skipWaiting(); // Força a instalação imediata da nova versão
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache); // Limpa os caches velhos
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// MOTOR DE INTERCEPTAÇÃO
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // =========================================================
    // 🚨 SALVO-CONDUTO VIP (O SERVICE WORKER ESTÁ PROIBIDO DE TOCAR AQUI)
    // =========================================================
    if (
        event.request.method !== 'GET' || 
        url.hostname.includes('firestore.googleapis.com') || 
        url.hostname.includes('google.firestore') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('identitytoolkit') ||
        url.hostname.includes('wa.me')
    ) {
        return; // Retorna vazio -> Obriga o navegador a ir direto pra internet real!
    }

    // Para as imagens, HTML, CSS e JS locais, faz o cache normal:
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request).then(networkResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        }).catch(() => {
            console.warn("Servidor offline e recurso não cacheado:", event.request.url);
        })
    );
});
