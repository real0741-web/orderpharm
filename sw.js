// ============================================================
// 오더팜 OrderPharm - Service Worker v1.0
// 역할: 웹 푸시 알림 수신 + 오프라인 캐시
// ============================================================

const CACHE_NAME = 'orderpharm-v1';
const OFFLINE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── 설치: 핵심 파일 캐시 ─────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// ── 활성화: 오래된 캐시 정리 ─────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── 네트워크 요청: 캐시 우선 (오프라인 대응) ─────────────────
self.addEventListener('fetch', (e) => {
  // Worker API 요청은 캐시 안 함
  if (e.request.url.includes('workers.dev') || e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // 성공하면 캐시 갱신
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── 웹 푸시 수신 ─────────────────────────────────────────────
self.addEventListener('push', (e) => {
  let data = { title: '오더팜', body: '새 알림이 있습니다.', icon: './icons/icon-192.png', tag: 'orderpharm' };

  if (e.data) {
    try { data = { ...data, ...e.data.json() }; }
    catch { data.body = e.data.text(); }
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: data.tag || 'orderpharm',
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
      data: { url: data.url || './' },
      actions: data.actions || []
    })
  );
});

// ── 알림 클릭: 해당 URL로 이동 ───────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || './';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // 없으면 새 탭
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── 백그라운드 동기화 (향후 확장용) ─────────────────────────
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-orders') {
    // 오프라인 중 쌓인 주문 나중에 전송 (향후 구현)
    console.log('[SW] 백그라운드 동기화:', e.tag);
  }
});
