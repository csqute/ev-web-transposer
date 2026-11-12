// Drum MIDI output: note hits, kit selection and SX mirroring.

import { midi, mixerChannels, settings } from "../../app/store.js";
import {
  markAppNoteForDevice,
  midiPerformanceDevices,
  sendMessagesToDevice,
  sxPerformanceDevices
} from "../midi/engine.js";
import { drumNoteFor } from "./model.js";

export function drumChannel() {
  return mixerChannels.value.DRUMS?.channel ?? 9;
}

export function drumDevices(includeSx = true) {
  return {
    midi: midiPerformanceDevices(),
    sx: includeSx ? sxPerformanceDevices() : []
  };
}

export function drumOutputConnected(includeSx = true, state = midi.value) {
  if (midiPerformanceDevices(state).length > 0) return true;
  return includeSx && sxPerformanceDevices(state).length > 0;
}

export function hasMidiDrumOutput() {
  return midiPerformanceDevices().length > 0;
}

export function anyKeyboardConnected() {
  return midi.value.devices.some((device) => device.sendable || device.echoable);
}

export function noteForState(baseNote, drumState = null) {
  return drumNoteFor(
    baseNote,
    settings.value.offset,
    drumState ? drumState.transposeCompensation : false
  );
}

async function sendNoteMessage(device, channel, note, velocity, on) {
  const message = on
    ? [0x90 | (channel & 0x0f), note & 0x7f, Math.max(1, Math.min(127, velocity)) & 0x7f]
    : [0x80 | (channel & 0x0f), note & 0x7f, 0];
  markAppNoteForDevice(device.key, channel, note, on);
  await sendMessagesToDevice(device, [message]);
}

export async function sendDrumNoteOn(note, velocity, includeSx = true) {
  const channel = drumChannel();
  const { midi: midiDevices, sx } = drumDevices(includeSx);
  await Promise.all([
    ...midiDevices.map((device) => sendNoteMessage(device, channel, note, velocity, true)),
    ...sx.map((device) => sendNoteMessage(device, channel, note, velocity, true))
  ]);
}

export async function sendDrumNoteOff(note, includeSx = true) {
  const channel = drumChannel();
  const { midi: midiDevices, sx } = drumDevices(includeSx);
  await Promise.all([
    ...midiDevices.map((device) => sendNoteMessage(device, channel, note, 0, false)),
    ...sx.map((device) => sendNoteMessage(device, channel, note, 0, false))
  ]);
}

export async function sendDrumKit(kit, includeSx = true) {
  const channel = drumChannel();
  const { midi: midiDevices, sx } = drumDevices(includeSx);
  const midiMessages = [
    [0xb0 | (channel & 0x0f), 0, 120],
    [0xb0 | (channel & 0x0f), 32, 0],
    [0xc0 | (channel & 0x0f), kit.program & 0x7f]
  ];
  const sxMessages = [
    [0xb0 | (channel & 0x0f), 0, kit.sxBankMsb & 0x7f],
    [0xb0 | (channel & 0x0f), 32, kit.sxBankLsb & 0x7f],
    [0xc0 | (channel & 0x0f), kit.sxProgram & 0x7f]
  ];
  await Promise.all([
    ...midiDevices.map((device) => sendMessagesToDevice(device, midiMessages)),
    ...sx.map((device) => sendMessagesToDevice(device, sxMessages))
  ]);
}

export async function sendAllDrumNoteOffs(notes, includeSx = true) {
  const channel = drumChannel();
  const { midi: midiDevices, sx } = drumDevices(includeSx);
  const unique = [...new Set(notes)];
  await Promise.all([
    ...midiDevices.flatMap((device) => unique.map((note) =>
      sendNoteMessage(device, channel, note, 0, false)
    )),
    ...sx.flatMap((device) => unique.map((note) =>
      sendNoteMessage(device, channel, note, 0, false)
    ))
  ]);
  // SX echo sessions can be left with a stuck note if a release was lost.
  if (includeSx) {
    await Promise.all(sx.map((device) =>
      sendMessagesToDevice(device, [[0xb0 | (channel & 0x0f), 123, 0]])
    ));
  }
}
