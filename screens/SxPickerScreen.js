import { useEffect, useRef, useState } from "preact/hooks";
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
  licenseView,
  midi,
  saveSoundPicker,
  setStatusLine,
  soundPicker,
  statusLine
} from "../app/store.js";
import { withMode } from "../core/sounds/picker.js";
import { connectMidi } from "../core/midi/engine.js";
import {
  cancelSxSwitching,
  resolveSxTarget,
  sendSxSlot,
  sxCandidateDevices
} from "../core/sxreg/engine.js";
import {
  SX_BUTTON_VARIANTS,
  decodeSxPath,
  encodeSxPath
} from "../core/sxreg/protocol.js";
import {
  SX_DEFAULT_GROUP_LABELS,
  SX_DELAY_LABELS,
  SX_DELAY_VALUES,
  SX_GROUP_COUNT,
  SX_GROUP_LABEL_MAX,
  SX_MODELS,
  SX_OTHER_MODEL_INDEX,
  SX_PAGE_COUNT,
  SX_PAGE_SIZE,
  SX_SLOT_NAME_MAX,
  SX_BANK_NAME_MAX,
  sxBankDisplayName,
  sxBankForPath,
  sxCurrentBankPath,
  sxDetectModelIndex,
  sxGroupLabel,
  sxModel,
  sxSlotAt,
  sxSlotName,
  withSxAllSlotsCleared,
  withSxAutoLearn,
  withSxBankAdded,
  withSxBankMoved,
  withSxBankRemoved,
  withSxBankRenamed,
  withSxButtonCount,
  withSxDelay,
  withSxGroupLabel,
  withSxImmediateSend,
  withSxKeepVolume,
  withSxModel,
  withSxSelected,
  withSxSettings,
  withSxSlot,
  withSxSlotCleared,
  withSxTargetKey,
  withSxVariant
} from "../core/sxreg/model.js";

function updateSx(mutator) {
  const next = mutator(soundPicker.value.sx);
  saveSoundPicker({ ...soundPicker.value, sx: next });
  return next;
}

function sxStatus(text, kind = "muted") {
  setStatusLine(text);
  if (text) addLog(text, kind);
}

function balanceLabel() {
  return licenseView().shortText;
}

function PageButton({ index, selected, onClick }) {
  return html`
    <button
      type="button"
      class=${`sound-page-btn${selected ? " selected" : ""}`}
      onClick=${onClick}
    >P${index + 1}</button>
  `;
}

/** 2×4 organizer tile with tap + long-press (mouse right-click also edits). */
function SxTile({ code, name, used, selected, onTap, onEdit }) {
  const timer = useRef(0);
  const press = useRef(null);
  const clear = () => {
    clearTimeout(timer.current);
    timer.current = 0;
  };
  const begin = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    clear();
    press.current = {
      x: event.clientX,
      y: event.clientY,
      long: false,
      pointerId: event.pointerId
    };
    timer.current = setTimeout(() => {
      const current = press.current;
      if (!current) return;
      current.long = true;
      haptic(30);
      onEdit?.();
    }, 450);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}
  };
  const move = (event) => {
    const current = press.current;
    if (!current) return;
    if (Math.abs(event.clientX - current.x) > 9
      || Math.abs(event.clientY - current.y) > 9) {
      current.moved = true;
      clear();
    }
  };
  const finish = (event) => {
    clear();
    const current = press.current;
    press.current = null;
    if (!current || current.moved) return;
    try { event.currentTarget.releasePointerCapture(current.pointerId); } catch (_) {}
    if (!current.long) onTap?.();
  };
  const cancel = () => {
    clear();
    press.current = null;
  };
  const tileClass = `sound-tile${used ? " used" : " empty"}${selected ? " selected" : ""}`;
  return html`
    <div
      class=${tileClass}
      role="button"
      tabindex="0"
      title=${used ? `${name} · 长按编辑` : `${code} 空 · 点按放入音色`}
      onPointerDown=${begin}
      onPointerMove=${move}
      onPointerUp=${finish}
      onPointerCancel=${cancel}
      onContextMenu=${(event) => {
        event.preventDefault();
        onEdit?.();
      }}
      onKeyDown=${(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTap?.();
        }
      }}
    >
      <span class="sound-tile-index">${code}</span>
      <span class="sound-tile-name">${used ? name : "空"}</span>
    </div>
  `;
}

