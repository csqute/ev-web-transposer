// Yamaha bulk-dump packet and Live Set parsers, ported from Modx*.kt.

import {
  MODX_LIVE_PAGE_COUNT,
  MODX_LIVE_SLOT_COUNT,
  MODX_LIVE_SLOTS_PER_PAGE,
  emptySlot,
  normalizeBank,
  profileIsMSeries
} from "./model.js";

function asBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (Array.isArray(data)) return Uint8Array.from(data);
  if (data && typeof data.length === "number") return Uint8Array.from(data);
  return new Uint8Array(0);
}

function u8(value) {
  return value & 0xff;
}

function value14(data, offset) {
  if (offset < 0 || offset + 1 >= data.length) return 0;
  const first = data[offset] & 0x7f;
  const second = data[offset + 1] & 0x7f;
  const bigEndian = (first << 7) | second;
  return bigEndian <= 0x7f ? bigEndian : (second << 7) | first;
}

function decodeStrict(bytes, label) {
  try {
    const text = new TextDecoder(label, { fatal: true }).decode(bytes).trim();
    if (text && !text.includes("�") && [...text].some((char) => char.codePointAt(0) > 0x7f)) {
      return text;
    }
  } catch (_) {}
  return null;
}

/**
 * Reads a fixed-width Yamaha name. Tries ASCII, strict UTF-8 and strict
 * Shift_JIS, then falls back to printable ASCII with spaces.
 */
export function readName(raw, offset, length) {
  const data = asBytes(raw);
  if (offset < 0 || offset >= data.length) return "";
  const end = Math.min(offset + length, data.length);
  let actualEnd = end;
  for (let index = offset; index < end; index += 1) {
    if (data[index] === 0) {
      actualEnd = index;
      break;
    }
  }
  if (actualEnd <= offset) return "";
  let last = actualEnd - offset;
  while (last > 0 && (data[offset + last - 1] & 0xff) === 0x20) last -= 1;
  if (last <= 0) return "";
  const trimmed = data.slice(offset, offset + last);
  const asciiOnly = trimmed.every((value) => (value & 0xff) >= 0x20 && (value & 0xff) <= 0x7e);
  if (asciiOnly) {
    return String.fromCharCode(...trimmed);
  }
  return decodeStrict(trimmed, "utf-8")
    || decodeStrict(trimmed, "shift_jis")
    || String.fromCharCode(...Array.from(trimmed, (value) => {
      const code = value & 0xff;
      return code >= 0x20 && code <= 0x7e ? code : 0x20;
    })).trim();
}

export function decodeName(raw) {
  const data = asBytes(raw);
  return readName(data, 0, data.length);
}

// ---- Packet parser ---------------------------------------------------------

function matchesModel(modelId, profile) {
  if (!profile) return false;
  if (profileIsMSeries(profile)) return modelId === 0x0d;
  return modelId === 0x02 || modelId === 0x06 || modelId === 0x07;
}

/**
 * Parses one Yamaha bulk-dump packet.
 *
 * MODX / MONTAGE: F0 43 0n 7F 1C [count hi] [count lo] 02|07 [addr x3] data… sum F7
 * M-series:       F0 43 0n 7F 1C [count hi] [count lo] 0D     [addr x4] data… sum F7
 */
