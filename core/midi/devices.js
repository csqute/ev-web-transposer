// Port grouping/filtering for Web MIDI. Pure functions, unit-testable.

const VIRTUAL_RE = /(MIDIWEB|NETWORK\s*SESSION|IAC|VIRTUAL|MICROSOFT\s*GS|TIMIDITY|APPLE\s*DLS)/i;
const SX_RE = /(SX\s*900|SX\s*700|PSR[\s-]*SX|GENOS|DIGITAL\s*KEYBOARD)/i;
const SX_EXCLUDE_RE = /(MODX|MONTAGE|MOTIF)/i;
const MANUFACTURER_SUFFIX_RE = /\b(INCORPORATED|INC|CORPORATION|CORP|CO\.?\s*LTD|LTD|COMPANY)\b/gi;

export function normalizeManufacturer(name) {
  return String(name || "")
    .toUpperCase()
    .replace(MANUFACTURER_SUFFIX_RE, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function normalizePortName(name) {
  let text = String(name || "").toUpperCase();
  let role = "other";

  if (/SOUND\s*$/.test(text)) {
    role = "sound";
    text = text.replace(/\s*SOUND\s*$/, " ");
  } else if (/KEYBOARD\s*$/.test(text)) {
    role = "keyboard";
    text = text.replace(/\s*KEYBOARD\s*$/, " ");
  }

  text = text
    .replace(/\bMPORT\s*\d+\b/g, " ")
    .replace(/\bMMIDI(?:\s*[\d.]+)?\b/g, " ")
    .replace(/\bMIDI\s*\d+\b/g, " ")
    .replace(/\bPORT\s*\d+\b/g, " ")
    .replace(/\bMIDI\b/g, " ")
    .replace(/\b(IN|OUT)\b/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

  if (!text) text = String(name || "MIDI").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  return { base: text || "MIDI", role };
}

function isVirtualName(name, manufacturer) {
  return VIRTUAL_RE.test(String(name || "")) || VIRTUAL_RE.test(String(manufacturer || ""));
}

function isSxName(name, manufacturer) {
  const text = `${name || ""} ${manufacturer || ""}`;
  return SX_RE.test(text) && !SX_EXCLUDE_RE.test(text);
}

function chooseOutput(group) {
  const connected = group.outputs.filter((port) => port.state !== "disconnected");
  if (!connected.length) return null;
  return connected.find((port) => port.role === "sound")
    || connected.find((port) => port.name === group.base)
    || connected.find((port) => port.role !== "keyboard")
    || connected[0];
}

export function buildDeviceGroups(inputs = [], outputs = [], deviceModes = {}) {
  const groups = new Map();

  const ensureGroup = (port) => {
    const { base } = normalizePortName(port.name);
    const manufacturer = normalizeManufacturer(port.manufacturer);
    const key = `${manufacturer}|${base}`;
    if (!groups.has(key)) {
      groups.set(key, {
        base,
        manufacturerKey: manufacturer,
        manufacturer: String(port.manufacturer || ""),
        inputs: [],
        outputs: [],
        names: new Set()
      });
    }
    return groups.get(key);
  };

  for (const port of inputs) {
    if (!port || !port.name) continue;
    const group = ensureGroup(port);
    group.inputs.push({
      id: port.id,
      name: port.name,
      manufacturer: port.manufacturer || "",
      state: port.state,
      connection: port.connection,
      port,
      ...normalizePortName(port.name)
    });
    group.names.add(String(port.name));
  }
  for (const port of outputs) {
    if (!port || !port.name) continue;
    const group = ensureGroup(port);
    group.outputs.push({
      id: port.id,
      name: port.name,
      manufacturer: port.manufacturer || "",
      state: port.state,
      connection: port.connection,
      port,
      ...normalizePortName(port.name)
    });
    group.names.add(String(port.name));
  }

  const list = [...groups.values()].map((group) => {
    const names = [...group.names];
    const isVirtual = names.some((name) => isVirtualName(name, group.manufacturer))
      || isVirtualName(group.base, group.manufacturer);
    const isSx = names.some((name) => isSxName(name, group.manufacturer));
    const output = chooseOutput(group);
    const inputsConnected = group.inputs.filter((port) => port.state !== "disconnected");
    const modelText = `${names.join(" ")} ${group.manufacturer} ${group.base}`.trim();
    return {
      base: group.base,
      manufacturerKey: group.manufacturerKey,
      manufacturer: group.manufacturer,
      names,
      inputs: group.inputs,
      outputs: group.outputs,
      inputCount: inputsConnected.length,
      outputCount: group.outputs.filter((port) => port.state !== "disconnected").length,
      output,
      outputName: output?.name || "",
      inputNames: inputsConnected.map((port) => port.name),
      modelText,
      modelKey: group.base,
      isVirtual,
      isSx,
      sendable: !!output && !isVirtual,
      echoable: inputsConnected.length > 0 && !isVirtual,
      displayName: output?.name || names[0] || group.base,
      sortName: `${group.manufacturerKey}|${group.base}|${names.sort().join("|")}`
    };
  });

  list.sort((a, b) => a.sortName.localeCompare(b.sortName));

  const counts = new Map();
  for (const device of list) {
    const groupKey = `${device.manufacturerKey}|${device.base}`;
    counts.set(groupKey, (counts.get(groupKey) || 0) + 1);
  }

  const seen = new Map();
  return list.map((device) => {
    const groupKey = `${device.manufacturerKey}|${device.base}`;
    const duplicate = (counts.get(groupKey) || 1) > 1;
    const ordinal = (seen.get(groupKey) || 0) + 1;
    seen.set(groupKey, ordinal);
    const key = `midi:${device.base}:${duplicate ? ordinal : 0}`;
    const storedMode = deviceModes[key];
    const mode = storedMode || (device.isSx ? "SX_ECHO" : "AUTO");
    return {
      ...device,
      key,
      ordinal: duplicate ? ordinal : 0,
      duplicate,
      shortName: duplicate ? `${device.base} #${ordinal}` : device.base,
      mode
    };
  });
}

export function connectedDevices(devices = []) {
  return devices.filter((device) => device.sendable || device.echoable);
}

export function sendableDevices(devices = []) {
  return devices.filter((device) => device.sendable && device.mode !== "OFF");
}

export function isVirtualPortName(name) {
  return VIRTUAL_RE.test(String(name || ""));
}
