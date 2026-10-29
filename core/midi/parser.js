// Incremental MIDI byte-stream parser, ported from MidiEventParser.kt.

export class MidiEventParser {
  constructor() {
    this.sysExBuffer = [];
    this.inSysEx = false;
    this.runningStatus = 0;
    this.dataBytes = [];
  }

  feed(buffer) {
    const events = [];
    const bytes = buffer instanceof Uint8Array ? buffer : Uint8Array.from(buffer || []);
    for (const value of bytes) {
      if (value >= 0xf8) continue; // real-time

      if (this.inSysEx) {
        if (value === 0xf7) {
          this.sysExBuffer.push(value);
          events.push({ type: "sysex", bytes: this.sysExBuffer.slice() });
          this.sysExBuffer = [];
          this.inSysEx = false;
          this.runningStatus = 0;
          this.dataBytes = [];
        } else if (value === 0xf0) {
          this.sysExBuffer = [value];
        } else if (value >= 0x80) {
          this.inSysEx = false;
          this.sysExBuffer = [];
          this.statusByte(value, events);
        } else {
          this.sysExBuffer.push(value);
        }
        continue;
      }

      if (value === 0xf0) {
        this.inSysEx = true;
        this.sysExBuffer = [value];
        this.runningStatus = 0;
        this.dataBytes = [];
      } else if (value >= 0x80) {
        this.statusByte(value, events);
      } else if (this.runningStatus !== 0) {
        this.dataBytes.push(value);
        const expected = this.expectedDataBytes(this.runningStatus);
        if (this.dataBytes.length >= expected) {
          events.push(this.makeChannelEvent(this.runningStatus, this.dataBytes));
          this.dataBytes = [];
        }
      }
    }
    return events;
  }

  statusByte(status, events) {
    this.dataBytes = [];
    if (status >= 0xf0) {
      this.runningStatus = 0;
      return;
    }
    this.runningStatus = status;
  }

  expectedDataBytes(status) {
    const command = status & 0xf0;
    return command === 0xc0 || command === 0xd0 ? 1 : 2;
  }

  makeChannelEvent(status, data) {
    const command = status & 0xf0;
    const channel = status & 0x0f;
    switch (command) {
      case 0x80:
        return { type: "noteoff", channel, note: data[0] };
      case 0x90:
        return data[1] === 0
          ? { type: "noteoff", channel, note: data[0] }
          : { type: "noteon", channel, note: data[0], velocity: data[1] };
      case 0xb0:
        return { type: "cc", channel, controller: data[0], value: data[1] };
      case 0xc0:
        return { type: "pc", channel, program: data[0] };
      default:
        return { type: "other", status, data: data.slice() };
    }
  }
}
