// Set-list model and PA700 SongBook NRPN codec.

export const SET_LIST_SLOT_COUNT = 9;
export const SET_LIST_MAX_GROUPS = 50;
export const SET_LIST_NAME_MAX = 24;
export const SONGBOOK_MIN_NUMBER = 1;
export const SONGBOOK_MAX_NUMBER = 9999;
export const SET_LIST_DEFAULT_CONTROL_CHANNEL = 15;

export function newId() {
  try {
    return crypto.randomUUID();
  } catch (_) {
    return `sl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function emptySlots() {
  return Array.from({ length: SET_LIST_SLOT_COUNT }, () => ({ number: null, name: "" }));
}

export function createGroup(name = "组 1", id = newId()) {
  return {
    id,
    name: String(name || "组 1").trim().slice(0, SET_LIST_NAME_MAX) || "组 1",
    slots: emptySlots()
  };
}

export function normalizeSlot(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const number = Number.isInteger(source.number)
    && source.number >= SONGBOOK_MIN_NUMBER
    && source.number <= SONGBOOK_MAX_NUMBER
    ? source.number
    : null;
  return {
    number,
    name: String(source.name || "").trim().slice(0, SET_LIST_NAME_MAX)
  };
}

export function normalizeGroup(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const sourceSlots = Array.isArray(source.slots) ? source.slots : [];
  const slots = Array.from({ length: SET_LIST_SLOT_COUNT }, (_, index) => normalizeSlot(sourceSlots[index]));
  return {
    id: String(source.id || newId()),
    name: String(source.name || "").trim().slice(0, SET_LIST_NAME_MAX) || "未命名组",
    slots
  };
}

export function defaultSetList() {
  return {
    version: 2,
    groups: [createGroup("组 1")],
    currentGroupIndex: 0,
    currentSlot: -1,
    captureSlot: -1,
    capturedNumber: null,
    remoteNumber: null
  };
}

export function normalizeSetList(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const sourceGroups = Array.isArray(source.groups) ? source.groups : [];
  const groups = (sourceGroups.length ? sourceGroups : [createGroup("组 1")])
    .slice(0, SET_LIST_MAX_GROUPS)
    .map(normalizeGroup);
  return {
    version: 2,
    groups,
    currentGroupIndex: Number.isInteger(source.currentGroupIndex)
      ? Math.max(0, Math.min(groups.length - 1, source.currentGroupIndex))
      : 0,
    currentSlot: Number.isInteger(source.currentSlot)
      ? Math.max(-1, Math.min(SET_LIST_SLOT_COUNT - 1, source.currentSlot))
      : -1,
    captureSlot: Number.isInteger(source.captureSlot)
      ? Math.max(-1, Math.min(SET_LIST_SLOT_COUNT - 1, source.captureSlot))
      : -1,
    capturedNumber: Number.isInteger(source.capturedNumber)
      && source.capturedNumber >= SONGBOOK_MIN_NUMBER
      && source.capturedNumber <= SONGBOOK_MAX_NUMBER
      ? source.capturedNumber
      : null,
    remoteNumber: Number.isInteger(source.remoteNumber)
      && source.remoteNumber >= SONGBOOK_MIN_NUMBER
      && source.remoteNumber <= SONGBOOK_MAX_NUMBER
      ? source.remoteNumber
      : null
  };
}

export function currentGroup(state) {
  return state.groups[state.currentGroupIndex] || state.groups[0];
}

export function slotConfigured(slot) {
  return !!slot && Number.isInteger(slot.number)
    && slot.number >= SONGBOOK_MIN_NUMBER
    && slot.number <= SONGBOOK_MAX_NUMBER;
}

export function slotDisplayName(slot) {
  if (slot.name.trim()) return slot.name.trim();
  return slot.number != null ? `SongBook ${slot.number}` : "未设置";
}

export function configuredCount(group) {
  return group.slots.filter(slotConfigured).length;
}

export function indexOfNumber(group, number) {
  return group.slots.findIndex((slot) => slotConfigured(slot) && slot.number === number);
}

export function withSlot(state, groupIndex, slotIndex, number, name) {
  if (groupIndex < 0 || groupIndex >= state.groups.length) return state;
  if (slotIndex < 0 || slotIndex >= SET_LIST_SLOT_COUNT) return state;
  const groups = [...state.groups];
  const slots = [...groups[groupIndex].slots];
  slots[slotIndex] = normalizeSlot({ number, name });
  groups[groupIndex] = { ...groups[groupIndex], slots };
  return {
    ...state,
    groups,
    captureSlot: -1,
    capturedNumber: null
  };
}

export function addGroup(state, name) {
  if (state.groups.length >= SET_LIST_MAX_GROUPS) return state;
  const group = createGroup(
    String(name || "").trim() || `组 ${state.groups.length + 1}`
  );
  return {
    ...state,
    groups: [...state.groups, group],
    currentGroupIndex: state.groups.length,
    currentSlot: -1,
    captureSlot: -1,
    capturedNumber: null
  };
}

export function renameGroup(state, groupIndex, name) {
  const trimmed = String(name || "").trim().slice(0, SET_LIST_NAME_MAX);
  if (!trimmed || groupIndex < 0 || groupIndex >= state.groups.length) return state;
  const groups = [...state.groups];
  groups[groupIndex] = { ...groups[groupIndex], name: trimmed };
  return { ...state, groups };
}

export function deleteGroup(state, groupIndex) {
  if (state.groups.length <= 1 || groupIndex < 0 || groupIndex >= state.groups.length) return state;
  const groups = state.groups.filter((_, index) => index !== groupIndex);
  const nextIndex = state.currentGroupIndex > groupIndex
    ? state.currentGroupIndex - 1
    : Math.min(state.currentGroupIndex, groups.length - 1);
  return {
    ...state,
    groups,
    currentGroupIndex: Math.max(0, nextIndex),
    currentSlot: -1,
    captureSlot: -1,
    capturedNumber: null
  };
}

export function nextConfiguredSlot(slots, from, step) {
  if (!step || !slots.length) return null;
  const size = slots.length;
  let index = from >= 0 && from < size ? from : (step > 0 ? -1 : size);
  for (let i = 0; i < size; i += 1) {
    index = ((index + step) % size + size) % size;
    if (slotConfigured(slots[index])) return index;
  }
  return null;
}

export function songBookMessages(channel, number) {
  const safe = Math.max(SONGBOOK_MIN_NUMBER, Math.min(SONGBOOK_MAX_NUMBER, number));
  return [
    [0xb0 | (channel & 0x0f), 99, 2],
    [0xb0 | (channel & 0x0f), 98, 64],
    [0xb0 | (channel & 0x0f), 6, Math.floor(safe / 100)],
    [0xb0 | (channel & 0x0f), 38, safe % 100]
  ];
}

/** Incremental NRPN 2/64 decoder, ported from SongBookNrpDecoder.kt. */
export class SongBookNrpDecoder {
  constructor() {
    this.reset();
  }

  reset() {
    this.nrpnMsb = -1;
    this.nrpnLsb = -1;
    this.dataMsb = -1;
    this.dataLsb = -1;
  }

  isSongBook() {
    return this.nrpnMsb === 2 && this.nrpnLsb === 64;
  }

  resetData() {
    this.dataMsb = -1;
    this.dataLsb = -1;
  }

  consume(controller, value) {
    const safe = Math.max(0, Math.min(127, Number(value) | 0));
    switch (controller) {
      case 99:
        this.nrpnMsb = safe;
        this.nrpnLsb = -1;
        this.resetData();
        break;
      case 98:
        this.nrpnLsb = safe;
        this.resetData();
        break;
      case 101:
      case 100:
        this.reset();
        return null;
      case 6:
        if (this.isSongBook()) {
          this.dataMsb = safe;
          this.dataLsb = -1;
        }
        break;
      case 38:
        if (this.isSongBook()) this.dataLsb = safe;
        break;
      default:
        return null;
    }
    if (!this.isSongBook() || this.dataMsb < 0 || this.dataLsb < 0) return null;
    const number = this.dataMsb * 100 + this.dataLsb;
    this.resetData();
    return number >= SONGBOOK_MIN_NUMBER && number <= SONGBOOK_MAX_NUMBER ? number : null;
  }
}
