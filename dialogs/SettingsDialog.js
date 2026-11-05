import { useEffect, useRef, useState } from "preact/hooks";
import { html, AppDialog, AlertDialog, Section, Chip, Stepper, Toggle, LogView, SmallButton, Hint } from "../ui/components.js";
import {
  clearLog,
  closeDialog,
  exportBackupJson,
  importBackupJson,
  logLines,
  midi,
  openDialog,
  setInterfaceStyle,
  setKeepAfterVoiceChange,
  setMidiChannel,
  setProtocolMode,
  setTheme,
  settings,
  showToast,
  license,
  setDeviceMode,
  templates,
  deleteTemplate
} from "../app/store.js";
import { BACKUP_MAX_TEXT_BYTES } from "../core/backup.js";
import {
  QrCollector,
  encodeQrFrames,
  parseQrFrame,
  renderQrToCanvas,
  startCameraScanner
} from "../core/qr.js";
import { MIDI_MODE_OPTIONS, PROTOCOL_LABELS, SX_MODE_OPTIONS } from "../core/midi/protocols.js";
import { connectMidi, refreshDevices, sendTestNote } from "../core/midi/engine.js";
import { APP_BUILD, APP_VERSION } from "../app/version.js";
import { INTERFACE_LABELS, THEME_LABELS, THEME_ORDER } from "../app/theme.js";

const PROTOCOL_CHOICES = [
  "AUTO",
  "UNIVERSAL",
  "RPN",
  "YAMAHA_MODX_M",
  "YAMAHA_MODX",
  "YAMAHA_MONTAGE",
  "LEARNED",
  "ALL"
];

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast("已复制"),
      () => showToast("复制失败，请手动选择")
    );
  } else {
    showToast("浏览器不支持自动复制");
  }
}

function backupStamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function readBackupFile(file) {
  if (file.text) return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("读取失败"));
    reader.readAsText(file);
  });
}

