// Shared mixer target selection used by the mixer and drum pages.

import { midi, mixerTargets } from "../../app/store.js";

export function mixerDeviceLists(state = midi.value) {
  const devices = state.devices || [];
  return {
    midiDevices: devices.filter((device) =>
      device.sendable && !device.isSx && device.mode !== "OFF"
    ),
    sxDevices: devices.filter((device) =>
      device.sendable && device.isSx && device.mode === "SX_ECHO"
    )
  };
}

export function listForTarget(lists, target) {
  return target === "SX" ? lists.sxDevices : lists.midiDevices;
}

export function targetsFor(config, target, lists) {
  const list = listForTarget(lists, target);
  const all = target === "SX" ? config.sxAll : config.midiAll;
  const keys = target === "SX" ? config.sxKeys : config.midiKeys;
  return all ? list : list.filter((device) => keys.includes(device.key));
}

export function currentMixerTargets(config = mixerTargets.value) {
  return targetsFor(config, config.target, mixerDeviceLists());
}
