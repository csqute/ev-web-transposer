// SysEx learning, ported from LearnEngine.kt, plus a small UI state machine.

import { signal } from "@preact/signals";
import { addLog, saveTemplate } from "../../app/store.js";

export const learnState = signal({
  active: false,
  remainingMs: 0,
  captures: 0,
  result: null
});

let captures = [];
let timer = 0;
let deadline = 0;
let onFinish = null;

function publicTemplate(template) {
  return {
    ...template,
    bytes: template.bytes.slice()
  };
}

export function learnFromCaptures(items) {
  const valid = items.filter((item) =>
    Array.isArray(item.bytes) &&
    item.bytes.length >= 6 &&
    item.bytes[0] === 0xf0 &&
    item.bytes[item.bytes.length - 1] === 0xf7
  );
  if (!valid.length) {
    return { ok: false, reason: "没有收到完整的 SysEx 消息" };
  }

  const groups = new Map();
  for (const item of valid) {
    const key = `${item.deviceKey}|${item.bytes.length}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const group = [...groups.values()]
    .sort((a, b) => b.length - a.length)[0]
    .slice()
    .sort((a, b) => a.timestampMs - b.timestampMs);

  if (group.length < 2) {
    return { ok: false, reason: "需要在琴上按两次 ♯" };
  }

  const length = group[0].bytes.length;
  const varyingIndices = [];
  for (let index = 1; index < length - 1; index += 1) {
    if (group.some((item) => item.bytes[index] !== group[0].bytes[index])) {
      varyingIndices.push(index);
    }
  }
  if (!varyingIndices.length) {
    return { ok: false, reason: "收到的消息没有变化" };
  }

  const roland = length > 3 && group[0].bytes[0] === 0xf0 && group[0].bytes[1] === 0x41;
  const checksumIndex = roland ? length - 2 : -1;

  const candidates = [];
  for (const index of varyingIndices) {
    if (index === checksumIndex) continue;
    const values = [];
    for (const item of group) {
      const value = item.bytes[index];
      if (values.length === 0 || values[values.length - 1] !== value) values.push(value);
    }
    if (values.length < 2) continue;
    const deltas = [];
    for (let i = 1; i < values.length; i += 1) deltas.push(signedDelta(values[i - 1], values[i]));
    if (!deltas.length || deltas.includes(0)) continue;
    const step = deltas[0];
    if (deltas.some((delta) => delta !== step)) continue;
    const first = values[0];
    const base = first === 64 || first === 0 ? first : first - step;
    const score = Math.abs(step) === 1 ? 3 : Math.abs(step) === 2 ? 2 : 1;
    candidates.push({ index, step, base: base & 0x7f, score });
  }

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best) {
    return { ok: false, reason: "没认出规律，可尝试手动模板" };
  }

  const template = {
    modelKey: group[0].modelKey,
    modelName: group[0].modelName || group[0].modelKey,
    bytes: group[0].bytes.slice(),
    valueIndex: best.index,
    base: best.base,
    stepPerSemitone: best.step,
    signed: false,
    checksum: roland ? "ROLAND" : "NONE"
  };
  return { ok: true, template: publicTemplate(template) };
}

function signedDelta(previous, next) {
  let delta = next - previous;
  if (delta > 64) delta -= 128;
  if (delta < -64) delta += 128;
  return delta;
}

export function captureLearnSysEx(device, bytes) {
  if (!learnState.value.active) return;
  captures.push({
    bytes: bytes.slice(),
    timestampMs: performance.now(),
    deviceKey: device?.key || "",
    modelKey: device?.modelKey || "UNKNOWN",
    modelName: device?.displayName || device?.modelKey || "未知琴"
  });
  learnState.value = {
    ...learnState.value,
    captures: captures.length
  };
}

function stopTimer() {
  clearInterval(timer);
  timer = 0;
}

function finish(reason = "完成") {
  stopTimer();
  const result = learnFromCaptures(captures);
  if (result.ok) {
    saveTemplate(result.template);
    addLog(`学习成功：${result.template.modelName} · 值字节 #${result.template.valueIndex + 1} · 每半音 ${result.template.stepPerSemitone}`, "ok");
  } else {
    addLog(`学习失败：${result.reason}`, "bad");
  }
  learnState.value = {
    active: false,
    remainingMs: 0,
    captures: captures.length,
    result: { ...result, finishedBy: reason }
  };
  if (onFinish) onFinish(result);
}

export function startLearn({ durationMs = 30000, finished = null } = {}) {
  stopTimer();
  captures = [];
  onFinish = finished;
  deadline = performance.now() + durationMs;
  learnState.value = { active: true, remainingMs: durationMs, captures: 0, result: null };
  timer = setInterval(() => {
    const remaining = Math.max(0, deadline - performance.now());
    learnState.value = { ...learnState.value, remainingMs: Math.round(remaining) };
    if (remaining <= 0) finish("超时");
  }, 200);
}

export function finishLearn() {
  if (learnState.value.active) finish("提前完成");
}

export function cancelLearn() {
  stopTimer();
  captures = [];
  onFinish = null;
  learnState.value = { active: false, remainingMs: 0, captures: 0, result: null };
}

export function parseHexBytes(text) {
  const cleaned = String(text || "").replace(/0x/gi, " ").replace(/[^0-9a-fA-F]/g, " ").trim();
  if (!cleaned) return [];
  const tokens = cleaned.split(/\s+/);
  const bytes = [];
  for (const token of tokens) {
    if (token.length > 2) throw new Error("HEX 每组最多两位");
    bytes.push(parseInt(token, 16));
  }
  return bytes;
}

export function manualTemplate({
  modelKey,
  modelName,
  hex,
  valueIndex,
  base = 64,
  stepPerSemitone = 1,
  signed = false,
  checksum = "NONE"
}) {
  const bytes = parseHexBytes(hex);
  if (bytes.length < 4) throw new Error("SysEx 至少需要 4 个字节");
  if (bytes[0] !== 0xf0 || bytes[bytes.length - 1] !== 0xf7) {
    throw new Error("SysEx 必须以 F0 开头、F7 结尾");
  }
  const index = Number(valueIndex);
  if (!Number.isInteger(index) || index < 1 || index > bytes.length - 2) {
    throw new Error("值字节位置超出范围");
  }
  const step = Number(stepPerSemitone);
  if (!Number.isInteger(step) || step === 0) throw new Error("每半音不能为 0");
  const template = {
    modelKey: String(modelKey || "").trim().toUpperCase(),
    modelName: String(modelName || modelKey || "手动模板").trim(),
    bytes,
    valueIndex: index,
    base: Math.max(0, Math.min(127, Number(base) | 0)),
    stepPerSemitone: step,
    signed: !!signed,
    checksum: checksum === "ROLAND" ? "ROLAND" : "NONE"
  };
  if (!template.modelKey) throw new Error("型号 key 不能为空");
  const saved = saveTemplate(template);
  if (!saved) throw new Error("模板格式无效");
  addLog(`已保存手动模板：${saved.modelName}`, "ok");
  return saved;
}
