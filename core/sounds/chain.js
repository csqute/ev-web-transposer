// Sound-chain model, ported from model/SoundChain.kt.

import { noteLabel, signedOffset, wrapOffset } from "../midi/notes.js";
import { KEYBOARD_SET_BANKS, nameAt } from "./picker.js";
import {
  normalizeRef,
  refDetail,
  refEffectiveName,
  refShortPosition
} from "../modx/model.js";

export const SOUND_CHAIN_MAX_CHAINS = 50;
export const SOUND_CHAIN_MAX_LINKS = 128;
export const SOUND_CHAIN_NAME_MAX = 24;
export const SOUND_CHAIN_LINK_NAME_MAX = 24;
export const SOUND_CHAIN_MAX_COLOR_INDEX = 7;

export function newId() {
  try {
    return crypto.randomUUID();
  } catch (_) {
    return `sc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function bankLabel(msb) {
  switch (msb) {
    case KEYBOARD_SET_BANKS.FACTORY:
      return "出厂";
    case KEYBOARD_SET_BANKS.USER:
      return "用户";
    case KEYBOARD_SET_BANKS.DIRECT:
      return "直接用户";
    case KEYBOARD_SET_BANKS.LOCAL:
      return "本机";
    default:
      return "自定义";
  }
}

export function pageRange(msb) {
  if (msb === KEYBOARD_SET_BANKS.FACTORY) return [1, 8];
  if ([KEYBOARD_SET_BANKS.USER, KEYBOARD_SET_BANKS.DIRECT, KEYBOARD_SET_BANKS.LOCAL].includes(msb)) {
    return [0, 8];
  }
  return [0, 127];
}

export function programRange(msb) {
  if ([KEYBOARD_SET_BANKS.USER, KEYBOARD_SET_BANKS.DIRECT, KEYBOARD_SET_BANKS.LOCAL].includes(msb)) {
    return [0, 47];
  }
  return [0, 127];
}

export function factoryCategory(lsb) {
  return {
    1: "风琴",
    2: "吉他",
    3: "弦乐",
    4: "铜管",
    5: "小号",
    6: "萨克斯/木管",
    7: "合成器",
    8: "民族"
  }[lsb] || `分类 ${lsb}`;
}

export function pageDisplay(link) {
  return link.bankMsb === KEYBOARD_SET_BANKS.FACTORY ? link.bankLsb : link.bankLsb + 1;
}

export function numberDisplay(link) {
  return link.program + 1;
}

export function normalizeTranspose(raw, legacy = null) {
  if (raw && typeof raw === "object") {
    const mode = raw.mode === "TARGET" ? "TARGET" : "OFFSET";
    const value = Number.isInteger(raw.value)
      ? Math.max(-12, Math.min(12, raw.value))
      : 0;
    return { mode, value };
  }
  if (legacy && typeof legacy === "object") {
    const mode = legacy.tmode === "target" ? "TARGET" : "OFFSET";
    const value = Number.isInteger(legacy.tvalue)
      ? Math.max(-12, Math.min(12, legacy.tvalue))
      : 0;
    return { mode, value };
  }
  return null;
}

export function transposeSummary(transpose) {
  if (!transpose) return "";
  return transpose.mode === "OFFSET"
    ? `移调 ${signedOffset(transpose.value)}`
    : `Key=${noteLabel(transpose.value)}`;
}

export function transposeDetail(transpose) {
  if (!transpose) return "";
  return transpose.mode === "OFFSET"
    ? `相对当前 ${signedOffset(transpose.value)} 半音`
    : `Key=${noteLabel(transpose.value)} · 直接设为 ${signedOffset(transpose.value)} 半音`;
}

export function transposeTileDetail(transpose) {
  if (!transpose) return "";
  return transpose.mode === "OFFSET"
    ? `相对 ${signedOffset(transpose.value)}`
    : `${signedOffset(transpose.value)} 半音`;
}

export function transposeOffsetFor(transpose, currentOffset) {
  if (!transpose) return currentOffset;
  return transpose.mode === "OFFSET"
    ? wrapOffset(currentOffset + transpose.value)
    : wrapOffset(transpose.value);
}

export function normalizeLink(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const intOr = (value, fallback) => Number.isInteger(value) ? value : fallback;
  const legacyTranspose = source.type === "transpose" ? source : null;
  return {
    id: String(source.id || newId()),
    name: String(source.name || "").trim().slice(0, SOUND_CHAIN_LINK_NAME_MAX),
    bankMsb: Math.max(0, Math.min(127, intOr(
      source.bankMsb !== undefined ? source.bankMsb : source.msb,
      KEYBOARD_SET_BANKS.USER
    ))),
    bankLsb: Math.max(0, Math.min(127, intOr(
      source.bankLsb !== undefined ? source.bankLsb : source.lsb,
      0
    ))),
    program: Math.max(0, Math.min(127, intOr(
      source.program !== undefined ? source.program : source.pc,
      0
    ))),
    colorIndex: Math.max(0, Math.min(SOUND_CHAIN_MAX_COLOR_INDEX, intOr(
      source.colorIndex !== undefined ? source.colorIndex : source.color,
      0
    ))),
    transpose: normalizeTranspose(source.transpose, legacyTranspose),
    /** KORG = PA Keyboard Set; MODX = Yamaha Live Set / Performance. */
    source: source.source === "MODX" ? "MODX" : "KORG",
    /** Present when source is MODX; a self-contained snapshot. */
    modx: source.modx && typeof source.modx === "object" ? normalizeRef(source.modx) : null
  };
}

export function createChain(name = "音色链 1", id = newId()) {
  return {
    id,
    name: String(name || "音色链 1").trim().slice(0, SOUND_CHAIN_NAME_MAX) || "音色链 1",
    links: [],
    currentIndex: -1
  };
}

export function normalizeChain(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const links = (Array.isArray(source.links) ? source.links : [])
    .slice(0, SOUND_CHAIN_MAX_LINKS)
    .map(normalizeLink);
  return {
    id: String(source.id || newId()),
    name: String(source.name || "").trim().slice(0, SOUND_CHAIN_NAME_MAX) || "未命名链",
    links,
    currentIndex: Number.isInteger(source.currentIndex)
      ? Math.max(-1, Math.min(links.length - 1, source.currentIndex))
      : -1
  };
}

export function defaultSoundChain() {
  return {
    version: 2,
    activeChainIndex: 0,
    chains: [createChain("音色链 1")]
  };
}

export function normalizeSoundChain(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const sourceChains = Array.isArray(source.chains) ? source.chains : [];
  const chains = (sourceChains.length ? sourceChains : [createChain("音色链 1")])
    .slice(0, SOUND_CHAIN_MAX_CHAINS)
    .map(normalizeChain);
  return {
    version: 2,
    chains,
    activeChainIndex: Number.isInteger(source.activeChainIndex)
      ? Math.max(0, Math.min(chains.length - 1, source.activeChainIndex))
      : 0
  };
}

export function activeChain(state) {
  return state.chains[state.activeChainIndex] || state.chains[0];
}

export function updateActiveChain(state, chain) {
  const chains = [...state.chains];
  chains[state.activeChainIndex] = normalizeChain(chain);
  return { ...state, chains };
}

export function addLink(state, link) {
  const chain = activeChain(state);
  if (chain.links.length >= SOUND_CHAIN_MAX_LINKS) return { state, added: false };
  const next = normalizeChain({
    ...chain,
    links: [...chain.links, normalizeLink(link)],
    currentIndex: chain.links.length
  });
  return { state: updateActiveChain(state, next), added: true };
}

export function duplicateLink(state, index) {
  const chain = activeChain(state);
  const source = chain.links[index];
  if (!source || chain.links.length >= SOUND_CHAIN_MAX_LINKS) return { state, added: false };
  return addLink(state, { ...source, id: newId() });
}

export function updateLink(state, index, link) {
  const chain = activeChain(state);
  if (index < 0 || index >= chain.links.length) return state;
  const links = [...chain.links];
  links[index] = normalizeLink(link);
  return updateActiveChain(state, { ...chain, links });
}

export function deleteLink(state, index) {
  const chain = activeChain(state);
  if (index < 0 || index >= chain.links.length) return state;
  const links = chain.links.filter((_, i) => i !== index);
  let currentIndex = chain.currentIndex;
  if (!links.length) currentIndex = -1;
  else if (index < currentIndex) currentIndex -= 1;
  else if (index === currentIndex) currentIndex = Math.min(currentIndex, links.length - 1);
  else currentIndex = Math.min(currentIndex, links.length - 1);
  return updateActiveChain(state, { ...chain, links, currentIndex });
}

export function moveLink(state, index, delta) {
  return moveLinkTo(state, index, index + delta);
}

export function moveLinkTo(state, from, to) {
  const chain = activeChain(state);
  if (from < 0 || from >= chain.links.length || to < 0 || to >= chain.links.length || from === to) {
    return state;
  }
  const currentId = chain.links[chain.currentIndex]?.id;
  const links = [...chain.links];
  const [item] = links.splice(from, 1);
  links.splice(to, 0, item);
  const currentIndex = currentId
    ? links.findIndex((link) => link.id === currentId)
    : chain.currentIndex;
  return updateActiveChain(state, { ...chain, links, currentIndex });
}

export function withCurrentLink(state, index) {
  const chain = activeChain(state);
  if (index < 0 || index >= chain.links.length) return state;
  return updateActiveChain(state, { ...chain, currentIndex: index });
}

export function activateChain(state, index) {
  if (index < 0 || index >= state.chains.length) return state;
  return { ...state, activeChainIndex: index };
}

export function addChain(state, name) {
  if (state.chains.length >= SOUND_CHAIN_MAX_CHAINS) return state;
  const chain = createChain(
    String(name || "").trim() || `音色链 ${state.chains.length + 1}`
  );
  return { ...state, chains: [...state.chains, chain], activeChainIndex: state.chains.length };
}

export function renameChain(state, index, name) {
  if (index < 0 || index >= state.chains.length) return state;
  const chains = [...state.chains];
  chains[index] = normalizeChain({ ...chains[index], name });
  return { ...state, chains };
}

export function deleteChain(state, index) {
  if (index < 0 || index >= state.chains.length) return state;
  const chains = state.chains.filter((_, i) => i !== index);
  const safeChains = chains.length ? chains : [createChain("音色链 1")];
  let active = state.activeChainIndex;
  if (active > index) active -= 1;
  if (active >= safeChains.length) active = safeChains.length - 1;
  return { ...state, chains: safeChains, activeChainIndex: Math.max(0, active) };
}

export function nextChainLink(links, from, step) {
  if (!links.length || !step) return null;
  const size = links.length;
  const current = from >= 0 && from < size ? from : (step > 0 ? -1 : size);
  return ((current + step) % size + size) % size;
}

/**
 * Converts a MODX snapshot to the field names Android's BackupCodec reads.
 * The web store keeps the longer names; only backup files are translated.
 */
export function chainStateForBackup(state) {
  const safe = normalizeSoundChain(state);
  return {
    activeChainIndex: safe.activeChainIndex,
    chains: safe.chains.map((chain) => ({
      id: chain.id,
      name: chain.name,
      currentIndex: chain.currentIndex,
      links: chain.links.map((link) => ({
        id: link.id,
        name: link.name,
        bankMsb: link.bankMsb,
        bankLsb: link.bankLsb,
        program: link.program,
        colorIndex: link.colorIndex,
        source: link.source,
        transpose: link.transpose
          ? { mode: link.transpose.mode, value: link.transpose.value }
          : null,
        ...(link.modx
          ? {
              modx: {
                profile: link.modx.profile,
                kind: link.modx.kind,
                index: link.modx.bankIndex,
                bankName: link.modx.bankName,
                page: link.modx.page,
                slot: link.modx.slot,
                slotName: link.modx.slotName,
                perfName: link.modx.performanceName,
                name: link.modx.displayName,
                msb: link.modx.bankMsb,
                lsb: link.modx.bankLsb,
                pc: link.modx.performanceNumber
              }
            }
          : {})
      }))
    }))
  };
}

export function chainDisplayName(link, picker) {
  if (link.name.trim()) return link.name.trim();
  if (link.transpose) return transposeSummary(link.transpose);
  if (link.source === "MODX") {
    return (link.modx && refEffectiveName(link.modx)) || "MODX 音色";
  }
  if (link.bankMsb === KEYBOARD_SET_BANKS.USER) {
    const imported = nameAt(picker, link.bankLsb, link.program);
    if (imported) return imported;
  }
  return `${bankLabel(link.bankMsb)} ${pageDisplay(link)}-${numberDisplay(link)}`;
}

export function chainLinkDetail(link) {
  if (link.transpose) return transposeDetail(link.transpose);
  if (link.source === "MODX") {
    return (link.modx && refDetail(link.modx)) || "MODX 音色";
  }
  const page = pageDisplay(link);
  const category = link.bankMsb === KEYBOARD_SET_BANKS.FACTORY
    ? `（${factoryCategory(link.bankLsb)}）`
    : "";
  return `${bankLabel(link.bankMsb)} · 页 ${page}${category} · 编号 ${numberDisplay(link)}`;
}

export function chainTileDetail(link) {
  if (link.transpose) return transposeTileDetail(link.transpose);
  if (link.source === "MODX") {
    return link.modx ? `MODX ${refShortPosition(link.modx)}` : "MODX 音色";
  }
  return `${bankLabel(link.bankMsb)} ${pageDisplay(link)}-${numberDisplay(link)}`;
}

export function soundChainMessages(channel, link) {
  return [
    [0xb0 | (channel & 0x0f), 0, link.bankMsb & 0x7f],
    [0xb0 | (channel & 0x0f), 32, link.bankLsb & 0x7f],
    [0xc0 | (channel & 0x0f), link.program & 0x7f]
  ];
}

/** Builds the serpentine visual slot order; nulls pad a short last row. */
export function serpentineSlots(count, columns) {
  if (count <= 0 || columns <= 0) return [];
  const rows = Math.ceil(count / columns);
  const slots = [];
  for (let row = 0; row < rows; row += 1) {
    const start = row * columns;
    const end = Math.min(start + columns, count);
    const rowItems = [];
    for (let index = start; index < end; index += 1) rowItems.push(index);
    if (row % 2 === 0) slots.push(...rowItems);
    else {
      for (let i = 0; i < columns - rowItems.length; i += 1) slots.push(null);
      slots.push(...rowItems.reverse());
    }
  }
  return slots;
}

export function linkFromFields(fields) {
  return normalizeLink(fields);
}
