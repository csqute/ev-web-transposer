// Yamaha PSR-SX / Genos registration SysEx, ported from
// YamahaRegProtocol.java and YamahaPathCodec.java in the Android app.
//
// 选择注册库（路径）:
//   F0 43 73 01 52 26 03 00 00 00 <ASCII/base64 path> 00 F7
// 查询当前库:
//   F0 43 73 01 52 26 03 01 00 F7
// 琴回报当前库:
//   F0 43 73 01 52 26 03 02 00 00 <path> 00 F7
// 选择注册记忆按键 1-10（按钮号 = 下标 + 1）:
//   SX 常用:   F0 43 73 01 52 25 11 00 02 00 nn F7
//   SX920:     F0 43 73 01 52 25 11 00 01 00 nn F7
//   Genos:     F0 43 73 01 52 25 00 01 01 01 nn F7

export const SX_BUTTON_VARIANTS = [
  {
    key: "SX_STANDARD",
    label: "SX 常用 (11 00 02 00)",
    body: [0x11, 0x00, 0x02, 0x00]
  },
  {
    key: "SX_920",
    label: "SX920 (11 00 01 00)",
    body: [0x11, 0x00, 0x01, 0x00]
  },
  {
    key: "GENOS",
    label: "Genos/Tyros (00 01 01 01)",
    body: [0x00, 0x01, 0x01, 0x01]
  }
];

const SYSEX_START = 0xf0;
const SYSEX_END = 0xf7;
const YAMAHA = 0x43;
const DEVICE = 0x73;
const MODEL = 0x01;

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const SX_EVENT = {
  BUTTON_REPORT: "BUTTON_REPORT",
  BUTTON_COMMAND: "BUTTON_COMMAND",
  BANK_REPORT: "BANK_REPORT",
  BANK_COMMAND: "BANK_COMMAND",
  BANK_QUERY: "BANK_QUERY",
  LINK_REQUEST: "LINK_REQUEST",
  IDENTITY: "IDENTITY",
  UNKNOWN: "UNKNOWN"
};

function asciiBytes(text) {
  const out = new Uint8Array(String(text || "").length);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = String(text).charCodeAt(index) & 0x7f;
  }
  return out;
}

function toBytes(bytes) {
  if (bytes instanceof Uint8Array) return bytes;
  if (Array.isArray(bytes)) return Uint8Array.from(bytes);
  return Uint8Array.from(bytes || []);
}

// ---- Yamaha path codec -----------------------------------------------------

function utf16beBytes(text) {
  const bytes = [];
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    bytes.push((code >> 8) & 0xff, code & 0xff);
  }
  return bytes;
}

function base64EncodeNoPad(bytes) {
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const b0 = bytes[index] & 0xff;
    const b1 = index + 1 < bytes.length ? bytes[index + 1] & 0xff : 0;
    const b2 = index + 2 < bytes.length ? bytes[index + 2] & 0xff : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += BASE64_ALPHABET.charAt((triple >> 18) & 0x3f);
    out += BASE64_ALPHABET.charAt((triple >> 12) & 0x3f);
    if (index + 1 < bytes.length) out += BASE64_ALPHABET.charAt((triple >> 6) & 0x3f);
    if (index + 2 < bytes.length) out += BASE64_ALPHABET.charAt(triple & 0x3f);
  }
  return out;
}

function base64Decode(text) {
  const out = [];
  let buffer = 0;
  let bits = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    let value;
    if (char >= "A" && char <= "Z") value = char.charCodeAt(0) - 65;
    else if (char >= "a" && char <= "z") value = char.charCodeAt(0) - 97 + 26;
    else if (char >= "0" && char <= "9") value = char.charCodeAt(0) - 48 + 52;
    else if (char === "+") value = 62;
    else if (char === "/") value = 63;
    else throw new Error("bad base64");
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

function utf16beDecode(bytes) {
  let out = "";
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    out += String.fromCharCode(((bytes[index] & 0xff) << 8) | (bytes[index + 1] & 0xff));
  }
  if (bytes.length % 2 === 1) out += "�";
  return out;
}

