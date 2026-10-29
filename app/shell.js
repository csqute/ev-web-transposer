import { useEffect, useRef, useState } from "preact/hooks";
import { html, Toast, StatusDot, SmallButton, AppDialog, BarIconButton } from "../ui/components.js";
import { StatusBar } from "../ui/StatusBar.js";
import { MainScreen } from "../screens/MainScreen.js";
import { MixerScreen } from "../screens/MixerScreen.js";
import { DrumScreen } from "../screens/DrumScreen.js";
import { SoundPickerScreen } from "../screens/SoundPickerScreen.js";
import { SoundChainScreen } from "../screens/SoundChainScreen.js";
import { SetListScreen } from "../screens/SetListScreen.js";
import { PlaceholderScreen } from "../screens/PlaceholderScreen.js";
import { SettingsDialog } from "../dialogs/SettingsDialog.js";
import { SupportDialog } from "../dialogs/SupportDialog.js";
import { PaywallDialog } from "../dialogs/PaywallDialog.js";
import { SuccessDialog } from "../dialogs/SuccessDialog.js";
import { PlaceholderDialog } from "../dialogs/PlaceholderDialog.js";
import { LearnDialog } from "../dialogs/LearnDialog.js";
import { PresetDialog } from "../dialogs/PresetDialog.js";
import {
  layout,
  license,
  midi,
  openDialog,
  route,
  saveLayout,
  showToast,
  ui
} from "./store.js";
import { navigate } from "./router.js";
import { exitFullscreenOrFocus, toggleFullscreen } from "./fullscreen.js";
import { isAppleTouchDevice } from "../core/midi/access.js";
import { APP_NAME, APP_VERSION } from "./version.js";
import {
  PANE_SCREENS,
  PANE_TITLES,
  withPaneAdded,
  withPaneMoved,
  withPaneRemoved,
  withPanesSwapped,
  withPaneScreen
} from "./panes.js";

const MIDIWEB_URL = "https://apps.apple.com/app/id6757226617";
const WIDE_QUERY = "(min-width: 1000px) and (orientation: landscape)";

function UnsupportedBanner() {
  const apple = isAppleTouchDevice();
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("网址已复制，请到 MIDIWeb Browser 里粘贴打开");
    } catch (_) {
      showToast("复制失败，请手动复制地址栏网址");
    }
  };
  return html`
    <div class="midi-banner" role="status">
      <div class="midi-banner-text">
        <strong>这个浏览器没有 Web MIDI</strong>
        <span>
          ${apple
            ? "iPad/iPhone 的 Safari 不支持；请用 MIDIWeb Browser 打开本页。"
            : "请用 Chrome 或 Edge 打开本页（需 HTTPS）。"}
        </span>
      </div>
      <div class="midi-banner-actions">
        <button type="button" class="banner-btn" onClick=${copyUrl}>复制网址</button>
        ${apple
          ? html`<a class="banner-btn link" href=${MIDIWEB_URL} target="_blank" rel="noreferrer">MIDIWeb Browser</a>`
          : null}
      </div>
    </div>
  `;
}

function DialogHost() {
  const dialog = ui.value.dialog;
  return html`
    ${dialog === "settings" ? html`<${SettingsDialog} />` : null}
    ${dialog === "support" ? html`<${SupportDialog} />` : null}
    ${dialog === "paywall" ? html`<${PaywallDialog} />` : null}
    ${dialog === "placeholder" ? html`<${PlaceholderDialog} />` : null}
    ${dialog === "learn" ? html`<${LearnDialog} />` : null}
    ${dialog === "presets" ? html`<${PresetDialog} />` : null}
    <${SuccessDialog} />
  `;
}

function ScreenView({ screen, embedded = false, onNavigate = null }) {
  switch (screen) {
    case "transpose":
      return html`<${MainScreen} embedded=${embedded} onNavigate=${onNavigate} />`;
    case "mixer":
      return html`<${MixerScreen} embedded=${embedded} />`;
    case "drums":
      return html`<${DrumScreen} embedded=${embedded} />`;
    case "sounds":
      return html`<${SoundPickerScreen} embedded=${embedded} />`;
    case "chain":
      return html`<${SoundChainScreen} embedded=${embedded} />`;
    case "setlist":
      return html`<${SetListScreen} embedded=${embedded} />`;
    default:
      return html`<${PlaceholderScreen} screen=${screen} />`;
  }
}

