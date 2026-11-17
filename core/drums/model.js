// Drum model, ported from model/Drum.kt.

export const DRUM_STEP_COUNT = 16;
export const DRUM_STEPS_PER_BEAT = 4;
export const DRUM_MIN_BPM = 40;
export const DRUM_MAX_BPM = 240;
export const DRUM_DEFAULT_BPM = 100;
export const DRUM_DEFAULT_CENTER_VELOCITY = 127;
export const DRUM_DEFAULT_EDGE_VELOCITY = 40;
export const DRUM_PATTERN_MASK = 0xffff;
export const DRUM_DEFAULT_VELOCITY = 110;

export const DRUM_PADS = [
  { id: "KICK", label: "KICK", chinese: "底鼓", note: 36 },
  { id: "SNARE", label: "SNARE", chinese: "军鼓", note: 38 },
  { id: "CLOSED_HAT", label: "CLOSED HH", chinese: "闭镲", note: 42 },
  { id: "OPEN_HAT", label: "OPEN HH", chinese: "开镲", note: 46 },
  { id: "CRASH", label: "CRASH", chinese: "吊镲", note: 49 },
  { id: "HIGH_TOM", label: "HIGH TOM", chinese: "高音通鼓", note: 50 },
  { id: "MID_TOM", label: "MID TOM", chinese: "中音通鼓", note: 47 },
  { id: "LOW_TOM", label: "LOW TOM", chinese: "低音通鼓", note: 45 },
  { id: "FLOOR_TOM", label: "FLOOR TOM", chinese: "落地通鼓", note: 43 },
  { id: "RIDE", label: "RIDE", chinese: "叮叮镲", note: 51 }
];

export const DRUM_PAD_BY_ID = Object.fromEntries(DRUM_PADS.map((pad) => [pad.id, pad]));
export const DEFAULT_DRUM_PAD_ORDER = DRUM_PADS.map((pad) => pad.id);

export const DRUM_KITS = [
  { id: "STANDARD", label: "Standard", chinese: "标准", program: 0, sxBankMsb: 127, sxBankLsb: 0, sxProgram: 0 },
  { id: "ROOM", label: "Room", chinese: "房间", program: 8, sxBankMsb: 127, sxBankLsb: 0, sxProgram: 8 },
  { id: "POWER", label: "Power", chinese: "力量", program: 16, sxBankMsb: 127, sxBankLsb: 0, sxProgram: 87 },
  { id: "ELECTRONIC", label: "Electronic", chinese: "电子", program: 24, sxBankMsb: 127, sxBankLsb: 0, sxProgram: 24 },
  { id: "TR_808", label: "TR-808", chinese: "808", program: 25, sxBankMsb: 127, sxBankLsb: 0, sxProgram: 25 },
  { id: "JAZZ", label: "Jazz", chinese: "爵士", program: 32, sxBankMsb: 127, sxBankLsb: 0, sxProgram: 32 },
  { id: "BRUSH", label: "Brush", chinese: "鼓刷", program: 40, sxBankMsb: 127, sxBankLsb: 0, sxProgram: 40 },
  { id: "ORCHESTRA", label: "Orchestra", chinese: "交响", program: 48, sxBankMsb: 127, sxBankLsb: 0, sxProgram: 48 },
  { id: "SFX", label: "SFX", chinese: "音效", program: 56, sxBankMsb: 126, sxBankLsb: 0, sxProgram: 0 }
];

export const DRUM_KIT_BY_ID = Object.fromEntries(DRUM_KITS.map((kit) => [kit.id, kit]));

export const DRUM_SFX_GROUPS = [
  { id: "HUMAN", label: "人声 / 生活" },
  { id: "WEAPON", label: "武器 / 爆炸" },
  { id: "TRANSPORT", label: "交通 / 机械" },
  { id: "NATURE", label: "动物 / 自然" },
  { id: "PERCUSSION", label: "打击 / 节拍" },
  { id: "INSTRUMENT", label: "乐器 / 噪音" }
];

