import { useRef, useState } from "preact/hooks";
import { html, haptic } from "./components.js";
import { padDistanceFraction, velocityFromPadDistance } from "../core/drums/model.js";

export function padAccentClass(padId) {
  switch (padId) {
    case "KICK":
      return "pad-kick";
    case "SNARE":
    case "CRASH":
    case "RIDE":
      return "pad-accent-alt";
    case "CLOSED_HAT":
    case "OPEN_HAT":
      return "pad-success";
    default:
      return "pad-danger";
  }
}

export function DrumPad({
  padId,
  index,
  title,
  subtitle,
  note,
  editMode,
  isDragging,
  isHoverTarget,
  velocityMode,
  fixedVelocity,
  centerVelocity,
  edgeVelocity,
  onDown,
  onUp,
  onDragStart,
  onDragMove,
  onDragEnd
}) {
  const [pressed, setPressed] = useState(false);
  const [shownVelocity, setShownVelocity] = useState(fixedVelocity);
  const activeRef = useRef(false);
  const startedRef = useRef(false);

  const begin = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    haptic(18);
    setPressed(true);
    activeRef.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (_) {}
    if (editMode) {
      onDragStart(index);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = padDistanceFraction(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height
    );
    const velocity = velocityMode === "POSITION"
      ? velocityFromPadDistance(fraction, centerVelocity, edgeVelocity)
      : fixedVelocity;
    const safe = Math.max(1, Math.min(127, velocity));
    setShownVelocity(safe);
    startedRef.current = onDown(safe) !== false;
  };

  const move = (event) => {
    if (!activeRef.current || !editMode) return;
    event.preventDefault();
    onDragMove(index, event.clientX, event.clientY);
  };

  const finish = (event, cancelled = false) => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setPressed(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch (_) {}
    if (editMode) {
      onDragEnd(index, event.clientX, event.clientY);
    } else if (startedRef.current) {
      startedRef.current = false;
      onUp();
    }
  };

  const badge = editMode ? "MOVE" : pressed ? `VEL ${shownVelocity}` : `NOTE ${note}`;

  return html`
    <div
      class=${`drum-pad ${padAccentClass(padId)}${pressed ? " pressed" : ""}${isDragging ? " dragging" : ""}${isHoverTarget ? " hover-target" : ""}`}
      onPointerDown=${begin}
      onPointerMove=${move}
      onPointerUp=${(event) => finish(event)}
      onPointerCancel=${(event) => finish(event, true)}
      data-pad=${padId}
    >
      <span class="pad-ring pad-ring-outer"></span>
      <span class="pad-ring pad-ring-inner"></span>
      <span class=${`drum-pad-title${title.length > 12 ? " long" : ""}`}>${title}</span>
      <span class="drum-pad-sub">${subtitle}</span>
      <span class="drum-pad-badge">${badge}</span>
    </div>
  `;
}
