// Byte-level transpose encoders/decoders, ported from the Android app's
// midi/TransposeEncoder.kt and midi/TransposeDecoder.kt.

export const MIN_OFFSET = -12;
export const MAX_OFFSET = 12;

export const PROTOCOL_MODES = [
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
];

export const PROTOCOL_LABELS = {
  AUTO: "自动（推荐）",
  UNIVERSAL: "通用",
  RPN: "RPN × 16 通道",
  YAMAHA_MODX_M: "雅马哈新款（MODX M）",
  YAMAHA_MODX: "雅马哈老款（MODX）",
  YAMAHA_MONTAGE: "雅马哈 MONTAGE",
  LEARNED: "学习模板",
  ALL: "全能备用",
  SX_ECHO: "SX 回环",
  MIDI_ECHO: "MIDI 回环",
  OFF: "关闭"
};

export const MIDI_MODE_OPTIONS = [
  "AUTO",
  "UNIVERSAL",
  "RPN",
  "YAMAHA_MODX_M",
  "YAMAHA_MODX",
  "YAMAHA_MONTAGE",
  "LEARNED",
  "ALL",
  "MIDI_ECHO",
  "OFF"
];

export const SX_MODE_OPTIONS = ["SX_ECHO", "OFF"];

const NO_VALUE = -1;

// Order and bytes exactly match the Android ALL_COMMANDS table.
export const ALL_TEMPLATES = [
  { model: "Yamaha MODX", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x07, 0x00, 0x00, 0x07, 0x40, 0xF7], valueIndex: 9 },
  { model: "Universal device 0", bytes: [0xF0, 0x7F, 0x00, 0x04, 0x04, 0x00, 0x40, 0xF7], valueIndex: 6 },
  { model: "Yamaha CP88/CP73", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x08, 0x20, 0x00, 0x07, 0x40, 0xF7], valueIndex: 9 },
  { model: "Universal broadcast", bytes: [0xF0, 0x7F, 0x7F, 0x04, 0x04, 0x00, 0x40, 0xF7], valueIndex: 6 },
  { model: "Yamaha MOTIF ES/MO", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x00, 0x00, 0x00, 0x01, 0x40, 0xF7], valueIndex: 8 },
  { model: "Yamaha MOTIF-RACK XS", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x03, 0x00, 0x00, 0x01, 0x40, 0xF7], valueIndex: 8 },
  { model: "Korg KRONOS header", bytes: [0xF0, 0x42, 0x30, 0x68, 0xF7], valueIndex: NO_VALUE },
  { model: "Universal device 0", bytes: [0xF0, 0x7F, 0x00, 0x04, 0x04, 0x00, 0x40, 0xF7], valueIndex: 6 },
  { model: "Yamaha MOXF", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x00, 0x00, 0x00, 0x01, 0x40, 0xF7], valueIndex: 9 },
  { model: "Yamaha MX49/61/88", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x17, 0x00, 0x00, 0x01, 0x40, 0xF7], valueIndex: 8 },
  { model: "Yamaha CK61/88", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x0B, 0x20, 0x00, 0x07, 0x40, 0xF7], valueIndex: 9 },
  { model: "Yamaha MONTAGE", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x02, 0x00, 0x00, 0x07, 0x40, 0xF7], valueIndex: 9 },
  { model: "Yamaha MODX M/MONTAGE M", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x0D, 0x00, 0x00, 0x02, 0x00, 0x00, 0x40, 0xF7], valueIndex: 11 },
  { model: "Korg device request", bytes: [0xF0, 0x42, 0x30, 0x00, 0x01, 0x49, 0xF7], valueIndex: NO_VALUE },
  { model: "Universal device 0", bytes: [0xF0, 0x7F, 0x00, 0x04, 0x04, 0x00, 0x40, 0xF7], valueIndex: 6 },
  { model: "Yamaha reface YC", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x06, 0x00, 0x00, 0x07, 0x40, 0xF7], valueIndex: 9 },
  { model: "Korg device request", bytes: [0xF0, 0x42, 0x30, 0x00, 0x01, 0x15, 0xF7], valueIndex: NO_VALUE },
  { model: "Universal device 0", bytes: [0xF0, 0x7F, 0x00, 0x04, 0x04, 0x00, 0x40, 0xF7], valueIndex: 6 },
  { model: "Universal device 0", bytes: [0xF0, 0x7F, 0x00, 0x04, 0x04, 0x00, 0x40, 0xF7], valueIndex: 6 },
  { model: "Yamaha MOTIF XF", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x12, 0x00, 0x00, 0x01, 0x40, 0xF7], valueIndex: 8 },
  { model: "Korg TRITON header", bytes: [0xF0, 0x42, 0x30, 0x50, 0xF7], valueIndex: NO_VALUE },
  { model: "Universal device 0", bytes: [0xF0, 0x7F, 0x00, 0x04, 0x04, 0x00, 0x40, 0xF7], valueIndex: 6 },
  { model: "Yamaha YC61/73/88", bytes: [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x09, 0x00, 0x00, 0x07, 0x40, 0xF7], valueIndex: 9 }
];