function RenameDialog({ title, initial, maxLength, onClose, onConfirm }) {
  const [name, setName] = useState(initial || "");
  return html`
    <${AppDialog} title=${title} onClose=${onClose}>
      <div class="sx-slot-editor">
        <label class="chain-field">
          <span>名称</span>
          <input
            type="text"
            maxlength=${maxLength}
            value=${name}
            onInput=${(event) => setName(event.currentTarget.value.slice(0, maxLength))}
          />
        </label>
        <div class="chain-dialog-actions">
          <${SmallButton} label="取消" onClick=${onClose} />
          <${SmallButton}
            label="保存"
            onClick=${() => {
              onConfirm(name);
              onClose();
            }}
          />
        </div>
      </div>
    <//>
  `;
}

// ---- settings --------------------------------------------------------------

function SxSettingsDialog({ onClose, onOpenBanks }) {
  const sx = soundPicker.value.sx;
  const settings = sx.settings;
  const target = resolveSxTarget(sx, midi.value.devices);
  const devices = sxCandidateDevices();
  const [customDelay, setCustomDelay] = useState(String(settings.delayMs));
  const [confirmClear, setConfirmClear] = useState(false);

  const update = (patch) => updateSx((state) => withSxSettings(state, patch));
  const setTarget = (key) => {
    cancelSxSwitching();
    updateSx((state) => withSxTargetKey(state, key));
  };
  const setModel = (index) => {
    const model = sxModel(index);
    updateSx((state) => withSxModel(state, index));
    sxStatus(`SX：琴型 ${model.label}（${model.buttons} 键）`);
  };

  return html`
    <${AppDialog} title="SX 音色选择设置" onClose=${onClose}>
      <div class="sound-settings sx-settings">
        <h3 class="section-title">发送到哪台 SX</h3>
        <p class="hint">
          网页版走 Web MIDI：SX 用 USB TO HOST 接在打开网页的设备上，第一次连接时允许 MIDI 权限（含 SysEx）。
          自动 = 第一台识别到的 SX / Genos。
        </p>
        <div class="sound-target-list">
          <${Chip} label="自动（第一台 SX）" selected=${!settings.targetDeviceKey} onClick=${() => setTarget("")} />
          ${devices.map((device) => html`
            <${Chip}
              label=${`${device.displayName}${device.isSx ? " · SX" : " · 未识别"}`}
              selected=${settings.targetDeviceKey === device.key}
              title=${device.outputName || device.displayName}
              onClick=${() => setTarget(device.key)}
            />
          `)}
        </div>
        ${devices.length === 0 ? html`<p class="hint danger">未连接 MIDI 琴。接上 SX 的 USB TO HOST 后点屏幕任意处重试。</p>` : null}
        ${settings.targetDeviceKey && !target
          ? html`<p class="hint danger">上次选择的琴当前未连接，请重新选择。</p>`
          : null}
        <p class="hint">当前：${target?.displayName || "未发现 SX"} · 型号 ${sxModel(settings.modelIndex).label}</p>
        <p class="hint">安卓备份里的 Cable / SysEx 逐包设置会在网页版忽略；Web MIDI 按完整 SysEx 发送。</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">发送方式</h3>
        <div class="modx-chip-wrap">
          <${Chip}
            label="点按即发"
            selected=${settings.immediateSend}
            onClick=${() => updateSx((state) => withSxImmediateSend(state, true))}
          />
          <${Chip}
            label="预选后发送"
            selected=${!settings.immediateSend}
            onClick=${() => updateSx((state) => withSxImmediateSend(state, false))}
          />
        </div>
        <p class="hint">预选模式：先点音色选中，再按底部的「发送」。</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">切换后保持音量</h3>
        <p class="hint">
          琴对外部发来的注册记忆切换，可能会把右手/左手音量改成注册里保存的旧值
          （面板按键不会）。开启后，网页版在切换前先读回琴上当前音量，
          切换完成后再自动发回去。
        </p>
        <div class="modx-chip-wrap">
          <${Chip}
            label="保持音量 开"
            selected=${settings.keepVolume}
            onClick=${() => updateSx((state) => withSxKeepVolume(state, true))}
          />
          <${Chip}
            label="关"
            selected=${!settings.keepVolume}
            onClick=${() => updateSx((state) => withSxKeepVolume(state, false))}
          />
        </div>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">切库后等待琴加载</h3>
        <p class="hint">
          发送切库路径后等这么久再发按键。按键落到旧库就调大；稳定后可以往小调，例如 0.1 秒。
        </p>
        <div class="modx-chip-wrap">
          ${SX_DELAY_LABELS.map((label, index) => html`
            <${Chip}
              key=${index}
              label=${label}
              selected=${settings.delayMs === SX_DELAY_VALUES[index]}
              onClick=${() => updateSx((state) => withSxDelay(state, SX_DELAY_VALUES[index]))}
            />
          `)}
        </div>
        <label class="chain-field">
          <span>自定义等待（毫秒）</span>
          <input
            type="number"
            min="0"
            max="60000"
            inputmode="numeric"
            value=${customDelay}
            onInput=${(event) => setCustomDelay(event.currentTarget.value.replace(/[^0-9]/g, "").slice(0, 5))}
          />
        </label>
        <div class="modx-dialog-buttons">
          <${SmallButton}
            label="应用自定义等待"
            disabled=${customDelay === ""}
            onClick=${() => {
              const value = Math.max(0, Math.min(60000, Number(customDelay) || 0));
              updateSx((state) => withSxDelay(state, value));
              setCustomDelay(String(value));
            }}
          />
        </div>
        <p class="hint">当前：${settings.delayMs} 毫秒 · 可输入 0–60000；0 = 切库后立即按键。</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">SX 琴型</h3>
        <p class="hint">SX 一般 8 个注册键；Genos / Genos2 是 10 个。按键格式可单独改。</p>
        <div class="modx-group-picker">
          ${SX_MODELS.map((model, index) => html`
            <${Chip}
              key=${model.label}
              label=${model.label}
              selected=${settings.modelIndex === index}
              onClick=${() => setModel(index)}
            />
          `)}
        </div>

        <h3 class="section-title">按键数量</h3>
        <div class="modx-chip-wrap">
          <${Chip}
            label="8 个（SX）"
            selected=${settings.buttonCount === 8}
            onClick=${() => updateSx((state) => withSxButtonCount(state, 8))}
          />
          <${Chip}
            label="10 个（Genos）"
            selected=${settings.buttonCount === 10}
            onClick=${() => updateSx((state) => withSxButtonCount(state, 10))}
          />
        </div>

        <h3 class="section-title">按键格式</h3>
        <div class="sound-target-list">
          ${SX_BUTTON_VARIANTS.map((variant, index) => html`
            <${Chip}
              key=${variant.key}
              label=${variant.label}
              selected=${settings.variantIndex === index}
              onClick=${() => {
                updateSx((state) => withSxVariant(state, index));
                sxStatus(`SX：按键格式 ${variant.label}`);
              }}
            />
          `)}
        </div>

        <h3 class="section-title">自动学习</h3>
        <div class="modx-chip-wrap">
          <${Chip}
            label="自动学习开"
            selected=${settings.autoLearn}
            onClick=${() => updateSx((state) => withSxAutoLearn(state, true))}
          />
          <${Chip}
            label="自动学习关"
            selected=${!settings.autoLearn}
            onClick=${() => updateSx((state) => withSxAutoLearn(state, false))}
          />
        </div>
        <p class="hint">开着时，在琴上切换的每个 .rgt 注册库都会自动加入列表。</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">组名缩写（底部 9 个组）</h3>
        <p class="hint">留空使用默认分类名（Piano、Organ、Guitar、String、Brass、Trumpet、Sax、Synth、Ethnic）。</p>
        <div class="sound-label-list">
          ${Array.from({ length: SX_GROUP_COUNT }, (_, index) => html`
            <label class="sound-label-row">
              <span>组 ${index + 1}</span>
              <input
                type="text"
                maxlength=${SX_GROUP_LABEL_MAX}
                value=${sx.groups[index]?.label || ""}
                placeholder=${SX_DEFAULT_GROUP_LABELS[index]}
                onInput=${(event) =>
                  updateSx((state) => withSxGroupLabel(state, index, event.currentTarget.value))}
              />
            </label>
          `)}
        </div>

        <div class="mixer-divider-line"></div>
        <div class="modx-dialog-buttons">
          <${SmallButton} label="管理注册库" onClick=${onOpenBanks} />
          <${SmallButton} label="清空所有音色位置" onClick=${() => setConfirmClear(true)} />
        </div>
        <p class="hint">
          在琴上切换注册库时，开着的自动学习会把完整 .rgt 路径加进来；
          之后在 2×4 网格里长按格子选库和按键号即可整理。
        </p>
      </div>
    <//>

    ${confirmClear
      ? html`
          <${AlertDialog}
            title="清空所有音色位置？"
            message="会清除 SX 9 组 × 6 页里的所有位置和名字，不会改动注册库列表和琴上的数据。"
            actions=${[
              { label: "取消", onClick: () => setConfirmClear(false) },
              {
                label: "清空",
                danger: true,
                onClick: () => {
                  setConfirmClear(false);
                  updateSx((state) => withSxAllSlotsCleared(state));
                  sxStatus("SX：已清空全部音色位置", "ok");
                }
              }
            ]}
          />
        `
      : null}
  `;
}

