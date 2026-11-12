// Yamaha MODX / MONTAGE Live Set model, ported from model/Modx.kt.

export const MODX_GROUP_COUNT = 9;
export const MODX_ORGANIZED_SLOT_COUNT = 48;
export const MODX_ORGANIZED_PAGE_SIZE = 8;
export const MODX_ORGANIZED_PAGE_COUNT = 6;
export const MODX_LIVE_PAGE_COUNT = 16;
export const MODX_LIVE_SLOTS_PER_PAGE = 16;
export const MODX_LIVE_SLOT_COUNT = 256;
export const MODX_GROUP_LABEL_MAX = 8;
export const MODX_NAME_MAX = 28;
export const MODX_BANK_NAME_MAX = 20;
export const MODX_PAGE_NAME_MAX = 20;
export const MODX_MAX_BANKS = 64;

/** Stable key of the always-available Live Set grid used without reading. */
export const MODX_MANUAL_BANK_KEY = "MODX_MANUAL";

export const MODX_DEFAULT_GROUP_LABELS = [
  "Piano", "Organ", "Guitar", "String", "Brass", "Trumpet", "Sax", "Synth", "Ethnic"
];

/**
 * Model ID and address width changed with MODX M OS 3.00.
 * Original MONTAGE uses model ID 0x02 and the same 3-byte Live Set layout.
 */
export const MODX_PROFILE_LIST = [
  { name: "MODX", label: "MODX / MODX+", modelId: 0x07, addressBytes: 3 },
  { name: "MONTAGE", label: "MONTAGE（原版）", modelId: 0x02, addressBytes: 3 },
  { name: "MODX_M_OS3", label: "MODX M（OS 3.00+）", modelId: 0x0d, addressBytes: 4 },
  { name: "MONTAGE_M", label: "MONTAGE M", modelId: 0x0d, addressBytes: 4 },
  { name: "MODX_M_OLD", label: "MODX M（OS 3.00 以前）", modelId: 0x06, addressBytes: 3 }
];

export const MODX_PROFILES = Object.fromEntries(
  MODX_PROFILE_LIST.map((profile) => [profile.name, profile])
);

export function modxProfile(name) {
  return MODX_PROFILES[String(name || "")] || null;
}

export function profileIsMSeries(profile) {
  return !!profile && (profile.name === "MODX_M_OS3" || profile.name === "MONTAGE_M");
}

export function profileSupportsCapture(profile) {
  return !!profile && (
    profile.name === "MODX"
    || profile.name === "MONTAGE"
    || profileIsMSeries(profile)
  );
}

export function profileSupportsPerformanceNames(profile) {
  return profileIsMSeries(profile);
}

export function profileUsesOriginalLiveSetLayout(profile) {
  return !!profile && (profile.name === "MODX" || profile.name === "MONTAGE");
}

export function profileSupportsBankSwitch(profile) {
  return !!profile && (profileIsMSeries(profile) || profile.name === "MODX_M_OLD");
}

/** Can a sound captured under [profile] be selected on [other]? */
export function profileWireCompatible(profile, other) {
  if (!profile || !other) return false;
  if (profileIsMSeries(profile) || profileIsMSeries(other)) {
    return profileIsMSeries(profile) === profileIsMSeries(other);
  }
  return profile.addressBytes === other.addressBytes;
}

/** Detects the protocol profile from a Web MIDI device group. */
export function detectModxProfile(device) {
  if (!device) return null;
  const text = [
    device.manufacturer,
    device.base,
    ...(Array.isArray(device.names) ? device.names : []),
    device.modelText,
    device.displayName
  ].filter(Boolean).join(" ").toUpperCase();
  // Word boundaries matter: the Web MIDI group repeats the base name, so
  // "MODX MODX Port1" must not be mistaken for "MODX M".
  if (/\bMONTAGE\s+M\b/.test(text)) return MODX_PROFILES.MONTAGE_M;
  if (/\bMODX\s+M\b/.test(text)) return MODX_PROFILES.MODX_M_OS3;
  if (text.includes("MONTAGE")) return MODX_PROFILES.MONTAGE;
  if (text.includes("MODX")) return MODX_PROFILES.MODX;
  return null;
}

