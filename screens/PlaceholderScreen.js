import { html } from "../ui/components.js";
import { navigate } from "../app/router.js";

const TITLES = {
  setlist: "歌单",
  sounds: "音色选择",
  chain: "音色链",
  mixer: "调音台",
  drums: "打鼓"
};

const NOTES = {
  setlist: "3×3 歌单、SongBook 编号发送、从琴抓取、上一首/下一首。",
  sounds: "9 组 × 6 页 × 48 格音色、KEYBOARDSET 导入、点按即发。",
  chain: "蛇形音色链、长按拖动排序、颜色、移调指令、多链管理。",
  mixer: "7 路推子、CC#7、静音、SX/MIDI 目标、通道映射。",
  drums: "10 个鼓垫、9 个鼓组、46 个音效、16 步 Loop。"
};

export function PlaceholderScreen({ screen }) {
  const title = TITLES[screen] || "功能";
  const note = NOTES[screen] || "";
  return html`
    <div class="sub-screen">
      <div class="screen-header">
        <button type="button" class="back-btn" onClick=${() => navigate("transpose")}>‹ 返回</button>
        <h1>${title}</h1>
        <span class="header-spacer"></span>
      </div>
      <div class="placeholder-card">
        <div class="placeholder-icon">🚧</div>
        <h2>${title}正在开发中</h2>
        <p>这个页面会在后续阶段上线。当前版本已经可以连接 MIDI、移调和授权。</p>
        <p class="hint">${note}</p>
      </div>
    </div>
  `;
}
