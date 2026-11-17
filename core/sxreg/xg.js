// Yamaha XG helpers for reading/writing SX keyboard-part volumes.
// Ported from the Android app's sxreg/XgProtocol.kt.
//
// Parameter Request:  F0 43 3n 4C hh mm ll F7
// Parameter Change:   F0 43 1n 4C hh mm ll dd ... F7
// Bulk Dump:          F0 43 0n 4C aa bb hh mm ll dd ... cc F7
//
// XG Multi Part volume is 08 nn 0B (0…127); with the factory setup part nn
// receives on MIDI channel nn+1, so parts 0–3 are Right 1 / Right 2 / Right 3 /
// Left.

export const XG_MULTI_PART_HIGH = 0x08;
export const XG_VOLUME_LOW = 0x0b;
export const XG_PART_BLOCK_SIZE = 0x29;

/** F0 43 3n 4C 08 nn 0B F7 — ask one part for its current volume. */
export function xgVolumeRequest(part) {
  return Uint8Array.from([
    0xf0, 0x43, 0x30, 0x4c,
    XG_MULTI_PART_HIGH,
    Number(part) & 0x0f,
    XG_VOLUME_LOW,
    0xf7
  ]);
}

/** Extracts part volumes from an XG Parameter Change or Bulk Dump reply. */
export function parseXgVolumes(bytes, length = bytes?.length || 0) {
  if (!bytes || length < 9) return null;
  if (bytes[0] !== 0xf0 || bytes[1] !== 0x43 || bytes[3] !== 0x4c) return null;
  const kind = bytes[2] & 0xf0;
  if (kind === 0x10) {
    const high = bytes[4] & 0x7f;
    const part = bytes[5] & 0x7f;
    const low = bytes[6] & 0x7f;
    if (high !== XG_MULTI_PART_HIGH || low !== XG_VOLUME_LOW || part > 15) return null;
    return new Map([[part, bytes[7] & 0x7f]]);
  }
  if (kind === 0x00) {
    if (length < 11) return null;
    const count = ((bytes[4] & 0x7f) << 7) | (bytes[5] & 0x7f);
    if (count <= 0) return null;
    const high = bytes[6] & 0x7f;
    const part = bytes[7] & 0x7f;
    const low = bytes[8] & 0x7f;
    if (high !== XG_MULTI_PART_HIGH || part > 15) return null;
    const start = 9;
    const end = start + count;
    if (end > length) return null;
    const values = new Map();
    // A one-byte dump of the volume address itself.
    if (low === XG_VOLUME_LOW && count === 1) {
      values.set(part, bytes[start] & 0x7f);
      return values;
    }
    // A block dump starts at 08 nn 00; each part block is 0x29 bytes.
    if (low !== 0x00) return null;
    for (let current = part; current <= 15; current += 1) {
      const index = start + (current - part) * XG_PART_BLOCK_SIZE + XG_VOLUME_LOW;
      if (index >= end) break;
      values.set(current, bytes[index] & 0x7f);
    }
    return values.size ? values : null;
  }
  return null;
}