export function isYamahaSynthLike(device) {
  if (!device) return false;
  const text = [
    device.manufacturer,
    device.base,
    device.modelText,
    device.displayName
  ].filter(Boolean).join(" ").toUpperCase();
  return text.includes("MODX") || text.includes("MONTAGE");
}

export const MODX_BANK_KINDS = {
  CURRENT: { name: "CURRENT", label: "当前 Live Set" },
  EDIT: { name: "EDIT", label: "当前库（Edit Buffer）" },
  USER: { name: "USER", label: "User" },
  LIBRARY: { name: "LIBRARY", label: "Library" },
  MANUAL: { name: "MANUAL", label: "手选网格" }
};

export function modxBankKind(name) {
  return MODX_BANK_KINDS[String(name || "")] || null;
}

export const MODX_VIEWS = ["LIVE_SET", "ORGANIZED"];

function int(value, fallback = 0) {
  return Number.isInteger(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function text(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

// ---- Live Set slot ---------------------------------------------------------

export function emptySlot(page = 0, slot = 0, slotName = "") {
  return {
    page,
    slot,
    slotName,
    performanceName: "",
    customName: "",
    color: 0,
    bankMsb: 0,
    bankLsb: 0,
    performanceNumber: 0,
    volume: 100,
    switchOn: false,
    slotType: 0,
    contentNumber: 0,
    sssTime: 0
  };
}

export function normalizeSlot(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    page: clamp(int(source.page), 0, MODX_LIVE_PAGE_COUNT - 1),
    slot: clamp(int(source.slot), 0, MODX_LIVE_SLOTS_PER_PAGE - 1),
    slotName: text(source.slotName, MODX_BANK_NAME_MAX),
    performanceName: text(source.performanceName, MODX_BANK_NAME_MAX),
    customName: text(source.customName, MODX_NAME_MAX),
    color: clamp(int(source.color), 0, 15),
    bankMsb: clamp(int(source.bankMsb), 0, 127),
    bankLsb: clamp(int(source.bankLsb), 0, 127),
    performanceNumber: clamp(int(source.performanceNumber), 0, 127),
    volume: clamp(int(source.volume, 100), 0, 127),
    switchOn: source.switchOn === true,
    slotType: clamp(int(source.slotType), 0, 15),
    contentNumber: clamp(int(source.contentNumber), 0, 127),
    sssTime: clamp(int(source.sssTime), 0, 127)
  };
}

export function slotIsEmpty(slot) {
  return !slot || !slot.switchOn;
}

export function slotBaseName(slot) {
  if (!slot) return "";
  return (slot.performanceName || "").trim() || (slot.slotName || "").trim();
}

export function slotDefaultName(slot) {
  return `${int(slot?.page) + 1}-${int(slot?.slot) + 1}`;
}

export function slotDisplayName(slot) {
  if (!slot) return "";
  return (slot.customName || "").trim()
    || slotBaseName(slot)
    || slotDefaultName(slot);
}

export function slotGridLabel(slot) {
  return slotIsEmpty(slot) ? "空" : slotDisplayName(slot);
}

export function slotNameSourceLabel(slot) {
  if (!slot) return "序号";
  if ((slot.performanceName || "").trim()) return "音色";
  if ((slot.slotName || "").trim()) return "槽名";
  return "序号";
}

export function slotTypeLabel(slot) {
  switch (int(slot?.slotType)) {
    case 0: return "Performance";
    case 1: return "Song";
    case 2: return "Audio";
    case 3: return "Pattern";
    default: return `类型 ${int(slot?.slotType)}`;
  }
}

// ---- Live Set bank ---------------------------------------------------------

export function emptyBankSlots() {
  return Array.from({ length: MODX_LIVE_SLOT_COUNT }, (_, index) =>
    emptySlot(Math.floor(index / MODX_LIVE_SLOTS_PER_PAGE), index % MODX_LIVE_SLOTS_PER_PAGE)
  );
}

export function bankKey(bank) {
  if (!bank) return "";
  if (bank.kind === "MANUAL") return MODX_MANUAL_BANK_KEY;
  return `${bank.profile || "MODX"}:${bank.kind || "CURRENT"}:${clamp(int(bank.bankIndex), 0, 7)}`;
}

export function isManualBank(bank) {
  return bank?.kind === "MANUAL";
}

export function normalizeBank(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const profile = modxProfile(source.profile)?.name || "MODX";
  const kind = modxBankKind(source.kind)?.name || "CURRENT";
  const bank = {
    profile,
    kind,
    bankIndex: clamp(int(source.bankIndex), 0, 7),
    bankName: text(source.bankName, MODX_BANK_NAME_MAX),
    pageNames: Array.from({ length: MODX_LIVE_PAGE_COUNT }, (_, index) =>
      text(Array.isArray(source.pageNames) ? source.pageNames[index] : "", MODX_PAGE_NAME_MAX)
    ),
    slots: emptyBankSlots(),
    capturedAt: Number.isFinite(Number(source.capturedAt)) ? Number(source.capturedAt) : 0,
    partial: source.partial === true
  };
  if (bank.kind === "MANUAL") {
    for (const slot of bank.slots) slot.switchOn = true;
  }
  const byPosition = new Map();
  for (const item of Array.isArray(source.slots) ? source.slots : []) {
    const safe = normalizeSlot(item);
    byPosition.set(safe.page * MODX_LIVE_SLOTS_PER_PAGE + safe.slot, safe);
  }
  for (let index = 0; index < MODX_LIVE_SLOT_COUNT; index += 1) {
    const item = byPosition.get(index);
    if (!item) continue;
    if (bank.kind === "MANUAL") item.switchOn = true;
    bank.slots[index] = item;
  }
  return bank;
}

export function manualBank(profile = "MODX") {
  return normalizeBank({
    profile,
    kind: "MANUAL",
    bankName: "默认网格",
    slots: Array.from({ length: MODX_LIVE_SLOT_COUNT }, (_, index) => ({
      ...emptySlot(
        Math.floor(index / MODX_LIVE_SLOTS_PER_PAGE),
        index % MODX_LIVE_SLOTS_PER_PAGE
      ),
      switchOn: true
    }))
  });
}

export function bankSlot(bank, page, slot) {
  if (!bank) return null;
  if (!Number.isInteger(page) || !Number.isInteger(slot)) return null;
  if (page < 0 || page >= MODX_LIVE_PAGE_COUNT) return null;
  if (slot < 0 || slot >= MODX_LIVE_SLOTS_PER_PAGE) return null;
  return bank.slots[page * MODX_LIVE_SLOTS_PER_PAGE + slot] || null;
}

export function bankPageName(bank, page) {
  const name = (bank?.pageNames?.[page] || "").trim();
  return name || `Page ${int(page) + 1}`;
}

export function bankNonEmptyCount(bank) {
  return bank?.slots?.filter((slot) => slot.switchOn).length || 0;
}

export function bankWithBankName(bank, name) {
  return { ...bank, bankName: text(name, MODX_BANK_NAME_MAX) };
}

export function bankWithPageName(bank, page, name) {
  if (!Number.isInteger(page) || page < 0 || page >= MODX_LIVE_PAGE_COUNT) return bank;
  const pageNames = [...(bank.pageNames || [])];
  pageNames[page] = text(name, MODX_PAGE_NAME_MAX);
  return { ...bank, pageNames };
}

export function bankWithSlot(bank, page, slot, item) {
  if (!bank) return bank;
  if (!Number.isInteger(page) || page < 0 || page >= MODX_LIVE_PAGE_COUNT) return bank;
  if (!Number.isInteger(slot) || slot < 0 || slot >= MODX_LIVE_SLOTS_PER_PAGE) return bank;
  const slots = [...bank.slots];
  slots[page * MODX_LIVE_SLOTS_PER_PAGE + slot] = normalizeSlot({
    ...item,
    page,
    slot
  });
  return { ...bank, slots };
}

export function bankWithPerformanceName(bank, page, slot, name) {
  const current = bankSlot(bank, page, slot);
  if (!current) return bank;
  return bankWithSlot(bank, page, slot, { ...current, performanceName: name });
}

export function bankWithCustomName(bank, page, slot, name) {
  const current = bankSlot(bank, page, slot);
  if (!current) return bank;
  return bankWithSlot(bank, page, slot, { ...current, customName: name });
}

/**
 * Re-capturing the same bank keeps user display names and Performance names
 * already read for the same underlying sound.
 */
export function bankMergedWith(bank, previous) {
  const fresh = normalizeBank(bank);
  if (!previous) return fresh;
  const old = normalizeBank(previous);
  return normalizeBank({
    ...fresh,
    bankName: fresh.bankName || old.bankName,
    pageNames: Array.from({ length: MODX_LIVE_PAGE_COUNT }, (_, index) =>
      fresh.pageNames[index] || old.pageNames[index] || ""
    ),
    slots: Array.from({ length: MODX_LIVE_SLOT_COUNT }, (_, index) => {
      const item = fresh.slots[index];
      const before = old.slots[index];
      if (!before) return item;
      const samePerformance =
        before.bankMsb === item.bankMsb
        && before.bankLsb === item.bankLsb
        && before.performanceNumber === item.performanceNumber;
      return {
        ...item,
        customName: before.customName.trim() ? before.customName : item.customName,
        performanceName: item.performanceName || (samePerformance ? before.performanceName : "")
      };
    })
  });
}

export function bankKindLabel(kind, bankIndex = 0) {
  switch (kind) {
    case "CURRENT": return "当前 Live Set";
    case "EDIT": return "当前库";
    case "USER": return `User ${int(bankIndex) + 1}`;
    case "LIBRARY": return `Library ${int(bankIndex) + 1}`;
    case "MANUAL": return "手选网格";
    default: return "当前 Live Set";
  }
}

export function bankLabel(bank) {
  if (!bank) return "";
  return bankKindLabel(bank.kind, bank.bankIndex);
}

// ---- Sound reference -------------------------------------------------------

export function soundRefFromSlot(bank, item, displayName = null) {
  return normalizeRef({
    profile: bank?.profile || "MODX",
    kind: bank?.kind || "CURRENT",
    bankIndex: bank?.bankIndex || 0,
    bankName: bank?.bankName || "",
    page: item?.page || 0,
    slot: item?.slot || 0,
    slotName: item?.slotName || "",
    performanceName: item?.performanceName || "",
    displayName: displayName == null ? slotDisplayName(item) : displayName,
    bankMsb: item?.bankMsb || 0,
    bankLsb: item?.bankLsb || 0,
    performanceNumber: item?.performanceNumber || 0
  });
}

export function normalizeRef(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  // Android backups encode references as index / perfName / name / msb /
  // lsb / pc; the web's own store uses the longer names. Accept both.
  const pick = (web, android, fallback) =>
    source[web] !== undefined ? source[web] : source[android] ?? fallback;
  return {
    profile: modxProfile(source.profile)?.name || "MODX",
    kind: modxBankKind(source.kind)?.name || "CURRENT",
    bankIndex: clamp(int(pick("bankIndex", "index")), 0, 7),
    bankName: text(source.bankName, MODX_BANK_NAME_MAX),
    page: clamp(int(source.page), 0, MODX_LIVE_PAGE_COUNT - 1),
    slot: clamp(int(source.slot), 0, MODX_LIVE_SLOTS_PER_PAGE - 1),
    slotName: text(source.slotName, MODX_BANK_NAME_MAX),
    performanceName: text(pick("performanceName", "perfName"), MODX_BANK_NAME_MAX),
    displayName: text(pick("displayName", "name"), MODX_NAME_MAX),
    bankMsb: clamp(int(pick("bankMsb", "msb")), 0, 127),
    bankLsb: clamp(int(pick("bankLsb", "lsb")), 0, 127),
    performanceNumber: clamp(int(pick("performanceNumber", "pc")), 0, 127)
  };
}

export function refBankKey(ref) {
  if (!ref) return "";
  if (ref.kind === "MANUAL") return MODX_MANUAL_BANK_KEY;
  return `${ref.profile || "MODX"}:${ref.kind || "CURRENT"}:${clamp(int(ref.bankIndex), 0, 7)}`;
}

export function refKey(ref) {
  return `${refBankKey(ref)}:${int(ref?.page)}:${int(ref?.slot)}`;
}

export function refEffectiveName(ref) {
  if (!ref) return "";
  return (ref.displayName || "").trim()
    || (ref.performanceName || "").trim()
    || (ref.slotName || "").trim()
    || (ref.kind === "MANUAL" ? `${int(ref.page) + 1}-${int(ref.slot) + 1}` : "MODX 音色");
}

export function refBankLabel(ref) {
  return bankKindLabel(ref?.kind, ref?.bankIndex);
}

export function refDetail(ref) {
  if (!ref) return "";
  const bank = (ref.bankName || "").trim() || refBankLabel(ref);
  return `${bank} · 页 ${int(ref.page) + 1} · 槽 ${int(ref.slot) + 1}`;
}

export function refShortPosition(ref) {
  return `P${int(ref?.page) + 1}-${int(ref?.slot) + 1}`;
}

// ---- Organized 9×48 grid ---------------------------------------------------

export function emptyOrganizedGroup() {
  return { entries: Array.from({ length: MODX_ORGANIZED_SLOT_COUNT }, () => null) };
}

export function normalizeOrganizedGroup(raw) {
  const entries = Array.isArray(raw?.entries) ? raw.entries : [];
  return {
    entries: Array.from({ length: MODX_ORGANIZED_SLOT_COUNT }, (_, index) =>
      entries[index] ? normalizeRef(entries[index]) : null
    )
  };
}

export function groupEntry(group, slot) {
  return group?.entries?.[slot] || null;
}

export function groupUsedCount(group) {
  return group?.entries?.filter(Boolean).length || 0;
}

export function groupWithEntry(group, slot, ref) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= MODX_ORGANIZED_SLOT_COUNT) {
    return group || emptyOrganizedGroup();
  }
  const entries = [...(group?.entries || emptyOrganizedGroup().entries)];
  entries[slot] = ref ? normalizeRef(ref) : null;
  return { entries };
}

