// Yamaha MODX SysEx / CC messages, ported from ModxProtocol.kt.

import {
  profileIsMSeries,
  profileSupportsBankSwitch
} from "./model.js";

export const MODX_LIVE_SET_CC = 62;

function bytes(values) {
  return values.map((value) => value & 0xff);
}

// ---- Capture targets -------------------------------------------------------

const ORIGINAL_BANK_BYTES = 20 + 16 * 20 + 256 * 26;
const M_BANK_BYTES = 20 + 16 * 20 + 256 * 20 + 256 * 18 + 256 * 256 + 256 * 32;
const M_PAGE_BYTES = 20 + 16 * 20 + 16 * 18 + 16 * 256 + 16 * 32;

export const MODX_CAPTURE_TARGETS = {
  ORIGINAL_LIVE_SET: {
    name: "ORIGINAL_LIVE_SET",
    label: "当前 Live Set 库",
    kind: "ORIGINAL_BANK",
    expectedBytes: ORIGINAL_BANK_BYTES
  },
  M_EDIT_BANK: {
    name: "M_EDIT_BANK",
    label: "当前库（Edit Buffer）",
    kind: "M_BANK",
    expectedBytes: M_BANK_BYTES
  },
  M_EDIT_PAGE: {
    name: "M_EDIT_PAGE",
    label: "当前库单页（Edit Buffer）",
    kind: "M_PAGE",
    expectedBytes: M_PAGE_BYTES
  },
  M_USER_BANK: {
    name: "M_USER_BANK",
    label: "User 库",
    kind: "M_BANK",
    expectedBytes: M_BANK_BYTES
  },
  M_USER_PAGE: {
    name: "M_USER_PAGE",
    label: "User 库单页",
    kind: "M_PAGE",
    expectedBytes: M_PAGE_BYTES
  },
  M_LIBRARY_BANK: {
    name: "M_LIBRARY_BANK",
    label: "Library 库",
    kind: "M_BANK",
    expectedBytes: M_BANK_BYTES
  },
  M_LIBRARY_PAGE: {
    name: "M_LIBRARY_PAGE",
    label: "Library 库单页",
    kind: "M_PAGE",
    expectedBytes: M_PAGE_BYTES
  }
};

export function captureTargetAddress(target, bankIndex = 0, pageIndex = 0) {
  switch (target.name) {
    case "ORIGINAL_LIVE_SET":
      return [0x0e, 0x41, 0x00];
    case "M_EDIT_BANK":
      return [0x04, 0x06, 0x00, 0x00];
    case "M_EDIT_PAGE":
      return [0x04, 0x06, 0x10, pageIndex & 0x0f];
    case "M_USER_BANK":
      return [0x04, 0x07, bankIndex & 0x07, 0x00];
    case "M_USER_PAGE":
      return [0x04, 0x07, 0x10 | (bankIndex & 0x07), pageIndex & 0x0f];
    case "M_LIBRARY_BANK":
      return [0x04, 0x08, bankIndex & 0x07, 0x00];
    case "M_LIBRARY_PAGE":
      return [0x04, 0x08, 0x10 | (bankIndex & 0x07), pageIndex & 0x0f];
    default:
      return [0x04, 0x06, 0x00, 0x00];
  }
}

export function captureTargetIsPage(target) {
  return target?.kind === "M_PAGE";
}

export function captureTargetNeedsBank(target) {
  return target?.name === "M_USER_BANK"
    || target?.name === "M_USER_PAGE"
    || target?.name === "M_LIBRARY_BANK"
    || target?.name === "M_LIBRARY_PAGE";
}

export function captureTargetsForProfile(profile) {
  if (!profile) return [];
  if (profile.name === "MODX" || profile.name === "MONTAGE") {
    return [MODX_CAPTURE_TARGETS.ORIGINAL_LIVE_SET];
  }
  if (profileIsMSeries(profile)) {
    return [
      MODX_CAPTURE_TARGETS.M_EDIT_BANK,
      MODX_CAPTURE_TARGETS.M_EDIT_PAGE,
      MODX_CAPTURE_TARGETS.M_USER_BANK,
      MODX_CAPTURE_TARGETS.M_USER_PAGE,
      MODX_CAPTURE_TARGETS.M_LIBRARY_BANK,
      MODX_CAPTURE_TARGETS.M_LIBRARY_PAGE
    ];
  }
  return [];
}

export function captureTargetForBankKind(profile, kind) {
  if (!profile) return null;
  if (profile.name === "MODX" || profile.name === "MONTAGE") {
    return kind === "CURRENT" ? MODX_CAPTURE_TARGETS.ORIGINAL_LIVE_SET : null;
  }
  if (!profileIsMSeries(profile)) return null;
  switch (kind) {
    case "CURRENT":
    case "EDIT":
      return MODX_CAPTURE_TARGETS.M_EDIT_BANK;
    case "USER":
      return MODX_CAPTURE_TARGETS.M_USER_BANK;
    case "LIBRARY":
      return MODX_CAPTURE_TARGETS.M_LIBRARY_BANK;
    default:
      return null;
  }
}

// ---- CC messages -----------------------------------------------------------