const NEW_YAMAHA = /\b(MODX|MONTAGE)\s+M(\d|\b)/i;

export function valueByte(offset) {
  const value = Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, Number(offset) | 0));
  return (0x40 + value) & 0x7F;
}

export function universal(offset) {
  return [0xF0, 0x7F, 0x7F, 0x04, 0x04, 0x00, valueByte(offset), 0xF7];
}

export function yamahaModx(offset) {
  return [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x07, 0x00, 0x00, 0x07, valueByte(offset), 0xF7];
}

export function yamahaModxM(offset) {
  return [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x0D, 0x00, 0x00, 0x02, 0x00, 0x00, valueByte(offset), 0xF7];
}

export function yamahaMontage(offset) {
  return [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x02, 0x00, 0x00, 0x07, valueByte(offset), 0xF7];
}

// RPN master coarse tuning on every channel. Split into 96 three-byte
// messages so Web MIDI bridges that expect one message per send behave well.
export function rpnCommands(offset) {
  const value = valueByte(offset);
  const messages = [];
  for (let channel = 0; channel < 16; channel += 1) {
    const status = 0xB0 | channel;
    messages.push([status, 65, 0]);
    messages.push([status, 64, 2]);
    messages.push([status, 6, value]);
    messages.push([status, 38, 0]);
    messages.push([status, 65, 0x7F]);
    messages.push([status, 64, 0x7F]);
  }
  return messages;
}

export function allCommands(offset) {
  const value = valueByte(offset);
  return ALL_TEMPLATES.map((template) => {
    const bytes = template.bytes.slice();
    if (template.valueIndex !== NO_VALUE) bytes[template.valueIndex] = value;
    return bytes;
  });
}

export function resolveMode(mode, modelName = "", template = null) {
  if (mode !== "AUTO") {
    if (mode === "LEARNED" && !template) return "UNIVERSAL";
    return mode;
  }
  if (template) return "LEARNED";
  const name = String(modelName || "");
  if (NEW_YAMAHA.test(name)) return "YAMAHA_MODX_M";
  const upper = name.toUpperCase();
  if (upper.includes("MODX")) return "YAMAHA_MODX";
  if (upper.includes("MONTAGE")) return "YAMAHA_MONTAGE";
  if (upper.includes("YAMAHA")) return "YAMAHA_MODX";
  return "UNIVERSAL";
}