export function groupWithDisplayName(group, slot, name) {
  const ref = groupEntry(group, slot);
  if (!ref) return group;
  return groupWithEntry(group, slot, { ...ref, displayName: name });
}

// ---- Settings / picker state ----------------------------------------------

export function defaultModxSettings() {
  return {
    targetKey: "",
    profileOverride: "",
    deviceNumber: 1,
    portIndex: 0,
    controlChannel: 0,
    crossBankSwitch: true,
    bankWaitMs: 800,
    sendGapMs: 10,
    autoReadPageNames: true,
    immediateSend: true,
    view: "LIVE_SET",
    selectedGroup: 0,
    organizedPage: 0,
    groupLabels: Array.from({ length: MODX_GROUP_COUNT }, () => "")
  };
}

export function normalizeModxSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const labels = Array.isArray(source.groupLabels) ? source.groupLabels : [];
  const view = MODX_VIEWS.includes(source.view) ? source.view : "LIVE_SET";
  return {
    targetKey: String(source.targetKey || "").trim(),
    profileOverride: modxProfile(source.profileOverride)?.name || "",
    deviceNumber: clamp(int(source.deviceNumber, 1), 1, 16),
    portIndex: clamp(int(source.portIndex), 0, 3),
    controlChannel: clamp(int(source.controlChannel), 0, 15),
    crossBankSwitch: source.crossBankSwitch !== false,
    bankWaitMs: clamp(int(source.bankWaitMs, 800), 0, 2000),
    sendGapMs: clamp(int(source.sendGapMs, 10), 0, 200),
    autoReadPageNames: source.autoReadPageNames !== false,
    immediateSend: source.immediateSend !== false,
    view,
    selectedGroup: clamp(int(source.selectedGroup), 0, MODX_GROUP_COUNT - 1),
    organizedPage: clamp(int(source.organizedPage), 0, MODX_ORGANIZED_PAGE_COUNT - 1),
    groupLabels: Array.from({ length: MODX_GROUP_COUNT }, (_, index) =>
      text(labels[index], MODX_GROUP_LABEL_MAX)
    )
  };
}