export const DRUM_SFX = [
  { id: "LAUGHING", note: 52, label: "Laughing", chinese: "笑声", group: "HUMAN" },
  { id: "SCREAM", note: 53, label: "Scream", chinese: "尖叫", group: "HUMAN" },
  { id: "PUNCH", note: 54, label: "Punch", chinese: "拳击", group: "HUMAN" },
  { id: "HEART_BEAT", note: 55, label: "Heart Beat", chinese: "心跳", group: "HUMAN" },
  { id: "FOOTSTEPS_1", note: 56, label: "Footsteps 1", chinese: "脚步 1", group: "HUMAN" },
  { id: "FOOTSTEPS_2", note: 57, label: "Footsteps 2", chinese: "脚步 2", group: "HUMAN" },
  { id: "APPLAUSE", note: 58, label: "Applause", chinese: "掌声", group: "HUMAN" },
  { id: "DOOR_CREAKING", note: 59, label: "Door Creaking", chinese: "开门声", group: "HUMAN" },
  { id: "DOOR", note: 60, label: "Door", chinese: "关门声", group: "HUMAN" },
  { id: "SCRATCH", note: 61, label: "Scratch", chinese: "刮擦", group: "HUMAN" },
  { id: "WIND_CHIMES", note: 62, label: "Wind Chimes", chinese: "风铃", group: "HUMAN" },

  { id: "GUN_SHOT", note: 72, label: "Gun Shot", chinese: "枪声", group: "WEAPON" },
  { id: "MACHINE_GUN", note: 73, label: "Machine Gun", chinese: "机枪", group: "WEAPON" },
  { id: "LASER_GUN", note: 74, label: "Lasergun", chinese: "激光枪", group: "WEAPON" },
  { id: "EXPLOSION", note: 75, label: "Explosion", chinese: "爆炸", group: "WEAPON" },

  { id: "CAR_ENGINE", note: 63, label: "Car-Engine", chinese: "汽车引擎", group: "TRANSPORT" },
  { id: "CAR_STOP", note: 64, label: "Car-Stop", chinese: "刹车", group: "TRANSPORT" },
  { id: "CAR_PASS", note: 65, label: "Car-Pass", chinese: "汽车驶过", group: "TRANSPORT" },
  { id: "CAR_CRASH", note: 66, label: "Car-Crash", chinese: "撞车", group: "TRANSPORT" },
  { id: "SIREN", note: 67, label: "Siren", chinese: "警笛", group: "TRANSPORT" },
  { id: "TRAIN", note: 68, label: "Train", chinese: "火车", group: "TRANSPORT" },
  { id: "JETPLANE", note: 69, label: "Jetplane", chinese: "飞机", group: "TRANSPORT" },
  { id: "HELICOPTER", note: 70, label: "Helicopter", chinese: "直升机", group: "TRANSPORT" },
  { id: "STARSHIP", note: 71, label: "Starship", chinese: "飞船", group: "TRANSPORT" },

  { id: "DOG", note: 76, label: "Dog", chinese: "狗叫", group: "NATURE" },
  { id: "HORSE_GALLOP", note: 77, label: "Horse-Gallop", chinese: "马蹄", group: "NATURE" },
  { id: "BIRDS", note: 78, label: "Birds", chinese: "鸟叫", group: "NATURE" },
  { id: "RAIN", note: 79, label: "Rain", chinese: "雨声", group: "NATURE" },
  { id: "THUNDER", note: 80, label: "Thunder", chinese: "雷声", group: "NATURE" },
  { id: "WIND", note: 81, label: "Wind", chinese: "风声", group: "NATURE" },
  { id: "SEASHORE", note: 82, label: "Seashore", chinese: "海浪", group: "NATURE" },
  { id: "STREAM", note: 83, label: "Stream", chinese: "溪流", group: "NATURE" },
  { id: "BUBBLE", note: 84, label: "Bubble", chinese: "气泡", group: "NATURE" },

  { id: "HIGH_Q", note: 39, label: "High Q", chinese: "高频", group: "PERCUSSION" },
  { id: "SLAP", note: 40, label: "Slap", chinese: "拍击", group: "PERCUSSION" },
  { id: "SCRATCH_PUSH", note: 41, label: "Scratch Push", chinese: "搓碟推", group: "PERCUSSION" },
  { id: "SCRATCH_PULL", note: 42, label: "Scratch Pull", chinese: "搓碟拉", group: "PERCUSSION" },
  { id: "STICKS", note: 43, label: "Sticks", chinese: "鼓棒", group: "PERCUSSION" },
  { id: "SQUARE_CLICK", note: 44, label: "Square Click", chinese: "方波咔哒", group: "PERCUSSION" },
  { id: "METRONOME_CLICK", note: 45, label: "Metronome Click", chinese: "节拍器", group: "PERCUSSION" },
  { id: "METRONOME_BELL", note: 46, label: "Metronome Bell", chinese: "节拍铃", group: "PERCUSSION" },

  { id: "GUITAR_FRET_NOISE", note: 47, label: "Guitar Fret Noise", chinese: "吉他品丝", group: "INSTRUMENT" },
  { id: "GUITAR_CUT_UP", note: 48, label: "Guitar Cutting Up", chinese: "切弦上", group: "INSTRUMENT" },
  { id: "GUITAR_CUT_DOWN", note: 49, label: "Guitar Cutting Down", chinese: "切弦下", group: "INSTRUMENT" },
  { id: "STRING_SLAP", note: 50, label: "String Slap", chinese: "低音拍弦", group: "INSTRUMENT" },
  { id: "FLUTE_KEY_CLICK", note: 51, label: "Fl.Key Click", chinese: "长笛按键", group: "INSTRUMENT" }
];

