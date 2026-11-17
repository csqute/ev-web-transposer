import { html, AlertDialog } from "../ui/components.js";
import { closeDialog, ui } from "../app/store.js";

export function PlaceholderDialog() {
  const payload = ui.value.dialogPayload || {};
  return html`
    <${AlertDialog}
      title=${payload.title || "提示"}
      message=${payload.message || ""}
      actions=${[{ label: "知道了", primary: true, onClick: () => closeDialog() }]}
      onClose=${closeDialog}
    />
  `;
}
