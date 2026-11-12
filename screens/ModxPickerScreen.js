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
  modx,
  modxRuntime,
  saveModx,
  saveSoundPicker,
  setStatusLine,
  soundPicker,
  statusLine
} from "../app/store.js";
import {
  MODX_BANK_NAME_MAX,
  MODX_GROUP_COUNT,
  MODX_LIVE_PAGE_COUNT,
  MODX_NAME_MAX,
  MODX_ORGANIZED_PAGE_COUNT,
  MODX_ORGANIZED_PAGE_SIZE,
  MODX_PAGE_NAME_MAX,
  MODX_PROFILE_LIST,
  bankKey,
  bankLabel,
  bankNonEmptyCount,
  bankPageName,
  bankSlot,
  ensureModxManualBank,
  findModxBank,
  isYamahaSynthLike,
  modxGroupLabel,
  organizedEntry,
  organizedTotal,
  profileIsMSeries,
  profileSupportsCapture,
  profileSupportsPerformanceNames,
  refDetail,
  refEffectiveName,
  resolveModxProfile,
  resolveModxTarget,
  selectedModxBank,
  slotDisplayName,
  slotGridLabel,
  slotIsEmpty,
  slotNameSourceLabel,
  soundRefFromSlot,
  withModxBankName,
  withModxClearedBanks,
  withModxClearedOrganized,
  withModxGroupEntry,
  withModxGroupLabel,
  withModxOrganizedDisplayName,
  withModxOrganizedPage,
  withModxPageName,
  withModxProfileOverride,
  withModxSelectedBank,
  withModxSelectedGroup,
  withModxSelectedPage,
  withModxSettings,
  withModxSlotCustomName,
  withModxTargetKey,
  withModxView
} from "../core/modx/model.js";
import {
  clearModxLastBank,
  captureModxLiveSet,
  modxCandidateDevices,
  readModxAllNames,
  readModxPageNames,
  resetModxRoutingState,
  sendModxOrganized,
  sendModxSlot,
  stopAllModxWork,
  stopModxCapture,
  stopModxNameRead
} from "../core/modx/engine.js";
import { withMode } from "../core/sounds/picker.js";

function status(text) {
  setStatusLine(text);
  if (text) addLog(text, "muted");
}

function balanceLabel() {
  return licenseView().shortText;
}

function ModxTile({
  code,
  name,
  badge = "",
  selected = false,
  used = true,
  className = "",
  onTap,
  onLongPress,
  title = ""
}) {
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
    if (onLongPress) {
      timer.current = setTimeout(() => {
        const current = press.current;
        if (!current) return;
        current.long = true;
        haptic(30);
        onLongPress();
      }, 450);
    }
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
  return html`
    <div
      class=${`modx-tile${used ? " used" : " empty"}${selected ? " selected" : ""}${className ? ` ${className}` : ""}`}
      role="button"
      tabindex="0"
      title=${title || name || code}
      onPointerDown=${begin}
      onPointerMove=${move}
      onPointerUp=${finish}
      onPointerCancel=${cancel}
      onContextMenu=${(event) => {
        event.preventDefault();
        if (used && onLongPress) onLongPress();
      }}
      onKeyDown=${(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTap?.();
        }
      }}
    >
      <span class="modx-tile-code">${code}</span>
      ${badge && used ? html`<span class="modx-tile-badge">${badge}</span>` : null}
      <span class="modx-tile-name">${name || "空"}</span>
    </div>
  `;
}

function ModxPageGrid({ page, columns = 4, count = MODX_LIVE_PAGE_COUNT, onPage }) {
  return html`
    <div class=${`modx-page-grid${columns === 4 ? " four" : ""}`}>
      ${Array.from({ length: count }, (_, index) => html`
        <button
          type="button"
          class=${`sound-page-btn${index === page ? " selected" : ""}`}
          onClick=${() => onPage(index)}
        >${index + 1}</button>
      `)}
    </div>
  `;
}

function NumberStepper({ label, value, min, max, step = 1, display, onChange }) {
  const clamp = (next) => Math.max(min, Math.min(max, next));
  return html`
    <div class="modx-stepper-row">
      <span class="modx-stepper-label">${label}</span>
      <div class="chain-number-controls">
        <button
          type="button"
          class="stepper-btn"
          disabled=${value <= min}
          onClick=${() => onChange(clamp(value - step))}
        >−</button>
        <span class="stepper-value chain-number-value">${display ? display(value) : value}</span>
        <button
          type="button"
          class="stepper-btn"
          disabled=${value >= max}
          onClick=${() => onChange(clamp(value + step))}
        >＋</button>
      </div>
    </div>
  `;
}

function ControlChannelStepper({ value, onChange }) {
  return html`
    <div class="mixer-channel-stepper sound-channel-stepper">
      <button
        type="button"
        class="stepper-btn"
        disabled=${value <= 0}
        onClick=${() => onChange(value - 1)}
      >−</button>
      <span class="stepper-value">${value + 1}</span>
      <button
        type="button"
        class="stepper-btn"
        disabled=${value >= 15}
        onClick=${() => onChange(value + 1)}
      >＋</button>
    </div>
  `;
}

function ViewSwitch({ view, onView }) {
  return html`
    <div class="modx-view-switch">
      <${Chip}
        label="Live Set"
        selected=${view === "LIVE_SET"}
        onClick=${() => onView("LIVE_SET")}
      />
      <${Chip}
        label="音色整理"
        selected=${view === "ORGANIZED"}
        onClick=${() => onView("ORGANIZED")}
      />
    </div>
  `;
}

