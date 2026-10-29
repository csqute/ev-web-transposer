import { useEffect, useRef, useState } from "preact/hooks";
import {
  AlertDialog,
  AppDialog,
  Chip,
  SmallButton,
  Toggle,
  haptic,
  html
} from "../ui/components.js";
import { DrumPad, padAccentClass } from "../ui/DrumPad.js";
import { DrumLoopGrid } from "../ui/DrumLoopGrid.js";
import { navigate } from "../app/router.js";
import {
  addLog,
  consumeUse,
  drumLoopMode,
  drumPlayhead,
  drumPlaying,
  drums,
  hasUses,
  license,
  midi,
  mixerChannels,
  openDialog,
  previewDrums,
  saveDrums,
  showToast,
  updateDrums,
  updateMixerChannel
} from "../app/store.js";
import {
  DRUM_KIT_BY_ID,
  DRUM_KITS,
  DRUM_MAX_BPM,
  DRUM_MIN_BPM,
  DRUM_SFX,
  DRUM_SFX_BY_ID,
  DRUM_SFX_GROUPS,
  DRUM_STEP_COUNT,
  DRUM_STEPS_PER_BEAT,
  chineseFor,
  defaultDrumSfxFor,
  drumStepIntervalMs,
  hasStep,
  labelFor,
  noteFor,
  sfxFor,
  stepMask,
  toggleStep,
  withDefaultSfxAssignments,
  withPatternCleared,
  withSfxAssigned,
  withSwappedPads
} from "../core/drums/model.js";
import {
  anyKeyboardConnected,
  drumChannel,
  drumOutputConnected,
  hasMidiDrumOutput,
  noteForState,
  sendAllDrumNoteOffs,
  sendDrumKit,
  sendDrumNoteOff,
  sendDrumNoteOn
} from "../core/drums/engine.js";
import { currentMixerTargets } from "../core/mixer/targets.js";
import { connectMidi, sendCcToDevices } from "../core/midi/engine.js";

const PAD_GAP = 8;

function ConnectionPill({ connected }) {
  return html`
    <span class=${`drum-conn${connected ? " on" : ""}`}>
      <span class="mixer-conn-dot"></span>
      ${connected ? "已连接" : "未连接"}
    </span>
  `;
}

function PadsGrid({
  state,
  editMode,
  velocityMode,
  fixedVelocity,
  centerVelocity,
  edgeVelocity,
  onPadDown,
  onPadUp,
  onSwap
}) {
  const gridRef = useRef(null);
  const [dragIndex, setDragIndex] = useState(-1);
  const [hoverIndex, setHoverIndex] = useState(-1);

  useEffect(() => {
    if (!editMode) {
      setDragIndex(-1);
      setHoverIndex(-1);
    }
  }, [editMode]);

  const indexAt = (x, y) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return -1;
    if (x < rect.left - PAD_GAP || x > rect.right + PAD_GAP
      || y < rect.top - PAD_GAP || y > rect.bottom + PAD_GAP) return -1;
    const cellWidth = (rect.width - PAD_GAP * 4) / 5;
    const cellHeight = (rect.height - PAD_GAP) / 2;
    const column = Math.max(0, Math.min(4, Math.floor((x - rect.left) / (cellWidth + PAD_GAP))));
    const row = Math.max(0, Math.min(1, Math.floor((y - rect.top) / (cellHeight + PAD_GAP))));
    return row * 5 + column;
  };

  const startDrag = (index) => {
    setDragIndex(index);
    setHoverIndex(index);
  };

  const moveDrag = (index, x, y) => {
    if (dragIndex !== index) return;
    setHoverIndex(indexAt(x, y));
  };

  const endDrag = (index, x, y) => {
    if (dragIndex !== index) return;
    const target = indexAt(x, y);
    setDragIndex(-1);
    setHoverIndex(-1);
    if (target >= 0 && target !== index) {
      haptic();
      onSwap(index, target);
    }
  };

  return html`
    <div class="drum-grid" ref=${gridRef}>
      ${state.padOrder.map((padId, index) => html`
        <${DrumPad}
          key=${padId}
          padId=${padId}
          index=${index}
          title=${labelFor(state, padId)}
          subtitle=${chineseFor(state, padId)}
          note=${noteFor(state, padId)}
          editMode=${editMode}
          isDragging=${dragIndex === index}
          isHoverTarget=${editMode && dragIndex >= 0 && hoverIndex === index && dragIndex !== index}
          velocityMode=${velocityMode}
          fixedVelocity=${fixedVelocity}
          centerVelocity=${centerVelocity}
          edgeVelocity=${edgeVelocity}
          onDown=${(velocity) => onPadDown(padId, velocity)}
          onUp=${() => onPadUp(padId)}
          onDragStart=${startDrag}
          onDragMove=${moveDrag}
          onDragEnd=${endDrag}
        />
      `)}
    </div>
  `;
}

