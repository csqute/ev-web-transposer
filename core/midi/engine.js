// Web MIDI engine: access, device refresh, transpose sends and test notes.

import {
  addLog,
  hasUses,
  consumeUse,
  deviceModes,
  handleSetListNumber,
  midi,
  settings,
  openDialog,
  templates,
  updateSettings
} from "../../app/store.js";
import {
  buildDevicesFromAccess,
  describeMidiError,
  requestMidiAccess,
  supportsMidi
} from "./access.js";
import { sendableDevices } from "./devices.js";
import { decodeTranspose, encodeTranspose } from "./protocols.js";
import { MidiEventParser } from "./parser.js";
import { EchoEngine } from "./echo.js";
import { captureLearnSysEx, learnState } from "./learn.js";
import { SongBookNrpDecoder } from "../setlist/model.js";

const songBookDecoder = new SongBookNrpDecoder();

let access = null;
let connecting = null;
let lastDeviceSignature = "";
const attachedPorts = new Map();
const lastProgramChangeMs = new Map();
const keepTimers = new Map();

function sendEchoBytes(deviceKey, bytes) {
  const device = midi.value.devices.find((item) => item.key === deviceKey);
  if (!device || !device.sendable) return false;
  sendToDevice(device, [bytes]).catch(() => {});
  return true;
}

const midiEchoEngine = new EchoEngine({
  send: sendEchoBytes,
  log: (message) => addLog(message, "muted")
});

const sxEchoEngine = new EchoEngine({
  send: sendEchoBytes,
  log: (message) => addLog(message, "muted"),
  controlChannels: [0, 1, 2, 3],
  noteOffFallback: true
});

export function hex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

export function isConnected() {
  return midi.value.devices.some((device) => device.sendable || device.echoable);
}

export function connectionText(state = midi.value) {
  if (!state.supported) return "浏览器不支持 Web MIDI";
  if (state.status === "connecting") return "连接中…";
  if (state.status === "error") return "连接失败";
  const devices = state.devices.filter((device) => device.sendable || device.echoable);
  if (devices.length === 1) return `已连接 ${devices[0].displayName}`;
  if (devices.length > 1) return `已连接 ${devices.length} 台`;
  return "未连接 · 接琴 USB";
}

function deviceListText(devices) {
  const real = devices.filter((device) => !device.isVirtual);
  if (!real.length) return "没有可用 MIDI 设备";
  return real.map((device) => `${device.displayName}（发 ${device.outputCount} / 收 ${device.inputCount}）`).join("、");
}

export function refreshDevices(quiet = false) {
  if (!access) return [];
  const devices = buildDevicesFromAccess(access, deviceModes.value);
  midi.value = {
    ...midi.value,
    devices,
    ignoredPorts: devices.filter((device) => device.isVirtual).map((device) => device.displayName)
  };
  const signature = devices.map((device) => `${device.key}:${device.outputName}:${device.inputNames.join(",")}`).join("|");
  if (!quiet && signature !== lastDeviceSignature) {
    lastDeviceSignature = signature;
    addLog(`MIDI 设备：${deviceListText(devices)}`, devices.some((device) => device.sendable) ? "ok" : "muted");
  }
  attachInputs(devices);
  midiEchoEngine.setEnabledDevices(
    devices.filter((device) => device.mode === "MIDI_ECHO" && device.sendable).map((device) => device.key)
  );
  sxEchoEngine.setEnabledDevices(
    devices.filter((device) => device.mode === "SX_ECHO" && device.sendable).map((device) => device.key)
  );
  return devices;
}

function templateForDevice(device) {
  if (!device) return null;
  return templates.value[device.modelKey] || templates.value[device.base] || null;
}

function attachInputs(devices) {
  const current = new Set();
  for (const device of devices) {
    for (const input of device.inputs) {
      const port = input.port;
      if (!port) continue;
      current.add(port);
      if (attachedPorts.has(port)) continue;
      const parser = new MidiEventParser();
      const handler = (event) => {
        if (!event?.data) return;
        const currentDevice = midi.value.devices.find((item) => item.key === device.key) || device;
        for (const parsed of parser.feed(event.data)) {
          handleIncoming(currentDevice, parsed);
        }
      };
      try {
        port.onmidimessage = handler;
      } catch (_) {}
      attachedPorts.set(port, handler);
    }
  }
  for (const [port, handler] of attachedPorts) {
    if (current.has(port)) continue;
    try {
      if (port.onmidimessage === handler) port.onmidimessage = null;
    } catch (_) {}
    attachedPorts.delete(port);
  }
}

/**
 * Re-asserts the App transpose after an App-originated sound change.
 * This is global (all keyboards), like Android's noteSoundChange().
 */
