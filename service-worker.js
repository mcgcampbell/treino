const CACHE_VERSION = 'treino-v2';

const ARQUIVOS_APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/utils/ui.js',
  './js/utils/backup.js',
  './js/utils/chart.js',
  './js/utils/buscaExercicio.js',
  './js/views/inicio.js',
  './js/views/ciclos.js',
  './js/views/modelos.js',
  './js/views/exercicios.js',
  './js/views/sessao.js',
  './js/views/historico.js',
  './js/views/backup.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      const urls = ARQUIVOS_APP_SHELL.map((p) => new URL(p, self.registration.scope).toString());
      return cache.addAll(urls);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: enquanto online, sempre busca a versão mais nova (essencial
// para que atualizações do app cheguem ao usuário). Offline, cai no cache.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((respostaRede) => {
        if (respostaRede && respostaRede.ok) {
          const clone = respostaRede.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return respostaRede;
      })
      .catch(() => caches.match(event.request))
  );
});
