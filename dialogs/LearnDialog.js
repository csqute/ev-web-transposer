import { useState } from "preact/hooks";
import {
  html,
  AppDialog,
  SmallButton,
  Stepper,
  Toggle,
  Hint
} from "../ui/components.js";
import {
  closeDialog,
  midi,
  settings,
  showToast,
  templates
} from "../app/store.js";
import {
  cancelLearn,
  finishLearn,
  learnState,
  manualTemplate,
  parseHexBytes,
  startLearn
} from "../core/midi/learn.js";
import { sendTranspose } from "../core/midi/engine.js";

const DEFAULT_HEX = "F0 43 10 7F 1C 07 00 00 07 40 F7";

function firstDevice() {
  return midi.value.devices.find((device) => device.inputCount > 0)
    || midi.value.devices.find((device) => device.sendable)
    || null;
}

export function LearnDialog() {
  const state = learnState.value;
  const device = firstDevice();
  const [manual, setManual] = useState(false);
  const [modelKey, setModelKey] = useState(() => device?.modelKey || "MANUAL");
  const [modelName, setModelName] = useState(() => device?.displayName || "手动模板");
  const [hex, setHex] = useState(DEFAULT_HEX);
  const [valueIndex, setValueIndex] = useState(9);
  const [base, setBase] = useState(64);
  const [step, setStep] = useState(1);
  const [signed, setSigned] = useState(false);
  const [checksum, setChecksum] = useState("NONE");
  const [manualError, setManualError] = useState("");

  let byteCount = 0;
  try {
    byteCount = parseHexBytes(hex).length;
  } catch (_) {}

  const close = () => {
    cancelLearn();
    closeDialog();
  };

  const begin = () => {
    setManual(false);
    setManualError("");
    startLearn({ durationMs: 30000 });
  };

  const saveManual = () => {
    try {
      const saved = manualTemplate({
        modelKey,
        modelName,
        hex,
        valueIndex,
        base,
        stepPerSemitone: step,
        signed,
        checksum
      });
      setManualError("");
      showToast(`已保存模板：${saved.modelName}`);
      cancelLearn();
      closeDialog();
    } catch (error) {
      setManualError(error?.message || String(error));
    }
  };

  const result = state.result;
  const success = result?.ok;

  return html`
    <${AppDialog} title="适配新琴" onClose=${close}>
      ${manual
        ? html`
          <div class="learn-form">
            <p class="hint">手动填写琴在改变移调时发出的 SysEx。值字节是从 1 开始计数的会变化字节。</p>
            <label class="learn-field">
              <span>型号 key（保存模板用）</span>
              <input class="learn-input" value=${modelKey} onInput=${(e) => setModelKey(e.currentTarget.value)} />
            </label>
            <label class="learn-field">
              <span>显示名称</span>
              <input class="learn-input" value=${modelName} onInput=${(e) => setModelName(e.currentTarget.value)} />
            </label>
            <label class="learn-field">
              <span>SysEx HEX</span>
              <textarea class="learn-hex" rows="3" value=${hex} onInput=${(e) => setHex(e.currentTarget.value)}></textarea>
            </label>
            <p class="hint">当前 ${byteCount} 个字节；必须 F0 开头、F7 结尾。</p>
            <${Stepper}
              label="值字节（从 1 开始）"
              value=${valueIndex + 1}
              min=${2}
              max=${Math.max(2, byteCount - 1)}
              onChange=${(value) => setValueIndex(value - 1)}
            />
            <${Stepper} label="移调 0 时的值（base）" value=${base} min=${0} max=${127} onChange=${setBase} />
            <${Stepper} label="每半音变化量" value=${step} min=${-12} max=${12} onChange=${setStep} />
            <${Toggle} label="负数用 7-bit 二补码" checked=${signed} onChange=${setSigned} />
            <${Toggle}
              label="Roland DT1 校验和"
              checked=${checksum === "ROLAND"}
              onChange=${(checked) => setChecksum(checked ? "ROLAND" : "NONE")}
            />
            ${manualError ? html`<p class="activation-message bad">${manualError}</p>` : null}
            <div class="button-row">
              <button type="button" class="primary-btn" onClick=${saveManual}>保存模板</button>
              <${SmallButton} label="取消" onClick=${() => setManual(false)} />
            </div>
          </div>
        `
        : state.active
          ? html`
            <div class="learn-status">
              <div class="learn-big">正在学习</div>
              <p>请在琴上把硬件移调归零，然后在 30 秒内按两次 ♯。</p>
              <div class="learn-count">剩余 ${Math.ceil(state.remainingMs / 1000)} 秒 · 已收到 ${state.captures} 条 SysEx</div>
              ${!device || device.inputCount === 0
                ? html`<p class="callout">没有可用的 MIDI 输入口。请先连接琴的 USB，并在设置里确认“接收口”大于 0。</p>`
                : null}
              <div class="button-row">
                <button type="button" class="primary-btn" onClick=${() => finishLearn()}>提前完成</button>
                <${SmallButton} label="取消" onClick=${() => cancelLearn()} />
              </div>
            </div>
          `
          : success
            ? html`
              <div class="learn-status">
                <div class="learn-big success">学习成功</div>
                <p>${result.template.modelName}</p>
                <p class="hint">
                  值字节 #${result.template.valueIndex + 1} ·
                  base ${result.template.base} ·
                  每半音 ${result.template.stepPerSemitone}
                  ${result.template.checksum === "ROLAND" ? " · Roland 校验" : ""}
                </p>
                <div class="button-row">
                  <button type="button" class="primary-btn" onClick=${async () => {
                    await sendTranspose(settings.value.offset, { consume: false, reason: "学习测试" });
                    showToast("已发送测试");
                  }}>发送测试</button>
                  <${SmallButton} label="完成" onClick=${close} />
                  <${SmallButton} label="手动模板" onClick=${() => setManual(true)} />
                </div>
              </div>
            `
            : result && !success
              ? html`
                <div class="learn-status">
                  <div class="learn-big failure">学习失败</div>
                  <p>${result.reason}</p>
                  <div class="button-row">
                    <button type="button" class="primary-btn" onClick=${begin}>重试</button>
                    <${SmallButton} label="手动模板" onClick=${() => setManual(true)} />
                    <${SmallButton} label="关闭" onClick=${close} />
                  </div>
                </div>
              `
              : html`
                <div class="learn-status">
                  <p>把琴的硬件移调归零，点「开始学习」，然后在 30 秒内按两次 ♯。</p>
                  <p class="hint">App 会从琴发出的 SysEx 里找出随移调变化的字节，生成可重放的模板。</p>
                  ${!device || device.inputCount === 0
                    ? html`<p class="callout">没有可用的 MIDI 输入口。请先连接琴的 USB。</p>`
                    : html`<p class="hint">当前可学习：${device.displayName}</p>`}
                  <div class="button-row">
                    <button type="button" class="primary-btn" onClick=${begin}>开始学习</button>
                    <${SmallButton} label="手动模板" onClick=${() => setManual(true)} />
                  </div>
                  <${Hint}>
                    已保存 ${Object.keys(templates.value).length} 个模板；可在设置 → 学习模板里查看/删除。
                  <//>
                </div>
              `}
    <//>
  `;
}
