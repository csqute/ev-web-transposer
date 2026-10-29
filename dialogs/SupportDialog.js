import { useState } from "preact/hooks";
import { html, AppDialog, SmallButton, Hint } from "../ui/components.js";
import {
  activateLicense,
  closeDialog,
  license,
  showSuccess,
  showToast
} from "../app/store.js";

export function SupportDialog() {
  const state = license.value;
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState("");
  const [activating, setActivating] = useState(false);

  const setFeedback = (text, kind = "") => {
    setMessage(text);
    setMessageKind(kind);
  };

  const copyDevice = async () => {
    try {
      await navigator.clipboard.writeText(state.device);
      setFeedback("设备码已复制", "ok");
    } catch (_) {
      setFeedback("复制失败，请手动选中设备码复制", "bad");
    }
  };

  const pasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCode(text.trim());
        setFeedback("已粘贴", "");
      }
    } catch (_) {
      setFeedback("浏览器不允许读取剪贴板，请手动长按粘贴", "bad");
    }
  };

  const activate = async () => {
    if (activating) return;
    const text = code.trim();
    if (!text) {
      setFeedback("请先粘贴激活码", "bad");
      return;
    }
    setActivating(true);
    setFeedback("正在校验签名…", "");
    try {
      const result = await activateLicense(text);
      setCode("");
      setFeedback(
        `${result.message}。设备码已更新，下次购买请复制新的设备码。`,
        "ok"
      );
      showSuccess(result.message, result.unlimited);
    } catch (error) {
      const textMessage = error?.message || String(error);
      setFeedback(textMessage, "bad");
      showToast(textMessage);
    } finally {
      setActivating(false);
    }
  };

  return html`
    <${AppDialog} title="次数与客服" onClose=${closeDialog}>
      <div class="support-hero">
        <div class="support-balance">
          ${state.unlimited ? "无限制版" : `剩余 ${state.balance} 次`}
        </div>
        <p class="hint">
          ${state.unlimited
            ? "所有功能不限次数，无需再充值。"
            : "每次成功移调、推子、打鼓、歌单/音色发送扣 1 次；设置、学习、测试音免费。"}
        </p>
      </div>

      <div class="support-qr-wrap">
        <img class="support-qr" src="./assets/contact_qr.jpg" alt="微信客服二维码" />
        <div class="support-qr-text">
          <p>扫码添加微信购买次数或永久版。</p>
          <p class="hint">发码时请把下面的设备码发给客服。</p>
        </div>
      </div>

      <div class="device-code-block">
        <div class="field-label">设备码</div>
        <div class="device-code-line">
          <code class="device-code">${state.device}</code>
          <${SmallButton} label="复制" onClick=${copyDevice} />
        </div>
      </div>

      <div class="activation-block">
        <div class="field-label">激活码（EV1...）</div>
        <textarea
          class="activation-input"
          rows="3"
          value=${code}
          onInput=${(event) => setCode(event.currentTarget.value)}
          placeholder="粘贴 EV1 开头的激活码"
        ></textarea>
        <div class="button-row">
          <${SmallButton} label="粘贴" onClick=${pasteCode} />
          <button
            type="button"
            class="primary-btn"
            disabled=${activating}
            onClick=${activate}
          >${activating ? "校验中…" : "激活"}</button>
        </div>
        ${message
          ? html`<p class=${`activation-message ${messageKind}`}>${message}</p>`
          : null}
      </div>

      <${Hint}>
        免费额度 50 次。清空浏览器数据后设备码和剩余次数会重置；
        卸载或换浏览器需要重新激活。网页版激活码只能防随意分享，无法像安卓版一样校验安装包。
      <//>
    <//>
  `;
}
