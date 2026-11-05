import { html, AlertDialog } from "../ui/components.js";
import { closeSuccess, ui } from "../app/store.js";

export function SuccessDialog() {
  const success = ui.value.success;
  if (!success) return null;
  return html`
    <${AlertDialog}
      title="充值成功"
      actions=${[{ label: "知道了", primary: true, onClick: () => closeSuccess() }]}
      onClose=${closeSuccess}
    >
      <div class="success-check">✓</div>
      <p class="success-message">${success.message}</p>
      ${success.unlimited
        ? html`<p class="hint">已升级为无限制版，所有功能不再扣次数。</p>`
        : null}
    <//>
  `;
}