/** Live Set slot select: CC0=62, CC32=page (0..15), PC=slot (0..15). */
export function modxSlotSelect(channel, pageIndex, slotIndex) {
  const ch = Math.max(0, Math.min(15, Number(channel) || 0));
  return [
    [0xb0 | ch, 0, MODX_LIVE_SET_CC],
    [0xb0 | ch, 32, Math.max(0, Math.min(15, pageIndex))],
    [0xc0 | ch, Math.max(0, Math.min(15, slotIndex))]
  ];
}

/** Fallback: select the underlying Performance (cross-bank, documented). */
export function modxPerformanceSelect(channel, bankMsb, bankLsb, program) {
  const ch = Math.max(0, Math.min(15, Number(channel) || 0));
  return [
    [0xb0 | ch, 0, Math.max(0, Math.min(127, bankMsb))],
    [0xb0 | ch, 32, Math.max(0, Math.min(127, bankLsb))],
    [0xc0 | ch, Math.max(0, Math.min(127, program))]
  ];
}

// ---- SysEx -----------------------------------------------------------------

/**
 * Undocumented Live Set bank switch.
 * XX: 0 = Preset, 1..8 = User 1..8, 9..16 = Library 1..8.
 * Original MONTAGE is intentionally unsupported.
 */
export function modxBankSwitch(profile, deviceNumber, bank) {
  if (!profile) return null;
  const dev = 0x10 | (Math.max(1, Math.min(16, Number(deviceNumber) || 1)) - 1);
  const value = Math.max(0, Math.min(127, Number(bank) || 0));
  switch (profile.name) {
    case "MODX":
    case "MODX_M_OLD":
      return bytes([
        0xf0, 0x43, dev, 0x7f, 0x1c, profile.modelId,
        0x09, 0x00, 0x00, value, 0xf7
      ]);
    case "MODX_M_OS3":
    case "MONTAGE_M":
      return bytes([
        0xf0, 0x43, dev, 0x7f, 0x1c, 0x0d,
        0x02, 0x00, 0x00, 0x00, value, 0xf7
      ]);
    default:
      return null;
  }
}

/** Bulk dump request. Device number n uses 0x20 + (n - 1). */
export function modxBulkRequestAddress(profile, deviceNumber, address) {
  const dev = 0x20 | (Math.max(1, Math.min(16, Number(deviceNumber) || 1)) - 1);
  return bytes([
    0xf0,
    0x43,
    dev,
    0x7f,
    0x1c,
    profile?.modelId || 0x07,
    ...address.map((value) => value & 0x7f),
    0xf7
  ]);
}

export function modxBulkRequest(profile, deviceNumber, target, bankIndex = 0, pageIndex = 0) {
  return modxBulkRequestAddress(
    profile,
    deviceNumber,
    captureTargetAddress(target, bankIndex, pageIndex)
  );
}

/**
 * Map a Live Set slot's Performance bank/program to the M-series
 * Performance bulk header `04 ll mm nn`.
 */
export function modxPerformanceHeader(profile, slot) {
  if (!profileIsMSeries(profile) || !slot) return null;
  const msb = (slot.bankMsb || 0) & 0x7f;
  const lsb = (slot.bankLsb || 0) & 0x7f;
  const program = (slot.performanceNumber || 0) & 0x7f;
  let group = -1;
  let bank = -1;
  if (msb === 0x3f || msb === 0x41) {
    if (lsb >= 0 && lsb <= 39) {
      group = 0x00;
      bank = lsb;
    }
  } else if (msb === 0x40 || msb === 0x42) {
    if (lsb >= 0 && lsb <= 4) {
      group = 0x01;
      bank = lsb;
    } else if (lsb >= 8 && lsb <= 0x7f) {
      group = 0x03;
      bank = lsb - 8;
    }
  }
  if (group < 0 || bank < 0) return null;
  return [0x04, group, bank, program];
}

export function modxPerformanceBulkRequest(profile, deviceNumber, header) {
  return modxBulkRequestAddress(profile, deviceNumber, header);
}

// ---- Selector --------------------------------------------------------------

/** Bank number used by the undocumented Live Set switch. */
export function modxBankSwitchValue(ref) {
  if (!ref) return null;
  switch (ref.kind) {
    case "USER": return (ref.bankIndex || 0) + 1;
    case "LIBRARY": return (ref.bankIndex || 0) + 9;
    default: return null;
  }
}

export function modxBankSwitchMessage(targetProfile, deviceNumber, ref) {
  const bank = modxBankSwitchValue(ref);
  if (bank == null) return null;
  return modxBankSwitch(targetProfile, deviceNumber, bank);
}

export function modxNeedsBankSwitch(targetProfile, ref, crossBankSwitch) {
  if (!crossBankSwitch) return false;
  if (!profileSupportsBankSwitch(targetProfile)) return false;
  return modxBankSwitchValue(ref) != null;
}

export function modxSlotMessages(channel, ref) {
  return modxSlotSelect(channel, ref?.page || 0, ref?.slot || 0);
}

export function hexBytes(data, max = 80) {
  const list = Array.from(data || []);
  if (!list.length) return "(empty)";
  const shown = list.slice(0, max)
    .map((value) => (value & 0xff).toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
  return list.length > max ? `${shown} … (${list.length} bytes)` : shown;
}
