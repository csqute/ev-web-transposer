// SX registration-memory organizer: 9 groups × 6 pages × 8 slots.
// The shape mirrors SxRegCodec.kt so Android and Web backups are identical.

import { decodeSxPath } from "./protocol.js";

export const SX_GROUP_COUNT = 9;
export const SX_PAGE_COUNT = 6;
export const SX_PAGE_SIZE = 8;
export const SX_SLOT_COUNT = SX_PAGE_COUNT * SX_PAGE_SIZE;
export const SX_GROUP_LABEL_MAX = 8;
export const SX_SLOT_NAME_MAX = 28;
export const SX_BANK_NAME_MAX = 24;
export const SX_BUTTON_NAME_MAX = 16;

export const SX_DEFAULT_GROUP_LABELS = [
  "Piano", "Organ", "Guitar", "String", "Brass", "Trumpet", "Sax", "Synth", "Ethnic"
];

export const SX_DELAY_VALUES = [
  0, 100, 200, 300, 500, 800,
  1000, 1500, 2000, 3000, 5000, 10000
];
export const SX_DELAY_LABELS = [
  "0 立即", "0.1 秒", "0.2 秒", "0.3 秒", "0.5 秒", "0.8 秒",
  "1 秒", "1.5 秒", "2 秒", "3 秒", "5 秒", "10 秒"
];

/** Known Yamaha arranger models; buttonCount/variant follow the Android presets. */
export const SX_MODELS = [
  { label: "SX600", buttons: 8, variant: 0 },
  { label: "SX620", buttons: 8, variant: 0 },
  { label: "SX700", buttons: 8, variant: 0 },
  { label: "SX720", buttons: 8, variant: 0 },
  { label: "SX900", buttons: 8, variant: 0 },
  { label: "SX920", buttons: 8, variant: 1 },
  { label: "Genos", buttons: 10, variant: 0 },
  { label: "Genos2", buttons: 10, variant: 0 },
  { label: "其他 / 未知", buttons: 8, variant: 0 }
];
export const SX_OTHER_MODEL_INDEX = SX_MODELS.length - 1;

function toInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeBank(raw) {
  if (!raw || typeof raw !== "object") return null;
  const path = String(raw.path || "").trim();
  if (!path) return null;
  const sourceButtons = Array.isArray(raw.buttons) ? raw.buttons : [];
  return {
    path,
    name: cleanText(raw.name, SX_BANK_NAME_MAX),
    buttons: Array.from({ length: 10 }, (_, index) =>
      cleanText(sourceButtons[index], SX_BUTTON_NAME_MAX)
    )
  };
}

function normalizeSlot(raw) {
  if (!raw || typeof raw !== "object") return null;
  const bankPath = String(raw.p ?? raw.bankPath ?? "").trim();
  if (!bankPath) return null;
  return {
    name: cleanText(raw.n ?? raw.name, SX_SLOT_NAME_MAX),
    bankPath,
    button: clamp(toInt(raw.b ?? raw.button, 1), 1, 10)
  };
}

function emptySlots() {
  return Array.from({ length: SX_SLOT_COUNT }, () => null);
}

function normalizeGroups(rawGroups) {
  const source = Array.isArray(rawGroups) ? rawGroups : [];
  return Array.from({ length: SX_GROUP_COUNT }, (_, index) => {
    const group = source[index] && typeof source[index] === "object" ? source[index] : {};
    const rawSlots = Array.isArray(group.slots) ? group.slots : [];
    return {
      label: cleanText(group.label, SX_GROUP_LABEL_MAX),
      slots: Array.from({ length: SX_SLOT_COUNT }, (_, slotIndex) =>
        normalizeSlot(rawSlots[slotIndex])
      )
    };
  });
}

function normalizeSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    modelIndex: clamp(toInt(source.modelIndex, SX_OTHER_MODEL_INDEX), 0, SX_MODELS.length - 1),
    variantIndex: clamp(toInt(source.variantIndex, 0), 0, 2),
    buttonCount: toInt(source.buttonCount, 8) === 10 ? 10 : 8,
    delayMs: clamp(toInt(source.delayMs, 1000), 0, 60000),
    // Kept for Android backup round-trips; Web MIDI sends one whole message.
    splitSysex: source.splitSysex === true,
    cable: toInt(source.cable, 0) === 1 ? 1 : 0,
    autoLearn: source.autoLearn !== false,
    immediateSend: source.immediateSend !== false,
    // Android keeps the live part volumes across a registration switch.
    // Web MIDI does not implement the XG read-back yet; keep it for backups.
    keepVolume: source.keepVolume === true,
    targetDeviceKey: String(source.targetDeviceKey || "").trim(),
    selectedGroup: clamp(toInt(source.selectedGroup, 0), 0, SX_GROUP_COUNT - 1),
    selectedPage: clamp(toInt(source.selectedPage, 0), 0, SX_PAGE_COUNT - 1)
  };
}

