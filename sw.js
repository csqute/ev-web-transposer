/* Ev移调器 Web：缓存应用外壳，桌面/Android 安装后可离线打开。 */
const CACHE_PREFIX = "ev-transposer-web-";
const CACHE = "ev-transposer-web-1795867577";
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
  "./vendor/qrcode.mjs",
  "./vendor/jsQR.js",
  "./song-studio/index.html",
  "./song-studio/app.js",
  "./song-studio/midi.js",
  "./song-studio/styles.css",
  "./song-studio/embed.css",
  "./song-studio/license.js",
  "./song-studio/license.css",
  "./song-studio/integrity.json",
  "./song-studio/core/qr.js",
  "./song-studio/core/license/crypto.js",
  "./song-studio/core/license/verify.js",
  "./song-studio/core/license/state.js",
  "./song-studio/core/license/seal.js",
  "./song-studio/assets/contact_qr.jpg",
  "./song-studio/vendor/jsQR.js",
  "./song-studio/vendor/qrcode.mjs",
  "./song-studio/korg_sounds.json",
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
  "./core/midi/echo.js",
  "./core/channels/model.js",
  "./core/mixer/model.js",
  "./core/mixer/targets.js",
  "./core/drums/model.js",
  "./core/drums/engine.js",
  "./core/sounds/picker.js",
  "./core/sounds/chain.js",
  "./core/modx/model.js",
  "./core/modx/protocol.js",
  "./core/modx/parse.js",
  "./core/modx/codec.js",
  "./core/modx/engine.js",
  "./core/sxreg/model.js",
  "./core/sxreg/protocol.js",
  "./core/sxreg/engine.js",
  "./core/sxreg/xg.js",
  "./core/sxreg/volumes.js",
  "./core/setlist/model.js",
  "./core/backup.js",
  "./core/qr.js",
  "./core/files/prf.js",
  "./core/files/zip.js",
  "./core/license/crypto.js",
  "./core/license/verify.js",
  "./core/license/state.js",
  "./core/license/seal.js",
  "./core/license/store.js",
  "./ui/components.js",
  "./ui/PickerModeSwitch.js",
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
  "./screens/ModxPickerScreen.js",
  "./screens/SxPickerScreen.js",
  "./screens/SoundChainScreen.js",
  "./screens/SetListScreen.js",
  "./screens/MidiConfigScreen.js",
  "./screens/StudioGate.js",
  "./screens/StudioScreen.js",
  "./screens/PlaceholderScreen.js",
  "./dialogs/SettingsDialog.js",
  "./dialogs/SupportDialog.js",
  "./dialogs/PaywallDialog.js",
  "./dialogs/SuccessDialog.js",
  "./dialogs/PlaceholderDialog.js",
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

  // Song Studio assets carry ?v= cache-busters. Match them without the query
  // so the precached app.js/styles.css also work on the first offline open.
  if (url.pathname.includes("/song-studio/")) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
          return response;
        });
      })
    );
    return;
  }

  if (event.request.mode === "navigate") {
    // The Song Studio pane is an iframe. Never cache it under the transposer
    // shell key: serve the precached studio document (ignoring ?embed=1).
    if (event.request.destination === "iframe") {
      event.respondWith(
        caches.match(event.request, { ignoreSearch: true })
          .then((cached) => cached || fetch(event.request))
      );
      return;
    }
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
