// ECDSA / device-code helpers. The public key is the same one used by the
// Android app and the existing web demo; the private key stays in the tool.

export const PUBLIC_KEY_BASE64 =
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEP5G5O8WjhGQTgpx7+4xQd1zWfVFDaGnLnPpy4AB8A/bo2OzcX6InF+O2auEmywT794/aohuAb95bCtllaLDypw==";

export const FREE_BASE_COUNT = 50;
export const MAX_ADD = 10000000;
export const DEVICE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const DEVICE_RE = /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/;

const keyCache = new Map();

export function b64ToBytes(text) {
  const clean = String(text).replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const padded = clean + "=".repeat((4 - (clean.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// WebCrypto consumes raw r||s while the license tool signs with DER.
export function derToRaw(der) {
  if (!der || der[0] !== 0x30) throw new Error("签名格式错误");
  let offset = 2;
  if (der[1] & 0x80) throw new Error("签名格式不支持");
  if (der[offset] !== 0x02) throw new Error("签名缺少 r");
  const rLen = der[offset + 1];
  let r = der.slice(offset + 2, offset + 2 + rLen);
  offset += 2 + rLen;
  if (der[offset] !== 0x02) throw new Error("签名缺少 s");
  const sLen = der[offset + 1];
  let s = der.slice(offset + 2, offset + 2 + sLen);
  const normalize = (value) => {
    while (value.length > 32 && value[0] === 0) value = value.slice(1);
    while (value.length < 32) {
      const next = new Uint8Array(value.length + 1);
      next.set(value, 1);
      value = next;
    }
    if (value.length !== 32) throw new Error("签名长度不正确");
    return value;
  };
  const out = new Uint8Array(64);
  out.set(normalize(r), 0);
  out.set(normalize(s), 32);
  return out;
}

export function importPublicKey(base64 = PUBLIC_KEY_BASE64) {
  if (!keyCache.has(base64)) {
    keyCache.set(base64, crypto.subtle.importKey(
      "spki",
      b64ToBytes(base64),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    ));
  }
  return keyCache.get(base64);
}

export function randomDeviceCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    out += DEVICE_ALPHABET[bytes[i] % DEVICE_ALPHABET.length];
    if (i === 3 || i === 7 || i === 11) out += "-";
  }
  return out;
}

export function isValidDeviceCode(code) {
  return DEVICE_RE.test(String(code || "").toUpperCase());
}

export function normalizeDeviceCode(code) {
  return String(code || "").toUpperCase();
}
