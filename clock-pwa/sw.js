const CACHE_NAME = "clock-pwa-shell-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-180.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("clock-pwa-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(new URL("./index.html", self.registration.scope), response.clone());
        }
        return response;
      } catch {
        const cachedPage = await caches.match(new URL("./index.html", self.registration.scope));
        if (cachedPage) {
          return cachedPage;
        }
        return new Response(
          "오프라인이며 저장된 시계 화면이 없습니다. 인터넷에 연결한 뒤 다시 열어 주세요.",
          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.ok && url.pathname.startsWith(new URL("./", self.registration.scope).pathname)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