function BpmSlider({ bpm, onPreview, onCommit }) {
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const pct = (bpm - DRUM_MIN_BPM) / (DRUM_MAX_BPM - DRUM_MIN_BPM);

  const valueAt = (x) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return bpm;
    const fraction = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    return Math.round(DRUM_MIN_BPM + fraction * (DRUM_MAX_BPM - DRUM_MIN_BPM));
  };

  const begin = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    dragRef.current = event.pointerId;
    try { trackRef.current?.setPointerCapture(event.pointerId); } catch (_) {}
    onPreview(valueAt(event.clientX));
  };

  const move = (event) => {
    if (dragRef.current !== event.pointerId) return;
    event.preventDefault();
    onPreview(valueAt(event.clientX));
  };

  const end = (event) => {
    if (dragRef.current !== event.pointerId) return;
    dragRef.current = null;
    try { trackRef.current?.releasePointerCapture(event.pointerId); } catch (_) {}
    onCommit();
  };

  return html`
    <div
      class="bpm-slider"
      ref=${trackRef}
      onPointerDown=${begin}
      onPointerMove=${move}
      onPointerUp=${end}
      onPointerCancel=${end}
    >
      <div class="bpm-track"></div>
      <div class="bpm-fill" style=${{ width: `${pct * 100}%` }}></div>
      <div class="bpm-thumb" style=${{ left: `${pct * 100}%` }}></div>
    </div>
  `;
}

function LoopTransport({ bpm, playing, onTogglePlay, onBpmPreview, onBpmCommit, onClear }) {
  return html`
    <div class="loop-transport">
      <button type="button" class=${`transport-btn${playing ? " stop" : ""}`} onClick=${onTogglePlay}>
        <span>${playing ? "■" : "▶"}</span>
        <span>${playing ? "停止" : "播放"}</span>
      </button>
      <span class="bpm-label">BPM</span>
      <${BpmSlider} bpm=${bpm} onPreview=${onBpmPreview} onCommit=${onBpmCommit} />
      <span class="bpm-value">${bpm}</span>
      <span class="bpm-range">${DRUM_MIN_BPM}–${DRUM_MAX_BPM}</span>
      <${SmallButton} label="清空" onClick=${onClear} />
    </div>
  `;
}

function DrumConnectionHint({ sfxMode, onReconnect }) {
  return html`
    <div class="drum-hint-row">
      <span>
        ${sfxMode
          ? "未检测到普通 MIDI：连接 PA700 后音效垫才能发声。"
          : "未检测到琴：连接 PA700 或 SX（SX 回环）后鼓垫才能发声。"}
      </span>
      <button type="button" class="drum-link" onClick=${onReconnect}>重新扫描 ›</button>
    </div>
  `;
}

function SfxMidiHint() {
  return html`
    <div class="drum-sfx-hint">
      音效垫只发送普通 MIDI（PA700）。当前只有 SX 回环；SX 的 SFX 键位不同，请切回「鼓组垫」使用。
    </div>
  `;
}

function EditModeHint() {
  return html`
    <div class="drum-edit-hint">
      排序模式：拖动一个鼓垫到另一个鼓垫上，松手即可交换位置（不会触发鼓声）。
    </div>
  `;
}

function ChannelStepper({ value, onChange }) {
  return html`
    <div class="mixer-channel-stepper drum-channel-stepper">
      <button type="button" class="stepper-btn" disabled=${value <= 0} onClick=${() => onChange(value - 1)}>−</button>
      <span class="stepper-value">${value + 1}</span>
      <button type="button" class="stepper-btn" disabled=${value >= 15} onClick=${() => onChange(value + 1)}>＋</button>
    </div>
  `;
}

function DrumRange({ label, value, min = 1, max = 127, onPreview, onCommit }) {
  return html`
    <div class="drum-range-block">
      <span class="drum-range-label">${label}：${value}</span>
      <input
        class="drum-range"
        type="range"
        min=${min}
        max=${max}
        value=${value}
        onInput=${(event) => onPreview(Number(event.currentTarget.value))}
        onPointerUp=${() => onCommit()}
        onKeyUp=${() => onCommit()}
        onBlur=${() => onCommit()}
      />
      <div class="drum-range-scale"><span>1</span><span>${value}</span><span>127</span></div>
    </div>
  `;
}