export function parseBulkDumpPacket(raw, profile) {
  const message = asBytes(raw);
  if (message.length < 10) return null;
  if (u8(message[0]) !== 0xf0 || u8(message[1]) !== 0x43) return null;
  if (u8(message[3]) !== 0x7f || u8(message[4]) !== 0x1c) return null;

  const byteCount = (u8(message[5]) << 7) | u8(message[6]);
  const modelId = u8(message[7]);
  if (!matchesModel(modelId, profile)) return null;

  const addressBytes = profile.addressBytes;
  const addressStart = 8;
  const dataStart = addressStart + addressBytes;
  const candidates = [...new Set([
    byteCount,
    byteCount - addressBytes,
    byteCount - addressBytes - 1,
    byteCount - 1
  ])].filter((value) => value >= 0);

  for (const dataLength of candidates) {
    const dataEnd = dataStart + dataLength;
    if (dataEnd + 1 >= message.length) continue;
    if (u8(message[dataEnd + 1]) !== 0xf7) continue;

    const checksum = u8(message[dataEnd]);
    let sum = 0;
    if (modelId === 0x0d) {
      sum += modelId;
    } else {
      sum += u8(message[5]);
      sum += u8(message[6]);
    }
    for (let index = addressStart; index < dataStart; index += 1) {
      sum += u8(message[index]);
    }
    for (let index = dataStart; index < dataEnd; index += 1) {
      sum += u8(message[index]);
    }
    sum += checksum;

    const address = Array.from({ length: addressBytes }, (_, index) =>
      u8(message[addressStart + index])
    );
    return {
      byteCount,
      modelId,
      addressBytes: address,
      data: message.slice(dataStart, dataEnd),
      checksumOk: (sum & 0x7f) === 0,
      rawLength: message.length,
      addressHex: address
        .map((value) => value.toString(16).toUpperCase().padStart(2, "0"))
        .join(" ")
    };
  }
  return null;
}

// ---- Slot / bank parsing ---------------------------------------------------

function parseOriginalSlot(data, offset, page, slot) {
  if (offset < 0 || offset + 26 > data.length) return emptySlot(page, slot);
  const name = readName(data, offset, 20);
  const performanceNumber = u8(data[offset + 21 + 2]) & 0x7f;
  return {
    page,
    slot,
    slotName: name,
    performanceName: "",
    customName: "",
    color: u8(data[offset + 20]) & 0x7f,
    bankMsb: u8(data[offset + 21]) & 0x7f,
    bankLsb: u8(data[offset + 22]) & 0x7f,
    performanceNumber,
    volume: u8(data[offset + 24]) & 0x7f,
    switchOn: (u8(data[offset + 25]) & 0x7f) !== 0,
    slotType: 0,
    contentNumber: performanceNumber,
    sssTime: 0
  };
}

function parseModxMSlot(data, offset, page, slot, name) {
  if (offset < 0 || offset + 18 > data.length) return emptySlot(page, slot, name);
  return {
    page,
    slot,
    slotName: name,
    performanceName: "",
    customName: "",
    color: value14(data, offset),
    bankMsb: value14(data, offset + 2),
    bankLsb: value14(data, offset + 4),
    performanceNumber: value14(data, offset + 6),
    volume: value14(data, offset + 8),
    switchOn: value14(data, offset + 10) !== 0,
    slotType: value14(data, offset + 12),
    contentNumber: value14(data, offset + 14),
    sssTime: value14(data, offset + 16)
  };
}

export function parseOriginalLiveSet(raw, profile, target = null) {
  const data = asBytes(raw);
  if (data.length < 20) return null;
  const bankName = readName(data, 0, 20);
  let offset = 20;
  const pageNames = Array.from({ length: MODX_LIVE_PAGE_COUNT }, (_, index) =>
    readName(data, offset + index * 20, 20)
  );
  offset += MODX_LIVE_PAGE_COUNT * 20;

  const slots = Array.from({ length: MODX_LIVE_SLOT_COUNT }, (_, index) =>
    emptySlot(
      Math.floor(index / MODX_LIVE_SLOTS_PER_PAGE),
      index % MODX_LIVE_SLOTS_PER_PAGE
    )
  );
  for (let page = 0; page < 8; page += 1) {
    for (let slot = 0; slot < MODX_LIVE_SLOTS_PER_PAGE; slot += 1) {
      const tableIndex = page * MODX_LIVE_SLOTS_PER_PAGE + slot;
      slots[page * MODX_LIVE_SLOTS_PER_PAGE + slot] = parseOriginalSlot(
        data,
        offset + tableIndex * 26,
        page,
        slot
      );
    }
  }
  offset += 128 * 26;
  for (let page = 8; page < MODX_LIVE_PAGE_COUNT; page += 1) {
    for (let slot = 0; slot < MODX_LIVE_SLOTS_PER_PAGE; slot += 1) {
      const tableIndex = (page - 8) * MODX_LIVE_SLOTS_PER_PAGE + slot;
      slots[page * MODX_LIVE_SLOTS_PER_PAGE + slot] = parseOriginalSlot(
        data,
        offset + tableIndex * 26,
        page,
        slot
      );
    }
  }

  return normalizeBank({
    profile: profile?.name || "MODX",
    kind: "CURRENT",
    bankIndex: 0,
    bankName,
    pageNames,
    slots,
    capturedAt: 0,
    partial: target ? data.length < target.expectedBytes : false
  });
}

