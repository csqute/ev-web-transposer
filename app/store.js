// Global signals and lightweight persistence.

import { effect, signal } from "@preact/signals";
import { THEMES, applyTheme } from "./theme.js";
import { defaultLayout, normalizeLayout } from "./panes.js";
import { defaultMixerChannels, normalizeMixerChannels } from "../core/mixer/model.js";
import { defaultDrums, normalizeDrums } from "../core/drums/model.js";
import { defaultSoundPicker, normalizeSoundPicker } from "../core/sounds/picker.js";
import { defaultSoundChain, normalizeSoundChain } from "../core/sounds/chain.js";
import {
  SONGBOOK_MAX_NUMBER,
  SONGBOOK_MIN_NUMBER,
  currentGroup,
  defaultSetList,
  indexOfNumber,
  normalizeSetList
} from "../core/setlist/model.js";

export {
  license,
  consumeUse,
  hasUses,
  activateLicense,
  licenseSummary
} from "../core/license/store.js";

const SETTINGS_KEY = "evwt.settings.v2";
const DEVICE_MODES_KEY = "evwt.deviceModes.v2";
const TEMPLATES_KEY = "evwt.templates.v2";
const PRESETS_KEY = "evwt.presets.v2";
const MIXER_KEY = "evwt.mixer.v2";
const MIXER_TARGETS_KEY = "evwt.mixerTargets.v2";
const DRUMS_KEY = "evwt.drums.v2";
const SOUND_PICKER_KEY = "evwt.soundPicker.v2";
const SOUND_CHAIN_KEY = "evwt.soundChain.v2";
const SET_LIST_KEY = "evwt.setList.v2";
const CONTROL_CHANNEL_KEY = "evwt.controlChannel.v1";

const DEVICE_MODE_VALUES = new Set([
  "AUTO",
  "UNIVERSAL",
  "RPN",
  "YAMAHA_MODX_M",
  "YAMAHA_MODX",
  "YAMAHA_MONTAGE",
  "LEARNED",
  "ALL",
  "SX_ECHO",
  "MIDI_ECHO",
  "OFF"
]);

export const DEFAULT_SETTINGS = {
  version: 2,
  theme: "DUAL",
  interfaceStyle: "PIANO",
  protocolMode: "AUTO",
  midiChannel: 0,
  keepAfterVoiceChange: true,
  offset: 0,
  step: 1
};

const GLOBAL_PROTOCOLS = new Set([
  "AUTO",
  "UNIVERSAL",
  "RPN",
  "YAMAHA_MODX_M",
  "YAMAHA_MODX",
  "YAMAHA_MONTAGE",
  "LEARNED",
  "ALL"
]);

function normalizeSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  let protocol = String(source.protocolMode || "AUTO").toUpperCase();
  if (!GLOBAL_PROTOCOLS.has(protocol)) protocol = "AUTO";
  return {
    version: 2,
    theme: THEMES[source.theme] ? source.theme : "DUAL",
    interfaceStyle: source.interfaceStyle === "LARGE_BUTTONS" ? "LARGE_BUTTONS" : "PIANO",
    protocolMode: protocol,
    midiChannel: Number.isInteger(source.midiChannel)
      ? Math.max(0, Math.min(15, source.midiChannel))
      : 0,
    keepAfterVoiceChange: source.keepAfterVoiceChange !== false,
    offset: Number.isInteger(source.offset)
      ? Math.max(-12, Math.min(12, source.offset))
      : 0,
    step: Number.isInteger(source.step)
      ? Math.max(1, Math.min(12, source.step))
      : 1
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return normalizeSettings(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return normalizeSettings(null);
  }
}

export const settings = signal(loadSettings());

let settingsTimer = 0;
effect(() => {
  const value = settings.value;
  applyTheme(value.theme);
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
    } catch (_) {}
  }, 150);
});

export function updateSettings(patch) {
  settings.value = normalizeSettings({ ...settings.value, ...patch });
}

export function setTheme(theme) {
  updateSettings({ theme });
}