function DrumSettingsDialog({
  state,
  channel,
  onClose,
  onOpenSfxEditor,
  onChannelChange,
  onPadModeChange,
  onSelectKit,
  onVelocityModeChange,
  onVelocityPreview,
  onVelocityCommit,
  onCenterPreview,
  onCenterCommit,
  onEdgePreview,
  onEdgeCommit,
  onCompensationChange,
  onResendKit
}) {
  const sfxMode = state.padMode === "SFX";
  return html`
    <${AppDialog} title="打鼓设置" onClose=${onClose}>
      <div class="drum-settings">
        <h3 class="section-title">鼓组通道</h3>
        <p class="hint">打鼓页和调音台的 DRUMS 通道共用。PA700 / SX 默认都是 MIDI 通道 10。</p>
        <${ChannelStepper} value=${channel} onChange=${onChannelChange} />

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">打击垫用途</h3>
        <p class="hint">
          鼓组垫：10 个打击垫打鼓。音效垫：10 个垫触发 PA700 的 SFX Kit GM 音效，每个垫都能单独选声音。
        </p>
        <div class="chip-row">
          <${Chip} label="鼓组垫" selected=${!sfxMode} onClick=${() => onPadModeChange("DRUM")} />
          <${Chip} label="音效垫" selected=${sfxMode} onClick=${() => onPadModeChange("SFX")} />
        </div>
        ${sfxMode
          ? html`
              <p class="hint">
                切换到音效垫会自动发送 SFX Kit GM（Bank 120 / LSB 0 / PC 56）。
                如果琴上没有变化，请在琴上把 Drum 轨选为 SFX Kit GM。
                SX 回环的 SFX 键位与 PA700 不同，音效垫只发送普通 MIDI。
              </p>
              <div class="drum-dialog-actions">
                <${SmallButton} label="编辑 10 个音效垫 ›" onClick=${onOpenSfxEditor} />
              </div>
            `
          : null}

        <div class="mixer-divider-line"></div>

        ${sfxMode
          ? html`
              <h3 class="section-title">音效鼓组</h3>
              <p class="hint">
                音效垫固定使用 SFX Kit GM（CC00 120 / CC32 0 / PC 56），音效名称和音符编号按 GM2 SFX Set。
              </p>
              <div class="drum-dialog-actions">
                <${SmallButton} label="重发 SFX 鼓组" onClick=${onResendKit} />
              </div>
              ${!hasMidiDrumOutput()
                ? html`<p class="hint danger">当前没有普通 MIDI 连接：音效垫不会发声。</p>`
                : null}
            `
          : html`
              <h3 class="section-title">鼓组音色</h3>
              <p class="hint">
                普通 MIDI 琴发送 GM2 Bank 120；SX 发送 Yamaha Bank 127（SFX 为 126）。
                SX 的 Drum 轨需选鼓组并接收通道 10。切换后点鼓垫试听。
              </p>
              <div class="drum-kit-grid">
                ${DRUM_KITS.map((kit) => html`
                  <${Chip}
                    label=${kit.chinese}
                    selected=${state.selectedKit === kit.id}
                    onClick=${() => onSelectKit(kit)}
                  />
                `)}
              </div>
              <p class="hint accent">
                App 选择：${DRUM_KIT_BY_ID[state.selectedKit].label}
                （${DRUM_KIT_BY_ID[state.selectedKit].chinese}）· 点上方按钮发送到琴
              </p>
              ${!drumOutputConnected(true)
                ? html`<p class="hint danger">当前未连接琴：切换鼓组只会更新界面，不会发送到琴。</p>`
                : null}
              <p class="hint">如果琴上没有变化，请在琴上直接选择 Drum 轨道的鼓组。</p>
            `}

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">力度</h3>
        <p class="hint">
          固定力度使用滑块数值；位置力度下，敲击鼓垫中心力度最大，越靠近边缘力度越小，
          中心/边缘力度都可调。Loop 播放使用固定力度。
        </p>
        <div class="chip-row">
          <${Chip} label="固定力度" selected=${state.velocityMode === "FIXED"} onClick=${() => onVelocityModeChange("FIXED")} />
          <${Chip} label="位置力度" selected=${state.velocityMode === "POSITION"} onClick=${() => onVelocityModeChange("POSITION")} />
        </div>
        <${DrumRange}
          label="固定 / Loop 力度"
          value=${state.fixedVelocity}
          onPreview=${onVelocityPreview}
          onCommit=${onVelocityCommit}
        />
        ${state.velocityMode === "POSITION"
          ? html`
              <${DrumRange}
                label="中心力度（鼓垫正中间）"
                value=${state.centerVelocity}
                onPreview=${onCenterPreview}
                onCommit=${onCenterCommit}
              />
              <${DrumRange}
                label="边缘力度（鼓垫最外侧）"
                value=${state.edgeVelocity}
                onPreview=${onEdgePreview}
                onCommit=${onEdgeCommit}
              />
            `
          : null}

        <div class="mixer-divider-line"></div>

        <${Toggle}
          label="移调补偿"
          checked=${state.transposeCompensation}
          onChange=${onCompensationChange}
        />
        <p class="hint">
          默认关闭。PA700 / SX 鼓组不跟随移调；只有琴把输入音符也移调时才需要打开。
        </p>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title accent">GM 鼓音符</h3>
        <p class="hint">
          底鼓 36 · 军鼓 38 · 闭镲 42 · 开镲 46<br />
          高音通鼓 50 · 中音通鼓 47 · 低音通鼓 45 · 落地通鼓 43<br />
          吊镲 49 · 叮叮镲 51
        </p>
        <p class="hint">
          如果鼓声不对：在琴上进入 Global › Tuning › Transpose Control，关闭 Mode › Midi In Notes；
          或者在上面打开「移调补偿」。<br />
          如果完全没声音：确认琴上已选择 Style、Drum 轨道没有被 Track Mute，并且调音台里 DRUMS 不是静音。
        </p>
      </div>
    <//>
  `;
}