export function SettingsDialog() {
  const state = settings.value;
  const licenseState = license.value;
  const midiState = midi.value;
  const devices = midiState.devices.filter((device) => !device.isVirtual);
  const virtualDevices = midiState.devices.filter((device) => device.isVirtual);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [backupText, setBackupText] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [backupResult, setBackupResult] = useState("");
  const fileInputRef = useRef(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrMode, setQrMode] = useState("show");
  const [qrFrames, setQrFrames] = useState([]);
  const [qrIndex, setQrIndex] = useState(0);
  const [qrPaused, setQrPaused] = useState(false);
  const [qrMessage, setQrMessage] = useState("");
  const [qrMeta, setQrMeta] = useState(null);
  const [qrReset, setQrReset] = useState(0);
  const qrCanvasRef = useRef(null);
  const qrVideoRef = useRef(null);
  const qrScanCanvasRef = useRef(null);

  const rescan = async () => {
    if (midiState.status === "connected") refreshDevices(false);
    else await connectMidi();
    showToast("已重新扫描 MIDI 设备");
  };

  const test = async () => {
    const ok = await sendTestNote();
    if (!ok) showToast("没有可发送的 MIDI 输出");
  };

  const copyLog = () => {
    const text = logLines.value
      .map((line) => `${line.time} ${line.text}`)
      .join("\n");
    copyText(text || "暂无日志");
  };

  const openExport = () => {
    setBackupText(exportBackupJson());
    setExportOpen(true);
  };

  const downloadBackup = () => {
    const text = backupText || exportBackupJson();
    try {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Ev-Transposer-backup-${backupStamp()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("已导出备份");
    } catch (_) {
      showToast("下载失败，请改用复制备份");
    }
  };

  const copyBackup = () => {
    copyText(backupText || exportBackupJson());
  };

  const onImportFile = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > BACKUP_MAX_TEXT_BYTES) {
      setBackupResult("备份文件太大（超过 2 MB）");
      return;
    }
    try {
      const text = await readBackupFile(file);
      setPendingBackup({ text, source: file.name || "文件" });
    } catch (error) {
      setBackupResult(`读取失败：${error?.message || error}`);
    }
  };

  const applyPendingBackup = () => {
    if (!pendingBackup) return;
    const result = importBackupJson(pendingBackup.text);
    setPendingBackup(null);
    setBackupResult(result.message);
  };

  const openQrShow = async () => {
    setQrOpen(true);
    setQrMode("show");
    setQrPaused(false);
    setQrFrames([]);
    setQrIndex(0);
    setQrMeta(null);
    setQrMessage("正在生成二维码…");
    try {
      const encoded = await encodeQrFrames(exportBackupJson());
      setQrFrames(encoded.frames);
      setQrMeta(encoded);
      setQrMessage("");
    } catch (error) {
      setQrOpen(false);
      setBackupResult(
        `二维码生成失败：${error?.message || error}。请改用文件导出。`
      );
    }
  };

  const closeQr = () => {
    setQrOpen(false);
    setQrPaused(false);
  };

  useEffect(() => {
    if (!qrOpen || qrMode !== "show" || qrPaused || qrFrames.length <= 1) {
      return undefined;
    }
    const timer = setInterval(() => {
      setQrIndex((value) => (value + 1) % qrFrames.length);
    }, 1000);
    return () => clearInterval(timer);
  }, [qrOpen, qrMode, qrPaused, qrFrames]);

  useEffect(() => {
    if (!qrOpen || qrMode !== "show") return;
    const frame = qrFrames[qrIndex];
    const canvas = qrCanvasRef.current;
    if (frame && canvas) renderQrToCanvas(frame, canvas, 600);
  }, [qrOpen, qrMode, qrFrames, qrIndex]);

  useEffect(() => {
    if (!qrOpen || qrMode !== "scan") return undefined;
    let stopped = false;
    let stopScanner = null;
    const collector = new QrCollector();
    const video = qrVideoRef.current;
    const canvas = qrScanCanvasRef.current;
    if (!video || !canvas) return undefined;
    setQrMessage("正在打开摄像头…");
    (async () => {
      try {
        stopScanner = await startCameraScanner({
          video,
          canvas,
          onFrame: async (text) => {
            const info = parseQrFrame(text);
            if (!info || stopped) return;
            const result = await collector.accept(info);
            if (stopped) return;
            if (result.status === "progress") {
              setQrMessage(`已扫描 ${result.received} / ${result.total} 帧`);
            } else if (result.status === "invalid") {
              setQrMessage(result.reason);
            } else if (result.status === "complete") {
              stopped = true;
              stopScanner?.();
              setQrOpen(false);
              setPendingBackup({ text: result.json, source: "二维码" });
            }
          },
          onError: (message) => setQrMessage(message)
        });
        if (stopped) {
          stopScanner?.();
        } else {
          setQrMessage("对准另一台设备屏幕上的二维码…");
        }
      } catch (error) {
        setQrMessage(error?.message || "无法打开摄像头，请改用文件导入");
      }
    })();
    return () => {
      stopped = true;
      stopScanner?.();
    };
  }, [qrOpen, qrMode, qrReset]);

  return html`
    <${AppDialog} title="设置" onClose=${closeDialog}>
      <${Section} title="快捷入口">
        <div class="button-row">
          <${SmallButton} label="预设" onClick=${() => openDialog("presets")} />
          <${SmallButton} label="次数与客服" onClick=${() => openDialog("support")} />
        </div>
        <div class="support-line">
          ${licenseState.unlimited ? "当前：无限制版" : `当前：剩余 ${licenseState.balance} 次`}
        </div>
      <//>

      <${Section}
        title="备份与恢复"
        hint="导出预设、音色链（含 MODX 快照）、打鼓 loop、歌单、音色表、MODX 音色表/整理、调音台、学习模板、外观和 MIDI 设置。不含激活次数/时长卡，可跨设备；安卓和网页版使用同一格式。"
      >
        <div class="button-row">
          <${SmallButton} label="导出备份" onClick=${openExport} />
          <${SmallButton} label="导入文件" onClick=${() => fileInputRef.current?.click()} />
          <${SmallButton} label="粘贴备份" onClick=${() => setPasteOpen(true)} />
          <${SmallButton} label="二维码" onClick=${openQrShow} />
        </div>
        <input
          ref=${fileInputRef}
          type="file"
          accept=".json,application/json"
          style="display:none"
          onChange=${onImportFile}
        />
        <p class="hint">
          导入会整体覆盖备份里存在的模块，未包含的模块保持不变；
          不会改动激活次数、时长卡、永久解锁或设备码，也不会发送 MIDI。
        </p>
      <//>

      <${Section} title="外观">
        <div class="field-label">界面</div>
        <div class="chip-row">
          ${Object.entries(INTERFACE_LABELS).map(([value, label]) => html`
            <${Chip}
              label=${label}
              selected=${state.interfaceStyle === value}
              onClick=${() => setInterfaceStyle(value)}
            />
          `)}
        </div>
        <div class="field-label spaced">主题</div>
        <div class="chip-row">
          ${THEME_ORDER.map((value) => html`
            <${Chip}
              label=${THEME_LABELS[value]}
              selected=${state.theme === value}
              onClick=${() => setTheme(value)}
            />
          `)}
        </div>
      <//>

      <${Section}
        title="MIDI"
        hint="自动模式按琴名选择协议；每台琴可以在下面的「连接的琴」里单独改模式。"
      >
        <div class="field-label">默认协议（新设备）</div>
        <div class="chip-row wrap">
          ${PROTOCOL_CHOICES.map((mode) => html`
            <${Chip}
              label=${PROTOCOL_LABELS[mode]}
              selected=${state.protocolMode === mode}
              onClick=${() => setProtocolMode(mode)}
            />
          `)}
        </div>
        <${Stepper}
          label="MIDI 通道（0 = CH1）"
          value=${state.midiChannel}
          min=${0}
          max=${15}
          onChange=${setMidiChannel}
        />
        <${Toggle}
          label="换音色后保持移调"
          checked=${state.keepAfterVoiceChange}
          onChange=${setKeepAfterVoiceChange}
        />
      <//>

      <${Section} title="连接的琴">
        ${devices.length === 0
          ? html`<p class="hint">未发现设备。接上琴的 USB，点“重新扫描”。</p>`
          : devices.map((device) => html`
            <div class="device-row">
              <div class="device-main">
                <div class="device-name">${device.displayName}</div>
                <div class="device-meta">
                  ${device.sendable ? "可发送" : "仅接收"} · 发送口 ${device.outputCount} · 接收口 ${device.inputCount}
                </div>
              </div>
              <select
                class="device-mode"
                value=${device.mode}
                title="这台琴的模式"
                onChange=${(event) => {
                  setDeviceMode(device.key, event.currentTarget.value);
                  refreshDevices(true);
                  showToast("已切换这台琴的模式");
                }}
              >
                ${(device.isSx ? SX_MODE_OPTIONS : MIDI_MODE_OPTIONS).map((mode) => html`
                  <option value=${mode}>${PROTOCOL_LABELS[mode] || mode}</option>
                `)}
              </select>
            </div>
          `)}
        ${virtualDevices.length
          ? html`<p class="hint">另有 ${virtualDevices.length} 个软件/虚拟端口已忽略（MIDIWeb、网络 MIDI 等）。</p>`
          : null}
        <div class="button-row">
          <${SmallButton} label="重新扫描" onClick=${rescan} />
          <${SmallButton} label="发送测试" onClick=${test} disabled=${!midiState.supported} />
        </div>
        ${!midiState.supported
          ? html`<p class="callout">这个浏览器没有 Web MIDI。iPad 请用 MIDIWeb Browser 打开本页；电脑/安卓请用 Chrome 或 Edge。</p>`
          : null}
        ${midiState.error ? html`<p class="callout">${midiState.error}</p>` : null}
      <//>

      <${Section} title="学习模板">
        ${Object.values(templates.value).length === 0
          ? html`<p class="hint">还没有学习模板。接上琴后点「适配新琴」，按提示在琴上按两次 ♯。</p>`
          : Object.values(templates.value).map((template) => html`
            <div class="device-row">
              <div class="device-main">
                <div class="device-name">${template.modelName}</div>
                <div class="device-meta">
                  值字节 #${template.valueIndex + 1} · base ${template.base} ·
                  每半音 ${template.stepPerSemitone}
                  ${template.checksum === "ROLAND" ? " · Roland 校验" : ""}
                </div>
              </div>
              <${SmallButton} label="删除" onClick=${() => {
                deleteTemplate(template.modelKey);
                showToast("已删除模板");
              }} />
            </div>
          `)}
        <div class="button-row">
          <${SmallButton} label="适配新琴" onClick=${() => openDialog("learn")} />
        </div>
      <//>

      <${Section} title="诊断">
        <${LogView} lines=${logLines.value.slice(0, 12)} />
        <div class="button-row">
          <${SmallButton} label="复制日志" onClick=${copyLog} />
          <${SmallButton} label="清空日志" onClick=${clearLog} />
        </div>
        <p class="hint diagnostics">
          Web MIDI：${midiState.supported ? "可用" : "不可用"} ·
          SysEx：${midiState.sysexEnabled ? "已开启" : "未知/关闭"} ·
          UA：${navigator.userAgent}
        </p>
      <//>

      <${Section} title="关于">
        <p class="hint">
          Ev移调器 ${APP_BUILD} 版 v${APP_VERSION}。网页版授权支持按次和永久解锁；
          日卡/周卡/月卡请使用安卓版。iPad 不支持 BLE 翻页，请用安卓版完成 forScore 翻页。
        </p>
        <p class="hint">
          网页版无法校验安装包签名，激活码只能起到防误用/防随意分享的作用。
        </p>
      <//>

      ${exportOpen ? html`
        <${AlertDialog}
          title="导出备份"
          message="可以下载文件，或复制下面的文本到另一台设备。"
          actions=${[
            { label: "关闭", onClick: () => setExportOpen(false) },
            { label: "复制", onClick: copyBackup },
            { label: "下载", primary: true, onClick: downloadBackup }
          ]}
        >
          <textarea
            class="backup-text"
            readonly
            value=${backupText}
            onFocus=${(event) => event.currentTarget.select()}
          ></textarea>
        </${AlertDialog}>
      ` : null}

      ${pasteOpen ? html`
        <${AlertDialog}
          title="粘贴备份"
          message="把另一台设备复制来的备份文本粘贴到这里。"
          actions=${[
            { label: "取消", onClick: () => setPasteOpen(false) },
            {
              label: "下一步",
              primary: true,
              onClick: () => {
                if (!pasteText.trim()) {
                  showToast("请先粘贴备份文本");
                  return;
                }
                setPendingBackup({ text: pasteText, source: "粘贴的文本" });
                setPasteOpen(false);
              }
            }
          ]}
        >
          <textarea
            class="backup-text"
            value=${pasteText}
            placeholder="粘贴备份 JSON…"
            onInput=${(event) => setPasteText(event.currentTarget.value)}
          ></textarea>
        </${AlertDialog}>
      ` : null}

      ${pendingBackup ? html`
        <${AlertDialog}
          title="导入备份？"
          message=${`来源：${pendingBackup.source}。备份里存在的模块会整体覆盖当前数据；激活次数、时长卡、永久解锁和设备码不受影响，也不会发送 MIDI。`}
          actions=${[
            { label: "取消", onClick: () => setPendingBackup(null) },
            { label: "导入", primary: true, onClick: applyPendingBackup }
          ]}
        />
      ` : null}

      ${backupResult ? html`
        <${AlertDialog}
          title="备份与恢复"
          message=${backupResult}
          actions=${[{ label: "知道了", primary: true, onClick: () => setBackupResult("") }]}
        />
      ` : null}
    <//>

    ${qrOpen ? html`
      <${AppDialog} title="二维码备份" onClose=${closeQr}>
        <div class="button-row">
          <${SmallButton}
            label="显示二维码"
            active=${qrMode === "show"}
            onClick=${() => {
              setQrMode("show");
              setQrPaused(false);
            }}
          />
          <${SmallButton}
            label="扫码导入"
            active=${qrMode === "scan"}
            onClick=${() => setQrMode("scan")}
          />
        </div>
        ${qrMode === "show" ? html`
          <p class="hint">
            另一台设备：设置 → 备份与恢复 → 二维码 → 扫码导入，对准二维码。
            数据量较大会自动分成多帧循环显示。
          </p>
          <p class="hint">
            ${qrMeta
              ? `数据量 ${Math.ceil(qrMeta.rawBytes / 1024)} KB · 第 ${qrIndex + 1} / ${qrFrames.length} 帧 · 每帧 1 秒 · 一轮约 ${(qrFrames.length * 1.0).toFixed(1)} 秒`
              : qrMessage}
          </p>
          <div class="button-row">
            ${qrFrames.length > 1
              ? html`<${SmallButton} label=${qrPaused ? "继续" : "暂停"} onClick=${() => setQrPaused(!qrPaused)} />`
              : null}
            <${SmallButton} label="上一帧" onClick=${() => {
              setQrPaused(true);
              setQrIndex((value) => (value - 1 + qrFrames.length) % qrFrames.length);
            }} />
            <${SmallButton} label="下一帧" onClick=${() => {
              setQrPaused(true);
              setQrIndex((value) => (value + 1) % qrFrames.length);
            }} />
            <${SmallButton} label="重新开始" onClick=${() => {
              setQrIndex(0);
              setQrPaused(false);
            }} />
          </div>
          <div class="qr-canvas-wrap">
            <canvas ref=${qrCanvasRef} class="qr-canvas"></canvas>
          </div>
          <p class="hint">
            扫码端进度没满时，点「暂停」后用上一帧/下一帧停在未扫到的帧上。
          </p>
        ` : html`
          <p class="hint">
            把另一台设备的二维码对准摄像头；可以任意顺序扫描，重复帧会忽略。
            如果浏览器不允许摄像头，请改用文件或粘贴导入。
          </p>
          <video ref=${qrVideoRef} class="qr-video" playsinline muted></video>
          <canvas ref=${qrScanCanvasRef} style="display:none"></canvas>
          <p class="hint">${qrMessage}</p>
          <div class="button-row">
            <${SmallButton} label="重置扫描" onClick=${() => {
              setQrReset((value) => value + 1);
              setQrMessage("对准另一台设备屏幕上的二维码…");
            }} />
          </div>
        `}
      </${AppDialog}>
    ` : null}
  `;
}
