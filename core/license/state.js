// Pure license state transitions. No DOM, no signals, so Node tests can import it.

import {
  FREE_BASE_COUNT,
  MAX_ADD,
  isValidDeviceCode,
  normalizeDeviceCode,
  randomDeviceCode
} from "./crypto.js";

export function defaultLicenseState() {
  return {
    version: 2,
    device: randomDeviceCode(),
    balance: FREE_BASE_COUNT,
    unlimited: false,
    used: [],
    seen: 0,
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
  const seen = Number.isFinite(source.seen) ? Math.max(0, Math.floor(source.seen)) : 0;
  const deviceEpoch = Number.isInteger(source.deviceEpoch) ? Math.max(0, source.deviceEpoch) : 0;
  return {
    version: 2,
    device,
    balance,
    unlimited: source.unlimited === true,
    used,
    seen,
    deviceEpoch,
    ...(source.migratedFrom ? { migratedFrom: source.migratedFrom } : {})
  };
}

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
  const add = Number(payload.add);
  if (!Number.isInteger(add) || add < 1 || add > MAX_ADD) {
    throw new Error("激活次数无效");
  }
  if (state.unlimited) {
    throw new Error("已经是无限制版，不需要再激活");
  }

  const used = [...state.used, payload.vid];
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
      ...state,
      balance,
      unlimited,
      used,
      seen: Math.max(state.seen || 0, Math.floor(now / 1000)),
      version: 2
    },
    message,
    added: add,
    unlimited
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
    seen: Math.max(state.seen || 0, Math.floor(now / 1000))
  };
}

export function hasUses(state, count = 1) {
  return state.unlimited || state.balance >= count;
}