export function parseModxMLiveSet(raw, pageIndex, target, profile, bankIndex = 0) {
  const data = asBytes(raw);
  if (data.length < 20) return null;
  const kind = captureBankKind(target);
  const partial = target ? data.length < target.expectedBytes : false;

  if (pageIndex != null) {
    const page = Math.max(0, Math.min(MODX_LIVE_PAGE_COUNT - 1, pageIndex));
    const pageName = readName(data, 0, 20);
    const pageNames = Array.from({ length: MODX_LIVE_PAGE_COUNT }, () => "");
    pageNames[page] = pageName;
    const slots = Array.from({ length: MODX_LIVE_SLOT_COUNT }, (_, index) =>
      emptySlot(
        Math.floor(index / MODX_LIVE_SLOTS_PER_PAGE),
        index % MODX_LIVE_SLOTS_PER_PAGE
      )
    );
    for (let slot = 0; slot < MODX_LIVE_SLOTS_PER_PAGE; slot += 1) {
      const name = readName(data, 20 + slot * 20, 20);
      const tableOffset = 20 + MODX_LIVE_SLOTS_PER_PAGE * 20 + slot * 18;
      slots[page * MODX_LIVE_SLOTS_PER_PAGE + slot] = parseModxMSlot(
        data,
        tableOffset,
        page,
        slot,
        name
      );
    }
    return normalizeBank({
      profile: profile?.name || "MODX_M_OS3",
      kind,
      bankIndex,
      bankName: pageName,
      pageNames,
      slots,
      partial
    });
  }

  const bankName = readName(data, 0, 20);
  let offset = 20;
  const pageNames = Array.from({ length: MODX_LIVE_PAGE_COUNT }, (_, index) =>
    readName(data, offset + index * 20, 20)
  );
  offset += MODX_LIVE_PAGE_COUNT * 20;
  const names = Array.from({ length: MODX_LIVE_SLOT_COUNT }, (_, index) =>
    readName(data, offset + index * 20, 20)
  );
  offset += MODX_LIVE_SLOT_COUNT * 20;
  const slots = Array.from({ length: MODX_LIVE_SLOT_COUNT }, (_, index) =>
    parseModxMSlot(
      data,
      offset + index * 18,
      Math.floor(index / MODX_LIVE_SLOTS_PER_PAGE),
      index % MODX_LIVE_SLOTS_PER_PAGE,
      names[index]
    )
  );
  return normalizeBank({
    profile: profile?.name || "MODX_M_OS3",
    kind,
    bankIndex,
    bankName,
    pageNames,
    slots,
    partial
  });
}

function captureBankKind(target) {
  switch (target?.name) {
    case "M_EDIT_BANK":
    case "M_EDIT_PAGE":
      return "EDIT";
    case "M_USER_BANK":
    case "M_USER_PAGE":
      return "USER";
    case "M_LIBRARY_BANK":
    case "M_LIBRARY_PAGE":
      return "LIBRARY";
    default:
      return "CURRENT";
  }
}

function writeInto(destination, destinationOffset, source) {
  if (!Number.isInteger(destinationOffset)
    || destinationOffset < 0
    || destinationOffset >= destination.length) {
    return;
  }
  const length = Math.min(source.length, destination.length - destinationOffset);
  if (length > 0) destination.set(source.slice(0, length), destinationOffset);
}

/**
 * Address-aware parse for the M-series Edit Buffer / User / Library dump.
 * The synth sends parameter records whose 4-byte addresses identify the
 * field (bank name, page name, slot name, slot table, ...).
 */