function SfxPadDialog({ state, onClose, onAssign, onReset }) {
  const order = state.padOrder;
  const [selectedPadId, setSelectedPadId] = useState(order[0] || "KICK");
  const selectedPad = order.includes(selectedPadId) ? selectedPadId : order[0];
  const currentSfx = sfxFor(state, selectedPad);
  return html`
    <${AppDialog} title="音效垫设置" onClose=${onClose}>
      <div class="sfx-dialog">
        <p class="hint">先点一个打击垫，再点下面的音效。点音效会立即分配并试听；所有设置自动保存。</p>

        <h3 class="section-title">10 个打击垫</h3>
        <div class="sfx-pad-list">
          ${order.map((padId, index) => {
            const sfx = sfxFor(state, padId);
            const selected = padId === selectedPad;
            return html`
              <button
                type="button"
                class=${`sfx-pad-row${selected ? " selected" : ""}`}
                onClick=${() => setSelectedPadId(padId)}
              >
                <span class="sfx-pad-index">${index + 1}</span>
                <span class="sfx-pad-chinese">${chineseFor({ ...state, padMode: "DRUM" }, padId)}</span>
                <span class="sfx-pad-arrow">→</span>
                <span class="sfx-pad-effect">${sfx.chinese}</span>
                <span class="sfx-pad-label">${sfx.label}</span>
                <span class="sfx-pad-note">${sfx.note}</span>
              </button>
            `;
          })}
        </div>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">给「${chineseFor({ ...state, padMode: "DRUM" }, selectedPad)}」选音效</h3>
        <p class="hint accent">当前：${currentSfx.chinese}（${currentSfx.label} · NOTE ${currentSfx.note}）</p>
        ${!hasMidiDrumOutput()
          ? html`<p class="hint danger">当前没有普通 MIDI 连接：选择只会保存，不会试听。</p>`
          : null}

        ${DRUM_SFX_GROUPS.map((group) => html`
          <div class="sfx-group">
            <h4>${group.label}</h4>
            ${DRUM_SFX.filter((sfx) => sfx.group === group.id).map((sfx) => {
              const assigned = currentSfx.id === sfx.id;
              return html`
                <button
                  type="button"
                  class=${`sfx-option${assigned ? " selected" : ""}`}
                  onClick=${() => onAssign(selectedPad, sfx)}
                >
                  <span class="sfx-option-chinese">${sfx.chinese}</span>
                  <span class="sfx-option-label">${sfx.label}</span>
                  <span class="sfx-option-note">NOTE ${sfx.note}</span>
                  <span class="sfx-option-check">${assigned ? "✓" : ""}</span>
                </button>
              `;
            })}
          </div>
        `)}

        <div class="mixer-divider-line"></div>
        <div class="drum-dialog-actions">
          <${SmallButton} label="恢复 10 个默认音效" onClick=${onReset} />
        </div>
        <p class="hint">
          鼓组音效来自 GM2 SFX Set（PA700：SFX Kit GM，Bank 120 / LSB 0 / PC 56）；
          只发送普通 MIDI，SX 回环请用鼓组垫。
        </p>
      </div>
    <//>
  `;
}

