import { html, AppDialog, Section, Chip, Stepper, Toggle, LogView, SmallButton, Hint } from "../ui/components.js";
import {
  clearLog,
  closeDialog,
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

export function SettingsDialog() {
  const state = settings.value;
  const licenseState = license.value;
  const midiState = midi.value;
  const devices = midiState.devices.filter((device) => !device.isVirtual);
  const virtualDevices = midiState.devices.filter((device) => device.isVirtual);

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
          Ev移调器 ${APP_BUILD} 版 v${APP_VERSION}。授权、扣次规则与安卓版一致；
          iPad 不支持 BLE 翻页，请用安卓版完成 forScore 翻页。
        </p>
        <p class="hint">
          网页版无法校验安装包签名，激活码只能起到防误用/防随意分享的作用。
        </p>
      <//>
    <//>
  `;
}