export function defaultSxReg() {
  return {
    version: 1,
    banks: [],
    groups: normalizeGroups(null),
    settings: normalizeSettings(null),
    currentBanks: {}
  };
}

function normalizeCurrentBanks(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const output = {};
  for (const [key, value] of Object.entries(source)) {
    const path = String(value || "").trim();
    if (key && path) output[key] = path;
  }
  return output;
}

/** Accepts both the Android codec shape and already-normalized Web state. */
export function normalizeSxReg(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const banks = (Array.isArray(source.banks) ? source.banks : [])
    .map(normalizeBank)
    .filter(Boolean);
  return {
    version: 1,
    banks,
    groups: normalizeGroups(source.groups),
    settings: normalizeSettings(source.settings),
    currentBanks: normalizeCurrentBanks(source.currentBanks)
  };
}

/**
 * Android-compatible JSON shape: slots are {n,p,b}, matching SxRegCodec.kt.
 * Used for localStorage and backups; the live signal keeps readable keys.
 */
export function encodeSxReg(raw) {
  const state = normalizeSxReg(raw);
  return {
    settings: { ...state.settings },
    banks: state.banks.map((bank) => ({
      path: bank.path,
      name: bank.name,
      buttons: [...bank.buttons]
    })),
    groups: state.groups.map((group) => ({
      label: group.label,
      slots: group.slots.map((slot) => (
        slot ? { n: slot.name, p: slot.bankPath, b: slot.button } : null
      ))
    })),
    currentBanks: { ...state.currentBanks }
  };
}

// ---- Queries ---------------------------------------------------------------

