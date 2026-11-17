// MODX backup/persistence codec, byte-compatible with Android ModxCodec.kt.

import {
  MODX_GROUP_COUNT,
  MODX_LIVE_PAGE_COUNT,
  MODX_LIVE_SLOT_COUNT,
  MODX_LIVE_SLOTS_PER_PAGE,
  MODX_MAX_BANKS,
  MODX_ORGANIZED_SLOT_COUNT,
  emptySlot,
  modxBankKind,
  modxProfile,
  normalizeModxPicker,
  normalizeRef,
  normalizeSlot
} from "./model.js";

const VERSION = 1;

function encodeRef(ref) {
  return {
    profile: ref.profile,
    kind: ref.kind,
    index: ref.bankIndex,
    bankName: ref.bankName,
    page: ref.page,
    slot: ref.slot,
    slotName: ref.slotName,
    perfName: ref.performanceName,
    name: ref.displayName,
    msb: ref.bankMsb,
    lsb: ref.bankLsb,
    pc: ref.performanceNumber
  };
}

function decodeRef(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return normalizeRef({
    profile: modxProfile(source.profile)?.name || "MODX",
    kind: modxBankKind(source.kind)?.name || "CURRENT",
    bankIndex: source.index,
    bankName: source.bankName,
    page: source.page,
    slot: source.slot,
    slotName: source.slotName,
    performanceName: source.perfName,
    displayName: source.name,
    bankMsb: source.msb,
    bankLsb: source.lsb,
    performanceNumber: source.pc
  });
}

export function encodeModxObject(state) {
  const safe = normalizeModxPicker(state);
  const root = { version: VERSION };
  root.settings = {
    targetKey: safe.settings.targetKey,
    profile: safe.settings.profileOverride,
    deviceNumber: safe.settings.deviceNumber,
    port: safe.settings.portIndex,
    controlChannel: safe.settings.controlChannel,
    crossBank: safe.settings.crossBankSwitch,
    bankWait: safe.settings.bankWaitMs,
    sendGap: safe.settings.sendGapMs,
    autoRead: safe.settings.autoReadPageNames,
    immediateSend: safe.settings.immediateSend,
    view: safe.settings.view,
    selectedGroup: safe.settings.selectedGroup,
    organizedPage: safe.settings.organizedPage,
    labels: [...safe.settings.groupLabels]
  };
  root.banks = safe.banks.map((bank) => {
    const manual = bank.kind === "MANUAL";
    return {
      profile: bank.profile,
      kind: bank.kind,
      index: bank.bankIndex,
      name: bank.bankName,
      capturedAt: bank.capturedAt,
      partial: bank.partial,
      pages: Array.from({ length: MODX_LIVE_PAGE_COUNT }, (_, page) =>
        bank.pageNames?.[page] || ""
      ),
      slots: bank.slots
        .filter((slot) => slot.switchOn && (!manual || slot.customName.trim()))
        .map((slot) => ({
          p: slot.page,
          s: slot.slot,
          sn: slot.slotName,
          pn: slot.performanceName,
          cn: slot.customName,
          c: slot.color,
          msb: slot.bankMsb,
          lsb: slot.bankLsb,
          pc: slot.performanceNumber,
          vol: slot.volume,
          type: slot.slotType,
          content: slot.contentNumber,
          sss: slot.sssTime
        }))
    };
  });
  root.selectedBank = safe.selectedBankKey;
  root.selectedPage = safe.selectedPage;
  root.groups = Array.from({ length: MODX_GROUP_COUNT }, (_, group) => {
    const slots = {};
    const entries = safe.groups?.[group]?.entries || [];
    for (let slot = 0; slot < MODX_ORGANIZED_SLOT_COUNT; slot += 1) {
      if (entries[slot]) slots[String(slot)] = encodeRef(entries[slot]);
    }
    return { slots };
  });
  return root;
}

export function encodeModx(state) {
  return JSON.stringify(encodeModxObject(state));
}

