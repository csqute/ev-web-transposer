// Browser license store: signal + localStorage v2, with one-time migration
// from the demo's evwt.license.v1.

import { signal } from "@preact/signals";
import { isValidDeviceCode } from "./crypto.js";
import { verifyActivation } from "./verify.js";
import {
  advanceLicenseClock,
  applyLicensePayload,
  defaultLicenseState,
  formatLicenseUntil,
  licenseAccess,
  licenseLabel,
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

/** Advances the seen-clock baseline at most once a minute. */
function touchLicense(wall = Date.now()) {
  const current = license.value;
  const advanced = advanceLicenseClock(current, wall);
  if (advanced.state !== current) saveLicense(advanced.state);
  return licenseAccess(license.value, wall);
}

/**
 * Charged operations are free while a day/week/month card is active.
 * A rolled-back clock disables the card, matching Android.
 */
export function hasUses(count = 1) {
  const access = touchLicense();
  return access.unlimited || access.periodActive || license.value.balance >= count;
}

export function consumeUse(count = 1) {
  const access = touchLicense();
  const state = license.value;
  if (access.unlimited || access.periodActive) return true;
  if (state.balance < count) return false;
  saveLicense({ ...state, balance: state.balance - count });
  return true;
}

export async function activateLicense(code) {
  const wall = Date.now();
  const advanced = advanceLicenseClock(license.value, wall);
  if (advanced.state !== license.value) saveLicense(advanced.state);
  const current = license.value;
  const access = licenseAccess(current, wall);
  // Use the monotonic time for both the code's own expiry and the new card,
  // so a rolled-back wall clock cannot mint extra days.
  const payload = await verifyActivation(code, { now: access.now });
  const applied = applyLicensePayload(current, payload, access.now);
  const rotated = rotateDeviceCode(applied.state, access.now);
  saveLicense(rotated);
  return {
    ok: true,
    message: applied.message,
    added: applied.added,
    unlimited: applied.unlimited,
    period: applied.period === true,
    days: applied.days || 0,
    licenseUntil: applied.licenseUntil || 0,
    device: rotated.device
  };
}

/**
 * Everything the UI needs for the balance chip, support page and paywall.
 * Pure read: callers that consume uses go through touchLicense() instead.
 */
export function licenseView(state = license.value, wall = Date.now()) {
  const access = licenseAccess(state, wall);
  return {
    ...access,
    device: state.device,
    balance: state.balance,
    text: licenseLabel(state, wall, false),
    shortText: licenseLabel(state, wall, true),
    untilText: formatLicenseUntil(access.until),
    className: state.unlimited || access.periodActive
      ? "unlimited"
      : (state.balance === 0 ? "zero" : "")
  };
}

export function licenseSummary(state = license.value) {
  return licenseView(state).text;
}

// Refresh "remaining N days" while a card is active, and once when it ends.
let lastPeriodTick = false;
if (typeof window !== "undefined" && typeof setInterval === "function") {
  setInterval(() => {
    const state = license.value;
    if (!state.licenseUntil) {
      lastPeriodTick = false;
      return;
    }
    const wall = Date.now();
    const access = licenseAccess(state, wall);
    if (!access.periodActive && !lastPeriodTick) return;
    const advanced = advanceLicenseClock(state, wall);
    if (advanced.state !== state) saveLicense(advanced.state);
    else license.value = { ...state };
    lastPeriodTick = access.periodActive;
  }, 60_000);
}
