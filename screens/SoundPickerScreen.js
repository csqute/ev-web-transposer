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
  consumeUse,
  controlChannel,
  hasUses,
  license,
  midi,
  openDialog,
  saveSoundPicker,
  setControlChannel,
  soundPicker,
  updateSoundPicker
} from "../app/store.js";
import {
  KEYBOARD_SET_BANKS,
  SOUND_GROUP_COUNT,
  SOUND_PAGE_COUNT,
  SOUND_PAGE_SIZE,
  SOUND_SLOT_COUNT,
  defaultGroupLabel,
  groupLabel,
  isKorgPaLike,
  keyboardSetMessages,
  nameAt,
  resolveSoundTarget,
  soundSlotLink,
  totalUsed,
  usedCount,
  withAllNamesCleared,
  withGroupLabel,
  withGroupNames,
  withImmediateSend,
  withSelected,
  withTargetKey
} from "../core/sounds/picker.js";
import { mixerDeviceLists } from "../core/mixer/targets.js";
import {
  scheduleKeepAfterSoundChange,
  sendMessagesToDevice
} from "../core/midi/engine.js";
import { parsePrfImport } from "../core/files/zip.js";

function ChannelStepper({ value, onChange }) {
  return html`
    <div class="mixer-channel-stepper sound-channel-stepper">
      <button type="button" class="stepper-btn" disabled=${value <= 0} onClick=${() => onChange(value - 1)}>−</button>
      <span class="stepper-value">${value + 1}</span>
      <button type="button" class="stepper-btn" disabled=${value >= 15} onClick=${() => onChange(value + 1)}>＋</button>
    </div>
  `;
}

function SoundTile({ group, slot, name, selected, onClick }) {
  const used = !!name;
  return html`
    <button
      type="button"
      class=${`sound-tile${used ? " used" : ""}${selected ? " selected" : ""}`}
      disabled=${!used}
      onClick=${onClick}
    >
      <span class="sound-tile-index">${group + 1}-${slot + 1}</span>
      <span class="sound-tile-name">${name || "空"}</span>
    </button>
  `;
}

