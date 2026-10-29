// EV1 activation-code verification. Pure enough to test with an injected key.

import {
  PUBLIC_KEY_BASE64,
  MAX_ADD,
  b64ToBytes,
  derToRaw,
  importPublicKey
} from "./crypto.js";

export function splitActivationCode(code) {
  const text = String(code || "").trim();
  const parts = text.split(".");
  if (parts.length !== 3 || parts[0] !== "EV1") {
    throw new Error("激活码格式不正确");
  }
  return { payloadBytes: b64ToBytes(parts[1]), signatureDer: b64ToBytes(parts[2]) };
}

export function validatePayload(payload, now = Date.now()) {
  if (!payload || typeof payload !== "object") throw new Error("激活码内容无效");
  if (payload.v !== 1) throw new Error("激活码版本不支持");
  if (payload.typ !== "topup") throw new Error("激活码类型不正确");
  if (!payload.device || typeof payload.device !== "string") {
    throw new Error("激活码缺少设备码");
  }
  if (!payload.vid || typeof payload.vid !== "string") {
    throw new Error("激活码缺少编号");
  }
  const add = Number(payload.add);
  if (!Number.isInteger(add) || add < 1 || add > MAX_ADD) {
    throw new Error("激活次数无效");
  }
  if (payload.expected !== undefined && payload.expected !== null) {
    const expected = Number(payload.expected);
    if (!Number.isInteger(expected) || expected < 0 || expected > MAX_ADD) {
      throw new Error("激活码余额字段无效");
    }
  }
  const exp = Number(payload.exp || 0);
  if (!Number.isFinite(exp) || exp < 0) throw new Error("激活码有效期无效");
  if (exp > 0 && now > exp * 1000) throw new Error("激活码已过期");
  return { ...payload, add, exp };
}

export async function verifyActivation(code, options = {}) {
  const {
    publicKeyBase64 = PUBLIC_KEY_BASE64,
    now = Date.now()
  } = options;

  if (!globalThis.crypto?.subtle) {
    throw new Error("当前浏览器不支持 WebCrypto");
  }

  const { payloadBytes, signatureDer } = splitActivationCode(code);
  const raw = derToRaw(signatureDer);
  const key = await importPublicKey(publicKeyBase64);
  const valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    raw,
    payloadBytes
  );
  if (!valid) throw new Error("签名校验失败");

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch (_) {
    throw new Error("激活码内容不是有效 JSON");
  }
  return validatePayload(payload, now);
}
