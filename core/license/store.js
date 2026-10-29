// Browser license store: signal + localStorage v2, with one-time migration
// from the demo's evwt.license.v1.

import { signal } from "@preact/signals";
import { isValidDeviceCode } from "./crypto.js";
import { verifyActivation } from "./verify.js";
import {
  applyLicensePayload,
  defaultLicenseState,
  normalizeLicenseState,
  rotateDeviceCode
} from "./state.js";

export const LICENSE_KEY = "evwt.license.v2";
export const LEGACY_LICENSE_KEY = "evwt.license.v1";

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function writeRaw(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // Private mode / quota: keep the in-memory state.
  }
}

function parseRaw(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

function loadLicenseState() {
  const v2 = parseRaw(readRaw(LICENSE_KEY));
  if (v2 && isValidDeviceCode(v2.device)) {
    return normalizeLicenseState(v2);
  }

  const v1 = parseRaw(readRaw(LEGACY_LICENSE_KEY));
  if (v1 && isValidDeviceCode(v1.device)) {
    const migrated = normalizeLicenseState({ ...v1, migratedFrom: "v1" });
    writeRaw(LICENSE_KEY, migrated);
    return migrated;
  }

  const fresh = defaultLicenseState();
  writeRaw(LICENSE_KEY, fresh);
  return fresh;
}

export const license = signal(loadLicenseState());

export function saveLicense(next) {
  license.value = next;
  writeRaw(LICENSE_KEY, next);
  return next;
}

export function hasUses(count = 1) {
  const state = license.value;
  return state.unlimited || state.balance >= count;
}

export function consumeUse(count = 1) {
  const state = license.value;
  if (state.unlimited) return true;
  if (state.balance < count) return false;
  saveLicense({ ...state, balance: state.balance - count });
  return true;
}

export async function activateLicense(code) {
  const payload = await verifyActivation(code);
  const current = license.value;
  const applied = applyLicensePayload(current, payload);
  const rotated = rotateDeviceCode(applied.state);
  saveLicense(rotated);
  return {
    ok: true,
    message: applied.message,
    added: applied.added,
    unlimited: applied.unlimited,
    device: rotated.device
  };
}

export function licenseSummary(state = license.value) {
  return state.unlimited ? "无限制版" : `剩余 ${state.balance} 次`;
}