export function modxGroupLabel(settings, index) {
  const label = (settings?.groupLabels?.[index] || "").trim();
  return label || MODX_DEFAULT_GROUP_LABELS[index] || `组 ${index + 1}`;
}

export function defaultModxPicker() {
  return {
    version: 1,
    banks: [],
    selectedBankKey: "",
    selectedPage: 0,
    groups: Array.from({ length: MODX_GROUP_COUNT }, emptyOrganizedGroup),
    settings: defaultModxSettings()
  };
}

export function normalizeModxPicker(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const sourceBanks = Array.isArray(source.banks) ? source.banks : [];
  const bankByKey = new Map();
  for (const bank of sourceBanks) {
    const safe = normalizeBank(bank);
    bankByKey.set(bankKey(safe), safe);
  }
  const banks = [...bankByKey.values()].slice(-MODX_MAX_BANKS);
  const keys = new Set(banks.map(bankKey));
  const selectedBankKey = keys.has(source.selectedBankKey)
    ? source.selectedBankKey
    : (banks[0] ? bankKey(banks[0]) : "");
  const sourceGroups = Array.isArray(source.groups) ? source.groups : [];
  return {
    version: 1,
    banks,
    selectedBankKey,
    selectedPage: clamp(int(source.selectedPage), 0, MODX_LIVE_PAGE_COUNT - 1),
    groups: Array.from({ length: MODX_GROUP_COUNT }, (_, index) =>
      normalizeOrganizedGroup(sourceGroups[index])
    ),
    settings: normalizeModxSettings(source.settings)
  };
}