export function setInterfaceStyle(interfaceStyle) {
  updateSettings({ interfaceStyle });
}

export function setProtocolMode(protocolMode) {
  updateSettings({ protocolMode });
}

export function setMidiChannel(midiChannel) {
  updateSettings({ midiChannel });
}

export function setKeepAfterVoiceChange(keepAfterVoiceChange) {
  updateSettings({ keepAfterVoiceChange });
}

function loadDeviceModes() {
  try {
    const raw = localStorage.getItem(DEVICE_MODES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const output = {};
    for (const [key, mode] of Object.entries(parsed)) {
      if (typeof key === "string" && DEVICE_MODE_VALUES.has(mode)) output[key] = mode;
    }
    return output;
  } catch (_) {
    return {};
  }
}

export const deviceModes = signal(loadDeviceModes());

export function setDeviceMode(key, mode) {
  if (!key || !DEVICE_MODE_VALUES.has(mode)) return;
  const next = { ...deviceModes.value, [key]: mode };
  deviceModes.value = next;
  try {
    localStorage.setItem(DEVICE_MODES_KEY, JSON.stringify(next));
  } catch (_) {}
}

export function normalizeTemplate(raw) {
  if (!raw || typeof raw !== "object") return null;
  const bytes = Array.isArray(raw.bytes)
    ? raw.bytes.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0 && value <= 255)
    : [];
  if (bytes.length < 4 || bytes[0] !== 0xf0 || bytes[bytes.length - 1] !== 0xf7) return null;
  const valueIndex = Number(raw.valueIndex);
  if (!Number.isInteger(valueIndex) || valueIndex < 1 || valueIndex >= bytes.length - 1) return null;
  const base = Number(raw.base);
  if (!Number.isInteger(base) || base < 0 || base > 127) return null;
  const stepPerSemitone = Number(raw.stepPerSemitone ?? raw.step);
  if (!Number.isInteger(stepPerSemitone) || stepPerSemitone === 0 || stepPerSemitone < -12 || stepPerSemitone > 12) return null;
  const checksum = raw.checksum === "ROLAND" ? "ROLAND" : "NONE";
  const modelKey = String(raw.modelKey || "").trim().toUpperCase();
  if (!modelKey) return null;
  return {
    modelKey,
    modelName: String(raw.modelName || modelKey).trim().slice(0, 64),
    bytes,
    valueIndex,
    base,
    stepPerSemitone,
    signed: raw.signed === true,
    checksum
  };
}

function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const output = {};
    for (const [key, value] of Object.entries(parsed)) {
      const template = normalizeTemplate({ ...value, modelKey: value?.modelKey || key });
      if (template) output[template.modelKey] = template;
    }
    return output;
  } catch (_) {
    return {};
  }
}

export const templates = signal(loadTemplates());

export function saveTemplate(template) {
  const normalized = normalizeTemplate(template);
  if (!normalized) return null;
  const next = { ...templates.value, [normalized.modelKey]: normalized };
  templates.value = next;
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
  } catch (_) {}
  return normalized;
}

export function deleteTemplate(modelKey) {
  const key = String(modelKey || "").trim().toUpperCase();
  if (!key) return;
  const next = { ...templates.value };
  delete next[key];
  templates.value = next;
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
  } catch (_) {}
}

