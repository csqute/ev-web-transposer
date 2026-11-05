// Animated multi-frame QR transport shared with the Android app.
//
// Frame text: EVQR1|session|index|total|crc32|mode|base64url-chunk
// mode: d = zlib deflate, r = raw bytes (used when compression is not smaller)
//
// The camera scanner uses window.jsQR, loaded as a classic script from
// vendor/jsQR.js. QR generation uses the MIT-licensed vendor/qrcode.mjs.

import qrcode from "../vendor/qrcode.mjs";

export const QR_PREFIX = "EVQR1";
// Smaller chunks keep the QR modules large enough to focus on another
// screen; 300 bytes is ~430 Base64 characters per frame.
export const QR_CHUNK_BYTES = 300;
export const QR_MAX_CHUNK_BYTES = 4096;
export const QR_MAX_FRAMES = 5000;
export const QR_MAX_DECOMPRESSED_BYTES = 4 * 1024 * 1024;

const BASE64URL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToBase64Url(bytes) {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const b0 = bytes[index];
    const b1 = bytes[index + 1];
    const b2 = bytes[index + 2];
    output += BASE64URL[b0 >> 2];
    output += BASE64URL[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 === undefined) break;
    output += BASE64URL[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 === undefined) break;
    output += BASE64URL[b2 & 0x3f];
  }
  return output;
}