function ModxProgress({ state, runtime, onStopCapture, onStopNames }) {
  if (runtime.capturing) {
    const fraction = runtime.captureExpected > 0
      ? Math.min(1, runtime.captureReceived / runtime.captureExpected)
      : 0;
    return html`
      <div class="modx-progress">
        <div class="modx-progress-bar"><span style=${{ width: `${fraction * 100}%` }}></span></div>
        <p class="hint">
          读取 ${runtime.captureReceived}/${runtime.captureExpected} 字节 ·
          ${runtime.capturePackets} 包 · 校验错误 ${runtime.captureChecksumErrors}
        </p>
        <p class="hint modx-ellipsis">最后地址：${runtime.captureLastAddress || "—"}</p>
        <${SmallButton} label="停止读取" onClick=${onStopCapture} />
      </div>
    `;
  }
  if (runtime.readingNames) {
    const fraction = runtime.nameReadTotal > 0
      ? Math.min(1, runtime.nameReadDone / runtime.nameReadTotal)
      : 0;
    return html`
      <div class="modx-progress">
        <div class="modx-progress-bar"><span style=${{ width: `${fraction * 100}%` }}></span></div>
        <p class="hint">
          读名 ${runtime.nameReadDone}/${runtime.nameReadTotal} ·
          找到 ${runtime.nameReadFound}
        </p>
        ${runtime.nameReadCurrent
          ? html`<p class="hint accent modx-ellipsis">正在读：${runtime.nameReadCurrent}</p>`
          : null}
        <${SmallButton} label="停止读名" onClick=${onStopNames} />
      </div>
    `;
  }
  if (runtime.message) {
    return html`<p class="hint modx-message" title=${runtime.message}>${runtime.message}</p>`;
  }
  return html`<p class="hint">点槽发送；长按槽可整理或改名。</p>`;
}

