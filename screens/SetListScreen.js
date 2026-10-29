import { useEffect, useState } from "preact/hooks";
import {
  AlertDialog,
  AppDialog,
  Chip,
  SmallButton,
  haptic,
  html
} from "../ui/components.js";
import { navigate } from "../app/router.js";
import {
  addLog,
  beginSetListCapture,
  cancelSetListCapture,
  clearCapturedSetListNumber,
  consumeUse,
  controlChannel,
  hasUses,
  license,
  midi,
  openDialog,
  saveSetList,
  setControlChannel,
  setList,
  statusLine
} from "../app/store.js";
import {
  SET_LIST_MAX_GROUPS,
  SET_LIST_NAME_MAX,
  SET_LIST_SLOT_COUNT,
  SONGBOOK_MAX_NUMBER,
  SONGBOOK_MIN_NUMBER,
  addGroup,
  configuredCount,
  currentGroup,
  deleteGroup,
  indexOfNumber,
  nextConfiguredSlot,
  renameGroup,
  slotConfigured,
  slotDisplayName,
  songBookMessages,
  withSlot
} from "../core/setlist/model.js";
import {
  connectMidi,
  midiPerformanceDevices,
  scheduleKeepAfterSoundChange,
  sendMessagesToDevice
} from "../core/midi/engine.js";

function ChannelStepper({ value, onChange }) {
  return html`
    <div class="mixer-channel-stepper setlist-channel-stepper">
      <button type="button" class="stepper-btn" disabled=${value <= 0} onClick=${() => onChange(value - 1)}>−</button>
      <span class="stepper-value">${value + 1}</span>
      <button type="button" class="stepper-btn" disabled=${value >= 15} onClick=${() => onChange(value + 1)}>＋</button>
    </div>
  `;
}

function SetListTile({ index, slot, current, editMode, onClick }) {
  const configured = slotConfigured(slot);
  return html`
    <button
      type="button"
      class=${`setlist-tile${current ? " current" : ""}${configured ? " configured" : ""}`}
      onClick=${onClick}
    >
      <span class="setlist-index">${index + 1}</span>
      <span class="setlist-corner">${current ? "▶ 当前" : editMode ? "编辑" : ""}</span>
      <span class="setlist-name">${slot.number != null ? slotDisplayName(slot) : "空"}</span>
      <span class="setlist-number">${slot.number != null ? `SongBook #${slot.number}` : "点此设置"}</span>
    </button>
  `;
}

function SlotEditDialog({ group, groupIndex, slotIndex, slot, onClose }) {
  const [numberText, setNumberText] = useState(slot.number?.toString() || "");
  const [nameText, setNameText] = useState(slot.name || "");
  const [error, setError] = useState("");
  const [captureRequested, setCaptureRequested] = useState(false);
  const state = setList.value;
  const capturing = state.captureSlot === slotIndex;
  const captured = state.capturedNumber;

  useEffect(() => {
    if (captureRequested && captured != null) {
      setNumberText(String(captured));
      setError("");
      setCaptureRequested(false);
      clearCapturedSetListNumber();
    }
  }, [captured, captureRequested]);

  const dismiss = () => {
    cancelSetListCapture();
    clearCapturedSetListNumber();
    onClose();
  };

  const save = () => {
    const trimmed = numberText.trim();
    const number = trimmed ? Number(trimmed) : null;
    if (trimmed && (!Number.isInteger(number) || number < SONGBOOK_MIN_NUMBER || number > SONGBOOK_MAX_NUMBER)) {
      setError("编号应为 1–9999");
      return;
    }
    const current = setList.value;
    saveSetList(withSlot(current, groupIndex, slotIndex, number, nameText));
    cancelSetListCapture();
    clearCapturedSetListNumber();
    addLog(
      number != null
        ? `歌单：第 ${slotIndex + 1} 格 → SongBook #${number}`
        : `歌单：已清空第 ${slotIndex + 1} 格`,
      "muted"
    );
    onClose();
  };

  const clear = () => {
    const current = setList.value;
    saveSetList(withSlot(current, groupIndex, slotIndex, null, ""));
    cancelSetListCapture();
    clearCapturedSetListNumber();
    onClose();
  };

  return html`
    <${AppDialog} title=${`编辑第 ${slotIndex + 1} 格`} onClose=${dismiss}>
      <div class="setlist-edit-dialog">
        <div class="setlist-number-row">
          <label class="setlist-number-field">
            <span>SongBook 编号</span>
            <input
              type="text"
              inputmode="numeric"
              maxlength="4"
              value=${numberText}
              placeholder="1–9999"
              onInput=${(event) => {
                setNumberText(event.currentTarget.value.replace(/\D/g, "").slice(0, 4));
                setError("");
              }}
            />
          </label>
          <${SmallButton}
            label=${capturing ? "等待琴上选择…" : "从琴抓取"}
            disabled=${capturing}
            onClick=${() => {
              setCaptureRequested(true);
              beginSetListCapture(groupIndex, slotIndex);
            }}
          />
        </div>
        ${capturing
          ? html`<p class="hint accent">现在在 PA700 上选择这首歌，App 会自动读取 SongBook 编号。</p>`
          : null}
        <label class="setlist-name-field">
          <span>显示名称（可留空）</span>
          <input
            type="text"
            maxlength=${SET_LIST_NAME_MAX}
            value=${nameText}
            onInput=${(event) => setNameText(event.currentTarget.value.slice(0, SET_LIST_NAME_MAX))}
          />
        </label>
        ${error ? html`<p class="hint danger">${error}</p>` : null}
        <div class="chain-dialog-actions">
          <${SmallButton} label="保存" onClick=${save} />
          <${SmallButton} label="清空" onClick=${clear} />
          <${SmallButton} label="取消" onClick=${dismiss} />
        </div>
        <p class="hint">
          编号是 PA700 里 SongBook 条目的 Number（SongBook › Write › Number）。
          如果琴上没有编号，请先在琴上给这些歌设置编号。
        </p>
      </div>
    <//>
  `;
}