export function scheduleKeepAfterSoundChange(reason = "换音色后保持") {
  if (!settings.value.keepAfterVoiceChange) return;
  const key = "__app_sound_change__";
  const old = keepTimers.get(key) || [];
  for (const timer of old) clearTimeout(timer);
  const timers = [400, 1000, 1800].map((delay) => setTimeout(() => {
    if (!settings.value.keepAfterVoiceChange) return;
    sendTranspose(settings.value.offset, { consume: false, reason }).catch(() => {});
  }, delay));
  keepTimers.set(key, timers);
  addLog(`换音色后保持：${reason} 触发，重发移调 3 次`, "muted");
}

function scheduleKeep(deviceKey, delays, reason) {
  if (!settings.value.keepAfterVoiceChange) return;
  const old = keepTimers.get(deviceKey) || [];
  for (const timer of old) clearTimeout(timer);
  const timers = delays.map((delay) => setTimeout(async () => {
    if (!settings.value.keepAfterVoiceChange) return;
    if (!midi.value.devices.some((device) => device.key === deviceKey)) return;
    await sendTranspose(settings.value.offset, { consume: false, reason });
  }, delay));
  keepTimers.set(deviceKey, timers);
}

function handleIncoming(device, event) {
  if (!device) return;

  if (event.type === "sysex") {
    captureLearnSysEx(device, event.bytes);
    if (learnState.value.active) return;
    if (device.mode === "MIDI_ECHO" || device.mode === "SX_ECHO") return;
    const decoded = decodeTranspose(event.bytes, templateForDevice(device));
    if (decoded === null) return;

    const now = performance.now();
    const lastPc = lastProgramChangeMs.get(device.key) || 0;
    const guard = settings.value.keepAfterVoiceChange && lastPc > 0 && now - lastPc < 2500;
    if (guard) {
      addLog(`${device.displayName} 换音色后报告移调 ${decoded > 0 ? "+" : ""}${decoded}，保持 App 的 ${settings.value.offset}`, "muted");
      scheduleKeep(device.key, [150, 700, 1400], "换音色后保持");
      return;
    }
    if (decoded !== settings.value.offset) {
      updateSettings({ offset: decoded });
      addLog(`琴上移调：${decoded > 0 ? "+" : ""}${decoded}，界面已同步`, "muted");
    }
    return;
  }

  if (event.type === "cc") {
    const entry = songBookDecoder.consume(event.controller, event.value);
    if (entry !== null) handleSetListNumber(entry);
  }

  const echoEngine = device.mode === "MIDI_ECHO"
    ? midiEchoEngine
    : device.mode === "SX_ECHO"
      ? sxEchoEngine
      : null;
  if (echoEngine) {
    echoEngine.handle(device.key, event, settings.value.offset);
    return;
  }

  if (event.type === "pc") {
    lastProgramChangeMs.set(device.key, performance.now());
    addLog(`${device.displayName} 换音色：PC ${event.program + 1}`, "muted");
    scheduleKeep(device.key, [400, 1000, 1800], "换音色后保持");
    return;
  }

  if (event.type === "cc" && (event.controller === 0 || event.controller === 32)) {
    lastProgramChangeMs.set(device.key, performance.now());
    scheduleKeep(device.key, [400, 1000, 1800], "换音色后保持");
    return;
  }
}

function handleStateChange() {
  refreshDevices(false);
}