export function selectedModxBank(state) {
  const banks = state?.banks || [];
  return banks.find((bank) => bankKey(bank) === state?.selectedBankKey)
    || banks.find((bank) => bank.kind === "MANUAL")
    || banks[0]
    || manualBank();
}

export function findModxBank(state, key) {
  return (state?.banks || []).find((bank) => bankKey(bank) === key) || null;
}

export function organizedEntry(state, group, slot) {
  return state?.groups?.[group]?.entries?.[slot] || null;
}

export function organizedUsedCount(state, group) {
  return state?.groups?.[group]?.entries?.filter(Boolean).length || 0;
}

export function organizedTotal(state) {
  return (state?.groups || []).reduce((sum, group) => sum + groupUsedCount(group), 0);
}

export function settingsAreDefault(settings) {
  return JSON.stringify(normalizeModxSettings(settings))
    === JSON.stringify(defaultModxSettings());
}

/** True when a backup would add meaningful MODX data. */
export function hasModxBackupContent(state) {
  return (state?.banks?.length || 0) > 0
    || organizedTotal(state) > 0
    || !settingsAreDefault(state?.settings);
}

export function withModxBank(state, bank) {
  const safe = normalizeBank(bank);
  const key = bankKey(safe);
  const banks = [...state.banks.filter((item) => bankKey(item) !== key), safe];
  const selectedBankKey = (state.banks || []).some((item) => bankKey(item) === state.selectedBankKey)
    ? state.selectedBankKey
    : key;
  return normalizeModxPicker({ ...state, banks, selectedBankKey });
}