function RenameGroupDialog({ group, onClose, onConfirm }) {
  const [name, setName] = useState(group.name);
  return html`
    <${AppDialog} title="组名" onClose=${onClose}>
      <div class="setlist-rename-dialog">
        <label class="setlist-name-field">
          <span>名称</span>
          <input
            type="text"
            maxlength=${SET_LIST_NAME_MAX}
            value=${name}
            onInput=${(event) => setName(event.currentTarget.value.slice(0, SET_LIST_NAME_MAX))}
          />
        </label>
        <div class="chain-dialog-actions">
          <${SmallButton} label="取消" onClick=${onClose} />
          <${SmallButton} label="保存" disabled=${!name.trim()} onClick=${() => onConfirm(name)} />
        </div>
      </div>
    <//>
  `;
}

function GroupManagerDialog({ state, onClose, onAdd, onSwitch, onRename, onDelete }) {
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const groups = state.groups;
  return html`
    <${AppDialog} title="歌单组" onClose=${onClose}>
      <div class="setlist-group-manager">
        <p class="hint">
          组是 App 里的 9 首一页歌单。切换组会切换下面 9 个格子；
          PA700 的 Set List 页不能通过 MIDI 远程翻页。
        </p>
        <div class="chain-new-row">
          <input
            type="text"
            maxlength=${SET_LIST_NAME_MAX}
            value=${newName}
            placeholder="新组名称"
            onInput=${(event) => setNewName(event.currentTarget.value.slice(0, SET_LIST_NAME_MAX))}
          />
          <${SmallButton} label="新建组" onClick=${() => { onAdd(newName); setNewName(""); }} />
        </div>
        <div class="chain-manager-list">
          ${groups.map((group, index) => html`
            <div class="chain-manager-row">
              <div class="chain-manager-info">
                <strong>${group.name}</strong>
                <span>${configuredCount(group)}/9 首 · 第 ${index + 1}/${groups.length} 组</span>
              </div>
              <${SmallButton}
                label=${index === state.currentGroupIndex ? "当前" : "切换"}
                disabled=${index === state.currentGroupIndex}
                onClick=${() => onSwitch(index)}
              />
              <${SmallButton} label="改名" onClick=${() => setRenaming(index)} />
              <${SmallButton} label="删除" disabled=${groups.length <= 1} onClick=${() => setDeleting(index)} />
            </div>
          `)}
        </div>
        <p class="hint">每格填写 PA700 SongBook 条目的 Number；一个组对应演出的一页 9 首。</p>
      </div>
    <//>

    ${renaming !== null
      ? html`
          <${RenameGroupDialog}
            group=${groups[renaming]}
            onClose=${() => setRenaming(null)}
            onConfirm=${(name) => { onRename(renaming, name); setRenaming(null); }}
          />
        `
      : null}

    ${deleting !== null
      ? html`
          <${AlertDialog}
            title=${`删除「${groups[deleting].name}」？`}
            message="这个组里的 9 格设置会一起删除，不能撤销。"
            actions=${[
              { label: "取消", onClick: () => setDeleting(null) },
              { label: "删除", danger: true, onClick: () => { onDelete(deleting); setDeleting(null); } }
            ]}
          />
        `
      : null}
  `;
}

