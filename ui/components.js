import { h } from "preact";
import { useEffect, useLayoutEffect, useRef } from "preact/hooks";
import htm from "htm";

export const html = htm.bind(h);

/**
 * Keeps a fixed dialog overlay inside the workspace pane that opened it.
 * On narrow screens (or global dialogs) it stays a normal viewport overlay.
 */
function useScopedOverlay() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const pane = el?.closest(".workspace-pane");
    if (!el || !pane) return undefined;
    let frame = 0;
    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!el.isConnected) return;
        const rect = pane.getBoundingClientRect();
        el.classList.add("pane-scoped");
        el.style.left = `${rect.left}px`;
        el.style.top = `${rect.top}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
        el.style.right = "auto";
        el.style.bottom = "auto";
      });
    };
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("scroll", apply, true);
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(apply)
      : null;
    observer?.observe(pane);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", apply);
      window.removeEventListener("scroll", apply, true);
      observer?.disconnect();
    };
  }, []);
  return ref;
}

export function haptic(duration = 40) {
  try {
    if (navigator.vibrate) navigator.vibrate(duration);
  } catch (_) {}
}

export function SmallButton({ label, onClick, active = false, disabled = false, title = "", className = "" }) {
  return html`
    <button
      type="button"
      class=${`small-btn${active ? " active" : ""}${className ? ` ${className}` : ""}`}
      onClick=${onClick}
      disabled=${disabled}
      title=${title || label}
    >${label}</button>
  `;
}

/** Fire immediately on pointer down (iPad-safe), with a keyboard click fallback. */
function usePointerTap(onClick, disabled = false) {
  const lastRef = useRef(0);
  const fire = (event) => {
    if (disabled) return;
    lastRef.current = performance.now();
    onClick?.(event);
  };
  return {
    onPointerDown: (event) => {
      if (disabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      fire(event);
    },
    onClick: (event) => {
      if (disabled) return;
      if (performance.now() - lastRef.current < 700) return;
      fire(event);
    }
  };
}

export function BarButton({ label, active = false, disabled = false, onClick, className = "" }) {
  const handlers = usePointerTap(onClick, disabled);
  return html`
    <button
      type="button"
      class=${`small-btn${active ? " active" : ""}${className ? ` ${className}` : ""}`}
      disabled=${disabled}
      title=${label}
      ...${handlers}
    >${label}</button>
  `;
}

export function BarIconButton({ label, title, disabled = false, onClick, className = "", children }) {
  const handlers = usePointerTap(onClick, disabled);
  return html`
    <button
      type="button"
      class=${`icon-btn${className ? ` ${className}` : ""}`}
      title=${title || label}
      aria-label=${label}
      disabled=${disabled}
      ...${handlers}
    >${children}</button>
  `;
}

export function AppDialog({ title, onClose, children, wide = false, headerAction = null }) {
  const overlayRef = useScopedOverlay();
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return html`
    <div
      ref=${overlayRef}
      class="dialog-overlay"
      onPointerDown=${(event) => {
        if (event.target === event.currentTarget && onClose) onClose();
      }}
    >
      <div class=${`app-dialog${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label=${title}>
        <div class="dialog-head">
          <h2>${title}</h2>
          <div class="dialog-head-actions">
            ${headerAction}
            <button type="button" class="dialog-close" onClick=${onClose}>关闭</button>
          </div>
        </div>
        <div class="dialog-content">${children}</div>
      </div>
    </div>
  `;
}

export function AlertDialog({ title, message, children, actions = [], onClose = null }) {
  const overlayRef = useScopedOverlay();
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return html`
    <div ref=${overlayRef} class="dialog-overlay">
      <div class="alert-dialog" role="alertdialog" aria-modal="true" aria-label=${title}>
        <h2>${title}</h2>
        ${message ? html`<p class="alert-message">${message}</p>` : null}
        ${children}
        <div class="alert-actions">
          ${actions.map((action) => html`
            <button
              type="button"
              class=${`dialog-action${action.primary ? " primary" : ""}${action.danger ? " danger" : ""}`}
              onClick=${action.onClick}
            >${action.label}</button>
          `)}
        </div>
      </div>
    </div>
  `;
}

export function Section({ title, hint = "", children }) {
  return html`
    <section class="settings-section">
      <h3>${title}</h3>
      ${hint ? html`<p class="hint">${hint}</p>` : null}
      <div class="section-body">${children}</div>
    </section>
  `;
}

export function Chip({ label, selected = false, onClick, title = "" }) {
  return html`
    <button
      type="button"
      class=${`chip${selected ? " selected" : ""}`}
      onClick=${onClick}
      title=${title || label}
    >${label}</button>
  `;
}

export function Stepper({ label, value, min, max, onChange, suffix = "", inline = false }) {
  const clamp = (next) => Math.max(min, Math.min(max, next));
  return html`
    <div class=${`stepper-row${inline ? " inline" : ""}`}>
      <span class="stepper-label">${label}</span>
      <div class="stepper">
        <button type="button" class="stepper-btn" disabled=${value <= min} onClick=${() => onChange(clamp(value - 1))}>−</button>
        <span class="stepper-value">${value}${suffix}</span>
        <button type="button" class="stepper-btn" disabled=${value >= max} onClick=${() => onChange(clamp(value + 1))}>＋</button>
      </div>
    </div>
  `;
}

export function Toggle({ label, checked, onChange }) {
  return html`
    <label class="switch-row">
      <span>${label}</span>
      <input
        type="checkbox"
        checked=${checked}
        onChange=${(event) => onChange(event.currentTarget.checked)}
      />
      <span class="switch-track" aria-hidden="true"></span>
    </label>
  `;
}

export function Slider({ label, value, min, max, onChange, suffix = "" }) {
  return html`
    <label class="slider-row">
      <span class="slider-label">${label}</span>
      <input
        type="range"
        min=${min}
        max=${max}
        value=${value}
        onInput=${(event) => onChange(Number(event.currentTarget.value))}
      />
      <span class="slider-value">${value}${suffix}</span>
    </label>
  `;
}

export function StatusDot({ active = false, danger = false }) {
  return html`<span class=${`status-dot${active ? " active" : ""}${danger ? " danger" : ""}`}></span>`;
}

export function LogView({ lines = [], empty = "暂无日志" }) {
  if (!lines.length) return html`<div class="log-view empty">${empty}</div>`;
  return html`
    <div class="log-view" aria-live="polite">
      ${lines.map((line) => html`
        <div class=${`log-line ${line.kind || "info"}`}>
          <span class="log-time">${line.time}</span>
          <span class="log-text">${line.text}</span>
        </div>
      `)}
    </div>
  `;
}

export function Toast({ toast }) {
  if (!toast) return null;
  return html`<div class="toast" role="status" aria-live="polite">${toast.message}</div>`;
}

export function Hint({ children }) {
  return html`<p class="hint">${children}</p>`;
}

export function Divider() {
  return html`<div class="divider"></div>`;
}