export function withModxSelectedBank(state, key) {
  if (!(state.banks || []).some((bank) => bankKey(bank) === key)) return state;
  return normalizeModxPicker({ ...state, selectedBankKey: key, selectedPage: 0 });
}

export function withModxSelectedPage(state, page) {
  return { ...state, selectedPage: clamp(int(page), 0, MODX_LIVE_PAGE_COUNT - 1) };
}

export function withModxSettings(state, settings) {
  return normalizeModxPicker({ ...state, settings: { ...state.settings, ...settings } });
}

export function withModxGroupLabel(state, group, label) {
  if (group < 0 || group >= MODX_GROUP_COUNT) return state;
  const labels = [...state.settings.groupLabels];
  labels[group] = text(label, MODX_GROUP_LABEL_MAX);
  return withModxSettings(state, { groupLabels: labels });
}

export function withModxView(state, view) {
  return withModxSettings(state, { view });
}

export function withModxSelectedGroup(state, group) {
  return withModxSettings(state, {
    selectedGroup: clamp(int(group), 0, MODX_GROUP_COUNT - 1)
  });
}

export function withModxOrganizedPage(state, page) {
  return withModxSettings(state, {
    organizedPage: clamp(int(page), 0, MODX_ORGANIZED_PAGE_COUNT - 1)
  });
}