function SetListSettingsDialog({ onClose }) {
  return html`
    <${AppDialog} title="歌单设置" onClose=${onClose}>
      <div class="setlist-settings">
        <h3 class="section-title">Control 通道</h3>
        <p class="hint">
          PA700 的 SongBook 选曲走特殊 Control 通道。App 发送和接收都使用这个通道；
          琴上也要把 MIDI IN/OUT 的同一个通道设为 Control。
        </p>
        <${ChannelStepper} value=${controlChannel.value} onChange=${(value) => setControlChannel(value)} />

        <div class="mixer-divider-line"></div>

        <h3 class="section-title accent">PA700 设置步骤</h3>
        <p class="hint">
          1. 确认要控制的歌曲在 SongBook 里有 Number（SongBook › Write › Number，1–9999）。<br />
          2. Global › MIDI › MIDI IN Channel：把同一个通道设为 Control；
          MIDI OUT Channel 也设为 Control（常用 16，等同 Tablet MIDI Preset）。<br />
          3. 保存 MIDI Preset（Write MIDI Preset）。<br />
          4. 使用时 PA700 请在 Style Play 或 Song Play 模式；发送选曲后琴会加载对应 SongBook 条目。
        </p>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title accent">关于 Set List 页</h3>
        <p class="hint">
          PA700 没有公开的 MIDI 命令来翻 Set List 页，所以 App 用「组」切换 9 首一页的歌单；
          切组只换 App 里的 9 格，不会翻琴上的 Set List 页。下一首/上一首由 App 按 SongBook 编号发送。
        </p>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title accent">抓取编号</h3>
        <p class="hint">
          在编辑格子里点「从琴抓取」，然后在 PA700 上选择那首歌；琴会把 SongBook 编号通过 Control OUT 通道发给 App。
        </p>

        <div class="mixer-divider-line"></div>

        <p class="hint danger">
          如果点格子后琴没反应：检查 Control 通道是否一致、MIDI IN Filters 是否屏蔽 Control Change，
          以及琴当前是否在 Style Play / Song Play 模式。
        </p>
      </div>
    <//>
  `;
}