export function parseModxMFromPackets(packets, target, profile, rawSize = 0, bankIndex = 0) {
  if (!Array.isArray(packets) || !packets.length) return null;
  const bankNameBytes = new Uint8Array(20);
  const pageNames = Array.from({ length: MODX_LIVE_PAGE_COUNT }, () => new Uint8Array(20));
  const nameBytes = Array.from({ length: MODX_LIVE_SLOT_COUNT }, () => new Uint8Array(20));
  const tableBytes = Array.from({ length: MODX_LIVE_SLOT_COUNT }, () => new Uint8Array(18));
  const tableReceived = new Array(MODX_LIVE_SLOT_COUNT).fill(false);
  let matched = 0;

  for (const packet of packets) {
    const address = packet.addressBytes || [];
    if (address.length < 4) continue;
    const a0 = address[0] & 0x7f;
    const a1 = address[1] & 0x7f;
    const a2 = address[2] & 0x7f;
    const a3 = address[3] & 0x7f;
    if (a0 !== 0x03) continue;
    const data = packet.data;
    if (!data || !data.length) continue;

    if (a1 === 0x00 && a2 === 0x00) {
      writeInto(bankNameBytes, a3, data);
      matched += 1;
    } else if (a1 >= 0x10 && a1 <= 0x1f) {
      const page = a1 & 0x0f;
      if (a3 === 0 && data.length >= 20) {
        let currentPage = page;
        let offset = 0;
        while (offset + 20 <= data.length && currentPage < MODX_LIVE_PAGE_COUNT) {
          pageNames[currentPage].set(data.slice(offset, offset + 20), 0);
          offset += 20;
          currentPage += 1;
        }
      } else if (page >= 0 && page < MODX_LIVE_PAGE_COUNT) {
        writeInto(pageNames[page], a3, data);
      }
      matched += 1;
    } else if (a1 >= 0x20 && a1 <= 0x2f) {
      const page = a1 & 0x0f;
      const startSlot = a2 & 0x0f;
      if (a3 === 0 && data.length >= 20) {
        let flat = page * MODX_LIVE_SLOTS_PER_PAGE + startSlot;
        let offset = 0;
        while (offset + 20 <= data.length && flat < MODX_LIVE_SLOT_COUNT) {
          nameBytes[flat].set(data.slice(offset, offset + 20), 0);
          offset += 20;
          flat += 1;
        }
      } else {
        const flat = page * MODX_LIVE_SLOTS_PER_PAGE + startSlot;
        if (flat >= 0 && flat < MODX_LIVE_SLOT_COUNT) {
          writeInto(nameBytes[flat], a3, data);
        }
      }
      matched += 1;
    } else if (a1 >= 0x30 && a1 <= 0x3f) {
      const page = a1 & 0x0f;
      const startSlot = a2 & 0x0f;
      if (a3 === 0 && data.length >= 18) {
        let flat = page * MODX_LIVE_SLOTS_PER_PAGE + startSlot;
        let offset = 0;
        while (offset + 18 <= data.length && flat < MODX_LIVE_SLOT_COUNT) {
          tableBytes[flat].set(data.slice(offset, offset + 18), 0);
          tableReceived[flat] = true;
          offset += 18;
          flat += 1;
        }
      } else {
        const flat = page * MODX_LIVE_SLOTS_PER_PAGE + startSlot;
        if (flat >= 0 && flat < MODX_LIVE_SLOT_COUNT) {
          writeInto(tableBytes[flat], a3, data);
          tableReceived[flat] = true;
        }
      }
      matched += 1;
    }
  }

  if (!matched) return null;

  const slots = Array.from({ length: MODX_LIVE_SLOT_COUNT }, (_, flat) => {
    const page = Math.floor(flat / MODX_LIVE_SLOTS_PER_PAGE);
    const slot = flat % MODX_LIVE_SLOTS_PER_PAGE;
    const name = readName(nameBytes[flat], 0, 20);
    if (tableReceived[flat]) {
      const parsed = parseModxMSlot(tableBytes[flat], 0, page, slot, name);
      return name && !parsed.switchOn ? { ...parsed, switchOn: true } : parsed;
    }
    return name
      ? { ...emptySlot(page, slot, name), switchOn: true }
      : emptySlot(page, slot);
  });

  return normalizeBank({
    profile: profile?.name || "MODX_M_OS3",
    kind: captureBankKind(target),
    bankIndex,
    bankName: readName(bankNameBytes, 0, 20),
    pageNames: pageNames.map((bytes) => readName(bytes, 0, 20)),
    slots,
    partial: target ? rawSize < target.expectedBytes : false
  });
}

