// SX registration slot sending and bank learning over Web MIDI.

import {
  addLog,
  consumeUse,
  hasUses,
  midi,
  openDialog,
  saveSoundPicker,
  setStatusLine,
  soundPicker
} from "../../app/store.js";
import {
  registerSysExInterceptor,
  sendCcToDevice,
  sendMessagesToDevice
} from "../midi/engine.js";
import {
  SX_BUTTON_VARIANTS,
  SX_EVENT,
  decodeSxPath,
  parseSxEvent,
  sxBankQueryMessage,
  sxBankSelectMessage,
  sxButtonMessage
} from "./protocol.js";
import {
  sxBankDisplayName,
  sxBankForPath,
  sxCurrentBankPath,
  sxIndexOfBank,
  sxPathsEqual,
  sxSlotName,
  withSxBankAdded,
  withSxCurrentBank
} from "./model.js";
import { xgVolumeRequest } from "./xg.js";
import { readXgVolumes } from "./volumes.js";

let switchToken = 0;
let pendingSwitch = null;

const VOLUME_PARTS = [0, 1, 2, 3];
const VOLUME_READ_TIMEOUT_MS = 300;
const VOLUME_RESTORE_DELAY_MS = 450;
const VOLUME_ANCHOR_MAX_AGE_MS = 8000;
let volumeAnchor = null;
let volumeAnchorDevice = "";
let volumeAnchorAt = 0;

function status(text, kind = "muted") {
  setStatusLine(text);
  if (text) addLog(text, kind);
}

