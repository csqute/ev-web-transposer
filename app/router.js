// Hash router for the single-pane layout.

import { route } from "./store.js";

const SCREEN_HASH = {
  transpose: "#/",
  setlist: "#/setlist",
  sounds: "#/sounds",
  chain: "#/chain",
  mixer: "#/mixer",
  drums: "#/drums"
};

const HASH_SCREEN = {
  "": "transpose",
  "#": "transpose",
  "#/": "transpose",
  "#/setlist": "setlist",
  "#/sounds": "sounds",
  "#/chain": "chain",
  "#/mixer": "mixer",
  "#/drums": "drums"
};

export function screenFromHash(hash = window.location.hash) {
  return HASH_SCREEN[hash] || "transpose";
}

export function syncRouteFromHash() {
  route.value = screenFromHash(window.location.hash);
}

export function navigate(screen) {
  const next = SCREEN_HASH[screen] ? screen : "transpose";
  route.value = next;
  const hash = SCREEN_HASH[next];
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export function backToMain() {
  navigate("transpose");
}

export function startRouter() {
  syncRouteFromHash();
  window.addEventListener("hashchange", syncRouteFromHash);
}
