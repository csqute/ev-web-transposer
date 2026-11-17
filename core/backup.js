// Platform-neutral Ev移调器 backup envelope shared with the Android app.
//
// This module is intentionally DOM-free so it can run in Node tests. It only
// carries user data sections; license state is never part of the whitelist.

export const BACKUP_FORMAT = "ev-transposer-backup";
export const BACKUP_VERSION = 1;
export const BACKUP_MAX_TEXT_BYTES = 2 * 1024 * 1024;

/** Sections understood by at least one platform. pageTurn is Android-only. */
export const BACKUP_SECTIONS = [
  "settings",
  "presets",
  "templates",
  "mixerChannels",
  "mixerTargets",
  "drums",
  "setList",
  "soundChain",
  "soundPicker",
  "deviceModes",
  "modx",
  "pageTurn"
];

function utf8Length(text) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }
  return unescape(encodeURIComponent(text)).length;
}

/**
 * Builds the canonical backup JSON. Only [BACKUP_SECTIONS] keys are copied,
 * so a caller cannot accidentally leak license/layout/runtime state.
 */
export function createBackupEnvelope(data, meta = {}) {
  const source = data && typeof data === "object" ? data : {};
  const sections = {};
  for (const key of BACKUP_SECTIONS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      sections[key] = source[key];
    }
  }
  const envelope = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    createdAt: meta.createdAt || new Date().toISOString(),
    createdBy: String(meta.createdBy || "Ev-Transposer Web"),
    platform: String(meta.platform || "web"),
    data: sections
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Parses a backup. Returns only whitelisted sections; unknown/license-like
 * keys are counted as warnings and never propagated to the caller.
 */
export function extractBackupData(text) {
  if (typeof text !== "string" || !text.trim()) {
    return { ok: false, error: "备份文件是空的" };
  }
  if (utf8Length(text) > BACKUP_MAX_TEXT_BYTES) {
    return { ok: false, error: "备份文件太大（超过 2 MB）" };
  }
  let root;
  try {
    root = JSON.parse(text.replace(/^﻿/, ""));
  } catch (_) {
    return { ok: false, error: "无法解析备份文件：不是有效的 JSON" };
  }
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    return { ok: false, error: "无法解析备份文件：顶层不是对象" };
  }
  if (root.format !== BACKUP_FORMAT) {
    return { ok: false, error: "不是 Ev移调器 的备份文件" };
  }
  const version = Number(root.formatVersion);
  if (!Number.isInteger(version) || version < 1) {
    return { ok: false, error: "备份格式版本不受支持" };
  }
  if (version > BACKUP_VERSION) {
    return { ok: false, error: "备份来自更新版本的 App，请先升级后再导入" };
  }
  const source = root.data;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return { ok: false, error: "备份文件缺少 data 内容" };
  }

  const data = {};
  let unknown = 0;
  for (const key of Object.keys(source)) {
    if (BACKUP_SECTIONS.includes(key)) {
      data[key] = source[key];
    } else {
      unknown += 1;
    }
  }
  const warnings = [];
  if (unknown > 0) warnings.push(`已忽略 ${unknown} 个未知模块`);
  if (Object.keys(data).length === 0) {
    return { ok: false, error: "备份里没有可导入的数据", warnings };
  }
  return {
    ok: true,
    data,
    warnings,
    meta: {
      createdAt: typeof root.createdAt === "string" ? root.createdAt : "",
      createdBy: typeof root.createdBy === "string" ? root.createdBy : "",
      platform: typeof root.platform === "string" ? root.platform : ""
    }
  };
}
