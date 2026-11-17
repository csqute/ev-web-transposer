// Note-level loopback engines, ported from MidiEchoEngine.kt / SxUsbEchoSession.
// No DOM or store imports: unit tests inject a fake clock and sender.

const FORWARD_CONTROLLERS = new Set([1, 2, 4, 11, 64, 65, 66, 67]);
const RATE_WINDOW_MS = 1000;
const RATE_PAUSE_MS = 2000;
const MAX_MESSAGES_PER_SECOND = 3000;
const PRUNE_THRESHOLD = 512;
const PRUNE_AGE_MS = 1000;

function clampNote(note) {
  return Math.max(0, Math.min(127, note));
}

export class EchoEngine {
  constructor(options = {}) {
    this.send = options.send || (() => false);
    this.now = options.now || (() => performance.now());
    this.log = options.log || (() => {});
    this.channels = options.channels || Array.from({ length: 16 }, (_, i) => i);
    this.controlChannels = options.controlChannels || this.channels;
    this.loopGuardMs = options.loopGuardMs ?? 50;
    this.noteOffFallback = options.noteOffFallback === true;
    this.enabled = new Set();
    this.activeNotes = new Map();
    this.sentNoteOns = new Map();
    this.sentMessages = new Map();
    this.echoedCount = 0;
    this.loopIgnored = 0;
    this.windowStartedAt = 0;
    this.windowCount = 0;
    this.pausedUntil = 0;
  }

  setEnabledDevices(keys) {
    const next = new Set(keys);
    const leaving = [...this.enabled].filter((key) => !next.has(key));
    this.enabled = next;
    for (const key of leaving) this.releaseDevice(key);
  }

  isEnabled(deviceKey) {
    return this.enabled.has(deviceKey);
  }

  markAppNote(deviceKey, channel, note, on) {
    if (!this.enabled.has(deviceKey)) return;
    if (!this.channels.includes(channel) || note < 0 || note > 127) return;
    if (on) {
      this.sentNoteOns.set(this.noteKey(deviceKey, channel, note), this.now());
      this.pruneNotes(this.now());
    }
  }

  handle(deviceKey, event, offset) {
    if (!this.enabled.has(deviceKey)) return;
    if (event.type === "noteoff") {
      this.noteOff(deviceKey, event.channel, event.note, offset);
      return;
    }
    if (!this.allowMessage()) return;
    if (event.type === "noteon") {
      this.noteOn(deviceKey, event.channel, event.note, event.velocity, offset);
    } else if (event.type === "cc") {
      this.controlChange(deviceKey, event.channel, event.controller, event.value);
    } else if (event.type === "other") {
      this.other(deviceKey, event.status, event.data);
    }
  }

  noteKey(deviceKey, channel, note) {
    return `${deviceKey}|${channel}|${note}`;
  }

  messageKey(deviceKey, status, data1, data2) {
    return `${deviceKey}|${status}|${data1}|${data2}`;
  }

  noteOn(deviceKey, channel, note, velocity, offset) {
    if (!this.channels.includes(channel) || note < 0 || note > 127) return;
    if (velocity <= 0) {
      this.noteOff(deviceKey, channel, note, offset);
      return;
    }
    const now = this.now();
    const sourceKey = this.noteKey(deviceKey, channel, note);
    if (this.wasRecentlySent(this.sentNoteOns.get(sourceKey), now)) {
      this.ignoreLoop(`音符 ${note}`);
      return;
    }
    const target = clampNote(note + Math.max(-12, Math.min(12, offset)));
    const previous = this.activeNotes.get(sourceKey);
    if (previous && (previous.channel !== channel || previous.note !== target)) {
      this.sendNoteOff(deviceKey, previous.channel, previous.note);
    }
    if (this.sendNoteOn(deviceKey, channel, target, velocity)) {
      this.activeNotes.set(sourceKey, { channel, note: target });
      this.sentNoteOns.set(this.noteKey(deviceKey, channel, target), now);
      this.pruneNotes(now);
      this.echoedCount += 1;
      if (this.echoedCount === 1 || this.echoedCount % 20 === 0) {
        this.log(`回环：通道 ${channel + 1} 音符 ${note} → ${target}（累计 ${this.echoedCount}）`);
      }
    }
  }

  noteOff(deviceKey, channel, note, offset = 0) {
    if (!this.channels.includes(channel)) return;
    const key = this.noteKey(deviceKey, channel, note);
    const active = this.activeNotes.get(key);
    if (!active) {
      if (this.noteOffFallback) {
        this.sendNoteOff(deviceKey, channel, clampNote(note + Math.max(-12, Math.min(12, offset))));
      }
      return;
    }
    this.activeNotes.delete(key);
    this.sendNoteOff(deviceKey, channel, active.note);
  }