export const DRUM_SFX_BY_ID = Object.fromEntries(DRUM_SFX.map((sfx) => [sfx.id, sfx]));

export const DEFAULT_DRUM_SFX = {
  KICK: "APPLAUSE",
  SNARE: "GUN_SHOT",
  CLOSED_HAT: "LAUGHING",
  OPEN_HAT: "SCREAM",
  CRASH: "EXPLOSION",
  HIGH_TOM: "PUNCH",
  MID_TOM: "HEART_BEAT",
  LOW_TOM: "SIREN",
  FLOOR_TOM: "MACHINE_GUN",
  RIDE: "THUNDER"
};

export function defaultDrumSfxFor(padId) {
  return DRUM_SFX_BY_ID[DEFAULT_DRUM_SFX[padId]] || DRUM_SFX[0];
}

export function defaultDrums() {
  return {
    version: 2,
    transposeCompensation: false,
    velocityMode: "FIXED",
    fixedVelocity: DRUM_DEFAULT_VELOCITY,
    centerVelocity: DRUM_DEFAULT_CENTER_VELOCITY,
    edgeVelocity: DRUM_DEFAULT_EDGE_VELOCITY,
    padOrder: [...DEFAULT_DRUM_PAD_ORDER],
    selectedKit: "STANDARD",
    padMode: "DRUM",
    sfxAssignments: { ...DEFAULT_DRUM_SFX },
    bpm: DRUM_DEFAULT_BPM,
    pattern: {}
  };
}