export function withModxTargetKey(state, key) {
  return withModxSettings(state, { targetKey: key });
}

export function withModxProfileOverride(state, name) {
  return withModxSettings(state, { profileOverride: name });
}

export function withModxGroupEntry(state, group, slot, ref) {
  if (group < 0 || group >= MODX_GROUP_COUNT) return state;
  const groups = [...state.groups];
  groups[group] = groupWithEntry(groups[group] || emptyOrganizedGroup(), slot, ref);
  return normalizeModxPicker({ ...state, groups });
}

export function withModxOrganizedDisplayName(state, group, slot, name) {
  if (group < 0 || group >= MODX_GROUP_COUNT) return state;
  const groups = [...state.groups];
  groups[group] = groupWithDisplayName(groups[group], slot, name);
  return normalizeModxPicker({ ...state, groups });
}

function updateModxBank(state, key, transform) {
  if ((state.banks || []).some((bank) => bankKey(bank) === key)) {
    return normalizeModxPicker({
      ...state,
      banks: state.banks.map((bank) => bankKey(bank) === key ? transform(bank) : bank)
    });
  }
  if (key !== MODX_MANUAL_BANK_KEY) return state;
  return withModxBank(state, transform(manualBank(state.settings?.profileOverride || "MODX")));
}

export function withModxBankName(state, key, name) {
  return updateModxBank(state, key, (bank) => bankWithBankName(bank, name));
}

export function withModxPageName(state, key, page, name) {
  return updateModxBank(state, key, (bank) => bankWithPageName(bank, page, name));
}

export function withModxPerformanceName(state, key, page, slot, name) {
  return normalizeModxPicker({
    ...state,
    banks: state.banks.map((bank) =>
      bankKey(bank) === key ? bankWithPerformanceName(bank, page, slot, name) : bank
    )
  });
}

export function withModxSlotCustomName(state, key, page, slot, name) {
  return updateModxBank(state, key, (bank) => bankWithCustomName(bank, page, slot, name));
}

export function withModxClearedBanks(state) {
  const banks = (state.banks || []).filter((bank) => bank.kind === "MANUAL");
  return normalizeModxPicker({
    ...state,
    banks,
    selectedBankKey: banks[0] ? bankKey(banks[0]) : ""
  });
}

export function withModxClearedOrganized(state) {
  return normalizeModxPicker({
    ...state,
    groups: Array.from({ length: MODX_GROUP_COUNT }, emptyOrganizedGroup)
  });
}

/** Ensures the always-available manual 16×16 grid exists. */
export function ensureModxManualBank(state) {
  if ((state.banks || []).some((bank) => bank.kind === "MANUAL")) return state;
  return withModxBank(state, manualBank(state.settings?.profileOverride || "MODX"));
}

// ---- Target / profile resolution ------------------------------------------

export function resolveModxTarget(state, devices) {
  const candidates = (devices || []).filter((device) =>
    device.sendable && !device.isSx && device.mode !== "OFF"
  );
  const key = state?.settings?.targetKey || "";
  if (key) return candidates.find((device) => device.key === key) || null;
  return candidates.find(isYamahaSynthLike) || null;
}

export function resolveModxProfile(state, target) {
  const override = modxProfile(state?.settings?.profileOverride);
  if (override) return override;
  if (!target) return null;
  return detectModxProfile(target);
}
