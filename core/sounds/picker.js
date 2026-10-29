// PA700/PA1000 User Keyboard Set browser model.

export const SOUND_GROUP_COUNT = 9;
export const SOUND_SLOT_COUNT = 48;
export const SOUND_PAGE_SIZE = 8;
export const SOUND_PAGE_COUNT = 6;
export const SOUND_GROUP_LABEL_MAX = 8;
export const SOUND_NAME_MAX = 28;

export const SOUND_GROUP_DEFAULT_LABELS = [
  "Piano", "Organ", "Guitar", "String", "Brass", "Trumpet", "Sax", "Synth", "Ethnic"
];

export const KEYBOARD_SET_BANKS = {
  FACTORY: 16,
  USER: 17,
  DIRECT: 18,
  LOCAL: 19
};

export function isKorgPaLike(device) {
  const text = [
    device?.manufacturer,
    device?.base,
    ...(device?.names || []),
    device?.displayName
  ].filter(Boolean).join(" ").toUpperCase();
  return /PA-?700|PA-?1000/.test(text);
}

function emptyGroups() {
  return Array.from({ length: SOUND_GROUP_COUNT }, () =>
    Array.from({ length: SOUND_SLOT_COUNT }, () => null)
  );
}

export function defaultSoundPicker() {
  return {
    version: 2,
    groups: emptyGroups(),
    settings: {
      immediateSend: true,
      targetKey: "",
      groupLabels: Array.from({ length: SOUND_GROUP_COUNT }, () => ""),
      selectedGroup: 0,
      selectedPage: 0
    }
  };
}

function cleanName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim().slice(0, SOUND_NAME_MAX);
  return name || null;
}

export function normalizeSoundPicker(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const sourceGroups = Array.isArray(source.groups) ? source.groups : [];
  const groups = Array.from({ length: SOUND_GROUP_COUNT }, (_, group) => {
    const slots = Array.isArray(sourceGroups[group]) ? sourceGroups[group] : [];
    return Array.from({ length: SOUND_SLOT_COUNT }, (_, slot) => cleanName(slots[slot]));
  });
  const settings = source.settings && typeof source.settings === "object" ? source.settings : {};
  const labels = Array.isArray(settings.groupLabels) ? settings.groupLabels : [];
  return {
    version: 2,
    groups,
    settings: {
      immediateSend: settings.immediateSend !== false,
      targetKey: String(settings.targetKey || "").trim(),
      groupLabels: Array.from({ length: SOUND_GROUP_COUNT }, (_, index) =>
        String(labels[index] || "").trim().slice(0, SOUND_GROUP_LABEL_MAX)
      ),
      selectedGroup: Number.isInteger(settings.selectedGroup)
        ? Math.max(0, Math.min(SOUND_GROUP_COUNT - 1, settings.selectedGroup))
        : 0,
      selectedPage: Number.isInteger(settings.selectedPage)
        ? Math.max(0, Math.min(SOUND_PAGE_COUNT - 1, settings.selectedPage))
        : 0
    }
  };
}

export function nameAt(state, group, slot) {
  return state.groups[group]?.[slot] || null;
}

export function usedCount(state, group) {
  return state.groups[group]?.filter(Boolean).length || 0;
}

export function totalUsed(state) {
  return state.groups.reduce((sum, slots) => sum + slots.filter(Boolean).length, 0);
}

export function defaultGroupLabel(group) {
  return SOUND_GROUP_DEFAULT_LABELS[group] || "Group";
}

export function groupLabel(state, group) {
  return state.settings.groupLabels[group]?.trim() || defaultGroupLabel(group);
}

export function withGroupNames(state, group, names) {
  if (group < 0 || group >= SOUND_GROUP_COUNT) return state;
  const groups = state.groups.map((slots, index) =>
    index === group
      ? Array.from({ length: SOUND_SLOT_COUNT }, (_, slot) => cleanName(names[slot]))
      : slots
  );
  return { ...state, groups };
}

export function withAllNamesCleared(state) {
  return { ...state, groups: emptyGroups() };
}

export function withSelected(state, group, page) {
  return {
    ...state,
    settings: {
      ...state.settings,
      selectedGroup: Math.max(0, Math.min(SOUND_GROUP_COUNT - 1, group)),
      selectedPage: Math.max(0, Math.min(SOUND_PAGE_COUNT - 1, page))
    }
  };
}

export function withImmediateSend(state, enabled) {
  return { ...state, settings: { ...state.settings, immediateSend: !!enabled } };
}

export function withTargetKey(state, key) {
  return { ...state, settings: { ...state.settings, targetKey: String(key || "").trim() } };
}

export function withGroupLabel(state, group, label) {
  if (group < 0 || group >= SOUND_GROUP_COUNT) return state;
  const labels = [...state.settings.groupLabels];
  labels[group] = String(label || "").trim().slice(0, SOUND_GROUP_LABEL_MAX);
  return { ...state, settings: { ...state.settings, groupLabels: labels } };
}

/** Resolves the saved target; blank means auto (PA-like first, then first). */
export function resolveSoundTarget(state, devices) {
  const candidates = devices.filter((device) =>
    device.sendable && !device.isSx && device.mode !== "OFF"
  );
  const key = state.settings.targetKey;
  if (key) return candidates.find((device) => device.key === key) || null;
  return candidates.find(isKorgPaLike) || candidates[0] || null;
}

export function soundSlotLink(group, slot, name = "") {
  return {
    name: String(name || "").slice(0, SOUND_NAME_MAX),
    bankMsb: KEYBOARD_SET_BANKS.USER,
    bankLsb: group,
    program: slot
  };
}

export function keyboardSetMessages(channel, link) {
  return [
    [0xb0 | (channel & 0x0f), 0, link.bankMsb & 0x7f],
    [0xb0 | (channel & 0x0f), 32, link.bankLsb & 0x7f],
    [0xc0 | (channel & 0x0f), link.program & 0x7f]
  ];
}
