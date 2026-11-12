// MODX capture, Performance-name reading and sound selection orchestration.

import {
  addLog,
  consumeUse,
  hasUses,
  midi,
  modx,
  modxRuntime,
  openDialog,
  saveModx,
  setStatusLine,
  updateModxRuntime
} from "../../app/store.js";
import {
  registerSysExInterceptor,
  scheduleKeepAfterSoundChange,
  sendMessagesToDevice
} from "../midi/engine.js";
import {
  MODX_LIVE_SLOTS_PER_PAGE,
  bankKey,
  bankMergedWith,
  bankNonEmptyCount,
  bankSlot,
  findModxBank,
  modxGroupLabel,
  modxProfile,
  organizedEntry,
  profileIsMSeries,
  profileSupportsBankSwitch,
  profileSupportsCapture,
  profileSupportsPerformanceNames,
  profileWireCompatible,
  refBankKey,
  resolveModxProfile,
  resolveModxTarget,
  soundRefFromSlot,
  withModxBank,
  withModxPerformanceName,
  withModxSelectedBank,
  withModxSelectedPage
} from "./model.js";
import {
  MODX_CAPTURE_TARGETS,
  captureTargetForBankKind,
  modxBankSwitchMessage,
  modxBankSwitchValue,
  modxBulkRequest,
  modxNeedsBankSwitch,
  modxPerformanceBulkRequest,
  modxPerformanceHeader,
  modxSlotMessages
} from "./protocol.js";
import {
  ModxCaptureSession,
  ModxPerformanceNameReader,
  chooseModxBank,
  parseBulkDumpPacket,
  parseModxMFromPackets,
  parseModxMLiveSet,
  parseOriginalLiveSet
} from "./parse.js";

let captureRun = null;
let nameRun = null;

function status(text) {
  setStatusLine(text);
}

