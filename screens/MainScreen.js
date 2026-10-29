import { html, SmallButton, BarButton } from "../ui/components.js";
import { StatusBar } from "../ui/StatusBar.js";
import { ConnectionInline } from "../ui/ConnectionInline.js";
import { PianoKeyboard } from "../ui/PianoKeyboard.js";
import { KeyGrid } from "../ui/KeyGrid.js";
import { MainControlBar } from "../ui/MainControlBar.js";
import { APP_NAME, APP_VERSION } from "../app/version.js";
import {
  hasUses,
  license,
  openDialog,
  route,
  settings,
  updateSettings
} from "../app/store.js";
import { navigate } from "../app/router.js";
import { toggleFullscreen } from "../app/fullscreen.js";
import { isAppleTouchDevice } from "../core/midi/access.js";
import { isConnected, sendTranspose } from "../core/midi/engine.js";
import {
  noteLabel,
  offsetForTap,
  signedOffset,
  wrapOffset
} from "../core/midi/notes.js";

function applyOffset(next, reason) {
  const current = settings.value.offset;
  const value = Math.max(-12, Math.min(12, next));
  if (value === current) return;

  // Android refuses a connected, charged change at zero balance before
  // touching the state. A disconnected preview is free.
  if (isConnected() && !hasUses(1)) {
    openDialog("paywall");
    return;
  }

  updateSettings({ offset: value });
  sendTranspose(value, { consume: true, reason }).catch(() => {});
}

export function MainScreen({ embedded = false, onNavigate = null }) {
  const state = license.value;
  const offset = settings.value.offset;
  const step = settings.value.step;
  const interfaceStyle = settings.value.interfaceStyle;
  const showFullscreen = !isAppleTouchDevice();
  const balanceText = state.unlimited ? "无限制版" : `剩余 ${state.balance} 次`;
  const balanceClass = state.unlimited
    ? "balance unlimited"
    : state.balance === 0
      ? "balance zero"
      : "balance";

  const go = (screen) => (onNavigate ? onNavigate(screen) : navigate(screen));

  const selectNote = (keyIndex) => {
    applyOffset(offsetForTap(offset, keyIndex), "移调");
  };

  const nudge = (delta) => {
    applyOffset(wrapOffset(offset + delta), "移调");
  };

  return html`
    <div class=${`main-screen${embedded ? " embedded" : ""}`}>
      ${embedded
        ? html`
            <div
              class="embedded-nav"
              onPointerDown=${(event) => event.stopPropagation()}
              onClick=${(event) => event.stopPropagation()}
            >
              <${BarButton} label="歌单" active=${route.value === "setlist"} onClick=${() => go("setlist")} />
              <${BarButton} label="音色" active=${route.value === "sounds"} onClick=${() => go("sounds")} />
              <${BarButton} label="打鼓" active=${route.value === "drums"} onClick=${() => go("drums")} />
              <${BarButton} label="调音台" active=${route.value === "mixer"} onClick=${() => go("mixer")} />
              <${BarButton} label="设置" onClick=${() => openDialog("settings")} />
            </div>
          `
        : html`
      <div class="topbar">
        <${StatusBar} />
        <span class=${balanceClass}>${balanceText}</span>
        <div class="titleblock">
          <h1>${APP_NAME}</h1>
          <span class="version">v${APP_VERSION}</span>
        </div>
        <div class="top-actions">
          <${SmallButton} label="歌单" onClick=${() => go("setlist")} />
          <${SmallButton} label="音色" onClick=${() => go("sounds")} />
          <${SmallButton} label="打鼓" onClick=${() => go("drums")} />
          <${SmallButton} label="调音台" onClick=${() => go("mixer")} />
          <${SmallButton} label="设置" onClick=${() => openDialog("settings")} />
          ${showFullscreen
            ? html`
                <button
                  type="button"
                  class="icon-btn"
                  title="全屏 / 专注模式"
                  aria-label="全屏或专注模式"
                  onClick=${() => toggleFullscreen()}
                >⛶</button>
              `
            : null}
        </div>
      </div>
      `}

      <div class="current-row">
        <div class="current-left">
          <div class="current-line">
            <span class="current-label">当前</span>
            <span class="current-offset">${signedOffset(offset)}</span>
            <span class="current-note">（${noteLabel(offset)}）</span>
          </div>
          <div class="offset-bar" aria-hidden="true">
            <div class="offset-fill" style=${{ width: `${((offset + 12) / 24) * 100}%` }}></div>
          </div>
        </div>
        <${ConnectionInline} />
      </div>

      <div class="keyboard-area">
        ${interfaceStyle === "LARGE_BUTTONS"
          ? html`<${KeyGrid} offset=${offset} onSelect=${selectNote} />`
          : html`<${PianoKeyboard} offset=${offset} onSelect=${selectNote} />`}
      </div>

      <${MainControlBar}
        step=${step}
        onTranspose=${nudge}
        onStepChange=${(value) => updateSettings({ step: value })}
      />
    </div>
  `;
}
