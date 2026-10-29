// Pure note/key mapping, ported from the Android app's model/Note.kt.

export const NOTE_LABELS = [
  "C", "♯C", "D", "♭E", "E", "F", "♯F", "G", "♭A", "A", "♭B", "B"
];

export const WHITE_INDICES = [0, 2, 4, 5, 7, 9, 11];

// Black key note index -> the white key it is drawn after (0-based).
export const BLACK_KEY_POSITIONS = [
  [1, 0],
  [3, 1],
  [6, 3],
  [8, 4],
  [10, 5]
];

// Offset produced by each chromatic key. G..B are one octave lower.
export const KEY_OFFSETS = [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1];

export function wrapIndex(offset) {
  return ((Number(offset) % 12) + 12) % 12;
}

export function offsetForKey(index) {
  return KEY_OFFSETS[wrapIndex(index)];
}

export function flipOctave(offset) {
  const safe = Math.max(-12, Math.min(12, Number(offset) | 0));
  return safe + 12 <= 12 ? safe + 12 : safe - 12;
}

export function offsetForTap(currentOffset, keyIndex) {
  const safeIndex = wrapIndex(keyIndex);
  return wrapIndex(currentOffset) === safeIndex
    ? flipOctave(currentOffset)
    : offsetForKey(safeIndex);
}

export function noteLabel(offset) {
  return NOTE_LABELS[wrapIndex(offset)];
}

export function signedOffset(offset) {
  const value = Number(offset) | 0;
  return value > 0 ? `+${value}` : String(value);
}

export function wrapOffset(offset) {
  let value = Number(offset) | 0;
  while (value > 12) value -= 12;
  while (value < -12) value += 12;
  return value;
}

export function isBlack(index) {
  return BLACK_KEY_POSITIONS.some(([note]) => note === wrapIndex(index));
}

export function clampOffset(offset) {
  return Math.max(-12, Math.min(12, Number(offset) | 0));
}