export function sxPathsEqual(left, right) {
  const a = String(left || "").replace(/\\/g, "/").trim();
  const b = String(right || "").replace(/\\/g, "/").trim();
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function sxBankForPath(state, path) {
  const banks = state?.banks || [];
  return banks.find((bank) => bank.path === path)
    || banks.find((bank) => sxPathsEqual(bank.path, path))
    || null;
}

export function sxIndexOfBank(state, path) {
  const banks = state?.banks || [];
  const exact = banks.findIndex((bank) => bank.path === path);
  if (exact >= 0) return exact;
  return banks.findIndex((bank) => sxPathsEqual(bank.path, path));
}

export function sxBankDisplayName(bank) {
  if (!bank) return "";
  const custom = String(bank.name || "").trim();
  if (custom) return custom;
  const decoded = decodeSxPath(bank.path).trim();
  const file = decoded.replace(/\/+$/, "").split("/").pop() || "";
  return file.trim() || "注册库";
}

export function sxBankPathLabel(path) {
  return decodeSxPath(path);
}

export function sxGroupLabel(state, index) {
  const custom = String(state?.groups?.[index]?.label || "").trim();
  return custom || SX_DEFAULT_GROUP_LABELS[index] || "Group";
}

export function sxSlotAt(state, group, slotIndex) {
  return state?.groups?.[group]?.slots?.[slotIndex] || null;
}

export function sxSlotName(state, slot) {
  if (!slot?.bankPath) return "";
  const custom = String(slot.name || "").trim();
  if (custom) return custom;
  const bank = sxBankForPath(state, slot.bankPath);
  const bankName = bank
    ? sxBankDisplayName(bank)
    : (decodeSxPath(slot.bankPath).replace(/\/+$/, "").split("/").pop() || "注册库");
  const buttonName = String(bank?.buttons?.[slot.button - 1] || "").trim();
  return buttonName ? `${bankName} · ${buttonName}` : `${bankName} · ${slot.button}`;
}

export function sxUsedCount(state) {
  return (state?.groups || []).reduce(
    (sum, group) => sum + (group.slots || []).filter(Boolean).length,
    0
  );
}

export function sxHasContent(state) {
  return (state?.banks?.length || 0) > 0 || sxUsedCount(state) > 0;
}

export function sxCurrentBankPath(state, deviceKey) {
  return String(state?.currentBanks?.[deviceKey] || "");
}

/** Best-effort model detection from a Web MIDI port name. */
export function sxDetectModelIndex(text) {
  const upper = String(text || "").toUpperCase();
  if (!upper) return -1;
  if (upper.includes("GENOS2") || upper.includes("GENOS 2")) return 7;
  if (upper.includes("GENOS")) return 6;
  if (upper.includes("SX920")) return 5;
  if (upper.includes("SX900")) return 4;
  if (upper.includes("SX720")) return 3;
  if (upper.includes("SX700")) return 2;
  if (upper.includes("SX620")) return 1;
  if (upper.includes("SX600")) return 0;
  return -1;
}

export function sxModel(index) {
  return SX_MODELS[index] || SX_MODELS[SX_OTHER_MODEL_INDEX];
}

// ---- Mutators --------------------------------------------------------------

function withSettings(state, patch) {
  return normalizeSxReg({ ...state, settings: { ...state.settings, ...patch } });
}

export function withSxSettings(state, patch) {
  return withSettings(state, patch);
}

export function withSxTargetKey(state, key) {
  return withSettings(state, { targetDeviceKey: String(key || "").trim() });
}

export function withSxSelected(state, group, page) {
  return withSettings(state, {
    selectedGroup: clamp(toInt(group, 0), 0, SX_GROUP_COUNT - 1),
    selectedPage: clamp(toInt(page, 0), 0, SX_PAGE_COUNT - 1)
  });
}

export function withSxImmediateSend(state, enabled) {
  return withSettings(state, { immediateSend: !!enabled });
}

export function withSxKeepVolume(state, enabled) {
  return withSettings(state, { keepVolume: !!enabled });
}

export function withSxDelay(state, delayMs) {
  return withSettings(state, { delayMs: clamp(toInt(delayMs, 0), 0, 60000) });
}

export function withSxAutoLearn(state, enabled) {
  return withSettings(state, { autoLearn: !!enabled });
}

export function withSxButtonCount(state, count) {
  return withSettings(state, { buttonCount: toInt(count, 8) === 10 ? 10 : 8 });
}

export function withSxVariant(state, index) {
  return withSettings(state, { variantIndex: clamp(toInt(index, 0), 0, 2) });
}

export function withSxModel(state, index) {
  const model = sxModel(clamp(toInt(index, SX_OTHER_MODEL_INDEX), 0, SX_MODELS.length - 1));
  const modelIndex = SX_MODELS.indexOf(model);
  return withSettings(state, {
    modelIndex,
    buttonCount: model.buttons,
    variantIndex: model.variant
  });
}

export function withSxGroupLabel(state, group, label) {
  if (group < 0 || group >= SX_GROUP_COUNT) return state;
  const groups = state.groups.map((item, index) =>
    index === group
      ? { ...item, label: cleanText(label, SX_GROUP_LABEL_MAX) }
      : item
  );
  return normalizeSxReg({ ...state, groups });
}

export function withSxBankAdded(state, encodedPath) {
  const path = String(encodedPath || "").trim();
  if (!path) return state;
  if (sxIndexOfBank(state, path) >= 0) return state;
  return normalizeSxReg({
    ...state,
    banks: [...state.banks, { path, name: "", buttons: Array(10).fill("") }]
  });
}

export function withSxBankRenamed(state, index, name) {
  if (index < 0 || index >= state.banks.length) return state;
  const banks = state.banks.map((bank, itemIndex) =>
    itemIndex === index ? { ...bank, name: cleanText(name, SX_BANK_NAME_MAX) } : bank
  );
  return normalizeSxReg({ ...state, banks });
}

export function withSxBankMoved(state, index, delta) {
  if (index < 0 || index >= state.banks.length) return state;
  const target = clamp(index + toInt(delta, 0), 0, state.banks.length - 1);
  if (target === index) return state;
  const banks = [...state.banks];
  const [bank] = banks.splice(index, 1);
  banks.splice(target, 0, bank);
  return normalizeSxReg({ ...state, banks });
}

export function withSxBankRemoved(state, index) {
  if (index < 0 || index >= state.banks.length) return state;
  const banks = state.banks.filter((_, itemIndex) => itemIndex !== index);
  return normalizeSxReg({ ...state, banks });
}

export function withSxSlot(state, group, slotIndex, slot) {
  if (group < 0 || group >= SX_GROUP_COUNT) return state;
  if (slotIndex < 0 || slotIndex >= SX_SLOT_COUNT) return state;
  const normalized = normalizeSlot({
    n: slot?.name,
    p: slot?.bankPath,
    b: slot?.button
  });
  const groups = state.groups.map((item, groupIndex) => {
    if (groupIndex !== group) return item;
    const slots = [...item.slots];
    slots[slotIndex] = normalized;
    return { ...item, slots };
  });
  return normalizeSxReg({ ...state, groups });
}

export function withSxSlotCleared(state, group, slotIndex) {
  return withSxSlot(state, group, slotIndex, null);
}

export function withSxAllSlotsCleared(state) {
  const groups = state.groups.map((group) => ({ ...group, slots: emptySlots() }));
  return normalizeSxReg({ ...state, groups });
}

export function withSxCurrentBank(state, deviceKey, path) {
  const key = String(deviceKey || "");
  const value = String(path || "").trim();
  if (!key) return state;
  const currentBanks = { ...state.currentBanks };
  if (value) currentBanks[key] = value;
  else delete currentBanks[key];
  return normalizeSxReg({ ...state, currentBanks });
}