function isBase64Char(char) {
  return (char >= "A" && char <= "Z")
    || (char >= "a" && char <= "z")
    || (char >= "0" && char <= "9")
    || char === "+" || char === "/";
}

/** Human-readable Yamaha path -> wire path (ASCII). */
export function encodeSxPath(path) {
  const text = String(path || "");
  let out = "";
  let index = 0;
  while (index < text.length) {
    const char = text.charAt(index);
    if (char === "+") {
      out += "+-";
      index += 1;
    } else if (char === "-") {
      out += "--";
      index += 1;
    } else if (text.charCodeAt(index) < 0x80) {
      out += char;
      index += 1;
    } else {
      const start = index;
      while (index < text.length && text.charCodeAt(index) >= 0x80) index += 1;
      out += `+${base64EncodeNoPad(utf16beBytes(text.slice(start, index)))}-`;
    }
  }
  return out;
}

/** Yamaha wire path -> human-readable path. Never throws. */
export function decodeSxPath(encoded) {
  const text = String(encoded || "");
  let out = "";
  let index = 0;
  while (index < text.length) {
    const char = text.charAt(index);
    if (char === "+") {
      let start = index + 1;
      let end = start;
      while (end < text.length && isBase64Char(text.charAt(end))) end += 1;
      const data = text.slice(start, end);
      if (end < text.length && text.charAt(end) === "-") end += 1;
      if (!data) {
        out += "+";
      } else {
        try {
          out += utf16beDecode(base64Decode(data));
        } catch (_) {
          out += `+${data}`;
        }
      }
      index = end;
    } else if (char === "-") {
      if (index + 1 < text.length && text.charAt(index + 1) === "-") {
        out += "-";
        index += 2;
      } else {
        out += "-";
        index += 1;
      }
    } else {
      out += char;
      index += 1;
    }
  }
  return out;
}

// ---- Message builders ------------------------------------------------------

export function sxButtonMessage(variantIndex, buttonIndex0) {
  const variant = SX_BUTTON_VARIANTS[variantIndex] || SX_BUTTON_VARIANTS[0];
  const index = Math.max(0, Math.min(9, Number(buttonIndex0) || 0));
  return Uint8Array.from([
    SYSEX_START, YAMAHA, DEVICE, MODEL,
    0x52, 0x25,
    ...variant.body,
    index,
    SYSEX_END
  ]);
}

export function sxBankSelectMessage(encodedPath) {
  const path = asciiBytes(encodedPath);
  return Uint8Array.from([
    SYSEX_START, YAMAHA, DEVICE, MODEL,
    0x52, 0x26, 0x03, 0x00, 0x00, 0x00,
    ...path,
    0x00,
    SYSEX_END
  ]);
}

export function sxBankQueryMessage() {
  return Uint8Array.from([
    SYSEX_START, YAMAHA, DEVICE, MODEL,
    0x52, 0x26, 0x03, 0x01, 0x00, SYSEX_END
  ]);
}

export function sxIdentityRequestMessage() {
  return Uint8Array.from([SYSEX_START, 0x7e, 0x7f, 0x06, 0x01, SYSEX_END]);
}

// ---- Parser ----------------------------------------------------------------

function isYamahaReg(bytes, length) {
  return length >= 7
    && bytes[0] === SYSEX_START
    && bytes[1] === YAMAHA
    && bytes[2] === DEVICE
    && bytes[3] === MODEL
    && bytes[4] === 0x52
    && (bytes[5] === 0x25 || bytes[5] === 0x26);
}

function isIdentityReply(bytes, length) {
  return length >= 12
    && bytes[0] === SYSEX_START
    && bytes[1] === 0x7e
    && bytes[3] === 0x06
    && bytes[4] === 0x02
    && bytes[5] === YAMAHA;
}