// ---- learned banks ---------------------------------------------------------

function SxBankManagerDialog({ onClose }) {
  const sx = soundPicker.value.sx;
  const target = resolveSxTarget(sx, midi.value.devices);
  const currentPath = sxCurrentBankPath(sx, target?.key || "");
  const [renameIndex, setRenameIndex] = useState(-1);
  const [deleteIndex, setDeleteIndex] = useState(-1);
  const [pathInput, setPathInput] = useState("");
  const [encodedPath, setEncodedPath] = useState(false);

  const addCurrent = () => {
    if (!currentPath) {
      sxStatus("SX：还没收到当前库；先在琴上选一个注册库", "warn");
      return;
    }
    const before = soundPicker.value.sx.banks.length;
    const next = updateSx((state) => withSxBankAdded(state, currentPath));
    sxStatus(
      next.banks.length > before ? "SX：已加入当前库" : "SX：当前库已经在列表里",
      next.banks.length > before ? "ok" : "warn"
    );
  };

  const addManual = () => {
    const text = pathInput.trim();
    if (!text) {
      sxStatus("SX：先输入注册库路径", "warn");
      return;
    }
    if (encodedPath && /[^\x00-\x7f]/.test(text)) {
      sxStatus("SX：勾了「已是编码格式」，但路径里还有中文", "warn");
      return;
    }
    const encoded = encodedPath ? text : encodeSxPath(text);
    const before = soundPicker.value.sx.banks.length;
    const next = updateSx((state) => withSxBankAdded(state, encoded));
    if (next.banks.length > before) {
      setPathInput("");
      sxStatus(`SX：已加入 ${decodeSxPath(encoded)}`, "ok");
    } else {
      sxStatus("SX：这个注册库已经在列表里", "warn");
    }
  };

  return html`
    <${AppDialog} title="SX 注册库（页面）" onClose=${onClose}>
      <div class="sound-settings sx-settings">
        <h3 class="section-title">自动学习</h3>
        <div class="modx-chip-wrap">
          <${Chip}
            label="开"
            selected=${sx.settings.autoLearn}
            onClick=${() => updateSx((state) => withSxAutoLearn(state, true))}
          />
          <${Chip}
            label="关"
            selected=${!sx.settings.autoLearn}
            onClick=${() => updateSx((state) => withSxAutoLearn(state, false))}
          />
        </div>
        <p class="hint">开着时，在琴上切换的每个 .rgt 注册库都会自动加入列表。</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">当前琴上的库</h3>
        <p class=${`hint${currentPath ? " accent" : ""}`}>
          ${currentPath
            ? decodeSxPath(currentPath)
            : "还没收到回报 · 先在琴上选一个注册库"}
        </p>
        <div class="modx-dialog-buttons">
          <${SmallButton}
            label="把当前库加入列表"
            disabled=${!currentPath}
            onClick=${addCurrent}
          />
        </div>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">已学习 ${sx.banks.length} 个库</h3>
        ${sx.banks.length === 0
          ? html`
              <p class="hint">
                列表还是空的。勾上自动学习，在琴上依次点一遍要用的注册库，或在下面手动添加路径。
              </p>
            `
          : html`
              <div class="sx-bank-list">
                ${sx.banks.map((bank, index) => html`
                  <div class="modx-bank-row" key=${`${bank.path}-${index}`}>
                    <div class="modx-bank-info">
                      <strong>${index + 1}. ${sxBankDisplayName(bank)}</strong>
                      <span>${decodeSxPath(bank.path)}</span>
                    </div>
                    <div class="sx-bank-actions">
                      <${SmallButton} label="改名" onClick=${() => setRenameIndex(index)} />
                      <${SmallButton} label="↑" disabled=${index === 0} onClick=${() => updateSx((state) => withSxBankMoved(state, index, -1))} />
                      <${SmallButton} label="↓" disabled=${index === sx.banks.length - 1} onClick=${() => updateSx((state) => withSxBankMoved(state, index, 1))} />
                      <${SmallButton} label="删" onClick=${() => setDeleteIndex(index)} />
                    </div>
                  </div>
                `)}
              </div>
            `}

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">手动添加 .rgt 路径</h3>
        <label class="chain-field">
          <span>路径</span>
          <input
            type="text"
            value=${pathInput}
            placeholder="User:/我的文件夹/[000].rgt"
            onInput=${(event) => setPathInput(event.currentTarget.value)}
          />
        </label>
        <div class="sx-bank-add-row">
          <${Chip}
            label="路径已是编码格式"
            selected=${encodedPath}
            onClick=${() => setEncodedPath(!encodedPath)}
          />
          <${SmallButton} label="加入列表" disabled=${!pathInput.trim()} onClick=${addManual} />
        </div>
        <p class="hint">中文路径会自动编码；从日志复制的 +...- 路径请勾上「已是编码格式」。</p>
      </div>
    <//>

    ${renameIndex >= 0 && sx.banks[renameIndex]
      ? html`
          <${RenameDialog}
            title="注册库名称"
            initial=${sx.banks[renameIndex].name}
            maxLength=${SX_BANK_NAME_MAX}
            onClose=${() => setRenameIndex(-1)}
            onConfirm=${(name) => {
              updateSx((state) => withSxBankRenamed(state, renameIndex, name));
              setRenameIndex(-1);
            }}
          />
        `
      : null}

    ${deleteIndex >= 0 && sx.banks[deleteIndex]
      ? html`
          <${AlertDialog}
            title="删除这个注册库？"
            message=${`${sxBankDisplayName(sx.banks[deleteIndex])}\n${decodeSxPath(sx.banks[deleteIndex].path)}`}
            actions=${[
              { label: "取消", onClick: () => setDeleteIndex(-1) },
              {
                label: "删除",
                danger: true,
                onClick: () => {
                  updateSx((state) => withSxBankRemoved(state, deleteIndex));
                  sxStatus("SX：已删除注册库", "ok");
                  setDeleteIndex(-1);
                }
              }
            ]}
          />
        `
      : null}
  `;
}