function decodeBank(raw) {
  if (!raw || typeof raw !== "object") return null;
  const profile = modxProfile(raw.profile)?.name || "MODX";
  const kind = modxBankKind(raw.kind)?.name || "CURRENT";
  const manual = kind === "MANUAL";
  const slots = Array.from({ length: MODX_LIVE_SLOT_COUNT }, (_, index) => ({
    ...emptySlot(
      Math.floor(index / MODX_LIVE_SLOTS_PER_PAGE),
      index % MODX_LIVE_SLOTS_PER_PAGE
    ),
    switchOn: manual
  }));
  const sourceSlots = Array.isArray(raw.slots) ? raw.slots : [];
  for (const item of sourceSlots) {
    if (!item || typeof item !== "object") continue;
    const page = Number(item.p);
    const slot = Number(item.s);
    if (!Number.isInteger(page) || page < 0 || page >= MODX_LIVE_PAGE_COUNT) continue;
    if (!Number.isInteger(slot) || slot < 0 || slot >= MODX_LIVE_SLOTS_PER_PAGE) continue;
    slots[page * MODX_LIVE_SLOTS_PER_PAGE + slot] = normalizeSlot({
      page,
      slot,
      slotName: item.sn,
      performanceName: item.pn,
      customName: item.cn,
      color: item.c,
      bankMsb: item.msb,
      bankLsb: item.lsb,
      performanceNumber: item.pc,
      volume: item.vol,
      switchOn: true,
      slotType: item.type,
      contentNumber: item.content,
      sssTime: item.sss
    });
  }
  const pages = Array.isArray(raw.pages) ? raw.pages : [];
  return {
    profile,
    kind,
    bankIndex: Number.isInteger(raw.index) ? raw.index : 0,
    bankName: String(raw.name || ""),
    pageNames: Array.from({ length: MODX_LIVE_PAGE_COUNT }, (_, page) =>
      String(pages[page] || "")
    ),
    slots,
    capturedAt: Number.isFinite(Number(raw.capturedAt)) ? Number(raw.capturedAt) : 0,
    partial: raw.partial === true
  };
}

export function decodeModxObject(raw) {
  const source = raw && typeof raw === "object" ? raw : null;
  if (!source) return normalizeModxPicker(null);
  const banks = [];
  const bankArray = Array.isArray(source.banks) ? source.banks : [];
  for (let index = 0; index < Math.min(bankArray.length, MODX_MAX_BANKS); index += 1) {
    const bank = decodeBank(bankArray[index]);
    if (bank) banks.push(bank);
  }

  const groupArray = Array.isArray(source.groups) ? source.groups : [];
  const groups = Array.from({ length: MODX_GROUP_COUNT }, (_, groupIndex) => {
    const slots = groupArray[groupIndex]?.slots;
    const entries = Array.from({ length: MODX_ORGANIZED_SLOT_COUNT }, () => null);
    if (slots && typeof slots === "object") {
      for (const [key, value] of Object.entries(slots)) {
        const slot = Number(key);
        if (!Number.isInteger(slot) || slot < 0 || slot >= MODX_ORGANIZED_SLOT_COUNT) {
          continue;
        }
        if (value && typeof value === "object") entries[slot] = decodeRef(value);
      }
    }
    return { entries };
  });

  const settingsJson = source.settings && typeof source.settings === "object"
    ? source.settings
    : {};
  const labels = Array.isArray(settingsJson.labels) ? settingsJson.labels : [];

  return normalizeModxPicker({
    banks,
    selectedBankKey: String(source.selectedBank || ""),
    selectedPage: source.selectedPage,
    groups,
    settings: {
      targetKey: settingsJson.targetKey,
      profileOverride: settingsJson.profile,
      deviceNumber: settingsJson.deviceNumber,
      portIndex: settingsJson.port,
      controlChannel: settingsJson.controlChannel,
      crossBankSwitch: settingsJson.crossBank,
      bankWaitMs: settingsJson.bankWait,
      sendGapMs: settingsJson.sendGap,
      autoReadPageNames: settingsJson.autoRead,
      immediateSend: settingsJson.immediateSend,
      view: settingsJson.view,
      selectedGroup: settingsJson.selectedGroup,
      organizedPage: settingsJson.organizedPage,
      groupLabels: labels
    }
  });
}

export function decodeModx(raw) {
  if (raw == null || raw === "") return normalizeModxPicker(null);
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return decodeModxObject(parsed);
  } catch (_) {
    return normalizeModxPicker(null);
  }
}
