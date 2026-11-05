// Web MIDI access helpers.

import { buildDeviceGroups } from "./devices.js";

export function supportsMidi() {
  return typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function";
}

export function requestMidiAccess() {
  return navigator.requestMIDIAccess({ sysex: true });
}

export function portSnapshot(port) {
  return {
    id: port.id,
    name: port.name || "",
    manufacturer: port.manufacturer || "",
    state: port.state || "",
    connection: port.connection || "",
    type: port.type || ""
  };
}

export function snapshotInputs(access) {
  if (!access?.inputs) return [];
  return Array.from(access.inputs.values(), portSnapshot);
}

export function snapshotOutputs(access) {
  if (!access?.outputs) return [];
  return Array.from(access.outputs.values(), portSnapshot);
}

export function buildDevicesFromAccess(access, deviceModes = {}) {
  const inputs = access?.inputs ? Array.from(access.inputs.values()) : [];
  const outputs = access?.outputs ? Array.from(access.outputs.values()) : [];
  return buildDeviceGroups(inputs, outputs, deviceModes);
}

export function describeMidiError(error) {
  const name = error?.name || "";
  const message = error?.message || String(error || "");
  if (name === "SecurityError") {
    return "浏览器拒绝了 MIDI 权限。请确认页面是 HTTPS，第一次连接时点「允许」，并允许 SysEx。";
  }
  if (name === "NotAllowedError") {
    return "MIDI 权限被拒绝。请在浏览器/App 的网站设置里允许 MIDI，然后重连。";
  }
  if (name === "NotSupportedError" || !supportsMidi()) {
    return "这个浏览器没有 Web MIDI。iPad 请用 MIDIWeb Browser 打开本页；电脑/安卓请用 Chrome 或 Edge。";
  }
  if (/sysex/i.test(message)) {
    return "浏览器没有开放 SysEx 权限。请在 MIDIWeb Browser 的设置里打开 SysEx，或在 Web MIDI Browser 里勾选 Enable SysEx。";
  }
  return `无法访问 MIDI：${message || name || "未知错误"}`;
}

export function isAppleTouchDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