// ---- slot editor -----------------------------------------------------------

function SxSlotEditorDialog({ group, slotIndex, onClose, onOpenBanks }) {
  const sx = soundPicker.value.sx;
  const settings = sx.settings;
  const slot = sx.groups[group]?.slots?.[slotIndex] || null;
  const target = resolveSxTarget(sx, midi.value.devices);
  const currentPath = sxCurrentBankPath(sx, target?.key || "");
  const [name, setName] = useState(slot?.name || "");
  const [bankPath, setBankPath] = useState(
    slot?.bankPath || currentPath || sx.banks[0]?.path || ""
  );
  const [button, setButton] = useState(
    Math.min(slot?.button || 1, settings.buttonCount)
  );

  const commit = () => {
    if (!bankPath) {
      sxStatus("SX：先选择注册库", "warn");
      return;
    }
    updateSx((state) => withSxSlot(state, group, slotIndex, { name, bankPath, button }));
    sxStatus(`SX：已保存 ${group + 1}-${slotIndex + 1}`, "ok");
    onClose();
  };

  return html`
    <${AppDialog} title=${`编辑音色位置 ${group + 1}-${slotIndex + 1}`} onClose=${onClose}>
      <div class="sx-slot-editor">
        <label class="chain-field">
          <span>显示名字</span>
          <input
            type="text"
            maxlength=${SX_SLOT_NAME_MAX}
            value=${name}
            placeholder="留空自动显示「库名 · 按键号」"
            onInput=${(event) => setName(event.currentTarget.value.slice(0, SX_SLOT_NAME_MAX))}
          />
        </label>

        <h3 class="section-title">注册库</h3>
        ${sx.banks.length === 0
          ? html`
              <p class="hint danger">
                还没有注册库。先打开「注册库」学习，或在琴上切换一次让 App 自动学习。
              </p>
              <div class="modx-dialog-buttons">
                <${SmallButton} label="打开注册库" onClick=${onOpenBanks} />
              </div>
            `
          : html`
              <div class="sound-target-list">
                ${sx.banks.map((bank) => html`
                  <${Chip}
                    key=${bank.path}
                    label=${sxBankDisplayName(bank)}
                    selected=${bankPath === bank.path}
                    title=${decodeSxPath(bank.path)}
                    onClick=${() => setBankPath(bank.path)}
                  />
                `)}
              </div>
            `}
        ${bankPath && !sxBankForPath(sx, bankPath)
          ? html`
              <${Chip}
                label=${`当前保存的库：${decodeSxPath(bankPath)}`}
                selected=${true}
                onClick=${() => {}}
              />
            `
          : null}

        <h3 class="section-title">按键</h3>
        <div class="sx-button-grid">
          ${Array.from({ length: settings.buttonCount }, (_, index) => index + 1).map((number) => html`
            <${Chip}
              key=${number}
              label=${String(number)}
              selected=${button === number}
              onClick=${() => setButton(number)}
            />
          `)}
        </div>

        <p class="hint">显示名留空时自动显示「库名 · 按键号」。</p>
        <div class="modx-dialog-buttons">
          ${slot
            ? html`
                <${SmallButton}
                  label="清空这个位置"
                  onClick=${() => {
                    updateSx((state) => withSxSlotCleared(state, group, slotIndex));
                    sxStatus("SX：已清空音色位置", "ok");
                    onClose();
                  }}
                />
              `
            : null}
          <${SmallButton} label="取消" onClick=${onClose} />
          <${SmallButton} label="保存" disabled=${!bankPath} onClick=${commit} />
        </div>
      </div>
    <//>
  `;
}