function normalizePreset(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim().slice(0, 24);
  if (!name) return null;
  let protocol = String(raw.protocol || "AUTO").toUpperCase();
  if (!GLOBAL_PROTOCOLS.has(protocol)) protocol = "AUTO";
  return {
    id: String(raw.id || `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    name,
    offset: Number.isInteger(raw.offset) ? Math.max(-12, Math.min(12, raw.offset)) : 0,
    step: Number.isInteger(raw.step) ? Math.max(1, Math.min(12, raw.step)) : 1,
    protocol,
    midiChannel: Number.isInteger(raw.midiChannel)
      ? Math.max(0, Math.min(15, raw.midiChannel))
      : 0,
    deviceModel: String(raw.deviceModel || "").slice(0, 64)
  };
}

function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizePreset).filter(Boolean);
  } catch (_) {
    return [];
  }
}

export const presets = signal(loadPresets());

function writePresets(next) {
  presets.value = next;
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
  } catch (_) {}
  return next;
}

export function savePreset(preset) {
  const normalized = normalizePreset(preset);
  if (!normalized) return null;
  writePresets([...presets.value, normalized]);
  return normalized;
}

export function updatePreset(id, patch) {
  const next = presets.value.map((preset) => {
    if (preset.id !== id) return preset;
    return normalizePreset({ ...preset, ...patch, id });
  }).filter(Boolean);
  writePresets(next);
}

export function deletePreset(id) {
  writePresets(presets.value.filter((preset) => preset.id !== id));
}

function loadMixerChannels() {
  try {
    const raw = localStorage.getItem(MIXER_KEY);
    return normalizeMixerChannels(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return defaultMixerChannels();
  }
}

export const mixerChannels = signal(loadMixerChannels());

export function saveMixerChannels(next) {
  const normalized = normalizeMixerChannels(next);
  mixerChannels.value = normalized;
  try {
    localStorage.setItem(MIXER_KEY, JSON.stringify(normalized));
  } catch (_) {}
  return normalized;
}

export function updateMixerChannel(id, patch) {
  const current = mixerChannels.value[id];
  if (!current) return mixerChannels.value;
  const next = {
    ...mixerChannels.value,
    [id]: { ...current, ...patch }
  };
  return saveMixerChannels(next);
}

/** Live fader movement: update the UI without a localStorage write per pixel. */
export function previewMixerChannel(id, patch) {
  const current = mixerChannels.value[id];
  if (!current) return mixerChannels.value;
  mixerChannels.value = {
    ...mixerChannels.value,
    [id]: { ...current, ...patch }
  };
  return mixerChannels.value;
}

function normalizeMixerTargets(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const midiKeys = Array.isArray(source.midiKeys)
    ? source.midiKeys.filter((key) => typeof key === "string")
    : [];
  const sxKeys = Array.isArray(source.sxKeys)
    ? source.sxKeys.filter((key) => typeof key === "string")
    : [];
  return {
    target: source.target === "SX" ? "SX" : "MIDI",
    midiAll: source.midiAll !== false,
    sxAll: source.sxAll !== false,
    midiKeys,
    sxKeys
  };
}

function loadMixerTargets() {
  try {
    const raw = localStorage.getItem(MIXER_TARGETS_KEY);
    return normalizeMixerTargets(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return normalizeMixerTargets(null);
  }
}

export const mixerTargets = signal(loadMixerTargets());

export function saveMixerTargets(next) {
  const normalized = normalizeMixerTargets(next);
  mixerTargets.value = normalized;
  try {
    localStorage.setItem(MIXER_TARGETS_KEY, JSON.stringify(normalized));
  } catch (_) {}
  return normalized;
}

function loadDrums() {
  try {
    const raw = localStorage.getItem(DRUMS_KEY);
    return normalizeDrums(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return defaultDrums();
  }
}

export const drums = signal(loadDrums());

export function saveDrums(next) {
  const normalized = normalizeDrums(next);
  drums.value = normalized;
  try {
    localStorage.setItem(DRUMS_KEY, JSON.stringify(normalized));
  } catch (_) {}
  return normalized;
}

export function updateDrums(patch) {
  return saveDrums({ ...drums.value, ...patch });
}

/** Live loop painting and BPM dragging: no disk write until release. */
export function previewDrums(next) {
  drums.value = normalizeDrums(next);
  return drums.value;
}

// Transient drum page state; never persisted.
export const drumLoopMode = signal(false);
export const drumPlaying = signal(false);
export const drumPlayhead = signal(-1);

function loadSoundPicker() {
  try {
    const raw = localStorage.getItem(SOUND_PICKER_KEY);
    return normalizeSoundPicker(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return defaultSoundPicker();
  }
}

export const soundPicker = signal(loadSoundPicker());

export function saveSoundPicker(next) {
  const normalized = normalizeSoundPicker(next);
  soundPicker.value = normalized;
  try {
    localStorage.setItem(SOUND_PICKER_KEY, JSON.stringify(normalized));
  } catch (_) {}
  return normalized;
}

export function updateSoundPicker(patch) {
  return saveSoundPicker({ ...soundPicker.value, ...patch });
}

function loadSoundChain() {
  try {
    const raw = localStorage.getItem(SOUND_CHAIN_KEY);
    return normalizeSoundChain(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return defaultSoundChain();
  }
}

export const soundChain = signal(loadSoundChain());

export function saveSoundChain(next) {
  const normalized = normalizeSoundChain(next);
  soundChain.value = normalized;
  try {
    localStorage.setItem(SOUND_CHAIN_KEY, JSON.stringify(normalized));
  } catch (_) {}
  return normalized;
}

export function updateSoundChain(patch) {
  return saveSoundChain({ ...soundChain.value, ...patch });
}

function loadSetList() {
  try {
    const raw = localStorage.getItem(SET_LIST_KEY);
    return normalizeSetList(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return defaultSetList();
  }
}

export const setList = signal(loadSetList());

function durableSetList(state) {
  return {
    version: 2,
    groups: state.groups,
    currentGroupIndex: state.currentGroupIndex,
    currentSlot: state.currentSlot
  };
}

export function saveSetList(next) {
  const normalized = normalizeSetList(next);
  setList.value = normalized;
  try {
    localStorage.setItem(SET_LIST_KEY, JSON.stringify(durableSetList(normalized)));
  } catch (_) {}
  return normalized;
}

export function beginSetListCapture(groupIndex, slotIndex) {
  const current = setList.value;
  const groups = current.groups;
  if (groupIndex < 0 || groupIndex >= groups.length) return;
  if (slotIndex < 0 || slotIndex >= 9) return;
  saveSetList({
    ...current,
    currentGroupIndex: groupIndex,
    captureSlot: slotIndex,
    capturedNumber: null
  });
  setStatusLine(
    `歌单：请在 PA700 上选择第 ${slotIndex + 1} 格的歌曲（Control CH ${controlChannel.value + 1}）`
  );
}

export function cancelSetListCapture() {
  const current = setList.value;
  if (current.captureSlot < 0 && current.capturedNumber == null) return;
  saveSetList({ ...current, captureSlot: -1, capturedNumber: null });
}

export function clearCapturedSetListNumber() {
  const current = setList.value;
  if (current.capturedNumber == null) return;
  saveSetList({ ...current, capturedNumber: null });
}

/**
 * Handles a SongBook NRPN selected on the instrument. During capture the
 * number is written into the waiting slot; otherwise the matching slot (or
 * group) is focused. Mirrors MainViewModel.handleSongBookControl().
 */
export function handleSetListNumber(entry) {
  if (!Number.isInteger(entry) || entry < SONGBOOK_MIN_NUMBER || entry > SONGBOOK_MAX_NUMBER) return;
  const current = setList.value;
  const captureSlot = current.captureSlot;
  if (captureSlot >= 0) {
    const group = currentGroup(current);
    const groupIndex = current.currentGroupIndex;
    const groups = [...current.groups];
    const slots = [...group.slots];
    slots[captureSlot] = { ...slots[captureSlot], number: entry };
    groups[groupIndex] = { ...group, slots };
    saveSetList({
      ...current,
      groups,
      currentSlot: captureSlot,
      captureSlot: -1,
      capturedNumber: entry,
      remoteNumber: entry
    });
    setStatusLine(`歌单：已抓取 SongBook #${entry} → 第 ${captureSlot + 1} 格`);
    addLog(`歌单：已抓取 SongBook #${entry}`, "ok");
    return;
  }
  const group = currentGroup(current);
  const slot = indexOfNumber(group, entry);
  if (slot >= 0) {
    saveSetList({ ...current, currentSlot: slot, remoteNumber: entry });
    setStatusLine(`歌单：琴上选择 SongBook #${entry}（${group.name} 第 ${slot + 1} 格）`);
    return;
  }
  const otherIndex = current.groups.findIndex((candidate) =>
    candidate.id !== group.id && indexOfNumber(candidate, entry) >= 0
  );
  if (otherIndex >= 0) {
    const otherGroup = current.groups[otherIndex];
    const otherSlot = indexOfNumber(otherGroup, entry);
    saveSetList({
      ...current,
      currentGroupIndex: otherIndex,
      currentSlot: otherSlot,
      remoteNumber: entry,
      captureSlot: -1,
      capturedNumber: null
    });
    setStatusLine(`歌单：琴上选择 SongBook #${entry}，已切到「${otherGroup.name}」第 ${otherSlot + 1} 格`);
    return;
  }
  saveSetList({ ...current, currentSlot: -1, remoteNumber: entry });
  setStatusLine(`歌单：琴上选择 SongBook #${entry}（不在当前歌单里）`);
}

function loadControlChannel() {
  try {
    const raw = localStorage.getItem(CONTROL_CHANNEL_KEY);
    if (raw === null || raw === "") return 15;
    const value = Number(raw);
    return Number.isInteger(value) ? Math.max(0, Math.min(15, value)) : 15;
  } catch (_) {
    return 15;
  }
}

export const controlChannel = signal(loadControlChannel());

export function setControlChannel(channel) {
  const value = Math.max(0, Math.min(15, Number(channel) || 0));
  controlChannel.value = value;
  try {
    localStorage.setItem(CONTROL_CHANNEL_KEY, String(value));
  } catch (_) {}
  return value;
}

/** Short-lived status line shown under tool pages. */
export const statusLine = signal("");

export function setStatusLine(text) {
  statusLine.value = String(text || "");
}

// Screen routing for the single-pane layout. Multi-pane uses layout state.
export const route = signal("transpose");

const LAYOUT_KEY = "evwt.layout.v1";

function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return defaultLayout();
    return normalizeLayout(JSON.parse(raw));
  } catch (_) {
    return defaultLayout();
  }
}

