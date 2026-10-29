/* Ev移调器 Web：缓存应用外壳，桌面/Android 安装后可离线打开。 */
const CACHE_PREFIX = "ev-transposer-web-";
const CACHE = "ev-transposer-web-1793262560";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./vendor/preact.module.js",
  "./vendor/hooks.module.js",
  "./vendor/htm.module.js",
  "./vendor/signals-core.module.js",
  "./vendor/signals.module.js",
  "./vendor/fflate.module.js",
  "./styles/tokens.css",
  "./styles/base.css",
  "./styles/components.css",
  "./styles/screens.css",
  "./styles/panes.css",
  "./styles/ipad.css",
  "./app/main.js",
  "./app/shell.js",
  "./app/router.js",
  "./app/store.js",
  "./app/panes.js",
  "./app/theme.js",
  "./app/fullscreen.js",
  "./app/version.js",
  "./core/midi/notes.js",
  "./core/midi/protocols.js",
  "./core/midi/access.js",
  "./core/midi/devices.js",
  "./core/midi/engine.js",
  "./core/midi/parser.js",
  "./core/midi/learn.js",
  "./core/midi/echo.js",
  "./core/mixer/model.js",
  "./core/mixer/targets.js",
  "./core/drums/model.js",
  "./core/drums/engine.js",
  "./core/sounds/picker.js",
  "./core/sounds/chain.js",
  "./core/setlist/model.js",
  "./core/files/prf.js",
  "./core/files/zip.js",
  "./core/license/crypto.js",
  "./core/license/verify.js",
  "./core/license/state.js",
  "./core/license/store.js",
  "./ui/components.js",
  "./ui/StatusBar.js",
  "./ui/ConnectionInline.js",
  "./ui/PianoKeyboard.js",
  "./ui/KeyGrid.js",
  "./ui/MainControlBar.js",
  "./ui/Fader.js",
  "./ui/DrumPad.js",
  "./ui/DrumLoopGrid.js",
  "./screens/MainScreen.js",
  "./screens/MixerScreen.js",
  "./screens/DrumScreen.js",
  "./screens/SoundPickerScreen.js",
  "./screens/SoundChainScreen.js",
  "./screens/SetListScreen.js",
  "./screens/PlaceholderScreen.js",
  "./dialogs/SettingsDialog.js",
  "./dialogs/SupportDialog.js",
  "./dialogs/PaywallDialog.js",
  "./dialogs/SuccessDialog.js",
  "./dialogs/PlaceholderDialog.js",
  "./dialogs/LearnDialog.js",
  "./dialogs/PresetDialog.js",
  "./assets/contact_qr.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // The archived demo at /demo/ has its own service worker and cache.
  if (url.pathname.includes("/demo/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("./index.html", copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      });
    })
  );
});