function RenameDialog({ title, initial, maxLength, onClose, onConfirm }) {
  const [name, setName] = useState(initial || "");
  return html`
    <${AppDialog} title=${title} onClose=${onClose}>
      <div class="modx-rename-dialog">
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

function ModxSettingsDialog({ onClose, onOpenCapture }) {
  const state = modx.value;
  const settings = state.settings;
  const target = resolveModxTarget(state, midi.value.devices);
  const profile = resolveModxProfile(state, target);
  const devices = modxCandidateDevices();
  const [confirmClearBanks, setConfirmClearBanks] = useState(false);
  const [confirmClearOrganized, setConfirmClearOrganized] = useState(false);

  const update = (patch, resetRouting = false) => {
    saveModx(withModxSettings(modx.value, patch));
    if (resetRouting) resetModxRoutingState();
  };
  const setTarget = (key) => {
    saveModx(withModxTargetKey(modx.value, key));
    resetModxRoutingState();
  };
  const setProfile = (name) => {
    saveModx(withModxProfileOverride(modx.value, name));
    resetModxRoutingState();
  };

  return html`
    <${AppDialog} title="MODX 设置" onClose=${onClose}>
      <div class="sound-settings modx-settings">
        <h3 class="section-title">发送到（音色选择和音色链只发这一台琴）</h3>
        <p class="hint">
          自动 = 优先选第一台 MODX / MONTAGE；也可以手动选任意 MIDI 设备（测试用）。
        </p>
        <div class="sound-target-list">
          <${Chip} label="自动" selected=${!settings.targetKey} onClick=${() => setTarget("")} />
          ${devices.map((device) => html`
            <${Chip}
              label=${`${device.displayName}${isYamahaSynthLike(device) ? " · MODX" : " · 未识别"}`}
              selected=${settings.targetKey === device.key}
              title=${device.outputName || device.displayName}
              onClick=${() => setTarget(device.key)}
            />
          `)}
        </div>
        ${devices.length === 0 ? html`<p class="hint danger">未连接 MIDI 琴。</p>` : null}
        ${settings.targetKey && !target
          ? html`<p class="hint danger">上次选择的琴当前未连接，请重新选择。</p>`
          : null}
        <p class="hint">当前型号：${profile?.label || "未识别（请在下面选择型号）"}</p>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">型号</h3>
        <p class="hint">自动按设备名识别；识别错误时手动选择。</p>
        <div class="modx-chip-wrap">
          <${Chip} label="自动识别" selected=${!settings.profileOverride} onClick=${() => setProfile("")} />
          ${MODX_PROFILE_LIST.map((item) => html`
            <${Chip}
              label=${item.label + (item.name === "MONTAGE" ? "（未真机验证）" : "")}
              selected=${settings.profileOverride === item.name}
              onClick=${() => setProfile(item.name)}
            />
          `)}
        </div>

        <${NumberStepper}
          label="设备号"
          value=${settings.deviceNumber}
          min=${1}
          max=${16}
          onChange=${(value) => update({ deviceNumber: value })}
        />
        <${NumberStepper}
          label="MIDI 端口（MONTAGE M 0–3）"
          value=${settings.portIndex}
          min=${0}
          max=${3}
          onChange=${(value) => update({ portIndex: value }, true)}
        />
        <h3 class="section-title">Control 通道</h3>
        <p class="hint">MODX 的 MIDI IN 通道要和这里一致，默认 Ch1。</p>
        <${ControlChannelStepper}
          value=${settings.controlChannel}
          onChange=${(value) => update({ controlChannel: value })}
        />

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">发送</h3>
        <div class="modx-chip-wrap">
          <${Chip}
            label="点按即发"
            selected=${settings.immediateSend}
            onClick=${() => update({ immediateSend: true })}
          />
          <${Chip}
            label="预选后发送"
            selected=${!settings.immediateSend}
            onClick=${() => update({ immediateSend: false })}
          />
        </div>
        <div class="modx-chip-wrap">
          <${Chip}
            label="跨库自动切库"
            selected=${settings.crossBankSwitch}
            onClick=${() => update({ crossBankSwitch: true })}
          />
          <${Chip}
            label="不自动切库"
            selected=${!settings.crossBankSwitch}
            onClick=${() => update({ crossBankSwitch: false })}
          />
        </div>
        <p class="hint">
          跨库切库是未公开 SysEx；固件不匹配时可能提示 illegal dump data，
          可改成不自动切库，先在琴上手动切库。
        </p>
        <${NumberStepper}
          label="切库等待"
          value=${settings.bankWaitMs}
          min=${0}
          max=${2000}
          step=${100}
          display=${(value) => `${value} ms`}
          onChange=${(value) => update({ bankWaitMs: value })}
        />
        <${NumberStepper}
          label="选槽消息间隔"
          value=${settings.sendGapMs}
          min=${0}
          max=${200}
          step=${10}
          display=${(value) => `${value} ms`}
          onChange=${(value) => update({ sendGapMs: value })}
        />
        <${SmallButton} label="清除切库记录" onClick=${() => clearModxLastBank()} />

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">读取</h3>
        <div class="modx-chip-wrap">
          <${Chip}
            label="抓取后自动读本页名"
            selected=${settings.autoReadPageNames}
            onClick=${() => update({ autoReadPageNames: true })}
          />
          <${Chip}
            label="不自动读"
            selected=${!settings.autoReadPageNames}
            onClick=${() => update({ autoReadPageNames: false })}
          />
        </div>
        <${SmallButton} label="读取 Live Set" onClick=${onOpenCapture} />

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">9 个整理组名</h3>
        <p class="hint">显示在音色整理底部的组按钮上；留空使用默认分类名。</p>
        <div class="sound-label-list">
          ${Array.from({ length: MODX_GROUP_COUNT }, (_, index) => html`
            <label class="sound-label-row">
              <span>组 ${index + 1}</span>
              <input
                type="text"
                maxlength="8"
                value=${settings.groupLabels[index]}
                placeholder=${modxGroupLabel(settings, index)}
                onInput=${(event) =>
                  saveModx(withModxGroupLabel(modx.value, index, event.currentTarget.value))}
              />
            </label>
          `)}
        </div>

        <div class="mixer-divider-line"></div>
        <h3 class="section-title">数据</h3>
        <p class="hint">
          备份会保存 MODX 音色表，安卓和网页版可以互相导入。
        </p>
        <div class="modx-chip-wrap">
          <${SmallButton} label="清空抓取的 Live Set" onClick=${() => setConfirmClearBanks(true)} />
          <${SmallButton} label="清空音色整理" onClick=${() => setConfirmClearOrganized(true)} />
        </div>
        <p class="hint">
          琴上先设置：UTILITY → Settings → Advanced 的 Bank Select / Pgm Change 打开；
          Part 1 → Edit → Mod/Control → Receive SW 也要打开。
        </p>
      </div>
    <//>

    ${confirmClearBanks
      ? html`
          <${AlertDialog}
            title="清空抓取的 Live Set？"
            message="会删除 App 里读取的库名/页名/槽位；手选网格和改过的名字会保留。音色整理和音色链里的快照仍可发送。不会改动琴。"
            actions=${[
              { label: "取消", onClick: () => setConfirmClearBanks(false) },
              {
                label: "清空",
                danger: true,
                onClick: () => {
                  setConfirmClearBanks(false);
                  stopAllModxWork("清空数据");
                  saveModx(withModxClearedBanks(modx.value));
                  status("MODX：已清空读取的 Live Set 数据");
                }
              }
            ]}
          />
        `
      : null}
    ${confirmClearOrganized
      ? html`
          <${AlertDialog}
            title="清空 MODX 音色整理？"
            message="只清空 9 组 × 48 格的整理内容；读取的 Live Set 数据和音色链不受影响。"
            actions=${[
              { label: "取消", onClick: () => setConfirmClearOrganized(false) },
              {
                label: "清空",
                danger: true,
                onClick: () => {
                  setConfirmClearOrganized(false);
                  saveModx(withModxClearedOrganized(modx.value));
                  status("MODX：已清空音色整理");
                }
              }
            ]}
          />
        `
      : null}
  `;
}

// ---- capture / bank dialogs ------------------------------------------------

function ModxCaptureDialog({ onClose }) {
  const state = modx.value;
  const target = resolveModxTarget(state, midi.value.devices);
  const profile = resolveModxProfile(state, target);
  const supportsBanks = profileIsMSeries(profile);
  const [kind, setKind] = useState("CURRENT");
  const [bankIndex, setBankIndex] = useState(0);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    const started = captureModxLiveSet(supportsBanks ? kind : "CURRENT", supportsBanks ? bankIndex : 0);
    setStarting(false);
    if (started) onClose();
  };

  return html`
    <${AppDialog} title="读取 MODX Live Set" onClose=${onClose}>
      <div class="modx-capture-dialog">
        <p class="hint">
          目标：<strong class=${target ? "" : "danger"}>${target?.displayName || "未连接"}</strong>
        </p>
        <p class="hint">型号：${profile?.label || "未识别（请在 MODX 设置里选择）"}</p>
        ${!profile
          ? html`<p class="hint danger">未识别型号。请先到「设置」里选择 MODX / MONTAGE 型号，再回来读取。</p>`
          : !profileSupportsCapture(profile)
            ? html`<p class="hint danger">${profile.label} 暂不支持读取；请升级到 OS 3.00+，或只在琴上手动选槽。</p>`
            : html`
                <h3 class="section-title">读取哪个库</h3>
                <div class="modx-chip-wrap">
                  <${Chip}
                    label=${supportsBanks ? "当前库" : "当前 Live Set"}
                    selected=${kind === "CURRENT"}
                    onClick=${() => setKind("CURRENT")}
                  />
                  ${supportsBanks
                    ? html`
                        <${Chip}
                          label="User 库"
                          selected=${kind === "USER"}
                          onClick=${() => setKind("USER")}
                        />
                        <${Chip}
                          label="Library 库"
                          selected=${kind === "LIBRARY"}
                          onClick=${() => setKind("LIBRARY")}
                        />
                      `
                    : null}
                </div>
                ${supportsBanks && (kind === "USER" || kind === "LIBRARY")
                  ? html`
                      <p class="hint">库号</p>
                      <div class="modx-bank-index-row">
                        ${Array.from({ length: 8 }, (_, index) => html`
                          <${Chip}
                            key=${index}
                            label=${String(index + 1)}
                            selected=${bankIndex === index}
                            onClick=${() => setBankIndex(index)}
                          />
                        `)}
                      </div>
                    `
                  : null}
                <p class="hint">
                  ${supportsBanks
                    ? "M 系列整库约 84 KB，需要几秒到几十秒；读取完成后可自动读本页 Performance 名。"
                    : "原版 MODX / MONTAGE 读取琴上当前 Live Set；显示的是槽名/备注，Performance 名需要本机手动整理。"}
                </p>
                ${modxRuntime.value.message
                  ? html`<p class="hint accent">${modxRuntime.value.message}</p>`
                  : null}
                <${SmallButton}
                  label=${starting ? "正在发送…" : "开始读取"}
                  disabled=${!target || starting || modxRuntime.value.capturing}
                  onClick=${start}
                />
              `}
      </div>
    <//>
  `;
}

function ModxBankDialog({ onClose, onOpenCapture }) {
  const state = modx.value;
  return html`
    <${AppDialog} title="Live Set 库" onClose=${onClose}>
      <div class="modx-bank-dialog">
        ${state.banks.length === 0
          ? html`<p class="hint">还没有读取的库。</p>`
          : state.banks.map((bank) => {
              const key = bankKey(bank);
              const selected = key === state.selectedBankKey;
              return html`
                <div class="modx-bank-row" key=${key}>
                  <div class="modx-bank-info">
                    <strong>${bank.bankName || "未命名库"}</strong>
                    <span>
                      ${bankLabel(bank)} · 非空 ${bankNonEmptyCount(bank)}
                      ${bank.partial ? " · 可能不完整" : ""}
                    </span>
                  </div>
                  <${SmallButton}
                    label=${selected ? "当前" : "选择"}
                    disabled=${selected}
                    onClick=${() => {
                      saveModx(withModxSelectedBank(modx.value, key));
                      onClose();
                    }}
                  />
                </div>
              `;
            })}
        <div class="mixer-divider-line"></div>
        <p class="hint">
          读取新库不会覆盖其它库；同一个库再次读取会更新，并保留你改过的音色显示名。
        </p>
        <${SmallButton} label="读取新库" onClick=${onOpenCapture} />
      </div>
    <//>
  `;
}

// ---- slot / organize dialogs -----------------------------------------------

function ModxSlotActionDialog({ action, onClose, onOrganize }) {
  const state = modx.value;
  const bank = findModxBank(state, action.bankKey);
  const item = bank ? bankSlot(bank, action.page, action.slot) : null;
  const [name, setName] = useState(item?.customName || "");
  if (!bank || !item) return null;
  const manual = bank.kind === "MANUAL";

  const commit = () => {
    if (name.trim() !== (item.customName || "")) {
      saveModx(withModxSlotCustomName(
        modx.value,
        action.bankKey,
        action.page,
        action.slot,
        name
      ));
    }
  };
  const close = () => {
    commit();
    onClose();
  };

  return html`
    <${AppDialog} title=${`P${action.page + 1}-${action.slot + 1}`} onClose=${close}>
      <div class="modx-slot-dialog">
        <p class="modx-slot-name">${slotDisplayName(item)}</p>
        ${manual
          ? html`<p class="hint">手选槽位 · 不读取琴上的库</p>`
          : html`
              <p class="hint">
                ${slotNameSourceLabel(item)} · ${item.slotType === 0 ? "Performance" : `类型 ${item.slotType}`}
                · Perf ${item.bankMsb}/${item.bankLsb}/${item.performanceNumber}
              </p>
              ${item.slotName && item.performanceName && item.slotName !== item.performanceName
                ? html`<p class="hint">槽名：${item.slotName}</p>`
                : null}
            `}
        <label class="chain-field">
          <span>显示名</span>
          <input
            type="text"
            maxlength=${MODX_NAME_MAX}
            value=${name}
            placeholder=${slotDisplayName(item)}
            onInput=${(event) => setName(event.currentTarget.value.slice(0, MODX_NAME_MAX))}
          />
        </label>
        <p class="hint">
          ${manual
            ? "直接输入，关闭后自动保存；留空恢复默认序号。"
            : "直接输入，关闭后自动保存；留空恢复琴上的原音色名。"}
        </p>
        <div class="modx-dialog-buttons">
          <${SmallButton}
            label="发送到琴"
            onClick=${() => {
              commit();
              sendModxSlot(action.bankKey, action.page, action.slot);
              onClose();
            }}
          />
          <${SmallButton}
            label="放入音色整理"
            onClick=${() => {
              commit();
              onOrganize(name.trim() || slotDisplayName(item), item);
              onClose();
            }}
          />
        </div>
      </div>
    <//>
  `;
}

function ModxOrganizeDialog({ ref, sourceLabel, onClose }) {
  const state = modx.value;
  const settings = state.settings;
  const [name, setName] = useState(ref ? refEffectiveName(ref) : "");
  const [group, setGroup] = useState(settings.selectedGroup);
  const [page, setPage] = useState(settings.organizedPage);
  const [pendingReplace, setPendingReplace] = useState(null);

  const place = (slot) => {
    saveModx(withModxGroupEntry(
      modx.value,
      group,
      slot,
      { ...ref, displayName: name.trim() || refEffectiveName(ref) }
    ));
    saveModx(withModxOrganizedPage(
      withModxSelectedGroup(modx.value, group),
      page
    ));
    status(`MODX：已整理到组 ${group + 1} 页 ${Math.floor(slot / MODX_ORGANIZED_PAGE_SIZE) + 1} 格 ${slot % MODX_ORGANIZED_PAGE_SIZE + 1}`);
    onClose();
  };

  if (!ref) return null;

  return html`
    <${AppDialog} title="放入音色整理" onClose=${onClose}>
      <div class="modx-organize-dialog">
        <p class="hint">${sourceLabel || refDetail(ref)}</p>
        <label class="chain-field">
          <span>显示名</span>
          <input
            type="text"
            maxlength=${MODX_NAME_MAX}
            value=${name}
            onInput=${(event) => setName(event.currentTarget.value.slice(0, MODX_NAME_MAX))}
          />
        </label>
        <h3 class="section-title">放到哪个组</h3>
        <div class="modx-group-picker">
          ${Array.from({ length: MODX_GROUP_COUNT }, (_, index) => html`
            <${Chip}
              key=${index}
              label=${modxGroupLabel(settings, index)}
              selected=${group === index}
              onClick=${() => { setGroup(index); setPage(0); }}
            />
          `)}
        </div>
        <${ModxPageGrid}
          page=${page}
          count=${MODX_ORGANIZED_PAGE_COUNT}
          onPage=${setPage}
        />
        <div class="modx-organize-grid">
          ${Array.from({ length: 2 }, (_, column) =>
            Array.from({ length: 4 }, (_, row) => {
              const slotInPage = column * 4 + row;
              const slot = page * MODX_ORGANIZED_PAGE_SIZE + slotInPage;
              const existing = organizedEntry(state, group, slot);
              return html`
                <${ModxTile}
                  key=${slot}
                  code=${`${group + 1}-${slot + 1}`}
                  name=${existing ? refEffectiveName(existing) : "空"}
                  used=${!!existing}
                  onTap=${() => {
                    if (existing) setPendingReplace(slot);
                    else place(slot);
                  }}
                />
              `;
            })
          )}
        </div>
        <p class="hint">点一个格子放入；放在已占用的格子会先确认替换。</p>
      </div>
    <//>

    ${pendingReplace != null
      ? html`
          <${AlertDialog}
            title="替换这个格子？"
            message=${`当前：${refEffectiveName(organizedEntry(modx.value, group, pendingReplace)) || "空"}`}
            actions=${[
              { label: "取消", onClick: () => setPendingReplace(null) },
              {
                label: "替换",
                danger: true,
                onClick: () => {
                  const slot = pendingReplace;
                  setPendingReplace(null);
                  place(slot);
                }
              }
            ]}
          />
        `
      : null}
  `;
}

function ModxPlaceFromLiveSetDialog({ group, slot, onClose, onOpenCapture }) {
  const state = modx.value;
  const targetPage = Math.floor(slot / MODX_ORGANIZED_PAGE_SIZE);
  const targetCell = slot % MODX_ORGANIZED_PAGE_SIZE;
  const banks = state.banks;
  const initialKey = banks.some((bank) => bankKey(bank) === state.selectedBankKey)
    ? state.selectedBankKey
    : (banks[0] ? bankKey(banks[0]) : "");
  const [bankKeyValue, setBankKeyValue] = useState(initialKey);
  const [page, setPage] = useState(state.selectedPage);
  const bank = findModxBank(state, bankKeyValue) || banks[0] || null;

  const pick = (ref) => {
    saveModx(withModxGroupEntry(
      modx.value,
      group,
      slot,
      { ...ref, displayName: refEffectiveName(ref) }
    ));
    saveModx(withModxOrganizedPage(
      withModxSelectedGroup(modx.value, group),
      targetPage
    ));
    status(`MODX：已放入 组 ${group + 1} 第 ${targetPage + 1} 页 第 ${targetCell + 1} 格`);
    onClose();
  };

  return html`
    <${AppDialog} title="从 Live Set 选择音色" onClose=${onClose}>
      <div class="modx-place-dialog">
        <p class="hint accent">
          放入 组 ${group + 1} · 第 ${targetPage + 1} 页 · 第 ${targetCell + 1} 格
        </p>
        <p class="hint">也可以继续用原来的方式：在 Live Set 长按音色槽 → 放入音色整理。</p>
        ${!bank
          ? html`
              <p class="hint danger">
                还没有读取 Live Set。先连接 MODX / MONTAGE，读取琴上的音色后再选。
              </p>
              <div class="modx-dialog-buttons">
                <${SmallButton} label="读取 Live Set" onClick=${onOpenCapture} />
                <${SmallButton} label="关闭" onClick=${onClose} />
              </div>
            `
          : html`
              ${banks.length > 1
                ? html`
                    <div class="modx-chip-wrap">
                      ${banks.map((option) => html`
                        <${Chip}
                          key=${bankKey(option)}
                          label=${option.bankName || "未命名库"}
                          selected=${bankKey(option) === bankKeyValue}
                          onClick=${() => {
                            setBankKeyValue(bankKey(option));
                            setPage(0);
                          }}
                        />
                      `)}
                    </div>
                  `
                : null}
              <p class="hint modx-ellipsis">
                ${bankLabel(bank)} · 非空 ${bankNonEmptyCount(bank)} ·
                ${bankPageName(bank, page)}
              </p>
              <${ModxPageGrid} page=${page} onPage=${setPage} />
              <div class="modx-live-grid">
                ${Array.from({ length: 16 }, (_, liveSlot) => {
                  const item = bankSlot(bank, page, liveSlot);
                  const usable = item && !slotIsEmpty(item);
                  return html`
                    <${ModxTile}
                      key=${liveSlot}
                      code=${String(liveSlot + 1)}
                      name=${usable ? slotGridLabel(item) : "空"}
                      used=${usable}
                      onTap=${() => {
                        if (usable) pick(soundRefFromSlot(bank, item));
                      }}
                    />
                  `;
                })}
              </div>
              <p class="hint">点一个音色放入这个格子；空槽不能选。</p>
            `}
      </div>
    <//>
  `;
}

function ModxOrganizedEditDialog({ group, slot, onClose }) {
  const state = modx.value;
  const ref = organizedEntry(state, group, slot);
  const [name, setName] = useState(ref?.displayName || "");
  if (!ref) return null;

  const commit = () => {
    if (name.trim() !== (ref.displayName || "")) {
      saveModx(withModxOrganizedDisplayName(modx.value, group, slot, name));
    }
  };
  const close = () => {
    commit();
    onClose();
  };

  return html`
    <${AppDialog} title="音色整理" onClose=${close}>
      <div class="modx-slot-dialog">
        <p class="modx-slot-name">${refEffectiveName(ref)}</p>
        <p class="hint">${refDetail(ref)}</p>
        <label class="chain-field">
          <span>显示名</span>
          <input
            type="text"
            maxlength=${MODX_NAME_MAX}
            value=${name}
            placeholder=${refEffectiveName(ref)}
            onInput=${(event) => setName(event.currentTarget.value.slice(0, MODX_NAME_MAX))}
          />
        </label>
        <p class="hint">直接输入，关闭后自动保存；留空恢复原音色名。</p>
        <div class="modx-dialog-buttons">
          <${SmallButton}
            label="发送到琴"
            onClick=${() => {
              commit();
              sendModxOrganized(group, slot);
              onClose();
            }}
          />
          <${SmallButton}
            label="移除"
            onClick=${() => {
              saveModx(withModxGroupEntry(modx.value, group, slot, null));
              status("MODX：已从音色整理移除");
              onClose();
            }}
          />
        </div>
      </div>
    <//>
  `;
}

// ---- main screen -----------------------------------------------------------

export function ModxPickerScreen({ embedded = false, forcedMode = null }) {
  const state = modx.value;
  const runtime = modxRuntime.value;
  const settings = state.settings;
  const bank = selectedModxBank(state);
  const target = resolveModxTarget(state, midi.value.devices);
  const profile = resolveModxProfile(state, target);
  const view = settings.view;
  const group = settings.selectedGroup;
  const page = state.selectedPage;
  const organizedPage = settings.organizedPage;

  const [selectedSlot, setSelectedSlot] = useState(-1);
  const [selectedOrganizedSlot, setSelectedOrganizedSlot] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [showBanks, setShowBanks] = useState(false);
  const [slotAction, setSlotAction] = useState(null);
  const [organizeRef, setOrganizeRef] = useState(null);
  const [organizeSource, setOrganizeSource] = useState("");
  const [organizedEdit, setOrganizedEdit] = useState(null);
  const [placeTarget, setPlaceTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);

  useEffect(() => {
    const next = ensureModxManualBank(modx.value);
    if (next !== modx.value) saveModx(next);
  }, []);

  useEffect(() => {
    setSelectedSlot(-1);
  }, [state.selectedBankKey, state.selectedPage]);

  useEffect(() => {
    setSelectedOrganizedSlot(-1);
  }, [group, organizedPage]);

  const updateView = (next) => saveModx(withModxView(modx.value, next));
  const chooseBank = (key) => saveModx(withModxSelectedBank(modx.value, key));
  const choosePage = (next) => saveModx(withModxSelectedPage(modx.value, next));
  const chooseGroup = (index) => saveModx(withModxSelectedGroup(modx.value, index));
  const chooseOrganizedPage = (index) => saveModx(withModxOrganizedPage(modx.value, index));

  const liveItem = bank ? bankSlot(bank, page, selectedSlot) : null;
  const liveName = liveItem && !slotIsEmpty(liveItem) ? slotDisplayName(liveItem) : null;
  const organizedRef = organizedEntry(state, group, selectedOrganizedSlot);
  const organizedEmpty = organizedTotal(state) === 0;

  const selectLiveSlot = (slot) => {
    haptic();
    setSelectedSlot(slot);
    const item = bankSlot(bank, page, slot);
    if (item && !slotIsEmpty(item) && settings.immediateSend) {
      sendModxSlot(bankKey(bank), page, slot);
    }
  };

  const selectOrganizedSlot = (slot) => {
    const ref = organizedEntry(state, group, slot);
    if (!ref) {
      setPlaceTarget({ group, slot });
      return;
    }
    haptic();
    setSelectedOrganizedSlot(slot);
    if (settings.immediateSend) sendModxOrganized(group, slot);
  };

  const openSlotAction = (pageIndex, slot) => {
    const item = bankSlot(bank, pageIndex, slot);
    if (!item || slotIsEmpty(item)) return;
    setSlotAction({ bankKey: bankKey(bank), page: pageIndex, slot });
  };

  const openOrganizedEdit = (slot) => {
    if (organizedEntry(state, group, slot)) setOrganizedEdit({ group, slot });
  };

  return html`
    <div class="sub-screen sound-screen modx-screen">
      <div class="sound-header modx-header">
        ${embedded
          ? null
          : html`<button type="button" class="back-btn" onClick=${() => navigate("transpose")}>‹ 返回</button>`}
        <div class="sound-heading">
          <h1>音色选择 · MODX</h1>
          <p class=${target ? "" : "danger"}>
            ${target?.displayName || "未连接"} · ${profile?.label || "未识别型号"} ·
            Control CH ${settings.controlChannel + 1} · ${balanceLabel()}
          </p>
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
                  <button type="button" class="chip selected">MODX</button>
                  <button
                    type="button"
                    class="chip"
                    onClick=${() => saveSoundPicker(withMode(soundPicker.value, "SX"))}
                  >SX</button>
                </div>
              `}
          <${SmallButton}
            label="音色链"
            onClick=${() => {
              saveSoundPicker(withMode(soundPicker.value, "MODX"));
              navigate("chain");
            }}
          />
          <${SmallButton} label="设置" onClick=${() => setShowSettings(true)} />
        </div>
      </div>

      <div class="modx-view-row">
        <${ViewSwitch} view=${view} onView=${updateView} />
        <span class="modx-view-hint">
          ${view === "LIVE_SET"
            ? `${bank?.bankName || "未命名库"} · 非空 ${bank ? bankNonEmptyCount(bank) : 0}`
            : `组 ${group + 1} · 第 ${organizedPage + 1}/${MODX_ORGANIZED_PAGE_COUNT} 页 · 已整理 ${organizedTotal(state)}`}
        </span>
      </div>

      ${view === "LIVE_SET"
        ? html`
            <div class="modx-workspace">
              <div class="modx-main">
                <div class="modx-page-heading">
                  <button
                    type="button"
                    class="modx-page-name"
                    title="点页名可改"
                    onClick=${() => bank && setRenameTarget({
                      type: "page",
                      bankKey: bankKey(bank),
                      page,
                      name: bankPageName(bank, page),
                      maxLength: MODX_PAGE_NAME_MAX
                    })}
                  >${bank ? bankPageName(bank, page) : "Page"}</button>
                  <span>P${page + 1}/${MODX_LIVE_PAGE_COUNT} · 点页名可改</span>
                </div>
                <div class="modx-live-grid">
                  ${Array.from({ length: 16 }, (_, slot) => {
                    const item = bankSlot(bank, page, slot);
                    const usable = item && !slotIsEmpty(item);
                    return html`
                      <${ModxTile}
                        key=${slot}
                        code=${String(slot + 1)}
                        name=${usable ? slotGridLabel(item) : "空"}
                        badge=${usable && bank.kind !== "MANUAL" ? slotNameSourceLabel(item) : ""}
                        used=${usable}
                        selected=${usable && slot === selectedSlot}
                        onTap=${() => selectLiveSlot(slot)}
                        onLongPress=${() => openSlotAction(page, slot)}
                      />
                    `;
                  })}
                </div>
                ${!settings.immediateSend
                  ? html`
                      <button
                        type="button"
                        class="sound-send-bar"
                        disabled=${!liveName}
                        onClick=${() => {
                          if (liveName) sendModxSlot(bankKey(bank), page, selectedSlot);
                        }}
                      >${liveName
                        ? `发送 P${page + 1}-${selectedSlot + 1} ${liveName}`
                        : "先选择一个音色"}</button>
                    `
                  : null}
              </div>

              <div class="modx-side">
                <button
                  type="button"
                  class="modx-bank-name"
                  title="点库名可改"
                  onClick=${() => bank && setRenameTarget({
                    type: "bank",
                    bankKey: bankKey(bank),
                    name: bank.bankName,
                    maxLength: MODX_BANK_NAME_MAX
                  })}
                >${bank?.bankName || "未命名库"}</button>
                <p class="hint modx-ellipsis">
                  ${bank ? bankLabel(bank) : ""} · 非空 ${bank ? bankNonEmptyCount(bank) : 0}
                  ${bank?.partial ? " · 可能不完整" : ""}
                </p>
                ${bank?.kind === "MANUAL"
                  ? html`
                      <p class="hint accent">
                        不用读取也能用：点格直接选琴上当前库的页/槽，长按可改名；
                        名字默认是 页-槽 序号。
                      </p>
                    `
                  : null}
                <div class="modx-side-actions">
                  <${SmallButton} label="切换库" onClick=${() => setShowBanks(true)} />
                  <${SmallButton}
                    label="读取 Live Set"
                    disabled=${runtime.capturing || runtime.readingNames || runtime.sending}
                    onClick=${() => setShowCapture(true)}
                  />
                </div>
                ${profileSupportsPerformanceNames(profile) && bank?.kind !== "MANUAL"
                  ? html`
                      <div class="modx-side-actions">
                        <${SmallButton}
                          label="读本页名"
                          disabled=${runtime.capturing || runtime.readingNames || runtime.sending}
                          onClick=${() => readModxPageNames()}
                        />
                        <${SmallButton}
                          label="读全部名"
                          disabled=${runtime.capturing || runtime.readingNames || runtime.sending}
                          onClick=${() => readModxAllNames()}
                        />
                      </div>
                    `
                  : null}
                <${ModxPageGrid}
                  page=${page}
                  count=${MODX_LIVE_PAGE_COUNT}
                  onPage=${choosePage}
                />
                <${ModxProgress}
                  state=${state}
                  runtime=${runtime}
                  onStopCapture=${() => stopModxCapture()}
                  onStopNames=${() => stopModxNameRead()}
                />
              </div>
            </div>
          `
        : html`
            <div class="modx-workspace modx-organized-workspace">
              <div class="modx-main">
                <p class="hint ${organizedEmpty ? "accent" : ""} modx-ellipsis">
                  ${organizedEmpty
                    ? "音色整理还是空的 · 点空格从 Live Set 选音色放入"
                    : `组 ${group + 1} · 第 ${organizedPage + 1}/${MODX_ORGANIZED_PAGE_COUNT} 页 · 点格发送，长按音色编辑，点/长按空格放入`}
                </p>
                <div class="modx-organize-grid">
                  ${Array.from({ length: 2 }, (_, column) =>
                    Array.from({ length: 4 }, (_, row) => {
                      const slotInPage = column * 4 + row;
                      const slot = organizedPage * MODX_ORGANIZED_PAGE_SIZE + slotInPage;
                      const ref = organizedEntry(state, group, slot);
                      return html`
                        <${ModxTile}
                          key=${slot}
                          code=${`${group + 1}-${slot + 1}`}
                          name=${ref ? refEffectiveName(ref) : "空"}
                          used=${!!ref}
                          selected=${!!ref && slot === selectedOrganizedSlot}
                          onTap=${() => selectOrganizedSlot(slot)}
                          onLongPress=${() => {
                            if (ref) openOrganizedEdit(slot);
                            else setPlaceTarget({ group, slot });
                          }}
                        />
                      `;
                    })
                  )}
                </div>
                ${!settings.immediateSend
                  ? html`
                      <button
                        type="button"
                        class="sound-send-bar"
                        disabled=${!organizedRef}
                        onClick=${() => {
                          if (organizedRef) sendModxOrganized(group, selectedOrganizedSlot);
                        }}
                      >${organizedRef
                        ? `发送 ${refEffectiveName(organizedRef)}`
                        : "先选择一个音色"}</button>
                    `
                  : null}
              </div>

              <div class="modx-side modx-organized-side">
                <p class="hint">选择整理页</p>
                <div class="sound-pages modx-organized-pages">
                  ${Array.from({ length: MODX_ORGANIZED_PAGE_COUNT }, (_, index) => html`
                    <button
                      type="button"
                      class=${`sound-page-btn${index === organizedPage ? " selected" : ""}`}
                      onClick=${() => chooseOrganizedPage(index)}
                    >P${index + 1}</button>
                  `)}
                </div>
                <${ModxProgress}
                  state=${state}
                  runtime=${runtime}
                  onStopCapture=${() => stopModxCapture()}
                  onStopNames=${() => stopModxNameRead()}
                />
              </div>
            </div>
            <div class="modx-group-row">
              <div class="modx-groups">
                ${Array.from({ length: MODX_GROUP_COUNT }, (_, index) => html`
                  <button
                    type="button"
                    class=${`sound-group-btn${index === group ? " selected" : ""}`}
                    title=${modxGroupLabel(settings, index)}
                    onClick=${() => chooseGroup(index)}
                  >${modxGroupLabel(settings, index)}</button>
                `)}
              </div>
              <${SmallButton} label="组名" onClick=${() => setShowSettings(true)} />
            </div>
          `}

      <div class="sound-footer">
        <span>
          ${view === "LIVE_SET" ? "Live Set：点槽发送 · 长按改名/整理" : "音色整理：点格发送 · 空格放入"}
        </span>
        <span class="sound-status" title=${statusLine.value}>${statusLine.value}</span>
      </div>

      ${showSettings
        ? html`
            <${ModxSettingsDialog}
              onClose=${() => setShowSettings(false)}
              onOpenCapture=${() => {
                setShowSettings(false);
                setShowCapture(true);
              }}
            />
          `
        : null}

      ${showCapture
        ? html`
            <${ModxCaptureDialog}
              onClose=${() => setShowCapture(false)}
            />
          `
        : null}

      ${showBanks
        ? html`
            <${ModxBankDialog}
              onClose=${() => setShowBanks(false)}
              onOpenCapture=${() => {
                setShowBanks(false);
                setShowCapture(true);
              }}
            />
          `
        : null}

      ${slotAction
        ? html`
            <${ModxSlotActionDialog}
              action=${slotAction}
              onClose=${() => setSlotAction(null)}
              onOrganize=${(name, item) => {
                const currentBank = findModxBank(modx.value, slotAction.bankKey);
                if (!currentBank || !item) return;
                setOrganizeRef(soundRefFromSlot(currentBank, item, name));
                setOrganizeSource(`Live Set P${slotAction.page + 1}-${slotAction.slot + 1}`);
                setSlotAction(null);
              }}
            />
          `
        : null}

      ${organizeRef
        ? html`
            <${ModxOrganizeDialog}
              ref=${organizeRef}
              sourceLabel=${organizeSource}
              onClose=${() => setOrganizeRef(null)}
            />
          `
        : null}

      ${organizedEdit
        ? html`
            <${ModxOrganizedEditDialog}
              group=${organizedEdit.group}
              slot=${organizedEdit.slot}
              onClose=${() => setOrganizedEdit(null)}
            />
          `
        : null}

      ${placeTarget
        ? html`
            <${ModxPlaceFromLiveSetDialog}
              group=${placeTarget.group}
              slot=${placeTarget.slot}
              onClose=${() => setPlaceTarget(null)}
              onOpenCapture=${() => {
                setPlaceTarget(null);
                setShowCapture(true);
              }}
            />
          `
        : null}

      ${renameTarget
        ? html`
            <${RenameDialog}
              title=${renameTarget.type === "bank" ? "改 Live Set 库名" : "改页名"}
              initial=${renameTarget.name}
              maxLength=${renameTarget.maxLength}
              onClose=${() => setRenameTarget(null)}
              onConfirm=${(name) => {
                if (renameTarget.type === "bank") {
                  saveModx(withModxBankName(modx.value, renameTarget.bankKey, name));
                } else {
                  saveModx(withModxPageName(
                    modx.value,
                    renameTarget.bankKey,
                    renameTarget.page,
                    name
                  ));
                }
              }}
            />
          `
        : null}
    </div>
  `;
}

