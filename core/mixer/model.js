// Mixer channel model, ported from model/Mixer.kt.

export const MIXER_CHANNELS = [
  { id: "UPPER_1", short: "UP1", full: "Upper 1", subtitle: "上声部 1", defaultChannel: 0, group: "KEYBOARD_SET" },
  { id: "UPPER_2", short: "UP2", full: "Upper 2", subtitle: "上声部 2", defaultChannel: 1, group: "KEYBOARD_SET" },
  { id: "UPPER_3", short: "UP3", full: "Upper 3", subtitle: "上声部 3", defaultChannel: 2, group: "KEYBOARD_SET" },
  { id: "LOWER", short: "LOWER", full: "Lower", subtitle: "下声部", defaultChannel: 3, group: "KEYBOARD_SET" },
  { id: "DRUMS", short: "DRUMS", full: "Drums", subtitle: "鼓组", defaultChannel: 9, group: "STYLE" },
  { id: "PERCUSSION", short: "PERC", full: "Percussion", subtitle: "打击乐", defaultChannel: 10, group: "STYLE" },
  { id: "BASS", short: "BASS", full: "Bass", subtitle: "贝斯", defaultChannel: 8, group: "STYLE" },
  { id: "SX_LEFT", short: "SXL", full: "SX Left", subtitle: "左手", defaultChannel: 3, group: "SX" },
  { id: "SX_RIGHT_1", short: "R1", full: "SX Right 1", subtitle: "右手 1", defaultChannel: 0, group: "SX" },
  { id: "SX_RIGHT_2", short: "R2", full: "SX Right 2", subtitle: "右手 2", defaultChannel: 1, group: "SX" },
  { id: "SX_RIGHT_3", short: "R3", full: "SX Right 3", subtitle: "右手 3", defaultChannel: 2, group: "SX" }
];

export const DEFAULT_VOLUME = 100;

export function defaultMixerChannels() {
  return Object.fromEntries(MIXER_CHANNELS.map((channel) => [
    channel.id,
    { channel: channel.defaultChannel, volume: DEFAULT_VOLUME, muted: false }
  ]));
}

export function normalizeMixerChannels(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const output = {};
  for (const definition of MIXER_CHANNELS) {
    const item = source[definition.id];
    output[definition.id] = {
      channel: Number.isInteger(item?.channel)
        ? Math.max(0, Math.min(15, item.channel))
        : definition.defaultChannel,
      volume: Number.isInteger(item?.volume)
        ? Math.max(0, Math.min(127, item.volume))
        : DEFAULT_VOLUME,
      muted: item?.muted === true
    };
  }
  return output;
}

export function channelsForTarget(channels, target) {
  return MIXER_CHANNELS.filter((definition) =>
    target === "SX" ? definition.group === "SX" : definition.group !== "SX"
  ).map((definition) => ({
    definition,
    ...channels[definition.id]
  }));
}

export function allMuted(channels, target) {
  const list = channelsForTarget(channels, target);
  return list.length > 0 && list.every((channel) => channel.muted);
}

export function anyMuted(channels, target) {
  return channelsForTarget(channels, target).some((channel) => channel.muted);
}

export function styleAtMax(channels) {
  const output = { ...channels };
  for (const definition of MIXER_CHANNELS) {
    if (definition.group === "STYLE") {
      output[definition.id] = {
        ...output[definition.id],
        volume: 127,
        muted: false
      };
    }
  }
  return output;
}

export function resetChannels(channels, target) {
  const output = { ...channels };
  for (const definition of MIXER_CHANNELS) {
    const belongs = target === "SX" ? definition.group === "SX" : definition.group !== "SX";
    if (!belongs) continue;
    output[definition.id] = {
      ...output[definition.id],
      channel: definition.defaultChannel
    };
  }
  return output;
}

export function clampVolume(value) {
  return Math.max(0, Math.min(127, Number(value) | 0));
}