export function encodeTranspose({ mode = "AUTO", offset = 0, channel = 0, modelName = "", template = null } = {}) {
  const resolvedMode = resolveMode(mode, modelName, template);
  let messages;
  switch (resolvedMode) {
    case "UNIVERSAL":
    case "AUTO":
      messages = [universal(offset)];
      break;
    case "RPN":
      messages = rpnCommands(offset);
      break;
    case "YAMAHA_MODX_M":
      messages = [yamahaModxM(offset)];
      break;
    case "YAMAHA_MODX":
      messages = [yamahaModx(offset)];
      break;
    case "YAMAHA_MONTAGE":
      messages = [yamahaMontage(offset)];
      break;
    case "LEARNED":
      messages = [template ? encodeLearned(template, offset) : universal(offset)];
      break;
    case "ALL":
      messages = allCommands(offset);
      break;
    case "SX_ECHO":
    case "MIDI_ECHO":
    case "OFF":
      messages = [];
      break;
    default:
      messages = [universal(offset)];
  }
  return { resolvedMode, messages };
}

export function encodeLearned(template, offset) {
  const bytes = template.bytes.slice();
  let value = template.base + (Number(offset) | 0) * template.stepPerSemitone;
  if (template.signed && value < 0) value += 128;
  bytes[template.valueIndex] = value & 0x7F;
  if (template.checksum === "ROLAND") {
    const checksumIndex = bytes.length - 2;
    const commandIndex = bytes.indexOf(0x12);
    if (commandIndex >= 0 && commandIndex < checksumIndex - 1 && template.valueIndex !== checksumIndex) {
      let sum = 0;
      for (let i = commandIndex + 1; i < checksumIndex; i += 1) sum += bytes[i] & 0x7F;
      bytes[checksumIndex] = (128 - (sum % 128)) & 0x7F;
    }
  }
  return bytes;
}

export function templateMatches(template, bytes) {
  if (!template || bytes.length !== template.bytes.length) return false;
  const checksumIndex = template.checksum === "ROLAND" ? template.bytes.length - 2 : -1;
  for (let i = 0; i < template.bytes.length; i += 1) {
    if (i === template.valueIndex || i === checksumIndex) continue;
    if (bytes[i] !== template.bytes[i]) return false;
  }
  return true;
}

export function templateDecodeOffset(template, bytes) {
  if (!templateMatches(template, bytes)) return null;
  if (!template.stepPerSemitone) return null;
  let difference = bytes[template.valueIndex] - template.base;
  if (template.signed && difference > 64) difference -= 128;
  if (difference % template.stepPerSemitone !== 0) return null;
  const offset = difference / template.stepPerSemitone;
  return offset >= -24 && offset <= 24 ? offset : null;
}

export function decodeTranspose(bytes, template = null) {
  if (!bytes || bytes.length < 4) return null;
  if (template) {
    const learned = templateDecodeOffset(template, bytes);
    if (learned !== null) return inFollowRange(learned);
  }
  if (bytes.length === 8 &&
      bytes[0] === 0xF0 && bytes[1] === 0x7F &&
      bytes[3] === 0x04 && bytes[4] === 0x04 && bytes[5] === 0x00 &&
      bytes[7] === 0xF7) {
    return inFollowRange(bytes[6] - 0x40);
  }
  if (bytes.length === 11 &&
      bytes[0] === 0xF0 && bytes[1] === 0x43 && bytes[2] === 0x10 && bytes[3] === 0x7F &&
      bytes[4] === 0x1C && (bytes[5] === 0x07 || bytes[5] === 0x02) &&
      bytes[7] === 0x00 && bytes[8] === 0x07 && bytes[10] === 0xF7) {
    return inFollowRange(bytes[9] - 0x40);
  }
  if (bytes.length === 13 &&
      bytes[0] === 0xF0 && bytes[1] === 0x43 && bytes[2] === 0x10 && bytes[3] === 0x7F &&
      bytes[4] === 0x1C && bytes[5] === 0x0D &&
      bytes[6] === 0x00 && bytes[7] === 0x00 && bytes[8] === 0x02 &&
      bytes[9] === 0x00 && bytes[10] === 0x00 && bytes[12] === 0xF7) {
    return inFollowRange(bytes[11] - 0x40);
  }
  return null;
}

function inFollowRange(value) {
  return value >= -12 && value <= 12 ? value : null;
}

export function protocolLabel(mode) {
  return PROTOCOL_LABELS[mode] || mode;
}
