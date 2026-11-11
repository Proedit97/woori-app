// 앱 파일을 기기에 저장해 두어 오프라인에서도 열리게 합니다.
// 앱을 고친 뒤 배포할 때는 VERSION 숫자를 올려주세요.
const VERSION = "woori-v5";
const SHELL = ["./", "index.html", "maps.js", "fb.js", "firebase-config.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && !FONT_HOSTS.includes(url.hostname)) return; // Firebase 통신은 건드리지 않음
  if (same && url.pathname.endsWith("version.json")) return; // 버전 확인은 항상 서버에서
  // 화면(HTML)과 설정 파일은 새 버전을 먼저, 안 되면 저장본
  if (same && (req.mode === "navigate" || /\.(html|js|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/"))) {
    e.respondWith(fetch(req, { cache: "no-cache" }).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
    return;
  }
  // 나머지는 저장본을 먼저 보여주고 뒤에서 갱신
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
