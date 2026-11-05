import { html, AlertDialog } from "../ui/components.js";
import { closeDialog, openDialog } from "../app/store.js";

export function PaywallDialog() {
  return html`
    <${AlertDialog}
      title="次数不足"
      message="每次成功移调、推子手势、打鼓、歌单/音色发送等扣 1 次；设置、学习、测试音、换鼓组、同步调音台免费。"
      actions=${[
        {
          label: "输入激活码 / 联系客服",
          primary: true,
          onClick: () => openDialog("support")
        },
        { label: "取消", onClick: () => closeDialog() }
      ]}
      onClose=${closeDialog}
    />
  `;
}
