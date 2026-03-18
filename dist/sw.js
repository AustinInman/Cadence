// Service Worker for Cadence PWA
// Strategy: Network-first for all requests (always get fresh content)

const CACHE_NAME = 'cadence-v5';

// Install — skip waiting immediately so new SW takes effect right away
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

// Activate — delete ALL old caches and claim clients immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for everything
// Only fall back to cache if network fails (offline support)
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Always network-only for API calls (never cache)
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('anthropic') ||
    url.pathname.includes('/rest/') ||
    url.pathname.includes('/auth/')
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ error: 'offline', message: 'No network connection' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Network-first for app assets
  event.respondWith(
    fetch(event.request).then(response => {
      // Update cache with fresh response
      if (response.ok && url.origin === self.location.origin) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() =>
      // Network failed — try cache as fallback
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        // SPA fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
    )
  );
});