export function chooseModxBank(byAddress, bySequence) {
  const base = (
    byAddress && byAddress.slots.filter((slot) => slot.switchOn).length > 0
      ? byAddress
      : bySequence && bySequence.slots.filter((slot) => slot.switchOn).length > 0
        ? bySequence
        : byAddress || bySequence
  );
  if (!base) return null;
  if (byAddress && bySequence && base === byAddress) {
    return normalizeBank({
      ...base,
      bankName: base.bankName || bySequence.bankName,
      pageNames: base.pageNames.map((name, index) =>
        name || bySequence.pageNames?.[index] || ""
      )
    });
  }
  return base;
}

// ---- Capture session -------------------------------------------------------

export class ModxCaptureSession {
  constructor(target, profile) {
    this.target = target;
    this.profile = profile;
    this.output = [];
    this.packets = [];
    this.packetCount = 0;
    this.checksumErrors = 0;
    this.overflow = false;
    this.lastAddress = "—";
    this.lastByteCount = 0;
    this.lastPacketAt = 0;
  }

  get received() {
    return this.output.length;
  }

  get expected() {
    return this.target.expectedBytes;
  }

  get isComplete() {
    return this.received >= this.expected;
  }

  accept(packet) {
    if (!packet.checksumOk) this.checksumErrors += 1;
    const remaining = this.target.expectedBytes - this.output.length;
    if (remaining > 0) {
      const length = Math.min(packet.data.length, remaining);
      for (let index = 0; index < length; index += 1) {
        this.output.push(packet.data[index]);
      }
    }
    if (packet.data.length > remaining) this.overflow = true;
    this.packets.push(packet);
    this.packetCount += 1;
    this.lastAddress = packet.addressHex || "—";
    this.lastByteCount = packet.byteCount;
    this.lastPacketAt = Date.now();
  }

  bytes() {
    return Uint8Array.from(this.output);
  }
}

// ---- Performance name reader ----------------------------------------------

/**
 * Collects the Performance Name from a Performance bulk-dump response.
 * Requested header `04 ll mm nn`; the name lives at `06 00 00 00` (20 chars),
 * and the block ends with a `05 ll mm nn` footer.
 */
export class ModxPerformanceNameReader {
  constructor(header) {
    this.header = Array.from(header || []);
    this.nameBytes = new Uint8Array(20);
    this.headerSeen = false;
    this.footerSeen = false;
    this.packetCount = 0;
    this.lastActivityAt = Date.now();
    this.firstAddress = "—";
    this.lastAddress = "—";
  }

  accept(packet) {
    const address = packet.addressBytes || [];
    if (address.length < 4) return false;
    const a0 = address[0] & 0x7f;
    const a1 = address[1] & 0x7f;
    const a2 = address[2] & 0x7f;
    const a3 = address[3] & 0x7f;

    this.packetCount += 1;
    this.lastActivityAt = Date.now();
    if (this.packetCount === 1) this.firstAddress = packet.addressHex || "—";
    this.lastAddress = packet.addressHex || "—";

    if (a0 === 0x04 && this.matchesBlock(a1, a2, a3)) {
      this.headerSeen = true;
      return false;
    }
    if (a0 === 0x05 && this.matchesBlock(a1, a2, a3)) {
      this.footerSeen = true;
      return true;
    }
    if (a0 === 0x06 && a1 === 0x00 && a2 === 0x00) {
      const data = packet.data || new Uint8Array(0);
      if (a3 === 0 && data.length >= 20) {
        this.nameBytes.set(data.slice(0, 20), 0);
      } else if (a3 >= 0 && a3 < 20) {
        const length = Math.min(data.length, 20 - a3);
        if (length > 0) this.nameBytes.set(data.slice(0, length), a3);
      }
    }
    return false;
  }

  name() {
    return decodeName(this.nameBytes);
  }

  hasName() {
    return this.nameBytes.some((value) => value !== 0);
  }

  matchesBlock(a1, a2, a3) {
    return this.header.length >= 4
      && a1 === (this.header[1] & 0x7f)
      && a2 === (this.header[2] & 0x7f)
      && a3 === (this.header[3] & 0x7f);
  }
}