export async function connectMidi() {
  if (!supportsMidi()) {
    midi.value = {
      ...midi.value,
      supported: false,
      status: "unsupported",
      error: describeMidiError(new Error("requestMIDIAccess missing"))
    };
    addLog("这个浏览器不支持 Web MIDI", "bad");
    return false;
  }
  if (access) {
    refreshDevices(false);
    return true;
  }
  if (connecting) return connecting;

  connecting = (async () => {
    midi.value = { ...midi.value, status: "connecting", error: "" };
    try {
      const nextAccess = await requestMidiAccess();
      access = nextAccess;
      access.onstatechange = handleStateChange;
      const sysexEnabled = nextAccess.sysexEnabled !== false;
      midi.value = {
        ...midi.value,
        status: "connected",
        sysexEnabled,
        error: ""
      };
      addLog(sysexEnabled ? "MIDI 权限已允许（含 SysEx）" : "MIDI 权限已允许，但 SysEx 可能被关闭", sysexEnabled ? "ok" : "warn");
      refreshDevices(false);
      return true;
    } catch (error) {
      access = null;
      const message = describeMidiError(error);
      midi.value = { ...midi.value, status: "error", error: message };
      addLog(message, "bad");
      return false;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

export async function ensureConnected() {
  if (access) return true;
  return connectMidi();
}

async function sendToDevice(device, messages) {
  const port = device?.output?.port;
  if (!port || typeof port.send !== "function") return 0;
  if (port.state === "disconnected") return 0;
  if (typeof port.open === "function" && port.connection !== "open") {
    try {
      await port.open();
    } catch (_) {
      // Some bridges report a closed connection but still accept send().
    }
  }
  let sent = 0;
  for (const message of messages) {
    try {
      port.send(Uint8Array.from(message));
      sent += 1;
    } catch (error) {
      addLog(`发送到 ${device.displayName} 失败：${error?.message || error}`, "bad");
      break;
    }
  }
  return sent;
}

export async function sendCcToDevice(device, channel, controller, value) {
  if (!device) return false;
  const sent = await sendToDevice(device, [[0xb0 | (channel & 0x0f), controller & 0x7f, value & 0x7f]]);
  return sent > 0;
}

export async function sendCcToDevices(devices, channel, controller, value) {
  let sent = 0;
  for (const device of devices) {
    if (await sendCcToDevice(device, channel, controller, value)) sent += 1;
  }
  return sent;
}

export async function sendMessagesToDevice(device, messages) {
  return sendToDevice(device, messages);
}

/** Ordinary MIDI keyboards used by the drum page and sound picker. */
export function midiPerformanceDevices(state = midi.value) {
  return state.devices.filter((device) =>
    device.sendable && !device.isSx && device.mode !== "OFF"
  );
}

/** SX echo sessions used by drum-pad mode and the mixer. */
export function sxPerformanceDevices(state = midi.value) {
  return state.devices.filter((device) =>
    device.sendable && device.isSx && device.mode === "SX_ECHO"
  );
}

/** Tell the echo engine an App-originated note so MIDI Thru cannot double it. */
export function markAppNoteForDevice(deviceKey, channel, note, on) {
  const device = midi.value.devices.find((item) => item.key === deviceKey);
  if (!device) return;
  if (device.mode === "MIDI_ECHO") {
    midiEchoEngine.markAppNote(device.key, channel, note, on);
  } else if (device.mode === "SX_ECHO") {
    sxEchoEngine.markAppNote(device.key, channel, note, on);
  }
}

export async function sendTranspose(offset, options = {}) {
  const { consume = true, reason = "移调" } = options;
  const connected = await ensureConnected();
  if (!connected) return false;

  const devices = sendableDevices(midi.value.devices);
  if (!devices.length) {
    addLog("没有可发送的 MIDI 输出，请检查 USB 连接", "bad");
    return false;
  }

  if (consume && !hasUses(1)) {
    openDialog("paywall");
    return false;
  }

  const results = [];
  for (const device of devices) {
    const mode = device.mode && device.mode !== "AUTO"
      ? device.mode
      : settings.value.protocolMode;
    if (mode === "SX_ECHO" || mode === "MIDI_ECHO") {
      // Echo devices transpose at note level through the input handler.
      // Changing the offset is still one charged operation, matching Android.
      results.push({ device, sent: 1, mode, echo: true });
      addLog(`${reason} ${device.displayName} · ${mode === "SX_ECHO" ? "SX 回环" : "MIDI 回环"}（音符级）`, "ok");
      continue;
    }
    const encoded = encodeTranspose({
      mode,
      offset,
      channel: settings.value.midiChannel,
      modelName: device.modelText,
      template: templateForDevice(device)
    });
    if (!encoded.messages.length) continue;
    const sent = await sendToDevice(device, encoded.messages);
    results.push({ device, sent, mode: encoded.resolvedMode });
    if (sent > 0) {
      const preview = encoded.messages[0];
      const suffix = encoded.messages.length > 1 ? ` 等 ${encoded.messages.length} 条` : "";
      addLog(`${reason} ${device.displayName} · ${encoded.resolvedMode} · ${hex(preview)}${suffix}`, "ok");
    }
  }

  const success = results.some((item) => item.sent > 0);
  if (!success) {
    addLog(`${reason}未发送：没有成功打开的 MIDI 输出`, "bad");
    return false;
  }

  if (consume) consumeUse(1);
  return true;
}

export async function sendTestNote() {
  const connected = await ensureConnected();
  if (!connected) return false;
  const devices = sendableDevices(midi.value.devices);
  if (!devices.length) {
    addLog("没有可发送的 MIDI 输出", "bad");
    return false;
  }
  for (const device of devices) {
    if (device.mode === "MIDI_ECHO") midiEchoEngine.markAppNote(device.key, 0, 60, true);
    if (device.mode === "SX_ECHO") sxEchoEngine.markAppNote(device.key, 0, 60, true);
    await sendToDevice(device, [[0x90, 60, 100]]);
    addLog(`测试音 → ${device.displayName}`, "ok");
  }
  await new Promise((resolve) => setTimeout(resolve, 320));
  for (const device of devices) {
    await sendToDevice(device, [[0x80, 60, 0]]);
  }
  return true;
}

export function getAccess() {
  return access;
}