function useWorkspaceWide() {
  const [wide, setWide] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(WIDE_QUERY).matches
  );
  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY);
    const update = () => setWide(query.matches);
    const updateAfterFullscreen = () => {
      update();
      setTimeout(update, 250);
    };
    query.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    document.addEventListener("fullscreenchange", updateAfterFullscreen);
    document.addEventListener("webkitfullscreenchange", updateAfterFullscreen);
    update();
    return () => {
      query.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      document.removeEventListener("fullscreenchange", updateAfterFullscreen);
      document.removeEventListener("webkitfullscreenchange", updateAfterFullscreen);
    };
  }, []);
  return wide;
}

function PaneMenuDialog({ index, onClose, onSelect, onMove, onRemove }) {
  const state = layout.value;
  const screen = state.panes[index];
  return html`
    <${AppDialog} title=${`窗格 · ${PANE_TITLES[screen] || screen}`} onClose=${onClose}>
      <div class="pane-dialog">
        <h3 class="section-title">显示页面</h3>
        <div class="pane-page-grid">
          ${PANE_SCREENS.map((item) => html`
            <button
              type="button"
              class=${`pane-page-option${item === screen ? " current" : ""}${state.panes.includes(item) && item !== screen ? " used" : ""}`}
              onClick=${() => onSelect(item)}
            >
              <strong>${PANE_TITLES[item]}</strong>
              <span>${item === screen ? "当前窗格" : state.panes.includes(item) ? "已打开" : "可添加"}</span>
            </button>
          `)}
        </div>
        <div class="pane-dialog-actions">
          <${SmallButton} label="左移" disabled=${index <= 0} onClick=${() => onMove(-1)} />
          <${SmallButton} label="右移" disabled=${index >= state.panes.length - 1} onClick=${() => onMove(1)} />
          <${SmallButton} label="关闭窗格" disabled=${state.panes.length <= 1} onClick=${onRemove} />
        </div>
        <p class="hint">
          最多 4 栏（4 栏时排成 2×2）。点其他窗格即可切换焦点；按住窗格标题拖动可交换位置。
        </p>
      </div>
    <//>
  `;
}

function AddPaneDialog({ onClose, onAdd }) {
  const state = layout.value;
  const unused = PANE_SCREENS.filter((screen) => !state.panes.includes(screen));
  return html`
    <${AppDialog} title="添加窗格" onClose=${onClose}>
      <div class="pane-dialog">
        <h3 class="section-title">选择新窗格的页面</h3>
        <div class="pane-page-grid">
          ${unused.map((screen) => html`
            <button type="button" class="pane-page-option" onClick=${() => onAdd(screen)}>
              <strong>${PANE_TITLES[screen]}</strong>
              <span>添加</span>
            </button>
          `)}
        </div>
      </div>
    <//>
  `;
}