function hex2(value) {
  return (value & 0xff).toString(16).toUpperCase().padStart(2, "0");
}

function describeIdentity(bytes, length) {
  let out = "Identity：Yamaha";
  if (length >= 11) {
    out += ` family=${hex2(bytes[6])}${hex2(bytes[7])}`;
    out += ` member=${hex2(bytes[8])}${hex2(bytes[9])}`;
  }
  if (length > 11) {
    out += " version=";
    for (let index = 10; index < length - 1; index += 1) {
      out += hex2(bytes[index]);
      if (index + 1 < length - 1) out += ".";
    }
  }
  return out;
}

function buttonVariantLabel(bytes) {
  if (!bytes || bytes.length < 11) return "未知按键格式";
  if (bytes[6] === 0x11) {
    return bytes[8] === 0x01 ? "SX920 格式" : "SX 常用格式";
  }
  if (bytes[6] === 0x00) return "Genos/Tyros 格式";
  return "未知按键格式";
}

function parseButton(bytes, length) {
  const head = bytes[6];
  const button = length >= 2 ? bytes[length - 2] & 0x7f : 0;
  if (head === 0x11) {
    return {
      type: SX_EVENT.BUTTON_COMMAND,
      button: button + 1,
      detail: `按键命令回显（${buttonVariantLabel(bytes)}）`
    };
  }
  if (length <= 10) {
    return { type: SX_EVENT.LINK_REQUEST, button: 0, detail: "SongBook/链接请求" };
  }
  if (button >= 0 && button <= 9) {
    return {
      type: SX_EVENT.BUTTON_REPORT,
      button: button + 1,
      detail: `琴上按键（${buttonVariantLabel(bytes)}）`
    };
  }
  return { type: SX_EVENT.UNKNOWN, button: 0, detail: "按键消息（未识别）" };
}

function parseBank(bytes, length) {
  if (length < 10) {
    return { type: SX_EVENT.UNKNOWN, detail: "库消息过短" };
  }
  const kind = bytes[7];
  if (kind === 0x01) {
    return { type: SX_EVENT.BANK_QUERY, detail: "当前库查询" };
  }
  let start = 10;
  while (start < length && bytes[start] === 0x00) start += 1;
  if (start >= length) {
    return { type: SX_EVENT.UNKNOWN, detail: "库消息无路径" };
  }
  let end = start;
  while (end < length && bytes[end] !== 0x00 && bytes[end] !== SYSEX_END) end += 1;
  if (end <= start) {
    return { type: SX_EVENT.UNKNOWN, detail: "库消息无路径" };
  }
  let encodedPath = "";
  for (let index = start; index < end; index += 1) {
    encodedPath += String.fromCharCode(bytes[index]);
  }
  const report = kind === 0x02;
  return {
    type: report ? SX_EVENT.BANK_REPORT : SX_EVENT.BANK_COMMAND,
    encodedPath,
    displayPath: decodeSxPath(encodedPath),
    detail: report ? "琴回报当前库" : "琴发出/回显库路径"
  };
}

/**
 * Parses one complete SysEx message. Returns null for anything that is not a
 * Yamaha registration message so other handlers can ignore it cheaply.
 */
export function parseSxEvent(input) {
  const bytes = toBytes(input);
  const length = bytes.length;
  if (length < 2) return null;
  if (isIdentityReply(bytes, length)) {
    return {
      type: SX_EVENT.IDENTITY,
      button: 0,
      encodedPath: "",
      displayPath: "",
      detail: describeIdentity(bytes, length)
    };
  }
  if (!isYamahaReg(bytes, length)) return null;
  const command = bytes[5];
  if (command === 0x25) return parseButton(bytes, length);
  if (command === 0x26) return parseBank(bytes, length);
  return { type: SX_EVENT.UNKNOWN, button: 0, detail: "雅马哈 SysEx（未识别）" };
}