export function DrumScreen({ embedded = false }) {
  const state = drums.value;
  const loopMode = drumLoopMode.value;
  const playing = drumPlaying.value;
  const playhead = drumPlayhead.value;
  const sfxMode = state.padMode === "SFX";
  const channel = mixerChannels.value.DRUMS?.channel ?? 9;
  const drumsMuted = mixerChannels.value.DRUMS?.muted === true;
  const anyConnected = anyKeyboardConnected();
  const midiOutput = hasMidiDrumOutput();
  const sfxLoopNeedsMidi = sfxMode && !midiOutput;

  const [editMode, setEditMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSfxEditor, setShowSfxEditor] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const playbackRef = useRef({ token: 0, timer: 0 });

  const deviceSignature = midi.value.devices
    .map((device) => `${device.key}:${device.mode}:${device.output?.port?.id || device.outputName}`)
    .join("|");

  const stopSequencer = ({ silent = false } = {}) => {
    const wasPlaying = drumPlaying.value;
    playbackRef.current.token += 1;
    clearTimeout(playbackRef.current.timer);
    playbackRef.current.timer = 0;
    drumPlaying.value = false;
    drumPlayhead.value = -1;
    if (!wasPlaying && !drumOutputConnected(true)) return;
    const current = drums.value;
    const includeSx = current.padMode === "DRUM";
    const notes = current.padOrder.map((padId) =>
      noteForState(noteFor(current, padId), current)
    );
    sendAllDrumNoteOffs(notes, includeSx).catch(() => {});
    if (wasPlaying && !silent) addLog("打鼓：16 步 Loop 已停止", "muted");
  };

  const startSequencer = () => {
    if (drumPlaying.value) return;
    const current = drums.value;
    const includeSx = current.padMode === "DRUM";
    const connected = drumOutputConnected(includeSx);
    if (connected && !hasUses(1)) {
      openDialog("paywall");
      return;
    }
    const token = playbackRef.current.token + 1;
    playbackRef.current.token = token;
    clearTimeout(playbackRef.current.timer);
    drumPlaying.value = true;
    drumPlayhead.value = 0;
    if (connected) consumeUse(1);
    addLog(
      connected
        ? `打鼓：16 步 Loop 开始播放（${current.bpm} BPM）`
        : "打鼓：未连接琴，Loop 只走界面不出声",
      connected ? "ok" : "muted"
    );

    let step = 0;
    let nextAt = performance.now();
    const tick = () => {
      if (token !== playbackRef.current.token) return;
      const nowState = drums.value;
      const stepMs = drumStepIntervalMs(nowState.bpm);
      const useSx = nowState.padMode === "DRUM";
      const notes = [];
      for (const padId of nowState.padOrder) {
        if (hasStep(nowState, padId, step)) {
          notes.push(noteForState(noteFor(nowState, padId), nowState));
        }
      }
      if (notes.length) {
        for (const note of notes) {
          sendDrumNoteOn(note, nowState.fixedVelocity, useSx).catch(() => {});
        }
      }
      drumPlayhead.value = step;
      const gate = Math.max(25, Math.min(70, Math.round(stepMs / 3)));
      if (notes.length) {
        setTimeout(() => {
          if (token !== playbackRef.current.token) return;
          for (const note of notes) {
            sendDrumNoteOff(note, useSx).catch(() => {});
          }
        }, gate);
      }
      step = (step + 1) % DRUM_STEP_COUNT;
      nextAt += stepMs;
      if (nextAt < performance.now() - stepMs) nextAt = performance.now();
      playbackRef.current.timer = setTimeout(tick, Math.max(0, nextAt - performance.now()));
    };
    tick();
  };

  const togglePlay = () => {
    haptic();
    if (drumPlaying.value) stopSequencer();
    else startSequencer();
  };

  useEffect(() => () => stopSequencer({ silent: true }), []);

  useEffect(() => {
    if (midi.value.supported && midi.value.status !== "connected") {
      connectMidi().catch(() => {});
    }
  }, []);

  // A persisted SFX mode must select SFX Kit GM on page open or reconnect.
  useEffect(() => {
    if (drums.value.padMode === "SFX") {
      sendDrumKit(DRUM_KIT_BY_ID.SFX, false).catch(() => {});
    }
  }, [deviceSignature]);

  const leaveEditMode = () => {
    setEditMode(false);
  };

  const goBack = () => {
    if (loopMode) {
      setLoopMode(false);
      return;
    }
    if (editMode) {
      leaveEditMode();
      return;
    }
    stopSequencer({ silent: true });
    navigate("transpose");
  };

  const auditionPad = (padId) => {
    const current = drums.value;
    const includeSx = current.padMode === "DRUM";
    if (!drumOutputConnected(includeSx)) return;
    const note = noteForState(noteFor(current, padId), current);
    sendDrumNoteOn(note, current.fixedVelocity, includeSx).catch(() => {});
    setTimeout(() => {
      sendDrumNoteOff(note, includeSx).catch(() => {});
    }, 80);
  };

  const auditionSfx = (sfx) => {
    if (!hasMidiDrumOutput()) return;
    const current = drums.value;
    const note = noteForState(sfx.note, current);
    sendDrumNoteOn(note, current.fixedVelocity, false).catch(() => {});
    setTimeout(() => {
      sendDrumNoteOff(note, false).catch(() => {});
    }, 120);
  };

  const padDown = (padId, velocity) => {
    const current = drums.value;
    const includeSx = current.padMode === "DRUM";
    const connected = drumOutputConnected(includeSx);
    if (connected && !hasUses(1)) {
      openDialog("paywall");
      return false;
    }
    const note = noteForState(noteFor(current, padId), current);
    sendDrumNoteOn(note, velocity, includeSx).catch(() => {});
    if (connected) consumeUse(1);
    return true;
  };

  const padUp = (padId) => {
    const current = drums.value;
    const includeSx = current.padMode === "DRUM";
    const note = noteForState(noteFor(current, padId), current);
    sendDrumNoteOff(note, includeSx).catch(() => {});
  };

  const swapPads = (from, to) => {
    const current = drums.value;
    const first = current.padOrder[from];
    const second = current.padOrder[to];
    const next = withSwappedPads(current, from, to);
    if (next === current) return;
    saveDrums(next);
    addLog(`打鼓：交换 ${first} ↔ ${second}`, "muted");
  };

  const setLoopMode = (enabled) => {
    haptic();
    if (drumLoopMode.value === enabled) return;
    drumLoopMode.value = enabled;
    if (enabled) leaveEditMode();
  };

  const setPadMode = (mode) => {
    haptic();
    if (drums.value.padMode === mode) return;
    const updated = updateDrums({ padMode: mode });
    leaveEditMode();
    if (mode === "SFX") {
      sendDrumKit(DRUM_KIT_BY_ID.SFX, false).catch(() => {});
      addLog(
        hasMidiDrumOutput()
          ? "打鼓：音效垫模式（已发送 SFX Kit GM）"
          : "打鼓：音效垫模式；未连接普通 MIDI，音效暂不发声",
        "muted"
      );
    } else {
      const kit = DRUM_KIT_BY_ID[updated.selectedKit];
      sendDrumKit(kit, true).catch(() => {});
      addLog(
        drumOutputConnected(true)
          ? `打鼓：鼓组垫模式（已发送 ${kit.label}）`
          : "打鼓：鼓组垫模式；未连接琴，鼓组切换未发送",
        "muted"
      );
    }
  };

  const selectKit = (kit) => {
    haptic();
    updateDrums({ selectedKit: kit.id });
    sendDrumKit(kit, true).catch(() => {});
    addLog(
      hasMidiDrumOutput()
        ? `打鼓：GM2 鼓组 ${kit.label}（PC ${kit.program}）`
        : "打鼓：未连接，鼓组切换未发送",
      "muted"
    );
  };

  const resendKit = () => {
    haptic();
    const current = drums.value;
    const kit = current.padMode === "SFX" ? DRUM_KIT_BY_ID.SFX : DRUM_KIT_BY_ID[current.selectedKit];
    sendDrumKit(kit, current.padMode !== "SFX").catch(() => {});
    addLog(
      current.padMode === "SFX"
        ? "打鼓：已重发 SFX 鼓组"
        : drumOutputConnected(true)
          ? `打鼓：已重发 ${kit.label} 鼓组`
          : "打鼓：未连接琴，鼓组未发送",
      "muted"
    );
  };

  const assignSfx = (padId, sfx) => {
    haptic();
    const next = withSfxAssigned(drums.value, padId, sfx.id);
    saveDrums(next);
    addLog(`打鼓：${padId} → ${sfx.chinese}（NOTE ${sfx.note}）`, "muted");
    if (next.padMode === "SFX") auditionSfx(sfx);
  };

  const resetSfx = () => {
    haptic();
    saveDrums(withDefaultSfxAssignments(drums.value));
    addLog("打鼓：10 个音效垫已恢复默认", "muted");
  };

  const setChannel = (nextChannel) => {
    haptic();
    const next = Math.max(0, Math.min(15, nextChannel));
    const current = mixerChannels.value.DRUMS;
    updateMixerChannel("DRUMS", { channel: next });
    const devices = currentMixerTargets();
    sendCcToDevices(devices, next, 7, current.muted ? 0 : current.volume).catch(() => {});
    addLog(`打鼓：鼓组通道 → CH${next + 1}`, "muted");
  };

  const setBpmPreview = (value) => {
    previewDrums({ ...drums.value, bpm: value });
  };

  const commitBpm = () => {
    saveDrums(drums.value);
  };

  const setVelocityPreview = (value) => {
    previewDrums({ ...drums.value, fixedVelocity: value });
  };

  const setVelocity = (value) => {
    const next = updateDrums({ fixedVelocity: value });
    addLog(`打鼓：固定/Loop 力度 ${next.fixedVelocity}`, "muted");
  };

  const setCenterPreview = (value) => {
    previewDrums({ ...drums.value, centerVelocity: Math.max(value, drums.value.edgeVelocity) });
  };

  const setCenter = (value) => {
    const next = updateDrums({
      centerVelocity: Math.max(value, drums.value.edgeVelocity)
    });
    addLog(`打鼓：中心力度 ${next.centerVelocity}`, "muted");
  };

  const setEdgePreview = (value) => {
    previewDrums({ ...drums.value, edgeVelocity: Math.min(value, drums.value.centerVelocity) });
  };

  const setEdge = (value) => {
    const next = updateDrums({
      edgeVelocity: Math.min(value, drums.value.centerVelocity)
    });
    addLog(`打鼓：边缘力度 ${next.edgeVelocity}`, "muted");
  };

  const setVelocityMode = (mode) => {
    haptic();
    updateDrums({ velocityMode: mode });
    addLog(`打鼓：力度模式 ${mode === "POSITION" ? "位置力度" : "固定力度"}`, "muted");
  };

  const setCompensation = (enabled) => {
    haptic();
    updateDrums({ transposeCompensation: enabled });
    addLog(enabled ? "打鼓：移调补偿已开启" : "打鼓：移调补偿已关闭", "muted");
  };

  const clearPattern = () => {
    const next = withPatternCleared(drums.value);
    saveDrums(next);
    addLog("打鼓：16 步 Loop 已清空", "muted");
    setShowClearConfirm(false);
  };

  const loopPreview = (next, previewPadId) => {
    previewDrums(next);
    if (previewPadId) auditionPad(previewPadId);
  };

  const commitPattern = () => {
    saveDrums(drums.value);
  };

  const subtitle = (() => {
    let text = "";
    if (loopMode) {
      text = `16 步 LOOP · 4/4 · 1 小节 · ${state.bpm} BPM`;
      if (sfxMode) text += " · 音效";
    } else if (sfxMode) {
      text = `SFX PADS · SFX Kit GM · MIDI · CH ${channel + 1}`;
      if (state.transposeCompensation) text += " · 移调补偿开";
    } else {
      text = `DRUM PADS · MIDI / SX · CH ${channel + 1}`;
      if (state.transposeCompensation) text += " · 移调补偿开";
    }
    if (playing) text += ` · 播放中 ${playhead + 1}/16`;
    if (drumsMuted) text += " · DRUMS 已静音";
    text += license.value.unlimited ? " · 无限制" : ` · 剩余 ${license.value.balance} 次`;
    return text;
  })();

  const subtitleClass = drumsMuted
    ? "danger"
    : playing
      ? "success"
      : state.transposeCompensation
        ? "accent-alt"
        : "";

  return html`
    <div class="sub-screen drum-screen">
      <div class="drum-header">
        ${loopMode
          ? html`<button type="button" class="back-btn drum-back" title="返回打击垫" onClick=${() => setLoopMode(false)}>‹ 打击垫</button>`
          : embedded
            ? null
            : html`<button type="button" class="back-btn" onClick=${goBack}>‹ 返回</button>`}
        <div class="drum-heading">
          <h1>打鼓</h1>
          <p class=${subtitleClass} title=${subtitle}>${subtitle}</p>
        </div>
        <div class="drum-header-actions">
          <${Chip} label="鼓垫" selected=${!loopMode} onClick=${() => setLoopMode(false)} />
          <${Chip} label="16 步 Loop" selected=${loopMode} onClick=${() => setLoopMode(true)} />
          ${!loopMode && !playing
            ? html`
                <${SmallButton}
                  label=${sfxMode ? "换音效" : editMode ? "完成" : "排序"}
                  onClick=${() => {
                    haptic();
                    if (sfxMode) setShowSfxEditor(true);
                    else setEditMode((value) => !value);
                  }}
                />
              `
            : null}
          ${playing ? html`<${SmallButton} label="■ 停止" onClick=${togglePlay} />` : null}
          <${ConnectionPill} connected=${anyConnected} />
          <${SmallButton} label="设置" onClick=${() => { haptic(); setShowSettings(true); }} />
        </div>
      </div>

      ${editMode
        ? html`<${EditModeHint} />`
        : !anyConnected && !loopMode
          ? html`<${DrumConnectionHint} sfxMode=${sfxMode} onReconnect=${() => { haptic(); connectMidi().catch(() => {}); }} />`
          : !loopMode && sfxMode && !midiOutput
            ? html`<${SfxMidiHint} />`
            : null}

      ${loopMode
        ? html`
            <${LoopTransport}
              bpm=${state.bpm}
              playing=${playing}
              onTogglePlay=${togglePlay}
              onBpmPreview=${setBpmPreview}
              onBpmCommit=${commitBpm}
              onClear=${() => setShowClearConfirm(true)}
            />
            <${DrumLoopGrid}
              state=${state}
              playing=${playing}
              playhead=${playhead}
              onPreview=${loopPreview}
              onCommit=${commitPattern}
            />
            <div class=${`drum-footer${!anyConnected || sfxLoopNeedsMidi ? " danger" : ""}`}>
              ${!anyConnected
                ? "未连接琴：可以先编排，播放只走界面不出声 · 连接 PA700 / SX 后自动发送"
                : sfxLoopNeedsMidi
                  ? "音效 Loop 只发送普通 MIDI；当前只有 SX 回环，不会发声"
                  : "点或拖动方格快速编排 · 每 4 格一拍 · 循环播放 · 编排会自动保存"}
            </div>
          `
        : html`
            <${PadsGrid}
              state=${state}
              editMode=${editMode}
              velocityMode=${state.velocityMode}
              fixedVelocity=${state.fixedVelocity}
              centerVelocity=${state.centerVelocity}
              edgeVelocity=${state.edgeVelocity}
              onPadDown=${padDown}
              onPadUp=${padUp}
              onSwap=${swapPads}
            />
            <div class="drum-footer ${sfxMode ? "two-lines" : ""}">
              ${editMode
                ? "排序模式：拖动鼓垫到目标鼓垫上松手交换 · 点「完成」返回演奏"
                : playing
                  ? "Loop 正在播放 · 可以直接在鼓垫上跟着打 · 点上方「■ 停止」结束"
                  : sfxMode
                    ? "音效垫：按下触发音效 · 点上方「换音效」给 10 个垫换声音 · 使用 PA700 的 SFX Kit GM"
                    : "按下即触发 · 松开发送 Note Off · 设置里可调力度和鼓组"}
            </div>
          `}

      ${showSettings
        ? html`
            <${DrumSettingsDialog}
              state=${state}
              channel=${channel}
              onClose=${() => setShowSettings(false)}
              onOpenSfxEditor=${() => { setShowSettings(false); setShowSfxEditor(true); }}
              onChannelChange=${setChannel}
              onPadModeChange=${setPadMode}
              onSelectKit=${selectKit}
              onVelocityModeChange=${setVelocityMode}
              onVelocityPreview=${setVelocityPreview}
              onVelocityCommit=${() => setVelocity(drums.value.fixedVelocity)}
              onCenterPreview=${setCenterPreview}
              onCenterCommit=${() => setCenter(drums.value.centerVelocity)}
              onEdgePreview=${setEdgePreview}
              onEdgeCommit=${() => setEdge(drums.value.edgeVelocity)}
              onCompensationChange=${setCompensation}
              onResendKit=${resendKit}
            />
          `
        : null}

      ${showSfxEditor
        ? html`
            <${SfxPadDialog}
              state=${state}
              onClose=${() => setShowSfxEditor(false)}
              onAssign=${assignSfx}
              onReset=${resetSfx}
            />
          `
        : null}

      ${showClearConfirm
        ? html`
            <${AlertDialog}
              title="清空 16 步？"
              message="所有鼓垫的编排都会被删除，此操作不能撤销。"
              actions=${[
                { label: "取消", onClick: () => setShowClearConfirm(false) },
                { label: "清空", danger: true, onClick: clearPattern }
              ]}
            />
          `
        : null}
    </div>
  `;
}
