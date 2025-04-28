// 서비스 워커 설치
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// 서비스 워커 활성화
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  return self.clients.claim();
});

// 페치 이벤트 처리
self.addEventListener('fetch', (event) => {
  // 기본 네트워크 요청 처리만 수행
  event.respondWith(fetch(event.request));
}); 