function base64UrlToBytes(text) {
  const clean = String(text || "").replace(/=+$/, "");
  if (!clean) return new Uint8Array(0);
  const output = [];
  let buffer = 0;
  let bits = 0;
  for (const character of clean) {
    const value = BASE64URL.indexOf(character);
    if (value < 0) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(output);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

export function randomQrSession() {
  const bytes = new Uint8Array(4);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function deflate(bytes) {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new CompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (_) {
    return null;
  }
}

async function inflate(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("浏览器不支持解压");
  }
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Builds the animated frame list for a backup JSON string. */
export async function encodeQrFrames(json, options = {}) {
  const chunkBytes = Math.max(
    200,
    Math.min(QR_MAX_CHUNK_BYTES, options.chunkBytes || QR_CHUNK_BYTES)
  );
  const session = options.session || randomQrSession();
  if (!/^[0-9a-fA-F]{8}$/.test(session)) throw new Error("session 必须是 8 位十六进制");
  const raw = new TextEncoder().encode(json);
  const compressed = await deflate(raw);
  const useDeflate = !!compressed && compressed.length < raw.length;
  const payload = useDeflate ? compressed : raw;
  const checksum = crc32(payload);
  const mode = useDeflate ? "d" : "r";
  const total = Math.max(1, Math.ceil(payload.length / chunkBytes));
  if (total > QR_MAX_FRAMES) {
    throw new Error(`备份太大，二维码需要 ${total} 帧，请改用文件导出`);
  }
  const frames = [];
  for (let index = 0; index < total; index += 1) {
    const chunk = payload.slice(index * chunkBytes, (index + 1) * chunkBytes);
    frames.push(
      `${QR_PREFIX}|${session}|${index}|${total}|` +
        `${checksum.toString(16).padStart(8, "0")}|${mode}|${bytesToBase64Url(chunk)}`
    );
  }
  return {
    frames,
    session,
    total,
    rawBytes: raw.length,
    payloadBytes: payload.length,
    deflated: useDeflate
  };
}

export function parseQrFrame(text) {
  const parts = String(text || "").trim().split("|");
  if (parts.length !== 7 || parts[0] !== QR_PREFIX) return null;
  const session = parts[1];
  if (!/^[0-9a-fA-F]{8}$/.test(session)) return null;
  const index = Number(parts[2]);
  const total = Number(parts[3]);
  if (!Number.isInteger(index) || !Number.isInteger(total)) return null;
  if (total < 1 || total > QR_MAX_FRAMES || index < 0 || index >= total) return null;
  const checksum = Number.parseInt(parts[4], 16);
  if (!Number.isInteger(checksum) || checksum < 0 || checksum > 0xffffffff) return null;
  if (parts[5] !== "d" && parts[5] !== "r") return null;
  const data = base64UrlToBytes(parts[6]);
  if (!data || data.length > QR_MAX_CHUNK_BYTES) return null;
  return {
    session: session.toLowerCase(),
    index,
    total,
    crc: checksum,
    deflated: parts[5] === "d",
    data
  };
}

/** Collects frames in any order until every chunk is present. */
export class QrCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.session = null;
    this.total = 0;
    this.crc = 0;
    this.deflated = true;
    this.chunks = [];
    this.received = 0;
  }

  async accept(info) {
    if (!info) return { status: "ignored" };
    if (this.session === null) {
      this.session = info.session;
      this.total = info.total;
      this.crc = info.crc;
      this.deflated = info.deflated;
      this.chunks = new Array(info.total).fill(null);
      this.received = 0;
    }
    if (
      info.session !== this.session ||
      info.total !== this.total ||
      info.crc !== this.crc ||
      info.deflated !== this.deflated
    ) {
      return { status: "ignored" };
    }
    if (info.index < 0 || info.index >= this.chunks.length) {
      return { status: "ignored" };
    }
    if (this.chunks[info.index]) {
      return { status: "progress", received: this.received, total: this.total };
    }
    this.chunks[info.index] = info.data;
    this.received += 1;
    if (this.received < this.total) {
      return { status: "progress", received: this.received, total: this.total };
    }
    const length = this.chunks.reduce((sum, chunk) => sum + (chunk?.length || 0), 0);
    const payload = new Uint8Array(length);
    let offset = 0;
    for (const chunk of this.chunks) {
      if (!chunk) {
        this.reset();
        return { status: "invalid", reason: "缺少一帧，请重新扫描" };
      }
      payload.set(chunk, offset);
      offset += chunk.length;
    }
    if (crc32(payload) !== this.crc) {
      this.reset();
      return { status: "invalid", reason: "二维码校验失败，请重新扫描" };
    }
    let bytes = payload;
    if (this.deflated) {
      try {
        bytes = await inflate(payload);
      } catch (_) {
        this.reset();
        return { status: "invalid", reason: "二维码内容解压失败，请重新扫描" };
      }
    }
    if (bytes.length > QR_MAX_DECOMPRESSED_BYTES) {
      this.reset();
      return { status: "invalid", reason: "二维码内容过大" };
    }
    return { status: "complete", json: new TextDecoder().decode(bytes) };
  }
}

/** Draws one QR frame into a canvas, sized for scanning from another screen. */
export function renderQrToCanvas(text, canvas, maxSize = 640) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const margin = 4;
  const scale = Math.max(1, Math.floor(maxSize / (count + margin * 2)));
  const size = (count + margin * 2) * scale;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#000000";
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (qr.isDark(row, column)) {
        context.fillRect(
          (column + margin) * scale,
          (row + margin) * scale,
          scale,
          scale
        );
      }
    }
  }
  return size;
}

/**
 * Starts the rear camera and decodes QR frames continuously.
 * Returns a stop function. onFrame receives decoded text and may be async.
 */
export async function startCameraScanner({ video, canvas, onFrame, onError }) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("浏览器不支持摄像头");
  }
  if (typeof window === "undefined" || typeof window.jsQR !== "function") {
    throw new Error("二维码识别库未加载");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false
  });
  video.srcObject = stream;
  video.setAttribute("playsinline", "");
  video.muted = true;
  await video.play();
  const context = canvas.getContext("2d", { willReadFrequently: true });
  let stopped = false;
  let lastScan = 0;
  const tick = async (now) => {
    if (stopped) return;
    if (now - lastScan > 120 && video.readyState >= 2) {
      lastScan = now;
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width && height) {
        const scale = Math.min(1, 720 / Math.max(width, height));
        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        context.drawImage(video, 0, 0, targetWidth, targetHeight);
        const image = context.getImageData(0, 0, targetWidth, targetHeight);
        const result = window.jsQR(image.data, targetWidth, targetHeight, {
          inversionAttempts: "dontInvert"
        });
        if (result?.data) {
          try {
            await onFrame(result.data);
          } catch (error) {
            onError?.(error?.message || String(error));
          }
        }
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return () => {
    stopped = true;
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };
}
