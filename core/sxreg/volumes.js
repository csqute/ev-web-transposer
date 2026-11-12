// Collects XG volume replies for the mixer and SX registration engine.
// Feature modules call readXgVolumes(); replies are consumed before the
// transpose decoder / learn capture sees them.

import { registerSysExInterceptor } from "../midi/engine.js";
import { parseXgVolumes } from "./xg.js";

const waiters = new Set();

/**
 * Registers a waiter, then calls [sendRequests] with the requested part list.
 * Resolves with a Map(part -> volume) after all wanted parts replied or after
 * the timeout (partial results are kept).
 */
export function readXgVolumes(device, parts, sendRequests, timeoutMs = 300) {
  if (!device) return Promise.resolve(new Map());
  const wanted = new Set((parts || []).map((part) => Number(part) & 0x0f));
  if (!wanted.size) return Promise.resolve(new Map());
  return new Promise((resolve) => {
    const waiter = {
      deviceKey: device.key,
      wanted,
      values: new Map(),
      timer: null,
      resolve
    };
    waiter.timer = setTimeout(() => {
      waiters.delete(waiter);
      resolve(waiter.values);
    }, Math.max(50, timeoutMs));
    waiters.add(waiter);
    Promise.resolve()
      .then(() => sendRequests?.([...wanted]))
      .catch(() => {});
  });
}

function handleXgSysEx(device, bytes) {
  if (!device || !waiters.size || !bytes) return false;
  const values = parseXgVolumes(bytes, bytes.length);
  if (!values) return false;
  for (const waiter of [...waiters]) {
    if (waiter.deviceKey !== device.key) continue;
    for (const [part, volume] of values) {
      if (waiter.wanted.has(part)) waiter.values.set(part, volume);
    }
    const complete = [...waiter.wanted].every((part) => waiter.values.has(part));
    if (complete) {
      clearTimeout(waiter.timer);
      waiters.delete(waiter);
      waiter.resolve(waiter.values);
    }
  }
  return true;
}

registerSysExInterceptor(handleXgSysEx);