function wait(ms) {
  const delay = Math.max(0, Number(ms) || 0);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Every sendable device is offered; auto prefers a Yamaha SX / Genos. */
export function sxCandidateDevices(devices = midi.value.devices) {
  return (devices || []).filter((device) =>
    device.sendable && device.mode !== "OFF"
  );
}

export function resolveSxTarget(state = soundPicker.value.sx, devices = midi.value.devices) {
  const candidates = sxCandidateDevices(devices);
  const key = state?.settings?.targetDeviceKey || "";
  if (key) return candidates.find((device) => device.key === key) || null;
  return candidates.find((device) => device.isSx) || null;
}

function saveSx(nextSx) {
  return saveSoundPicker({ ...soundPicker.value, sx: nextSx });
}

function variantLabel(index) {
  return SX_BUTTON_VARIANTS[index]?.label || SX_BUTTON_VARIANTS[0].label;
}

/**
 * Reads the live keyboard-part volumes before a registration switch.
 * Returns null when the option is off, and an empty Map when the option is
 * on but the keyboard did not answer the XG requests.
 */
async function snapshotSxVolumes(target) {
  const settings = soundPicker.value.sx.settings;
  if (!settings.keepVolume) {
    volumeAnchor = null;
    volumeAnchorDevice = "";
    return null;
  }
  const age = performance.now() - volumeAnchorAt;
  if (volumeAnchorDevice === target.key && volumeAnchor
    && age < VOLUME_ANCHOR_MAX_AGE_MS) {
    return volumeAnchor;
  }
  const values = await readXgVolumes(
    target,
    VOLUME_PARTS,
    async (parts) => {
      for (const part of parts) {
        await sendMessagesToDevice(target, [xgVolumeRequest(part)]);
      }
    },
    VOLUME_READ_TIMEOUT_MS
  );
  if (values.size) {
    volumeAnchor = values;
    volumeAnchorDevice = target.key;
    volumeAnchorAt = performance.now();
  } else {
    volumeAnchor = null;
    volumeAnchorDevice = "";
  }
  return values;
}

/** Puts the pre-switch volumes back once the registration has been applied. */
async function restoreSxVolumes(target, volumes) {
  if (!volumes || !volumes.size) {
    addLog("SX：⚠️ 没读回琴上音量，本次未恢复（琴可能不支持 XG 参数请求）", "warn");
    return;
  }
  const token = switchToken;
  await wait(VOLUME_RESTORE_DELAY_MS);
  if (token !== switchToken) return;
  let sent = 0;
  const entries = [...volumes.entries()].sort((a, b) => a[0] - b[0]);
  for (const [part, volume] of entries) {
    if (await sendCcToDevice(target, part, 7, volume)) sent += 1;
  }
  if (sent > 0) {
    volumeAnchor = null;
    volumeAnchorDevice = "";
    const detail = entries.map(([part, volume]) => `CH${part + 1}=${volume}`).join(" ");
    addLog(`SX：🎚 已恢复音量 ${detail}`, "ok");
  } else {
    addLog("SX：⚠️ 恢复音量发送失败（MIDI 输出未打开）", "warn");
  }
}

async function sendButton(
  target,
  slot,
  charge,
  settings,
  context = "SX",
  savedVolumes = null
) {
  const sent = await sendMessagesToDevice(
    target,
    [sxButtonMessage(settings.variantIndex, slot.button - 1)]
  );
  if (!sent) {
    status(`${context}：按键发送失败（MIDI 输出未打开）`, "bad");
    return false;
  }
  if (charge) consumeUse(1);
  const name = sxSlotName(soundPicker.value.sx, slot);
  status(`${context}：${name}`, "ok");
  addLog(`SX：[TX] 按键 ${slot.button} · ${variantLabel(settings.variantIndex)}`, "muted");
  if (savedVolumes !== null) {
    await restoreSxVolumes(target, savedVolumes);
  }
  return true;
}

async function performSlotSend(target, slot, token, context = "SX") {
  const settings = soundPicker.value.sx.settings;
  const sx = soundPicker.value.sx;
  // Read the live volumes before touching the bank: an external registration
  // recall can restore the volume stored in the .rgt.
  const savedVolumes = await snapshotSxVolumes(target);
  if (token !== switchToken) return;
  const now = performance.now();
  if (pendingSwitch && now >= pendingSwitch.readyAt) pendingSwitch = null;
  const samePending = pendingSwitch
    && pendingSwitch.deviceKey === target.key
    && sxPathsEqual(pendingSwitch.path, slot.bankPath)
    && now < pendingSwitch.readyAt;

  if (samePending) {
    const remaining = Math.max(0, pendingSwitch.readyAt - now);
    if (remaining > 0) {
      status(`${context}：等琴加载 ${Math.ceil(remaining)}ms 后按键`);
      await wait(remaining);
    }
    if (token !== switchToken) return;
    pendingSwitch = null;
    saveSx(withSxCurrentBank(soundPicker.value.sx, target.key, slot.bankPath));
    await sendButton(target, slot, true, settings, context, savedVolumes);
    return;
  }

  const sameBank = sxPathsEqual(sxCurrentBankPath(sx, target.key), slot.bankPath);
  if (sameBank && !pendingSwitch) {
    await sendButton(target, slot, true, settings, context, savedVolumes);
    return;
  }

  const startedAt = performance.now();
  pendingSwitch = {
    deviceKey: target.key,
    path: slot.bankPath,
    startedAt,
    readyAt: startedAt + settings.delayMs
  };
  status(`${context}：正在切换注册库（等待 ${settings.delayMs} ms）…`);

  const sent = await sendMessagesToDevice(target, [sxBankSelectMessage(slot.bankPath)]);
  if (!sent) {
    if (pendingSwitch && pendingSwitch.deviceKey === target.key
      && sxPathsEqual(pendingSwitch.path, slot.bankPath)) {
      pendingSwitch = null;
    }
    status(`${context}：切库发送失败（MIDI 输出未打开）`, "bad");
    return;
  }
  consumeUse(1);
  const bank = sxBankForPath(sx, slot.bankPath);
  addLog(`SX：[TX] 注册库 ${bank ? sxBankDisplayName(bank) : slot.bankPath}`, "muted");

  await wait(settings.delayMs);
  if (token !== switchToken) return;

  const reported = sxCurrentBankPath(soundPicker.value.sx, target.key);
  if (pendingSwitch?.lastReportAt && reported && !sxPathsEqual(reported, slot.bankPath)) {
    addLog(
      `SX：⚠️ 切库回报不一致（请求 ${decodeSxPath(slot.bankPath)}，琴回报 ${decodeSxPath(reported)}）；仍发送按键`,
      "warn"
    );
  }
  saveSx(withSxCurrentBank(soundPicker.value.sx, target.key, slot.bankPath));
  pendingSwitch = null;
  await sendButton(
    target,
    slot,
    false,
    soundPicker.value.sx.settings,
    context,
    savedVolumes
  );

  await wait(700);
  if (token !== switchToken) return;
  await sendMessagesToDevice(target, [sxBankQueryMessage()]);
}

/**
 * Sends one organizer slot: selects the .rgt bank, waits the configured
 * delay, then presses the 1–10 registration button. Each tap costs at most
 * one trial use, matching the Android app.
 */
/**
 * Sends a saved slot snapshot (bank path + button), shared by the SX picker
 * and sound-chain steps. [context] prefixes the status line.
 */
export async function sendSxSlotValue(slot, { context = "SX" } = {}) {
  if (!slot?.bankPath) {
    status(`${context}：SX 音色数据缺失，请重新选择`, "warn");
    return false;
  }
  const sx = soundPicker.value.sx;
  const target = resolveSxTarget(sx, midi.value.devices);
  if (!target) {
    status(`${context}：未发现 SX；请连接 USB TO HOST 并允许 SysEx`, "bad");
    return false;
  }
  if (!hasUses(1)) {
    openDialog("paywall");
    return false;
  }
  const token = ++switchToken;
  await performSlotSend(target, slot, token, context);
  return true;
}

export async function sendSxSlot(group, slotIndex) {
  const slot = soundPicker.value.sx.groups?.[group]?.slots?.[slotIndex];
  if (!slot?.bankPath) {
    status(`SX 音色选择：${group + 1}-${slotIndex + 1} 还是空的`, "warn");
    return false;
  }
  return sendSxSlotValue(slot);
}

export function cancelSxSwitching() {
  switchToken += 1;
  pendingSwitch = null;
}

// ---- Learning --------------------------------------------------------------

function currentSxTargetKey() {
  return resolveSxTarget(soundPicker.value.sx, midi.value.devices)?.key || "";
}

function handleSxSysEx(device, bytes) {
  if (!device) return false;
  const sxNow = soundPicker.value.sx;
  const targeted = device.key === sxNow.settings.targetDeviceKey
    || device.key === currentSxTargetKey();
  if (!device.isSx && !targeted) return false;

  const event = parseSxEvent(bytes);
  if (!event) return false;

  if (event.type === SX_EVENT.BANK_REPORT || event.type === SX_EVENT.BANK_COMMAND) {
    const path = String(event.encodedPath || "").trim();
    if (!path) {
      addLog(`SX：📚 ${event.detail}（没有路径）`, "muted");
      return true;
    }
    if (pendingSwitch && pendingSwitch.deviceKey === device.key) {
      pendingSwitch.lastReportAt = performance.now();
    }
    let next = withSxCurrentBank(soundPicker.value.sx, device.key, path);
    let learned = false;
    if (next.settings.autoLearn && sxIndexOfBank(next, path) < 0) {
      next = withSxBankAdded(next, path);
      learned = true;
    }
    saveSx(next);
    const display = event.displayPath || path;
    if (learned) addLog(`SX：⭐ 已学习注册库 ${display}`, "ok");
    if (device.key === currentSxTargetKey()) {
      setStatusLine(`SX 当前库：${display}`);
    }
    addLog(`SX：📚 ${event.detail} → ${display}`, "muted");
    return true;
  }

  if (event.type === SX_EVENT.BUTTON_REPORT) {
    if (device.key === currentSxTargetKey()) {
      setStatusLine(`SX：琴上按键 ${event.button}`);
    }
    addLog(`SX：🎛 琴上按键 ${event.button}（${event.detail}）`, "muted");
    return true;
  }

  if (event.type === SX_EVENT.BUTTON_COMMAND) {
    addLog(`SX：↩ 按键命令回显 ${event.button}`, "muted");
    return true;
  }
  if (event.type === SX_EVENT.BANK_QUERY) {
    addLog(`SX：❓ ${event.detail}`, "muted");
    return true;
  }
  if (event.type === SX_EVENT.LINK_REQUEST) {
    addLog(`SX：🔗 ${event.detail}`, "muted");
    return true;
  }
  if (event.type === SX_EVENT.IDENTITY) {
    addLog(`SX：🆔 ${event.detail}`, "muted");
    return true;
  }
  return true;
}

registerSysExInterceptor(handleSxSysEx);
