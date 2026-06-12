// ==========================================
// ZERO LABS - PORTARIA PRO MASTER
// sw.js - Service Worker (Modo Leve - Sem Cache Agressivo)
// ==========================================

self.addEventListener('install', (event) => {
    console.log('👷‍♂️ Service Worker: Instalado com sucesso!');
    self.skipWaiting(); // Força a atualização imediata
});

self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Ativado e pronto!');
});

self.addEventListener('fetch', (event) => {
    // Modo "Network First": Busca sempre o código novo na internet/servidor local.
    // Não vamos usar cache de arquivos JS para você não ter dor de cabeça programando.
    event.respondWith(fetch(event.request));
});