export function SetListScreen({ embedded = false }) {
  const state = setList.value;
  const group = currentGroup(state);
  const channel = controlChannel.value;
  const balance = license.value.unlimited ? "无限制" : `剩余 ${license.value.balance} 次`;
  const midiDevices = midiPerformanceDevices();
  const connected = midiDevices.length > 0;
  const [editMode, setEditMode] = useState(false);
  const [editingSlot, setEditingSlot] = useState(-1);
  const [showGroups, setShowGroups] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localStatus, setLocalStatus] = useState("");

  useEffect(() => {
    if (midi.value.supported && midi.value.status !== "connected") {
      connectMidi().catch(() => {});
    }
  }, []);

  const apply = (next) => saveSetList(next);
  const setStatus = (text) => {
    setLocalStatus(text);
    if (text) addLog(text, "muted");
  };

  const selectSlot = async (index) => {
    const current = setList.value;
    const currentGroupValue = currentGroup(current);
    const slot = currentGroupValue.slots[index];
    if (!slotConfigured(slot)) {
      setEditingSlot(index);
      return;
    }
    if (connected && !hasUses(1)) {
      openDialog("paywall");
      return;
    }
    saveSetList({
      ...current,
      currentSlot: index,
      remoteNumber: slot.number
    });
    if (!connected) {
      setStatus(`歌单：未连接琴，未发送 SongBook #${slot.number}`);
      return;
    }
    let sent = 0;
    for (const device of midiDevices) {
      const count = await sendMessagesToDevice(
        device,
        songBookMessages(channel, slot.number)
      ).catch(() => 0);
      if (count > 0) sent += 1;
    }
    if (sent > 0) {
      consumeUse(1);
      scheduleKeepAfterSoundChange("歌单");
      setStatus(
        `歌单：SongBook #${slot.number} · ${slotDisplayName(slot)}（Control CH ${channel + 1}）`
      );
    } else {
      setStatus("歌单：发送失败：没有可用的 MIDI 输出");
    }
  };

  const stepSong = (step) => {
    const next = nextConfiguredSlot(group.slots, state.currentSlot, step);
    if (next === null) {
      setStatus(`歌单：${group.name} 里还没有可用的歌曲`);
      return;
    }
    selectSlot(next);
  };

  const selectGroup = (index) => {
    const current = setList.value;
    if (index < 0 || index >= current.groups.length) return;
    const nextGroup = current.groups[index];
    const slot = current.remoteNumber != null
      ? indexOfNumber(nextGroup, current.remoteNumber)
      : -1;
    saveSetList({
      ...current,
      currentGroupIndex: index,
      currentSlot: slot,
      captureSlot: -1,
      capturedNumber: null
    });
  };

  const stepGroup = (step) => {
    const count = state.groups.length;
    if (count <= 1) return;
    selectGroup(((state.currentGroupIndex + step) % count + count) % count);
  };

  const saveSlot = (index, number, name) => {
    const current = setList.value;
    saveSetList(withSlot(current, current.currentGroupIndex, index, number, name));
  };

  const addGroupAction = (name) => {
    const next = addGroup(setList.value, name);
    apply(next);
    setStatus(`歌单：新建「${next.groups.at(-1)?.name || name}」`);
  };

  const renameGroupAction = (index, name) => {
    apply(renameGroup(setList.value, index, name));
  };

  const deleteGroupAction = (index) => {
    apply(deleteGroup(setList.value, index));
  };

  const startEditSlot = (index) => {
    haptic();
    setEditingSlot(index);
  };

  const hint = editMode
    ? "编辑模式：点格子设置歌曲名称和 SongBook 编号；「从琴抓取」可直接读取编号。"
    : "点格子切歌 · 底部上一首/下一首 · PA700 请处于 Style Play 或 Song Play 模式";
  const displayedStatus = localStatus || statusLine.value;

  return html`
    <div class="sub-screen setlist-screen">
      <div class="setlist-header">
        ${embedded ? null : html`<button type="button" class="back-btn" onClick=${() => (editMode ? setEditMode(false) : navigate("transpose"))}>‹ 返回</button>`}
        <div class="setlist-heading">
          <h1>歌单</h1>
          <p>PA700 SET LIST · 9 首/组 · Control CH ${channel + 1} · 组 ${state.currentGroupIndex + 1}/${state.groups.length} · ${balance}</p>
        </div>
        <div class="setlist-header-actions">
          <${SmallButton} label="‹" disabled=${state.groups.length <= 1} onClick=${() => stepGroup(-1)} />
          <button type="button" class="chain-name-chip" onClick=${() => setShowGroups(true)} title="管理歌单组">${group.name}</button>
          <${SmallButton} label="›" disabled=${state.groups.length <= 1} onClick=${() => stepGroup(1)} />
          <span class=${`drum-conn${connected ? " on" : ""}`}>
            <span class="mixer-conn-dot"></span>${connected ? "已连接" : "未连接"}
          </span>
          <${SmallButton} label=${editMode ? "完成" : "编辑"} onClick=${() => { haptic(); setEditMode(!editMode); }} />
          <${SmallButton} label="设置" onClick=${() => setShowSettings(true)} />
        </div>
      </div>

      <div class=${`setlist-hint${editMode ? " edit" : ""}`}>${hint}</div>

      <div class="setlist-grid">
        ${Array.from({ length: 9 }, (_, index) => {
          const slot = group.slots[index];
          return html`
            <${SetListTile}
              key=${`${group.id}-${index}`}
              index=${index}
              slot=${slot}
              current=${state.currentSlot === index}
              editMode=${editMode}
              onClick=${() => {
                haptic();
                if (editMode || !slotConfigured(slot)) startEditSlot(index);
                else selectSlot(index);
              }}
            />
          `;
        })}
      </div>

      ${!editMode
        ? html`
            <div class="setlist-transport">
              <button type="button" class="setlist-transport-btn" onClick=${() => stepSong(-1)}>◀ 上一首</button>
              <div class="setlist-now">
                <strong>${slotConfigured(group.slots[state.currentSlot]) ? slotDisplayName(group.slots[state.currentSlot]) : "未选择歌曲"}</strong>
                <span>
                  ${slotConfigured(group.slots[state.currentSlot])
                    ? `第 ${state.currentSlot + 1} 格 · SongBook #${group.slots[state.currentSlot].number}`
                    : "点格子或按下一首开始"}
                  ${state.remoteNumber != null && group.slots[state.currentSlot]?.number !== state.remoteNumber
                    ? ` · 琴上 #${state.remoteNumber}`
                    : ""}
                </span>
              </div>
              <button type="button" class="setlist-transport-btn" onClick=${() => stepSong(1)}>下一首 ▶</button>
            </div>
          `
        : null}

      ${displayedStatus
        ? html`<div class="setlist-status" title=${displayedStatus}>${displayedStatus}</div>`
        : null}

      ${editingSlot >= 0
        ? html`
            <${SlotEditDialog}
              key=${`${group.id}-${editingSlot}`}
              group=${group}
              groupIndex=${state.currentGroupIndex}
              slotIndex=${editingSlot}
              slot=${group.slots[editingSlot]}
              onClose=${() => setEditingSlot(-1)}
            />
          `
        : null}

      ${showGroups
        ? html`
            <${GroupManagerDialog}
              state=${state}
              onClose=${() => setShowGroups(false)}
              onAdd=${addGroupAction}
              onSwitch=${(index) => { selectGroup(index); setShowGroups(false); }}
              onRename=${renameGroupAction}
              onDelete=${deleteGroupAction}
            />
          `
        : null}

      ${showSettings
        ? html`<${SetListSettingsDialog} onClose=${() => setShowSettings(false)} />`
        : null}
    </div>
  `;
}
