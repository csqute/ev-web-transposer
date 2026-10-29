// iPad-friendly fullscreen: try the real API, otherwise focus mode.

import { setFocusMode, showToast, ui } from "./store.js";

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

async function exitRealFullscreen() {
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch (_) {}
}

export async function enterFullscreenOrFocus() {
  const element = document.documentElement;
  const request = element.requestFullscreen || element.webkitRequestFullscreen;
  let entered = false;
  if (request) {
    try {
      await request.call(element);
      entered = true;
    } catch (_) {
      entered = false;
    }
  }
  // Real fullscreen already hides the browser chrome; keep the app's top row.
  // Focus mode is only the fallback when the Fullscreen API is unavailable.
  setFocusMode(!entered);
  if (!entered) {
    showToast("当前浏览器不支持网页全屏，已进入专注模式", 2600);
  }
  try {
    if (screen.orientation && typeof screen.orientation.lock === "function") {
      await screen.orientation.lock("landscape");
    }
  } catch (_) {
    // iPad rejects orientation lock by design.
  }
  if (window.matchMedia("(orientation: portrait)").matches) {
    showToast("请把 iPad 横过来使用", 2800);
  }
}

export async function exitFullscreenOrFocus() {
  setFocusMode(false);
  if (fullscreenElement()) await exitRealFullscreen();
}

export async function toggleFullscreen() {
  if (ui.value.focusMode || fullscreenElement()) {
    await exitFullscreenOrFocus();
  } else {
    await enterFullscreenOrFocus();
  }
}