function SoundPickerSettingsDialog({
  picker,
  target,
  devices,
  onClose,
  onSendMode,
  onTarget,
  onControlChannel,
  onGroupLabel,
  onImportFiles,
  onImportFolderFiles,
  onClearRequest,
  scrollToImport = false
}) {
  const settings = picker.settings;
  const selectedKey = settings.targetKey;
  const targetMissing = !!selectedKey && !target;
  const total = totalUsed(picker);
  const folderChooserRef = useRef(null);
  const importRef = useRef(null);
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const chromeMajor = Number((ua.match(/(?:Chrome|CriOS)\/(\d+)/) || [])[1] || 0);
  const folderProperty = "webkitdirectory" in document.createElement("input");
  // Chrome for Android only gained real folder picking in version 132.
  const folderSupported = folderProperty && (!isAndroid || chromeMajor >= 132);
  const folderProblem = folderSupported
    ? ""
    : isAndroid
      ? `当前安卓浏览器${chromeMajor ? `（Chrome ${chromeMajor}）` : ""}不支持直接选文件夹，需要 Chrome 132 或更新版本。请先用「选择文件」进入 KEYBOARDSET 文件夹，多选 USER01.PRF–USER09.PRF；或把文件夹压缩成 ZIP 再导入。`
      : isIOS
        ? "当前 iOS 版本不支持直接选文件夹（需要 iOS 18.4 或更新版本）。请用 ZIP 或多选 PRF 文件导入。"
        : "当前浏览器不支持直接选文件夹。请用 ZIP 或多选 PRF 文件导入。";

  useEffect(() => {
    const input = folderChooserRef.current;
    if (!input) return;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (!scrollToImport) return undefined;
    const frame = requestAnimationFrame(() => {
      importRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollToImport]);
  return html`
    <${AppDialog} title="音色选择设置" onClose=${onClose}>
      <div class="sound-settings">
        <h3 class="section-title">发送方式</h3>
        <div class="chip-row">
          <${Chip} label="点按即发" selected=${settings.immediateSend} onClick=${() => onSendMode(true)} />
          <${Chip} label="预选后发送" selected=${!settings.immediateSend} onClick=${() => onSendMode(false)} />
        </div>
        <p class="hint">预选模式：先点音色选中，再按底部的「发送」。</p>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">发送到</h3>
        <p class="hint">
          音色选择和音色链只发这一台琴。自动 = 优先 PA700/PA1000，没有就选第一台已启用的 MIDI 琴。
        </p>
        <div class="sound-target-list">
          <${Chip} label="自动" selected=${selectedKey === ""} onClick=${() => onTarget("")} />
          ${devices.map((device) => html`
            <${Chip}
              label=${`${device.displayName}${isKorgPaLike(device) ? " · PA" : ""}`}
              selected=${selectedKey === device.key}
              title=${device.outputName || device.displayName}
              onClick=${() => onTarget(device.key)}
            />
          `)}
        </div>
        ${devices.length === 0 ? html`<p class="hint danger">未连接 MIDI 琴。</p>` : null}
        ${targetMissing ? html`<p class="hint danger">上次选择的琴当前未连接，请重新选择。</p>` : null}

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">Control 通道</h3>
        <p class="hint">与歌单、音色链共用；琴上的 MIDI IN Control 通道要一致。</p>
        <${ChannelStepper} value=${controlChannel.value} onChange=${onControlChannel} />

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">组名缩写</h3>
        <p class="hint">
          显示在底部 9 个组按钮上；留空则使用默认分类名（Piano、Organ、Guitar、String、Brass、Trumpet、Sax、Synth、Ethnic）。
        </p>
        <div class="sound-label-list">
          ${Array.from({ length: SOUND_GROUP_COUNT }, (_, index) => html`
            <label class="sound-label-row">
              <span>组 ${index + 1}</span>
              <input
                type="text"
                maxlength="8"
                value=${settings.groupLabels[index]}
                placeholder=${defaultGroupLabel(index)}
                onInput=${(event) => onGroupLabel(index, event.currentTarget.value)}
              />
            </label>
          `)}
        </div>

        <div class="mixer-divider-line"></div>

        <h3 class="section-title" ref=${importRef}>导入音色表</h3>
        <p class="hint">
          在琴上 Media › Save，勾选 Keyboard Sets，导出到 U 盘；把 U 盘或 KEYBOARDSET 文件夹拷到设备上。
          选择 ZIP 或 USER01.PRF–USER09.PRF 文件；也可以直接选择 KEYBOARDSET 文件夹。
          只读名字和位置，不会改动琴。
        </p>
        <div class="sound-import-actions">
          <label class="small-btn file-pick-btn">
            选择文件（ZIP / PRF，可多选）
            <input
              type="file"
              multiple
              onChange=${onImportFiles}
            />
          </label>
          ${folderSupported
            ? html`
                <label class="small-btn file-pick-btn">
                  选择 KEYBOARDSET 文件夹
                  <input
                    ref=${folderChooserRef}
                    type="file"
                    multiple
                    webkitdirectory=${true}
                    directory=${true}
                    onChange=${onImportFolderFiles}
                  />
                </label>
              `
            : null}
        </div>
        ${folderProblem ? html`<p class="hint danger">${folderProblem}</p>` : null}
        ${isAndroid && folderSupported
          ? html`<p class="hint">如果安卓文件选择器里没有文件夹选项，请进入 KEYBOARDSET 文件夹后全选 PRF，或压缩成 ZIP 再导入。</p>`
          : null}
        <p class="hint accent">当前已导入 ${total} 个音色名字。</p>

        <div class="mixer-divider-line"></div>
        <${SmallButton} label="清空所有音色名字" onClick=${onClearRequest} />
      </div>
    <//>
  `;
}

export function SoundPickerScreen({ embedded = false }) {
  const picker = soundPicker.value;
  const settings = picker.settings;
  const group = settings.selectedGroup;
  const page = settings.selectedPage;
  const devices = mixerDeviceLists().midiDevices;
  const target = resolveSoundTarget(picker, midi.value.devices);
  const channel = controlChannel.value;
  const balance = license.value.unlimited ? "无限制" : `剩余 ${license.value.balance} 次`;
  const groupNames = picker.groups[group];
  const [selectedSlot, setSelectedSlot] = useState(-1);
  const [status, setStatus] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [scrollToImport, setScrollToImport] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importing, setImporting] = useState(false);

  const selectedName = selectedSlot >= 0
    ? nameAt(picker, group, page * SOUND_PAGE_SIZE + selectedSlot)
    : null;

  const updateStatus = (text) => {
    setStatus(text);
    if (text) addLog(text, "muted");
  };

  const sendSlot = async (slotInPage) => {
    const slot = page * SOUND_PAGE_SIZE + slotInPage;
    const name = nameAt(picker, group, slot);
    if (!name) {
      updateStatus(`音色选择：${group + 1}-${slot + 1} 没有导入的音色`);
      return;
    }
    if (!target) {
      updateStatus("音色选择：未连接所选的琴，请在设置里选择");
      return;
    }
    if (!hasUses(1)) {
      openDialog("paywall");
      return;
    }
    const link = soundSlotLink(group, slot, name);
    const sent = await sendMessagesToDevice(target, keyboardSetMessages(channel, link)).catch(() => 0);
    if (!sent) {
      updateStatus(`音色选择：发送失败：${target.displayName}`);
      return;
    }
    consumeUse(1);
    scheduleKeepAfterSoundChange("音色选择");
    updateStatus(
      `音色选择：${name}（用户 ${group + 1}-${slot + 1} · ${target.displayName} · Control CH ${channel + 1}）`
    );
  };

  const selectTile = (slotInPage) => {
    haptic();
    setSelectedSlot(slotInPage);
    if (settings.immediateSend) sendSlot(slotInPage);
  };

  const choosePage = (index) => {
    setSelectedSlot(-1);
    saveSoundPicker(withSelected(soundPicker.value, group, index));
  };

  const chooseGroup = (index) => {
    setSelectedSlot(-1);
    saveSoundPicker(withSelected(soundPicker.value, index, 0));
  };

  const importFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((file) => /\.(zip|prf)$/i.test(file.name));
    if (!files.length) {
      updateStatus("音色选择：请选择 .zip、.prf 或 KEYBOARDSET 文件夹");
      return;
    }
    setImporting(true);
    updateStatus("音色选择：正在读取文件…");
    try {
      const payloads = [];
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        payloads.push({ name: file.name, bytes });
      }
      const result = parsePrfImport(payloads);
      if (!result.records) {
        const detail = result.rejected.slice(0, 3).join("、");
        updateStatus(`音色选择：导入失败${detail ? `（${detail}）` : ""}`);
        return;
      }
      let next = soundPicker.value;
      for (const [pageNumber, names] of Object.entries(result.banks)) {
        next = withGroupNames(next, Number(pageNumber) - 1, names);
      }
      if (!usedCount(soundPicker.value, group)) {
        const firstPage = Math.min(...Object.keys(result.banks).map(Number));
        next = withSelected(next, firstPage - 1, 0);
      }
      saveSoundPicker(next);
      const skipped = result.rejected.length ? ` · 跳过 ${result.rejected.length} 个文件` : "";
      updateStatus(`音色选择：已导入 ${result.records} 个音色（${result.pages} 页）${skipped}`);
      result.rejected.slice(0, 3).forEach((item) => addLog(`音色选择导入跳过：${item}`, "warn"));
    } catch (error) {
      updateStatus(`音色选择：导入失败（${error?.message || error}）`);
    } finally {
      setImporting(false);
    }
  };

  const onFilesPicked = async (event) => {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    setShowSettings(false);
    setScrollToImport(false);
    await importFiles(files);
  };

  const onFolderPicked = async (event) => {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    setShowSettings(false);
    setScrollToImport(false);
    await importFiles(files);
  };

  const clearNames = () => {
    saveSoundPicker(withAllNamesCleared(soundPicker.value));
    setSelectedSlot(-1);
    setConfirmClear(false);
    updateStatus("音色选择：已清空导入的音色名字");
  };

  const slotsInPage = Array.from({ length: SOUND_PAGE_SIZE }, (_, index) => index);

  return html`
    <div class="sub-screen sound-screen">
      <div class="sound-header">
        ${embedded ? null : html`<button type="button" class="back-btn" onClick=${() => navigate("transpose")}>‹ 返回</button>`}
        <div class="sound-heading">
          <h1>音色选择</h1>
          <p class=${target ? "" : "danger"} title=${`发送到 ${target?.displayName || "未连接"} · Control CH ${channel + 1} · ${balance}`}>
            发送到 ${target?.displayName || "未连接"} · Control CH ${channel + 1} · ${balance}
          </p>
        </div>
        <div class="sound-header-actions">
          <${SmallButton} label="音色链" onClick=${() => navigate("chain")} />
          <${SmallButton} label="导入音色表" onClick=${() => { setScrollToImport(true); setShowSettings(true); }} disabled=${importing} />
          <${SmallButton} label="设置" onClick=${() => { setScrollToImport(false); setShowSettings(true); }} />
        </div>
      </div>

      <div class="sound-workspace">
        <div class="sound-grid">
          ${Array.from({ length: 2 }, (_, column) =>
            Array.from({ length: 4 }, (_, row) => {
              const slotInPage = column * 4 + row;
              const slot = page * SOUND_PAGE_SIZE + slotInPage;
              return html`
                <${SoundTile}
                  key=${slot}
                  group=${group}
                  slot=${slot}
                  name=${groupNames[slot]}
                  selected=${slotInPage === selectedSlot}
                  onClick=${() => selectTile(slotInPage)}
                />
              `;
            })
          )}
        </div>

        <div class="sound-pages">
          ${Array.from({ length: SOUND_PAGE_COUNT }, (_, index) => html`
            <button
              type="button"
              class=${`sound-page-btn${index === page ? " selected" : ""}`}
              onClick=${() => choosePage(index)}
            >P${index + 1}</button>
          `)}
        </div>

        <div class="sound-groups">
          ${Array.from({ length: SOUND_GROUP_COUNT }, (_, index) => html`
            <button
              type="button"
              class=${`sound-group-btn${index === group ? " selected" : ""}`}
              title=${groupLabel(picker, index)}
              onClick=${() => chooseGroup(index)}
            >${groupLabel(picker, index)}</button>
          `)}
        </div>
      </div>

      ${!settings.immediateSend
        ? html`
            <button
              type="button"
              class="sound-send-bar"
              disabled=${!selectedName}
              onClick=${() => sendSlot(selectedSlot)}
            >
              ${selectedName
                ? `发送 ${group + 1}-${page * SOUND_PAGE_SIZE + selectedSlot + 1} ${selectedName}`
                : "先选择一个音色"}
            </button>
          `
        : null}

      <div class="sound-footer">
        <span>${settings.immediateSend ? "点按音色立即发送" : "预选后按上方按钮发送"}</span>
        <span class="sound-status" title=${status}>${status}</span>
      </div>

      ${showSettings
        ? html`
            <${SoundPickerSettingsDialog}
              picker=${picker}
              target=${target}
              devices=${devices}
              onClose=${() => setShowSettings(false)}
              onSendMode=${(enabled) => saveSoundPicker(withImmediateSend(soundPicker.value, enabled))}
              onTarget=${(key) => saveSoundPicker(withTargetKey(soundPicker.value, key))}
              onControlChannel=${(value) => setControlChannel(value)}
              onGroupLabel=${(index, value) => saveSoundPicker(withGroupLabel(soundPicker.value, index, value))}
              onImportFiles=${onFilesPicked}
              onImportFolderFiles=${onFolderPicked}
              onClearRequest=${() => setConfirmClear(true)}
              scrollToImport=${scrollToImport}
            />
          `
        : null}

      ${confirmClear
        ? html`
            <${AlertDialog}
              title="清空音色名字？"
              message="只清除 App 里导入的名字，不会改动琴上的数据。"
              actions=${[
                { label: "取消", onClick: () => setConfirmClear(false) },
                { label: "清空", danger: true, onClick: clearNames }
              ]}
            />
          `
        : null}
    </div>
  `;
}