function clampInt(value, min, max, fallback) {
  return Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

export function normalizeDrums(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const order = Array.isArray(source.padOrder) ? source.padOrder.filter((id) => DRUM_PAD_BY_ID[id]) : [];
  const padOrder = order.length === DRUM_PADS.length && new Set(order).size === DRUM_PADS.length
    ? order
    : [...DEFAULT_DRUM_PAD_ORDER];

  const centerVelocity = clampInt(source.centerVelocity, 1, 127, DRUM_DEFAULT_CENTER_VELOCITY);
  const edgeVelocity = Math.min(
    clampInt(source.edgeVelocity, 1, 127, DRUM_DEFAULT_EDGE_VELOCITY),
    centerVelocity
  );

  const assignments = {};
  for (const pad of DRUM_PADS) {
    const stored = source.sfxAssignments && source.sfxAssignments[pad.id];
    assignments[pad.id] = DRUM_SFX_BY_ID[stored] ? stored : DEFAULT_DRUM_SFX[pad.id];
  }

  const pattern = {};
  if (source.pattern && typeof source.pattern === "object") {
    for (const pad of DRUM_PADS) {
      const mask = Number(source.pattern[pad.id]);
      if (Number.isInteger(mask) && mask !== 0) pattern[pad.id] = mask & DRUM_PATTERN_MASK;
    }
  }

  return {
    version: 2,
    transposeCompensation: source.transposeCompensation === true,
    velocityMode: source.velocityMode === "POSITION" || source.velocityMode === "PRESSURE" ? "POSITION" : "FIXED",
    fixedVelocity: clampInt(source.fixedVelocity, 1, 127, DRUM_DEFAULT_VELOCITY),
    centerVelocity,
    edgeVelocity,
    padOrder,
    selectedKit: DRUM_KIT_BY_ID[source.selectedKit] ? source.selectedKit : "STANDARD",
    padMode: source.padMode === "SFX" ? "SFX" : "DRUM",
    sfxAssignments: assignments,
    bpm: clampInt(source.bpm, DRUM_MIN_BPM, DRUM_MAX_BPM, DRUM_DEFAULT_BPM),
    pattern
  };
}

export function sfxFor(state, padId) {
  return DRUM_SFX_BY_ID[state.sfxAssignments[padId]] || defaultDrumSfxFor(padId);
}

export function noteFor(state, padId) {
  return state.padMode === "SFX" ? sfxFor(state, padId).note : DRUM_PAD_BY_ID[padId].note;
}

export function labelFor(state, padId) {
  return state.padMode === "SFX" ? sfxFor(state, padId).label : DRUM_PAD_BY_ID[padId].label;
}

export function chineseFor(state, padId) {
  return state.padMode === "SFX" ? sfxFor(state, padId).chinese : DRUM_PAD_BY_ID[padId].chinese;
}

export function stepMask(state, padId) {
  return state.pattern[padId] || 0;
}

export function hasStep(state, padId, step) {
  return step >= 0 && step < DRUM_STEP_COUNT && ((stepMask(state, padId) >> step) & 1) === 1;
}

export function withStepSet(state, padId, step, on) {
  if (step < 0 || step >= DRUM_STEP_COUNT) return state;
  const mask = stepMask(state, padId);
  const bit = 1 << step;
  const nextMask = on ? mask | bit : mask & ~bit;
  if (nextMask === mask) return state;
  const nextPattern = { ...state.pattern };
  if (nextMask === 0) delete nextPattern[padId];
  else nextPattern[padId] = nextMask;
  return { ...state, pattern: nextPattern };
}

export function toggleStep(state, padId, step) {
  return withStepSet(state, padId, step, !hasStep(state, padId, step));
}

export function withPatternCleared(state) {
  return Object.keys(state.pattern).length ? { ...state, pattern: {} } : state;
}

export function withSwappedPads(state, from, to) {
  if (from < 0 || from >= state.padOrder.length || to < 0 || to >= state.padOrder.length || from === to) {
    return state;
  }
  const padOrder = [...state.padOrder];
  [padOrder[from], padOrder[to]] = [padOrder[to], padOrder[from]];
  return { ...state, padOrder };
}

export function withSfxAssigned(state, padId, sfxId) {
  if (!DRUM_SFX_BY_ID[sfxId]) return state;
  return { ...state, sfxAssignments: { ...state.sfxAssignments, [padId]: sfxId } };
}

export function withDefaultSfxAssignments(state) {
  return { ...state, sfxAssignments: { ...DEFAULT_DRUM_SFX } };
}

export function drumNoteFor(baseNote, transposeOffset, compensate) {
  const note = compensate ? baseNote - transposeOffset : baseNote;
  return Math.max(0, Math.min(127, note));
}

export function padDistanceFraction(x, y, width, height) {
  if (width <= 0 || height <= 0) return 0;
  const dx = (x - width / 2) / (width / 2);
  const dy = (y - height / 2) / (height / 2);
  return Math.max(0, Math.min(1, Math.sqrt(dx * dx + dy * dy)));
}

export function velocityFromPadDistance(fraction, centerVelocity, edgeVelocity) {
  const center = Math.max(1, Math.min(127, centerVelocity));
  const edge = Math.min(Math.max(1, Math.min(127, edgeVelocity)), center);
  const position = Math.max(0, Math.min(1, fraction));
  return Math.max(1, Math.min(127, Math.round(center + (edge - center) * position)));
}

export function drumStepIntervalMs(bpm) {
  const safeBpm = Math.max(DRUM_MIN_BPM, Math.min(DRUM_MAX_BPM, bpm));
  return Math.round(60000 / safeBpm / DRUM_STEPS_PER_BEAT);
}
