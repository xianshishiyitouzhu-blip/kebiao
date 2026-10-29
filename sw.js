/* 离线缓存：应用本体随安装一起存好；识别组件由页面按需存进 kebiao-ocr-v1 */
const APP_CACHE = 'kebiao-app-v1';
const CORE = [
  './',
  'index.html',
  'styles.css',
  'parser.js',
  'ocr.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'vendor/xlsx.full.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('kebiao-app-') && k !== APP_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html', { ignoreSearch: true }).then((hit) => hit || fetch(req)).catch(() => caches.match('./')),
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((resp) => {
        // 识别组件交给页面自己存，这里只顺手存应用本体的文件
        if (resp.ok && !url.pathname.includes('/vendor/tesseract/')) {
          const copy = resp.clone();
          caches.open(APP_CACHE).then((c) => c.put(req, copy));
        }
        return resp;
      });
    }),
  );
});