// ---- chain picker ----------------------------------------------------------

export function ModxChainPickerDialog({ onClose, onPick }) {
  const state = modx.value;
  const settings = state.settings;
  useEffect(() => {
    const next = ensureModxManualBank(modx.value);
    if (next !== modx.value) saveModx(next);
  }, []);
  const [tab, setTab] = useState(0);
  const [group, setGroup] = useState(settings.selectedGroup);
  const [organizedPage, setOrganizedPage] = useState(settings.organizedPage);
  const [bankKeyValue, setBankKeyValue] = useState(state.selectedBankKey);
  const [livePage, setLivePage] = useState(state.selectedPage);
  const bank = findModxBank(state, bankKeyValue) || selectedModxBank(state);

  return html`
    <${AppDialog} title="选择 MODX 音色" onClose=${onClose}>
      <div class="modx-chain-picker">
        <div class="modx-chip-wrap">
          <${Chip} label="音色整理" selected=${tab === 0} onClick=${() => setTab(0)} />
          <${Chip} label="Live Set" selected=${tab === 1} onClick=${() => setTab(1)} />
        </div>

        ${tab === 0
          ? organizedTotal(state) === 0
            ? html`
                <p class="hint">
                  还没有整理音色。先到「Live Set」长按一个槽，选「放入音色整理」。
                </p>
              `
            : html`
                <h3 class="section-title">组</h3>
                <div class="modx-group-picker">
                  ${Array.from({ length: MODX_GROUP_COUNT }, (_, index) => html`
                    <${Chip}
                      key=${index}
                      label=${modxGroupLabel(settings, index)}
                      selected=${group === index}
                      onClick=${() => { setGroup(index); setOrganizedPage(0); }}
                    />
                  `)}
                </div>
                <${ModxPageGrid}
                  page=${organizedPage}
                  count=${MODX_ORGANIZED_PAGE_COUNT}
                  onPage=${setOrganizedPage}
                />
                <div class="modx-organize-grid">
                  ${Array.from({ length: 2 }, (_, column) =>
                    Array.from({ length: 4 }, (_, row) => {
                      const slotInPage = column * 4 + row;
                      const slot = organizedPage * MODX_ORGANIZED_PAGE_SIZE + slotInPage;
                      const ref = organizedEntry(state, group, slot);
                      return html`
                        <${ModxTile}
                          key=${slot}
                          code=${`${group + 1}-${slot + 1}`}
                          name=${ref ? refEffectiveName(ref) : "空"}
                          used=${!!ref}
                          onTap=${() => { if (ref) onPick(ref); }}
                        />
                      `;
                    })
                  )}
                </div>
                <p class="hint">点一个音色填入音色链。</p>
              `
          : html`
              <h3 class="section-title">库</h3>
              <div class="modx-chip-wrap">
                ${state.banks.map((option) => html`
                  <${Chip}
                    key=${bankKey(option)}
                    label=${`${option.bankName || "未命名库"} · ${bankLabel(option)}`}
                    selected=${bankKey(option) === bankKeyValue}
                    onClick=${() => setBankKeyValue(bankKey(option))}
                  />
                `)}
              </div>
              <${ModxPageGrid} page=${livePage} onPage=${setLivePage} />
              <div class="modx-live-grid">
                ${Array.from({ length: 16 }, (_, slot) => {
                  const item = bankSlot(bank, livePage, slot);
                  const usable = item && !slotIsEmpty(item);
                  return html`
                    <${ModxTile}
                      key=${slot}
                      code=${String(slot + 1)}
                      name=${usable ? slotGridLabel(item) : "空"}
                      badge=${usable && bank.kind !== "MANUAL" ? slotNameSourceLabel(item) : ""}
                      used=${usable}
                      onTap=${() => {
                        if (usable) onPick(soundRefFromSlot(bank, item));
                      }}
                    />
                  `;
                })}
              </div>
              <p class="hint">点一个非空槽填入音色链。</p>
            `}
      </div>
    <//>
  `;
}