/** 1–4 pane workspace layout (wide iPad only). Persisted across sessions. */
export const layout = signal(loadLayout());

export function saveLayout(next) {
  const normalized = normalizeLayout(next);
  layout.value = normalized;
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(normalized));
  } catch (_) {}
  return normalized;
}

// Transient UI state: dialogs, toast, focus mode.
export const ui = signal({
  dialog: null,
  dialogPayload: null,
  toast: null,
  success: null,
  focusMode: false
});

export function openDialog(name, payload = null) {
  ui.value = { ...ui.value, dialog: name, dialogPayload: payload };
}

export function closeDialog() {
  ui.value = { ...ui.value, dialog: null, dialogPayload: null };
}

let toastTimer = 0;
let toastSeq = 0;

export function showToast(message, duration = 2200) {
  const id = ++toastSeq;
  ui.value = { ...ui.value, toast: { id, message } };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (ui.value.toast && ui.value.toast.id === id) {
      ui.value = { ...ui.value, toast: null };
    }
  }, duration);
}

export function setFocusMode(focusMode) {
  ui.value = { ...ui.value, focusMode: !!focusMode };
}

export function showSuccess(message, unlimited = false) {
  ui.value = { ...ui.value, success: { message, unlimited } };
}

export function closeSuccess() {
  ui.value = { ...ui.value, success: null };
}

// MIDI connection state.
export const midi = signal({
  supported: typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function",
  status: "idle",
  error: "",
  sysexEnabled: false,
  devices: [],
  ignoredPorts: []
});

// Monotonic event log, newest first, 80 entries.
export const logLines = signal([]);

export function addLog(text, kind = "info") {
  const time = new Date().toTimeString().slice(0, 8);
  logLines.value = [{ time, text: String(text), kind }, ...logLines.value].slice(0, 80);
}

export function clearLog() {
  logLines.value = [];
}