  controlChange(deviceKey, channel, controller, value) {
    if (!this.controlChannels.includes(channel)) return;
    if (!FORWARD_CONTROLLERS.has(controller)) return;
    this.sendGuarded(deviceKey, [0xb0 | channel, controller, value & 0x7f]);
  }

  other(deviceKey, status, data) {
    const channel = status & 0x0f;
    if (!this.controlChannels.includes(channel)) return;
    const command = status & 0xf0;
    if (command === 0xe0 && data.length >= 2) {
      this.sendGuarded(deviceKey, [status, data[0] & 0x7f, data[1] & 0x7f]);
    } else if (command === 0xd0 && data.length >= 1) {
      this.sendGuarded(deviceKey, [status, data[0] & 0x7f]);
    } else if (command === 0xa0 && data.length >= 2) {
      const source = data[0] & 0x7f;
      const active = this.activeNotes.get(this.noteKey(deviceKey, channel, source));
      if (!active) return;
      this.sendGuarded(deviceKey, [status, active.note, data[1] & 0x7f]);
    }
  }

  sendNoteOn(deviceKey, channel, note, velocity) {
    return this.send(deviceKey, [0x90 | channel, clampNote(note), Math.max(1, Math.min(127, velocity))]);
  }

  sendNoteOff(deviceKey, channel, note) {
    return this.send(deviceKey, [0x80 | channel, clampNote(note), 0]);
  }

  sendGuarded(deviceKey, message) {
    const status = message[0] & 0xff;
    const data1 = message[1] & 0xff;
    const data2 = message.length > 2 ? message[2] & 0xff : 0;
    const key = this.messageKey(deviceKey, status, data1, data2);
    const now = this.now();
    if (this.wasRecentlySent(this.sentMessages.get(key), now)) {
      this.ignoreLoop(`消息 ${status.toString(16).toUpperCase()}`);
      return;
    }
    if (this.send(deviceKey, message)) {
      this.sentMessages.set(key, now);
      this.pruneMessages(now);
    }
  }

  allowMessage() {
    const now = this.now();
    if (now < this.pausedUntil) return false;
    if (now - this.windowStartedAt >= RATE_WINDOW_MS) {
      this.windowStartedAt = now;
      this.windowCount = 0;
    }
    this.windowCount += 1;
    if (this.windowCount > MAX_MESSAGES_PER_SECOND) {
      this.pausedUntil = now + RATE_PAUSE_MS;
      this.log("回环：消息过多，已暂停回发 2 秒（检查琴的 Local Control / MIDI Thru）");
      return false;
    }
    return true;
  }

  wasRecentlySent(sentAt, now) {
    return sentAt !== undefined && now - sentAt >= 0 && now - sentAt < this.loopGuardMs;
  }

  ignoreLoop(what) {
    this.loopIgnored += 1;
    if (this.loopIgnored === 1 || this.loopIgnored % 50 === 0) {
      this.log(`回环：忽略疑似回授 ${what}（累计 ${this.loopIgnored}）`);
    }
  }

  releaseDevice(deviceKey) {
    const targets = [];
    for (const [key, active] of this.activeNotes) {
      if (key.startsWith(`${deviceKey}|`)) {
        targets.push(active);
        this.activeNotes.delete(key);
      }
    }
    for (const key of [...this.sentNoteOns.keys()]) {
      if (key.startsWith(`${deviceKey}|`)) this.sentNoteOns.delete(key);
    }
    for (const key of [...this.sentMessages.keys()]) {
      if (key.startsWith(`${deviceKey}|`)) this.sentMessages.delete(key);
    }
    for (const channel of this.channels) {
      this.sendGuarded(deviceKey, [0xb0 | channel, 64, 0]);
    }
    for (const active of targets) {
      this.sendNoteOff(deviceKey, active.channel, active.note);
    }
    for (const channel of this.channels) {
      this.send(deviceKey, [0xb0 | channel, 123, 0]);
      this.send(deviceKey, [0xb0 | channel, 120, 0]);
    }
  }

  releaseAll() {
    const keys = [...this.enabled];
    this.enabled.clear();
    for (const key of keys) this.releaseDevice(key);
  }

  pruneNotes(now) {
    if (this.sentNoteOns.size <= PRUNE_THRESHOLD) return;
    for (const [key, at] of this.sentNoteOns) {
      if (now - at > PRUNE_AGE_MS) this.sentNoteOns.delete(key);
    }
  }

  pruneMessages(now) {
    if (this.sentMessages.size <= PRUNE_THRESHOLD) return;
    for (const [key, at] of this.sentMessages) {
      if (now - at > PRUNE_AGE_MS) this.sentMessages.delete(key);
    }
  }
}
