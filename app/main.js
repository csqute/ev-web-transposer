import { render } from "preact";
import { html } from "../ui/components.js";
import { App } from "./shell.js";
import { startRouter } from "./router.js";
import {
  addLog,
  license,
  logLines,
  midi,
  mixerChannels,
  mixerTargets,
  drums,
  drumLoopMode,
  drumPlaying,
  drumPlayhead,
  soundPicker,
  soundChain,
  setList,
  controlChannel,
  layout,
  openDialog,
  presets,
  route,
  setFocusMode,
  settings,
  templates,
  updateSettings
} from "./store.js";
import { connectMidi, sendTestNote, sendTranspose } from "../core/midi/engine.js";
import { learnState } from "../core/midi/learn.js";
import { APP_VERSION } from "./version.js";

startRouter();
render(html`<${App} />`, document.getElementById("app"));

addLog(`Ev移调器 Web v${APP_VERSION} 启动`, "ok");
if (!midi.value.supported) {
  addLog("当前浏览器没有 Web MIDI：iPad 请用 MIDIWeb Browser 打开", "warn");
}

// Keep the screen awake during performance when the browser allows it.
let wakeLock = null;
async function requestWakeLock() {
  if (!("wakeLock" in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener?.("release", () => {
      wakeLock = null;
    });
  } catch (_) {}
}

window.addEventListener("pointerdown", () => {
  requestWakeLock();
}, { once: true });

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !wakeLock) requestWakeLock();
});

// Surface unexpected failures in the in-app diagnostics log.
window.addEventListener("error", (event) => {
  addLog(`脚本错误：${event.message || "未知"}`, "bad");
});
window.addEventListener("unhandledrejection", (event) => {
  addLog(`未处理错误：${event.reason?.message || event.reason || "未知"}`, "bad");
});

const serviceWorkerSecure = location.protocol === "https:"
  || location.hostname === "localhost"
  || location.hostname === "127.0.0.1";
if ("serviceWorker" in navigator && serviceWorkerSecure) {
  const register = () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // WKWebView wrappers may not allow service workers; the app still works.
    });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

// Test/debug hook used by the Playwright suite.
window.__ev = {
  APP_VERSION,
  settings,
  midi,
  license,
  mixerChannels,
  mixerTargets,
  drums,
  drumLoopMode,
  drumPlaying,
  drumPlayhead,
  soundPicker,
  soundChain,
  setList,
  controlChannel,
  layout,
  route,
  logLines,
  templates,
  presets,
  learnState,
  setFocusMode,
  updateSettings,
  openDialog,
  connectMidi,
  sendTranspose,
  sendTestNote
};
