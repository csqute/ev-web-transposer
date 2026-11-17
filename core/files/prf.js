// Reads Keyboard Set names from a KORG Pa .PRF export. Ported from
// PrfKeyboardSetParser.kt; only names and positions are read.

const NAME_CHUNK = [0, 2, 0, 0x1c];
const NAME_LENGTH = 28;
const PAGE_ID_OFFSET = 10;
const MAX_SLOT = 47;

function indexOf(bytes, pattern, from) {
  const last = bytes.length - pattern.length;
  let start = Math.max(0, from);
  while (start <= last) {
    let matched = true;
    for (let offset = 0; offset < pattern.length; offset += 1) {
      if (bytes[start + offset] !== pattern[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return start;
    start += 1;
  }
  return -1;
}

function hasRecordHeader(bytes, at) {
  return at >= 4
    && bytes[at - 4] === 0
    && bytes[at - 2] === 0
    && bytes[at - 1] === 5
    && bytes[at + 32] === 0
    && bytes[at + 33] === 0
    && bytes[at + 34] === 0
    && bytes[at + 35] === 3
    && bytes[at + 36] === 1
    && bytes[at + 39] === 0;
}

function readName(bytes, start) {
  let end = start + NAME_LENGTH;
  for (let index = start; index < start + NAME_LENGTH; index += 1) {
    if (bytes[index] === 0) {
      end = index;
      break;
    }
  }
  if (end <= start) return null;
  let output = "";
  for (let index = start; index < end; index += 1) {
    const value = bytes[index];
    if (value < 0x20 || value === 0x7f) return null;
    output += String.fromCharCode(value);
  }
  const name = output.trim();
  return name || null;
}

export function parsePrf(bytes) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const banks = {};
  let records = 0;
  let skipped = 0;
  let searchFrom = 0;
  while (true) {
    const at = indexOf(source, NAME_CHUNK, searchFrom);
    if (at < 0) break;
    searchFrom = at + 1;
    if (!hasRecordHeader(source, at) || at + NAME_LENGTH + 12 > source.length) {
      skipped += 1;
      continue;
    }
    const pageId = source[at + 37];
    const slot = source[at + 38];
    const page = pageId - PAGE_ID_OFFSET;
    if (page < 1 || page > 9 || slot > MAX_SLOT) {
      skipped += 1;
      continue;
    }
    const name = readName(source, at + 4);
    if (!name) {
      skipped += 1;
      continue;
    }
    if (!banks[page]) banks[page] = {};
    banks[page][slot] = name;
    records += 1;
  }
  return { banks, records, skipped, pages: Object.keys(banks).length };
}