function log(text, kind = "muted") {
  addLog(text, kind);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function busy() {
  const runtime = modxRuntime.value;
  return runtime.capturing || runtime.readingNames || runtime.sending;
}

function targetDevice(state = modx.value) {
  return resolveModxTarget(state, midi.value.devices);
}

function profileFor(state = modx.value) {
  return resolveModxProfile(state, targetDevice(state));
}

/**
 * MONTAGE M / MODX M expose up to four MIDI ports. The group's automatic
 * output ignores the port setting, so pick the requested connected output.
 */
function routedDevice(device, portIndex) {
  if (!device) return null;
  const outputs = (device.outputs || []).filter((output) =>
    output?.port && output.state !== "disconnected"
  );
  if (!outputs.length) return device;
  const index = Math.max(0, Math.min(3, Number(portIndex) || 0));
  const selected = outputs[Math.min(index, outputs.length - 1)];
  if (!selected) return device;
  return { ...device, output: selected, outputName: selected.name || device.outputName };
}

function bankLabelForKind(kind, bankIndex = 0) {
  switch (kind) {
    case "CURRENT": return "当前 Live Set";
    case "EDIT": return "当前库";
    case "USER": return `User ${bankIndex + 1}`;
    case "LIBRARY": return `Library ${bankIndex + 1}`;
    case "MANUAL": return "手选网格";
    default: return "当前 Live Set";
  }
}

// ---- Capture ---------------------------------------------------------------

export function captureModxLiveSet(kind, bankIndex = 0) {
  const state = modx.value;
  if (busy()) {
    status("MODX：正在抓取/读名/发送，请稍后");
    return false;
  }
  const selectedDevice = targetDevice(state);
  if (!selectedDevice) {
    status("MODX：未连接所选的琴，请在 MODX 设置里选择");
    return false;
  }
  const device = routedDevice(selectedDevice, state.settings.portIndex);
  const profile = profileFor(state);
  if (!profile) {
    status("MODX：未识别型号，请在 MODX 设置里选择型号");
    return false;
  }
  if (!profileSupportsCapture(profile)) {
    status(`MODX：${profile.label} 暂不支持抓取；请升级到 OS 3.00+ 或只在琴上手动选槽`);
    return false;
  }
  const target = captureTargetForBankKind(profile, kind);
  if (!target) {
    status("MODX：当前型号不能读取这个库");
    return false;
  }
  const actualBank = kind === "USER" || kind === "LIBRARY"
    ? Math.max(0, Math.min(7, bankIndex))
    : 0;
  const session = new ModxCaptureSession(target, profile);
  const now = Date.now();
  const run = {
    deviceKey: device.key,
    profile,
    target,
    kind,
    bankIndex: actualBank,
    session,
    startedAt: now,
    lastChangeAt: now,
    lastProgressAt: 0,
    timer: 0
  };
  captureRun = run;
  updateModxRuntime({
    capturing: true,
    captureReceived: 0,
    captureExpected: target.expectedBytes,
    capturePackets: 0,
    captureChecksumErrors: 0,
    captureLastAddress: "",
    readingNames: false,
    nameReadTotal: 0,
    nameReadDone: 0,
    nameReadFound: 0,
    nameReadCurrent: "",
    sending: false,
    message: `正在读取 ${target.label}…`
  });

  const request = modxBulkRequest(
    profile,
    state.settings.deviceNumber,
    target,
    actualBank,
    0
  );
  sendMessagesToDevice(device, [request])
    .then((sent) => {
      if (!sent) {
        if (captureRun === run) captureRun = null;
        clearInterval(run.timer);
        updateModxRuntime({
          capturing: false,
          message: "发送读取请求失败（MIDI 输出）"
        });
        status("MODX：发送读取请求失败；检查 USB 连接、琴上的 Bulk Receive 和型号");
        return;
      }
      log(`MODX：读取 ${target.label}（${bankLabelForKind(kind, actualBank)}，${profile.label}）`);
      if (captureRun !== run) return;
      run.timer = setInterval(() => {
        if (captureRun !== run) return;
        const elapsed = Date.now() - run.startedAt;
        if (run.session.received >= target.expectedBytes) {
          finishModxCapture(run, "数据达到期望长度");
        } else if (run.session.received === 0 && elapsed > 5000) {
          finishModxCapture(run, "5 秒没有收到数据");
        } else if (run.session.received > 0
          && Date.now() - run.lastChangeAt > 2500) {
          finishModxCapture(run, "2.5 秒无新数据");
        } else if (elapsed > 90000) {
          finishModxCapture(run, "90 秒总超时");
        }
      }, 200);
    })
    .catch(() => {
      if (captureRun === run) captureRun = null;
      clearInterval(run.timer);
      updateModxRuntime({
        capturing: false,
        message: "发送读取请求失败（MIDI 输出）"
      });
      status("MODX：发送读取请求失败；检查 USB 连接、琴上的 Bulk Receive 和型号");
    });
  return true;
}

export function stopModxCapture() {
  stopModxCaptureWithReason("手动停止");
}

function stopModxCaptureWithReason(reason) {
  if (!captureRun) return;
  finishModxCapture(captureRun, reason, false);
}

function updateCaptureProgress(run) {
  updateModxRuntime({
    capturing: true,
    captureReceived: run.session.received,
    captureExpected: run.session.expected,
    capturePackets: run.session.packetCount,
    captureChecksumErrors: run.session.checksumErrors,
    captureLastAddress: run.session.lastAddress
  });
}

function finishModxCapture(run, reason, autoRead = true) {
  if (captureRun !== run) return;
  captureRun = null;
  clearInterval(run.timer);
  const raw = run.session.bytes();
  let parsed = null;
  if (run.target.kind === "ORIGINAL_BANK") {
    parsed = parseOriginalLiveSet(raw, run.profile, run.target);
  } else if (run.target.kind === "M_BANK") {
    const byAddress = parseModxMFromPackets(
      run.session.packets,
      run.target,
      run.profile,
      raw.length,
      run.bankIndex
    );
    const bySequence = parseModxMLiveSet(
      raw,
      null,
      run.target,
      run.profile,
      run.bankIndex
    );
    parsed = chooseModxBank(byAddress, bySequence);
  } else if (run.target.kind === "M_PAGE") {
    const byAddress = parseModxMFromPackets(
      run.session.packets,
      run.target,
      run.profile,
      raw.length,
      run.bankIndex
    );
    const bySequence = parseModxMLiveSet(
      raw,
      0,
      run.target,
      run.profile,
      run.bankIndex
    );
    parsed = chooseModxBank(byAddress, bySequence);
  }

  if (!parsed) {
    updateModxRuntime({
      capturing: false,
      message: `读取失败：无法解析（${reason}，${raw.length} 字节）`
    });
    status("MODX：读取失败（" + reason + "）；检查端口/型号/琴上的 Bulk Receive");
    log(`MODX：读取失败，收到 ${raw.length} 字节，${run.session.packetCount} 包，${reason}`, "bad");
    return;
  }

  const previous = findModxBank(modx.value, bankKey(parsed));
  const merged = bankMergedWith(parsed, previous);
  merged.capturedAt = Date.now();
  const next = withModxSelectedPage(
    withModxSelectedBank(withModxBank(modx.value, merged), bankKey(merged)),
    0
  );
  saveModx(next, true);

  const named = merged.slots.filter((slot) => slot.performanceName.trim()).length;
  const name = merged.bankName || "未命名库";
  updateModxRuntime({
    capturing: false,
    captureReceived: raw.length,
    captureExpected: run.target.expectedBytes,
    capturePackets: run.session.packetCount,
    captureChecksumErrors: run.session.checksumErrors,
    message: [
      "读取完成：",
      name,
      `，非空槽 ${bankNonEmptyCount(merged)}`,
      named > 0 ? `，已有音色名 ${named}` : "",
      merged.partial ? "（可能不完整）" : ""
    ].join("")
  });
  status(
    `MODX：已读取 ${name}（${bankLabelForKind(merged.kind, merged.bankIndex)}，`
    + `非空 ${bankNonEmptyCount(merged)}，${reason}）`
  );
  log(
    `MODX：读取完成 ${name}，非空 ${bankNonEmptyCount(merged)}，`
    + `${raw.length}/${run.target.expectedBytes} 字节，`
    + `${run.session.packetCount} 包，校验错误 ${run.session.checksumErrors}`,
    "ok"
  );

  const pageHasSlots = Array.from({ length: MODX_LIVE_SLOTS_PER_PAGE }, (_, slot) => {
    const item = bankSlot(merged, 0, slot);
    return item && item.switchOn;
  }).some(Boolean);
  if (autoRead
    && modx.value.settings.autoReadPageNames
    && profileIsMSeries(run.profile)
    && pageHasSlots) {
    setTimeout(() => {
      if (!captureRun && !nameRun) {
        startModxNameReadForBank(merged, 0);
      }
    }, 600);
  }
}

// ---- Performance names -----------------------------------------------------

export function readModxPageNames() {
  const bank = selectedBankForNames();
  if (!bank) return;
  if (bank.kind === "MANUAL") {
    status("MODX：手选网格没有音色名；请先读取 Live Set 库");
    return;
  }
  startModxNameReadForBank(bank, modx.value.selectedPage);
}

export function readModxAllNames() {
  const bank = selectedBankForNames();
  if (!bank) return;
  if (bank.kind === "MANUAL") {
    status("MODX：手选网格没有音色名；请先读取 Live Set 库");
    return;
  }
  startModxNameReadForBank(bank, null);
}

function selectedBankForNames() {
  const state = modx.value;
  return findModxBank(state, state.selectedBankKey)
    || state.banks.find((bank) => bank.kind === "MANUAL")
    || state.banks[0]
    || null;
}

function startModxNameReadForBank(bank, page) {
  if (!bank || bank.kind === "MANUAL") {
    status("MODX：手选网格没有音色名；请先读取 Live Set 库");
    return false;
  }
  const state = modx.value;
  if (busy()) {
    status("MODX：正在抓取/读名/发送，请稍后");
    return false;
  }
  const device = targetDevice(state);
  if (!device) {
    status("MODX：未连接所选的琴");
    return false;
  }
  const profile = profileFor(state);
  if (!profile) {
    status("MODX：未识别型号，请在 MODX 设置里选择");
    return false;
  }
  if (!profileSupportsPerformanceNames(profile)) {
    status(`MODX：${profile.label} 暂不支持读取 Performance 名；可以先手动改显示名`);
    return false;
  }
  const targets = [];
  if (page == null) {
    bank.slots.forEach((item, flat) => {
      if (item.switchOn) targets.push({ flat, slot: item });
    });
  } else {
    const effectivePage = Math.max(0, Math.min(15, page));
    for (let slotIndex = 0; slotIndex < MODX_LIVE_SLOTS_PER_PAGE; slotIndex += 1) {
      const item = bankSlot(bank, effectivePage, slotIndex);
      if (!item || !item.switchOn) continue;
      targets.push({
        flat: effectivePage * MODX_LIVE_SLOTS_PER_PAGE + slotIndex,
        slot: item
      });
    }
  }
  if (!targets.length) {
    status("MODX：没有可读取的非空槽");
    return false;
  }

  const run = {
    deviceKey: device.key,
    profile,
    bankKey: bankKey(bank),
    queue: targets,
    index: 0,
    found: 0,
    savedCount: 0,
    currentFlat: -1,
    reader: null,
    timer: 0
  };
  nameRun = run;
  updateModxRuntime({
    readingNames: true,
    nameReadTotal: targets.length,
    nameReadDone: 0,
    nameReadFound: 0,
    nameReadCurrent: "",
    sending: false,
    message: "正在读取 Performance 名…"
  });
  log(`MODX：开始读取音色名 ${targets.length} 个（${profile.label}）`);
  sendNextModxNameRequest(run);
  return true;
}

function sendNextModxNameRequest(run) {
  if (nameRun !== run) return;
  const state = modx.value;
  const found = midi.value.devices.find((item) => item.key === run.deviceKey) || null;
  if (!found) {
    completeModxNameRead(run, "设备断开");
    return;
  }
  const device = routedDevice(found, state.settings.portIndex);
  while (run.index < run.queue.length) {
    const target = run.queue[run.index];
    const header = modxPerformanceHeader(run.profile, target.slot);
    if (!header) {
      run.index += 1;
      updateModxNameProgress(run);
      continue;
    }
    run.currentFlat = target.flat;
    const reader = new ModxPerformanceNameReader(header);
    run.reader = reader;
    const request = modxPerformanceBulkRequest(
      run.profile,
      state.settings.deviceNumber,
      header
    );
    sendMessagesToDevice(device, [request])
      .then((sent) => {
        if (nameRun !== run || run.reader !== reader) return;
        if (!sent) {
          run.reader = null;
          run.index += 1;
          updateModxNameProgress(run);
          if (run.index >= run.queue.length) {
            completeModxNameRead(run, "完成");
          } else {
            setTimeout(() => sendNextModxNameRequest(run), 120);
          }
          return;
        }
        updateModxRuntime({
          readingNames: true,
          nameReadDone: run.index,
          nameReadTotal: run.queue.length,
          nameReadFound: run.found,
          nameReadCurrent: `P${target.slot.page + 1}-${target.slot.slot + 1}`
        });
        const started = Date.now();
        clearInterval(run.timer);
        run.timer = setInterval(() => {
          if (nameRun !== run || run.reader !== reader) return;
          const now = Date.now();
          if (reader.footerSeen) {
            finishCurrentModxName(run, "收到块结束");
          } else if (reader.packetCount === 0 && now - started > 3000) {
            finishCurrentModxName(run, "3 秒无响应");
          } else if (reader.packetCount > 0
            && now - reader.lastActivityAt > 1500) {
            finishCurrentModxName(run, "1.5 秒无新数据");
          } else if (now - started > 20000) {
            finishCurrentModxName(run, "20 秒超时");
          }
        }, 120);
      })
      .catch(() => {
        if (nameRun !== run || run.reader !== reader) return;
        run.reader = null;
        run.index += 1;
        updateModxNameProgress(run);
        if (run.index >= run.queue.length) completeModxNameRead(run, "完成");
        else setTimeout(() => sendNextModxNameRequest(run), 120);
      });
    return;
  }
  completeModxNameRead(run, "完成");
}

function updateModxNameProgress(run) {
  updateModxRuntime({
    readingNames: true,
    nameReadDone: run.index,
    nameReadTotal: run.queue.length,
    nameReadFound: run.found,
    nameReadCurrent: ""
  });
}

function finishCurrentModxName(run, reason) {
  if (nameRun !== run) return;
  const reader = run.reader;
  if (!reader) return;
  run.reader = null;
  clearInterval(run.timer);
  const target = run.queue[run.index];
  if (!target) {
    completeModxNameRead(run, reason);
    return;
  }
  const name = reader.name();
  const flat = run.currentFlat;
  run.index += 1;
  if (name && flat >= 0) {
    run.found += 1;
    run.savedCount += 1;
    const page = Math.floor(flat / MODX_LIVE_SLOTS_PER_PAGE);
    const slot = flat % MODX_LIVE_SLOTS_PER_PAGE;
    const next = withModxPerformanceName(
      modx.value,
      run.bankKey,
      page,
      slot,
      name
    );
    saveModx(next, run.savedCount % 8 === 0);
  }
  updateModxRuntime({
    readingNames: true,
    nameReadDone: run.index,
    nameReadTotal: run.queue.length,
    nameReadFound: run.found,
    nameReadCurrent: ""
  });
  if (run.index >= run.queue.length) {
    completeModxNameRead(run, reason);
  } else {
    setTimeout(() => sendNextModxNameRequest(run), 400);
  }
}

export function stopModxNameRead() {
  if (!nameRun) return;
  completeModxNameRead(nameRun, "手动停止");
}

function completeModxNameRead(run, reason) {
  if (nameRun !== run) return;
  nameRun = null;
  clearInterval(run.timer);
  run.reader = null;
  saveModx(modx.value, true);
  const done = run.queue.length;
  const finished = reason === "完成" || run.index >= done;
  updateModxRuntime({
    readingNames: false,
    nameReadDone: done,
    nameReadTotal: done,
    nameReadFound: run.found,
    nameReadCurrent: "",
    message: finished
      ? `音色名读取完成：找到 ${run.found} / ${done}`
      : `已停止：找到 ${run.found} / ${done}（${reason}）`
  });
  status(
    finished
      ? `MODX：音色名读取完成（找到 ${run.found} / ${done}）`
      : `MODX：已停止读取音色名（找到 ${run.found} / ${done}，${reason}）`
  );
  log(`MODX：音色名读取结束，找到 ${run.found} / ${done}（${reason}）`, "ok");
}

// ---- SysEx replies ---------------------------------------------------------

function handleModxSysEx(device, bytes) {
  const capture = captureRun;
  if (capture && capture.deviceKey === device?.key) {
    const packet = parseBulkDumpPacket(bytes, capture.profile);
    if (packet) {
      capture.session.accept(packet);
      capture.lastChangeAt = Date.now();
      const now = Date.now();
      if (now - capture.lastProgressAt >= 150) {
        capture.lastProgressAt = now;
        updateCaptureProgress(capture);
      }
      if (capture.session.isComplete) {
        finishModxCapture(capture, "数据达到期望长度");
      }
    }
    return true;
  }
  const names = nameRun;
  if (names && names.deviceKey === device?.key) {
    const reader = names.reader;
    const packet = parseBulkDumpPacket(bytes, names.profile);
    if (packet && reader && reader.accept(packet)) {
      finishCurrentModxName(names, "收到块结束");
    }
    return true;
  }
  return false;
}

registerSysExInterceptor(handleModxSysEx);

// ---- Sound selection -------------------------------------------------------

export function modxCandidateDevices(devices = midi.value.devices) {
  return (devices || []).filter((device) =>
    device.sendable && !device.isSx && device.mode !== "OFF"
  );
}

export function sendModxSlot(bankKeyValue, page, slot) {
  const state = modx.value;
  const bank = findModxBank(state, bankKeyValue);
  if (!bank) return false;
  const item = bankSlot(bank, page, slot);
  if (!item || !item.switchOn) {
    status(`MODX：P${page + 1}-${slot + 1} 是空槽`);
    return false;
  }
  return sendModxSound(soundRefFromSlot(bank, item));
}

export function sendModxOrganized(group, slot) {
  const ref = organizedEntry(modx.value, group, slot);
  if (!ref) return false;
  return sendModxSound(ref, { sourceLabel: "音色整理" });
}

export function sendModxChainLink(ref) {
  return sendModxSound(ref, { sourceLabel: "音色链" });
}

function modxBankLabelForRef(ref) {
  return bankLabelForKind(ref.kind, ref.bankIndex);
}

export async function sendModxSound(ref, options = {}) {
  const {
    sourceLabel = "音色选择",
    checkUsage = true
  } = options;
  const state = modx.value;
  if (busy()) {
    status("MODX：正在抓取/读名/发送，请稍后");
    return false;
  }
  const selectedDevice = targetDevice(state);
  if (!selectedDevice) {
    status("MODX：未连接所选的琴，请在 MODX 设置里选择");
    return false;
  }
  const device = routedDevice(selectedDevice, state.settings.portIndex);
  const targetProfile = profileFor(state);
  if (!targetProfile) {
    status("MODX：未识别型号，请在 MODX 设置里选择");
    return false;
  }
  const refProfile = modxProfile(ref.profile);
  if (ref.kind !== "MANUAL" && refProfile && !profileWireCompatible(refProfile, targetProfile)) {
    status(
      `MODX：此音色来自 ${refProfile.label}，当前琴是 ${targetProfile.label}，不能直接发送`
    );
    return false;
  }
  if (checkUsage && !hasUses(1)) {
    openDialog("paywall");
    return false;
  }

  const settings = state.settings;
  const switchValue = modxBankSwitchValue(ref);
  const needsSwitch = modxNeedsBankSwitch(
    targetProfile,
    ref,
    settings.crossBankSwitch
  ) && modxRuntime.value.lastSentBank !== switchValue;
  const currentBankRef = ref.kind === "CURRENT"
    || ref.kind === "EDIT"
    || ref.kind === "MANUAL";

  updateModxRuntime({ sending: true, message: "" });
  let success = false;
  try {
    if (needsSwitch) {
      const switchMessage = modxBankSwitchMessage(
        targetProfile,
        settings.deviceNumber,
        ref
      );
      if (!switchMessage) {
        status("MODX：无法切换到这个库");
        return false;
      }
      const sent = await sendMessagesToDevice(device, [switchMessage]);
      if (!sent) {
        status(`MODX：切库发送失败（${device.displayName}）`);
        return false;
      }
      updateModxRuntime({ lastSentBank: switchValue });
      status(`MODX：切库到 ${modxBankLabelForRef(ref)}，等待 ${settings.bankWaitMs} ms`);
      if (settings.bankWaitMs > 0) await delay(settings.bankWaitMs);
    }

    const messages = modxSlotMessages(settings.controlChannel, ref);
    for (let index = 0; index < messages.length; index += 1) {
      if (index > 0 && settings.sendGapMs > 0) await delay(settings.sendGapMs);
      const sent = await sendMessagesToDevice(device, [messages[index]]);
      if (!sent) {
        status(`MODX：选槽发送失败（${device.displayName}）`);
        return false;
      }
    }

    success = true;
    consumeUse(1);
    scheduleKeepAfterSoundChange(sourceLabel);
    const current = modx.value;
    const selectedKey = refBankKey(ref);
    if (findModxBank(current, selectedKey)) {
      saveModx(
        withModxSelectedPage(
          withModxSelectedBank(current, selectedKey),
          ref.page
        ),
        false
      );
    }
    const bankNote = currentBankRef && modxRuntime.value.lastSentBank != null
      ? "；注意：琴上已切过库，当前库位置可能已变化"
      : !currentBankRef && !settings.crossBankSwitch
        ? "；未自动切库，按琴上当前库发送"
        : "";
    status(
      `MODX：${sourceLabel} ${refName(ref)}（${refDetailText(ref)} · `
      + `${device.displayName} · Control CH ${settings.controlChannel + 1}）${bankNote}`
    );
    return true;
  } catch (error) {
    status(`MODX：发送失败（${error?.message || error}）`);
    return false;
  } finally {
    updateModxRuntime({
      sending: false,
      message: success ? `已发送：${refName(ref)}` : modxRuntime.value.message
    });
  }
}

function refName(ref) {
  return ref?.displayName || ref?.performanceName || ref?.slotName || "MODX 音色";
}

function refDetailText(ref) {
  const bank = ref.bankName || modxBankLabelForRef(ref);
  return `${bank} · 页 ${(ref.page || 0) + 1} · 槽 ${(ref.slot || 0) + 1}`;
}

// ---- Settings helpers ------------------------------------------------------

export function modxGroupLabelText(state, index) {
  return modxGroupLabel(state.settings, index);
}

export function resetModxRoutingState() {
  updateModxRuntime({ replyPort: null, lastSentBank: null });
}

export function clearModxLastBank() {
  updateModxRuntime({ lastSentBank: null });
  status("MODX：已清除切库记录；下次跨库会重新切库");
}

export function stopAllModxWork(reason = "清空数据") {
  stopModxCaptureWithReason(reason);
  if (nameRun) completeModxNameRead(nameRun, reason);
}

export const MODX_CAPTURE_KINDS = ["CURRENT", "USER", "LIBRARY"];
export { MODX_CAPTURE_TARGETS, profileSupportsBankSwitch };
