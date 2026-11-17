// Pure license state transitions. No DOM, no signals, so Node tests can import it.
//
// Mirrors the Android LicenseStore/LicensePolicy: top-up codes add uses,
// day/week/month cards grant unlimited access until an epoch timestamp,
// renewals stack from the current expiry, and rolling the wall clock back
// cannot extend a card.

import {
  FREE_BASE_COUNT,
  MAX_ADD,
  isValidDeviceCode,
  normalizeDeviceCode,
  randomDeviceCode
} from "./crypto.js";

export const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
/** Longest card the tool and app accept (10 years). */
export const MAX_PERIOD_DAYS = 3650;
/** A wall clock this far behind the highest seen time is clock tampering. */
export const CLOCK_ROLLBACK_TOLERANCE_MS = 10 * 60 * 1000;

const MAX_CLOCK_JUMP_MS = 30 * MILLIS_PER_DAY;
const SEEN_STORE_INTERVAL_MS = 60 * 1000;

export function defaultLicenseState() {
  return {
    version: 2,
    device: randomDeviceCode(),
    balance: FREE_BASE_COUNT,
    unlimited: false,
    used: [],
    seen: 0,
    seenMillis: 0,
    licenseUntil: 0,
    deviceEpoch: 0
  };
}

export function normalizeLicenseState(raw, fallback = null) {
  const source = raw && typeof raw === "object" ? raw : {};
  const fallbackDevice = fallback && isValidDeviceCode(fallback.device)
    ? normalizeDeviceCode(fallback.device)
    : randomDeviceCode();
  const device = isValidDeviceCode(source.device)
    ? normalizeDeviceCode(source.device)
    : fallbackDevice;
  const used = Array.isArray(source.used)
    ? source.used.filter((item) => typeof item === "string" && item.length > 0)
    : [];
  const balance = Number.isInteger(source.balance) ? Math.max(0, source.balance) : FREE_BASE_COUNT;
  const seenSeconds = Number.isFinite(source.seen)
    ? Math.max(0, Math.floor(source.seen))
    : 0;
  const seenMillis = Number.isFinite(source.seenMillis)
    ? Math.max(0, Math.floor(source.seenMillis))
    : 0;
  const licenseUntil = Number.isFinite(source.licenseUntil)
    ? Math.max(0, Math.floor(source.licenseUntil))
    : 0;
  const deviceEpoch = Number.isInteger(source.deviceEpoch) ? Math.max(0, source.deviceEpoch) : 0;
  return {
    version: 2,
    device,
    balance,
    unlimited: source.unlimited === true,
    used,
    seen: Math.max(seenSeconds, Math.floor(seenMillis / 1000)),
    seenMillis,
    licenseUntil,
    deviceEpoch,
    ...(source.migratedFrom ? { migratedFrom: source.migratedFrom } : {})
  };
}

// ---- Period-card clock -----------------------------------------------------

/**
 * Highest wall-clock time this install has observed, in millis. Older Web
 * builds (and Android before v3.23) stored seconds in `seen`; a legacy value
 * far in the future is ignored so correcting a bad clock does not lock the
 * user out forever.
 */
export function seenBaseline(state, wall = Date.now()) {
  const seenMillis = Number.isFinite(state?.seenMillis)
    ? Math.max(0, state.seenMillis)
    : 0;
  const legacyMillis = Number.isFinite(state?.seen)
    ? Math.max(0, state.seen) * 1000
    : 0;
  const safeLegacy = legacyMillis > wall + MAX_CLOCK_JUMP_MS ? 0 : legacyMillis;
  return Math.max(seenMillis, safeLegacy);
}

/** True when the wall clock was moved well behind the highest seen time. */
export function isClockRolledBack(state, wall = Date.now()) {
  const seen = seenBaseline(state, wall);
  return seen > 0 && wall + CLOCK_ROLLBACK_TOLERANCE_MS < seen;
}

/**
 * Clamps now to the highest seen time and advances the baseline at most once
 * a minute. A single forward jump larger than 30 days is used for this check
 * but not stored, so correcting a wildly wrong clock restores access.
 */
export function advanceLicenseClock(state, wall = Date.now()) {
  const baseline = seenBaseline(state, wall);
  const now = Math.max(wall, baseline);
  if (baseline === 0) {
    return {
      state: { ...state, seenMillis: now, seen: Math.floor(now / 1000) },
      now,
      changed: true
    };
  }
  const delta = now - baseline;
  if (delta >= SEEN_STORE_INTERVAL_MS && delta <= MAX_CLOCK_JUMP_MS) {
    return {
      state: { ...state, seenMillis: now, seen: Math.floor(now / 1000) },
      now,
      changed: true
    };
  }
  return { state, now, changed: false };
}