// ---- screen ----------------------------------------------------------------

export function SxPickerScreen({ embedded = false, forcedMode = null }) {
  const sx = soundPicker.value.sx;
  const settings = sx.settings;
  const group = settings.selectedGroup;
  const page = settings.selectedPage;
  const target = resolveSxTarget(sx, midi.value.devices);
  const [selectedSlot, setSelectedSlot] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [showBanks, setShowBanks] = useState(false);
  const [edit, setEdit] = useState(null);

  useEffect(() => {
    connectMidi().catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedSlot(-1);
  }, [group, page]);

  // "其他 / 未知" doubles as automatic model detection, like Android.
  // Try once per connected SX so a deliberate "其他" choice is not overridden.
  const autoModelFor = useRef("");
  useEffect(() => {
    if (!target) {
      autoModelFor.current = "";
      return;
    }
    if (autoModelFor.current === target.key) return;
    autoModelFor.current = target.key;
    if (settings.modelIndex !== SX_OTHER_MODEL_INDEX) return;
    const detected = sxDetectModelIndex(target.modelText || target.displayName);
    if (detected < 0 || detected === settings.modelIndex) return;
    updateSx((state) => withSxModel(state, detected));
  }, [target?.key]);

  const firstSlot = page * SX_PAGE_SIZE;
  const selectedValue = selectedSlot >= 0
    ? sxSlotAt(sx, group, firstSlot + selectedSlot)
    : null;
  const selectedName = selectedValue ? sxSlotName(sx, selectedValue) : null;
  const currentPath = sxCurrentBankPath(sx, target?.key || "");
  const currentBankLabel = currentPath
    ? `当前库：${sxBankForPath(sx, currentPath)
      ? sxBankDisplayName(sxBankForPath(sx, currentPath))
      : decodeSxPath(currentPath)}`
    : "在琴上切换注册库会自动学习";
  const targetLabel = target
    ? target.displayName
    : "未发现 SX";
  const subtitle = `${targetLabel} · ${sxModel(settings.modelIndex).label} · ` +
    `${settings.buttonCount} 键 · ${balanceLabel()}`;

  const choosePage = (index) => {
    haptic();
    updateSx((state) => withSxSelected(state, group, index));
  };

  const chooseGroup = (index) => {
    haptic();
    updateSx((state) => withSxSelected(state, index, 0));
  };

  const selectSlot = (slotInPage) => {
    const slotIndex = firstSlot + slotInPage;
    const value = sxSlotAt(sx, group, slotIndex);
    if (!value) {
      setEdit({ group, slotIndex });
      return;
    }
    haptic();
    setSelectedSlot(slotInPage);
    if (settings.immediateSend) sendSxSlot(group, slotIndex);
  };

  return html`
    <div class="sub-screen sound-screen sx-screen">
      <div class="sound-header">
        ${embedded
          ? null
          : html`<button type="button" class="back-btn" onClick=${() => navigate("transpose")}>‹ 返回</button>`}
        <div class="sound-heading">
          <h1>音色选择 · SX</h1>
          <p class=${target ? "" : "danger"} title=${subtitle}>${subtitle}</p>
        </div>
        <div class="sound-header-actions">
          ${forcedMode
            ? null
            : html`
                <div class="modx-mode-switch">
                  <button
                    type="button"
                    class="chip"
                    onClick=${() => saveSoundPicker(withMode(soundPicker.value, "KORG"))}
                  >KORG</button>
                  <button
                    type="button"
                    class="chip"
                    onClick=${() => saveSoundPicker(withMode(soundPicker.value, "MODX"))}
                  >MODX</button>
                  <button type="button" class="chip selected">SX</button>
                </div>
              `}
          <${SmallButton} label="注册库" onClick=${() => setShowBanks(true)} />
          <${SmallButton} label="设置" onClick=${() => setShowSettings(true)} />
        </div>
      </div>

      <p class="sx-current-bank" title=${currentBankLabel}>${currentBankLabel}</p>

      <div class="sound-workspace">
        <div class="sound-grid">
          ${Array.from({ length: 2 }, (_, column) =>
            Array.from({ length: 4 }, (_, row) => {
              const slotInPage = column * 4 + row;
              const slotIndex = firstSlot + slotInPage;
              const slot = sxSlotAt(sx, group, slotIndex);
              const name = slot ? sxSlotName(sx, slot) : null;
              return html`
                <${SxTile}
                  key=${slotIndex}
                  code=${`${group + 1}-${slotIndex + 1}`}
                  name=${name}
                  used=${!!slot}
                  selected=${slotInPage === selectedSlot}
                  onTap=${() => selectSlot(slotInPage)}
                  onEdit=${() => setEdit({ group, slotIndex })}
                />
              `;
            })
          )}
        </div>

        <div class="sound-pages">
          ${Array.from({ length: SX_PAGE_COUNT }, (_, index) => html`
            <${PageButton}
              key=${index}
              index=${index}
              selected=${index === page}
              onClick=${() => choosePage(index)}
            />
          `)}
        </div>

        <div class="sound-groups">
          ${Array.from({ length: SX_GROUP_COUNT }, (_, index) => html`
            <button
              type="button"
              class=${`sound-group-btn${index === group ? " selected" : ""}`}
              title=${sxGroupLabel(sx, index)}
              onClick=${() => chooseGroup(index)}
            >${sxGroupLabel(sx, index)}</button>
          `)}
        </div>
      </div>

      ${!settings.immediateSend
        ? html`
            <button
              type="button"
              class="sound-send-bar"
              disabled=${!selectedName}
              onClick=${() => {
                if (selectedSlot >= 0) sendSxSlot(group, firstSlot + selectedSlot);
              }}
            >
              ${selectedName
                ? `发送 ${group + 1}-${firstSlot + selectedSlot + 1} ${selectedName}`
                : "先选择一个音色"}
            </button>
          `
        : null}

      <div class="sound-footer">
        <span>
          ${settings.immediateSend
            ? "点按音色立即发送 · P1–P6 只是整理页 · 长按格子可编辑"
            : "预选后按上方按钮发送 · 长按格子可编辑"}
        </span>
        <span class="sound-status" title=${statusLine.value}>${statusLine.value}</span>
      </div>

      ${showSettings
        ? html`
            <${SxSettingsDialog}
              onClose=${() => setShowSettings(false)}
              onOpenBanks=${() => {
                setShowSettings(false);
                setShowBanks(true);
              }}
            />
          `
        : null}

      ${showBanks
        ? html`
            <${SxBankManagerDialog}
              onClose=${() => setShowBanks(false)}
            />
          `
        : null}

      ${edit
        ? html`
            <${SxSlotEditorDialog}
              group=${edit.group}
              slotIndex=${edit.slotIndex}
              onClose=${() => setEdit(null)}
              onOpenBanks=${() => {
                setEdit(null);
                setShowBanks(true);
              }}
            />
          `
        : null}
    </div>
  `;
}