function Workspace() {
  const state = layout.value;
  const [paneMenu, setPaneMenu] = useState(-1);
  const [addingPane, setAddingPane] = useState(false);
  const [drag, setDrag] = useState(null);
  const initializedRef = useRef(false);
  const dragCleanupRef = useRef(null);
  const apple = isAppleTouchDevice();
  const balance = license.value;
  const connectedCount = midi.value.devices.filter((device) => device.sendable || device.echoable).length;
  const balanceText = balance.unlimited ? "无限制版" : `剩余 ${balance.balance} 次`;

  const focusPane = (index) => {
    if (index === layout.value.focused) return;
    saveLayout({ ...layout.value, focused: index });
    navigate(layout.value.panes[index]);
  };

  const goScreen = (screen) => {
    const current = layout.value;
    const existing = current.panes.indexOf(screen);
    if (existing >= 0) {
      saveLayout({ ...current, focused: existing });
      navigate(screen);
      return;
    }
    saveLayout(withPaneScreen(current, current.focused, screen));
    navigate(screen);
  };

  // The main pane's five buttons never replace the main pane itself.
  const goFromMain = (screen) => {
    const current = layout.value;
    const existing = current.panes.indexOf(screen);
    if (existing >= 0) {
      saveLayout({ ...current, focused: existing });
      navigate(screen);
      return;
    }
    const mainIndex = current.panes.indexOf("transpose");
    const sideIndices = current.panes
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item !== "transpose")
      .map(({ index }) => index);
    const target = sideIndices.length
      ? sideIndices[sideIndices.length - 1]
      : (mainIndex >= 0 ? mainIndex : current.focused);
    saveLayout(withPaneScreen(current, target, screen));
    navigate(screen);
  };

  const changePane = (index, screen) => {
    const current = layout.value;
    const existing = current.panes.indexOf(screen);
    if (existing >= 0 && existing !== index) {
      saveLayout({ ...current, focused: existing });
      navigate(screen);
      setPaneMenu(-1);
      return;
    }
    saveLayout(withPaneScreen(current, index, screen));
    navigate(screen);
    setPaneMenu(-1);
  };

  const addPane = (screen) => {
    saveLayout(withPaneAdded(layout.value, screen));
    navigate(screen);
    setAddingPane(false);
  };

  const removePane = (index) => {
    const next = withPaneRemoved(layout.value, index);
    saveLayout(next);
    navigate(next.panes[next.focused]);
    setPaneMenu(-1);
  };

  const movePane = (index, delta) => {
    saveLayout(withPaneMoved(layout.value, index, delta));
  };

  const swapPanes = (from, to) => {
    const next = withPanesSwapped(layout.value, from, to);
    if (next === layout.value) return;
    saveLayout(next);
    navigate(next.panes[next.focused]);
  };

  useEffect(() => () => dragCleanupRef.current?.(), []);

  /** Drag a pane header onto another pane to swap their positions. */
  const startPaneDrag = (event, index) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest("button")) return;
    const from = index;
    const startX = event.clientX;
    const startY = event.clientY;
    let active = false;
    let target = from;

    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.body.classList.remove("pane-dragging");
      dragCleanupRef.current = null;
    };

    const move = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      if (!active) {
        if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 8) return;
        active = true;
        document.body.classList.add("pane-dragging");
        setDrag({ from, target: from });
      }
      moveEvent.preventDefault();
      const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const paneElement = element?.closest?.(".workspace-pane");
      if (!paneElement) return;
      const panes = [...document.querySelectorAll(".workspace-pane")];
      const next = panes.indexOf(paneElement);
      if (next >= 0 && next !== target) {
        target = next;
        setDrag({ from, target: next });
      }
    };

    const finish = (upEvent) => {
      if (upEvent?.pointerId !== undefined && upEvent.pointerId !== event.pointerId) return;
      cleanup();
      if (active && target !== from) swapPanes(from, target);
      setDrag(null);
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    dragCleanupRef.current = cleanup;
  };

  // Keep the hash/focused pane in sync for back/forward and deep links.
  useEffect(() => {
    const current = layout.value;
    const hash = window.location.hash;
    const rootHash = hash === "" || hash === "#" || hash === "#/";
    const index = current.panes.indexOf(route.value);
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Opening the bare site should restore the saved focused pane instead
      // of replacing it with the default main screen.
      const focusedScreen = current.panes[current.focused];
      if (rootHash && route.value === "transpose" && focusedScreen !== "transpose") {
        navigate(focusedScreen);
        return;
      }
    }
    if (index < 0) {
      saveLayout(withPaneScreen(current, current.focused, route.value));
    } else if (index !== current.focused) {
      saveLayout({ ...current, focused: index });
    }
  }, [route.value]);

  return html`
    <div class="workspace">
      <div class="workspace-bar">
        <div class="workspace-left">
          <${StatusBar} />
          <span class=${`workspace-balance${balance.unlimited ? " unlimited" : ""}`}>${balanceText}</span>
        </div>
        <button
          type="button"
          class="workspace-brand"
          title="回到主界面"
          onClick=${() => goScreen("transpose")}
        >
          <strong>${APP_NAME}</strong>
          <span>v${APP_VERSION}</span>
        </button>
        <span class="workspace-conn" title=${connectedCount ? `已连接 ${connectedCount} 台琴` : "未连接琴"}>
          <${StatusDot} active=${connectedCount > 0} danger=${connectedCount === 0} />
          <span>${connectedCount > 0 ? `已连接 ${connectedCount} 台` : "未连接"}</span>
        </span>
        <div class="workspace-actions">
          ${apple
            ? null
            : html`
                <${BarIconButton}
                  label="全屏或专注模式"
                  title="全屏 / 专注模式"
                  onClick=${() => toggleFullscreen()}
                >⛶</${BarIconButton}>
              `}
          <${BarIconButton}
            label="添加窗格"
            title="添加窗格"
            disabled=${state.panes.length >= 4}
            onClick=${() => setAddingPane(true)}
          >＋</${BarIconButton}>
        </div>
      </div>

      <div
        class=${`workspace-panes${ui.value.focusMode ? " focus" : ""}`}
        style=${{ "--pane-count": String(state.panes.length) }}
        data-pane-count=${state.panes.length}
      >
        ${state.panes.map((screen, index) => html`
          <div
            key=${screen}
            class=${`workspace-pane${index === state.focused ? " focused" : ""}${drag?.from === index ? " dragging" : ""}${drag && drag.target === index && drag.target !== drag.from ? " drop-target" : ""}`}
            data-screen=${screen}
            onPointerDown=${() => focusPane(index)}
          >
            <div
              class="pane-head"
              title="按住拖动可交换窗格位置"
              onPointerDown=${(event) => startPaneDrag(event, index)}
            >
              <span class="pane-grip" aria-hidden="true">⠿</span>
              <span class="pane-title">${PANE_TITLES[screen]}</span>
              ${index === state.focused ? html`<span class="pane-focus">当前</span>` : null}
              <button
                type="button"
                class="pane-menu-btn"
                title="窗格选项"
                aria-label="窗格选项"
                onPointerDown=${(event) => {
                  if (event.pointerType === "mouse" && event.button !== 0) return;
                  event.preventDefault();
                  setPaneMenu(index);
                }}
                onClick=${(event) => {
                  event.stopPropagation();
                  setPaneMenu(index);
                }}
              >⋯</button>
            </div>
            <div class=${`pane-body${screen === "transpose" ? " main-pane" : ""}`}>
              <${ScreenView} screen=${screen} embedded=${true} onNavigate=${screen === "transpose" ? goFromMain : null} />
            </div>
          </div>
        `)}
      </div>
    </div>

    ${paneMenu >= 0 && paneMenu < state.panes.length
      ? html`
          <${PaneMenuDialog}
            index=${paneMenu}
            onClose=${() => setPaneMenu(-1)}
            onSelect=${(screen) => changePane(paneMenu, screen)}
            onMove=${(delta) => movePane(paneMenu, delta)}
            onRemove=${() => removePane(paneMenu)}
          />
        `
      : null}
    ${addingPane && state.panes.length < 4
      ? html`<${AddPaneDialog} onClose=${() => setAddingPane(false)} onAdd=${addPane} />`
      : null}
  `;
}

export function App() {
  const wide = useWorkspaceWide();
  const screen = route.value;
  const focusMode = ui.value.focusMode;
  return html`
    <div class=${`app${focusMode ? " focus-mode" : ""}${wide ? " workspace-mode" : ""}`}>
      ${!midi.value.supported ? html`<${UnsupportedBanner} />` : null}
      ${wide
        ? html`<${Workspace} />`
        : html`<${ScreenView} screen=${screen} embedded=${false} />`}
      <${DialogHost} />
      <${Toast} toast=${ui.value.toast} />
      ${focusMode && !wide && screen !== "transpose"
        ? html`<button type="button" class="focus-exit" onClick=${() => exitFullscreenOrFocus()}>退出专注</button>`
        : null}
    </div>
  `;
}