/** Combined access calculation used by labels and charged operations. */
export function licenseAccess(state, wall = Date.now()) {
  const rolledBack = isClockRolledBack(state, wall);
  const { now } = advanceLicenseClock(state, wall);
  const until = Number.isFinite(state?.licenseUntil)
    ? Math.max(0, state.licenseUntil)
    : 0;
  const periodActive = !rolledBack && until > now;
  const daysLeft = periodActive
    ? Math.ceil((until - now) / MILLIS_PER_DAY)
    : 0;
  return {
    now,
    until,
    rolledBack,
    periodActive,
    daysLeft,
    expired: until > 0 && !rolledBack && until <= now,
    periodBlockedByClock: rolledBack && until > 0,
    unlimited: state?.unlimited === true
  };
}

export function licenseDaysLeft(state, wall = Date.now()) {
  return licenseAccess(state, wall).daysLeft;
}

export function hasUnlimitedAccess(state, wall = Date.now()) {
  const access = licenseAccess(state, wall);
  return access.unlimited || access.periodActive;
}

export function formatLicenseUntil(until) {
  if (!Number.isFinite(until) || until <= 0) return "";
  const date = new Date(until);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Full/compact access label, matching Android's MainUiState accessLabel /
 * accessLabelShort.
 */
export function licenseLabel(state, wall = Date.now(), short = false) {
  if (state?.unlimited) return short ? "无限制" : "无限制版";
  const access = licenseAccess(state, wall);
  if (access.periodBlockedByClock) return "系统时间异常";
  if (access.periodActive) {
    return short
      ? `时长卡剩余 ${access.daysLeft} 天`
      : `时长卡 · 剩余 ${access.daysLeft} 天`;
  }
  return `剩余 ${state?.balance ?? 0} 次`;
}

// ---- Redemption ------------------------------------------------------------

export function applyLicensePayload(state, payload, now = Date.now()) {
  if (normalizeDeviceCode(payload.device) !== normalizeDeviceCode(state.device)) {
    throw new Error("这个激活码不是这台设备的");
  }
  if (!payload.vid || typeof payload.vid !== "string") {
    throw new Error("激活码缺少编号");
  }
  if (state.used.includes(payload.vid)) {
    throw new Error("这个激活码已经用过了");
  }
  if (state.unlimited) {
    throw new Error("已经是无限制版，不需要再激活");
  }
  const used = [...state.used, payload.vid];
  const base = {
    ...state,
    used,
    seen: Math.max(state.seen || 0, Math.floor(now / 1000)),
    seenMillis: Math.max(state.seenMillis || 0, now),
    version: 2
  };

  if (payload.typ === "period") {
    const days = Number(payload.days);
    if (!Number.isInteger(days) || days < 1 || days > MAX_PERIOD_DAYS) {
      throw new Error("时长卡天数无效");
    }
    const currentUntil = Number.isFinite(state.licenseUntil)
      ? Math.max(0, state.licenseUntil)
      : 0;
    // Renewals stack: a card bought while another is active starts from the
    // current expiry instead of throwing the remaining time away.
    const until = Math.max(currentUntil, now) + days * MILLIS_PER_DAY;
    const totalDays = Math.ceil((until - now) / MILLIS_PER_DAY);
    return {
      state: { ...base, licenseUntil: until },
      message:
        `激活成功：+${days} 天，有效期至 ${formatLicenseUntil(until)}` +
        `（剩余 ${totalDays} 天）`,
      added: 0,
      unlimited: false,
      period: true,
      days,
      licenseUntil: until
    };
  }

  if (payload.typ !== "topup") {
    throw new Error("激活码类型不正确");
  }
  const add = Number(payload.add);
  if (!Number.isInteger(add) || add < 1 || add > MAX_ADD) {
    throw new Error("激活次数无效");
  }

  let balance = state.balance;
  let unlimited = false;
  let message;
  if (add === 1) {
    unlimited = true;
    message = "激活成功：已升级为无限制版";
  } else {
    balance += add;
    message = `激活成功：+${add} 次，剩余 ${balance} 次`;
  }

  return {
    state: {
      ...base,
      balance,
      unlimited
    },
    message,
    added: add,
    unlimited,
    period: false,
    days: 0,
    licenseUntil: base.licenseUntil || 0
  };
}

export function rotateDeviceCode(state, now = Date.now()) {
  let next = randomDeviceCode();
  let guard = 0;
  while (next === state.device && guard < 8) {
    next = randomDeviceCode();
    guard += 1;
  }
  return {
    ...state,
    device: next,
    deviceEpoch: (state.deviceEpoch || 0) + 1,
    seen: Math.max(state.seen || 0, Math.floor(now / 1000)),
    seenMillis: Math.max(state.seenMillis || 0, now)
  };
}

export function hasUses(state, count = 1, wall = Date.now()) {
  if (state.unlimited) return true;
  if (licenseAccess(state, wall).periodActive) return true;
  return state.balance >= count;
}
