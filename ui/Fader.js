import { useRef, useState } from "preact/hooks";
import { html, haptic } from "./components.js";

const CAP_HEIGHT = 24;

function capCenter(track, value) {
  const rect = track.getBoundingClientRect();
  const travel = Math.max(1, rect.height - CAP_HEIGHT);
  const pct = Math.max(0, Math.min(127, value)) / 127;
  return rect.bottom - CAP_HEIGHT / 2 - pct * travel;
}

function valueAt(track, y) {
  const rect = track.getBoundingClientRect();
  const travel = Math.max(1, rect.height - CAP_HEIGHT);
  const center = Math.max(rect.top + CAP_HEIGHT / 2,
    Math.min(rect.bottom - CAP_HEIGHT / 2, y));
  const pct = (rect.bottom - CAP_HEIGHT / 2 - center) / travel;
  return Math.max(0, Math.min(127, Math.round(pct * 127)));
}

export function Fader({
  value,
  muted = false,
  disabled = false,
  onVolume,
  onToggleMute
}) {
  const trackRef = useRef(null);
  const stateRef = useRef(null);
  const [ring, setRing] = useState(null);
  const pct = Math.max(0, Math.min(127, value)) / 127;

  const begin = (event) => {
    if (disabled || event.button !== undefined && event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    event.preventDefault();
    haptic(20);
    const center = capCenter(track, value);
    const onCap = Math.abs(event.clientY - center) <= 16;
    const start = value;
    stateRef.current = {
      pointerId: event.pointerId,
      start,
      last: value,
      dragging: onCap,
      waiting: !onCap,
      grabOffset: onCap ? event.clientY - center : 0,
      savedCenter: center,
      approach: Math.sign(event.clientY - center) || 1
    };
    setRing({ waiting: !onCap, pointerY: event.clientY });
    try {
      track.setPointerCapture(event.pointerId);
    } catch (_) {}
  };

  const move = (event) => {
    const state = stateRef.current;
    const track = trackRef.current;
    if (!state || !track || event.pointerId !== state.pointerId) return;
    event.preventDefault();

    if (state.waiting) {
      if (state.approach > 0 ? event.clientY >= state.savedCenter : event.clientY <= state.savedCenter) {
        state.waiting = false;
        state.dragging = true;
        state.grabOffset = 0;
      } else {
        setRing({ waiting: true, pointerY: event.clientY });
        return;
      }
    }

    const next = valueAt(track, event.clientY - state.grabOffset);
    state.last = next;
    setRing({ waiting: false, pointerY: event.clientY });
    const accepted = onVolume(next, false, state.start);
    if (accepted === false) {
      state.dragging = false;
      state.waiting = false;
      setRing(null);
      try { track.releasePointerCapture(state.pointerId); } catch (_) {}
      stateRef.current = null;
    }
  };

  const finish = (event) => {
    const state = stateRef.current;
    const track = trackRef.current;
    if (!state || !track || (event && event.pointerId !== state.pointerId)) return;
    try { track.releasePointerCapture(state.pointerId); } catch (_) {}
    if (state.dragging && state.last !== state.start) {
      onVolume(state.last, true, state.start);
    }
    stateRef.current = null;
    setRing(null);
  };

  const capBottom = `calc((100% - ${CAP_HEIGHT}px) * ${pct})`;
  const fillHeight = `calc(12px + (100% - ${CAP_HEIGHT}px) * ${pct})`;

  return html`
    <div class=${`mixer-fader${muted ? " muted" : ""}`}>
      <div
        class="fader-track"
        ref=${trackRef}
        onPointerDown=${begin}
        onPointerMove=${move}
        onPointerUp=${(event) => finish(event)}
        onPointerCancel=${(event) => finish(event)}
      >
        <div class="fader-rail"></div>
        <div class="fader-fill" style=${{ height: fillHeight }}></div>
        <div class="fader-tick" style=${{ bottom: "0%" }}></div>
        <div class="fader-tick" style=${{ bottom: "25%" }}></div>
        <div class="fader-tick" style=${{ bottom: "50%" }}></div>
        <div class="fader-tick" style=${{ bottom: "75%" }}></div>
        <div class="fader-tick" style=${{ bottom: "100%" }}></div>
        <div class="fader-cap" style=${{ bottom: capBottom }}>
          <span class="fader-grip"></span>
          <span class="fader-grip"></span>
          <span class="fader-grip"></span>
        </div>
        ${ring ? html`
          <div class=${`fader-ring${ring.waiting ? " waiting" : ""}`} style=${{ bottom: capBottom }}></div>
          <div class="fader-finger" style=${{ top: `${ring.pointerY - (trackRef.current?.getBoundingClientRect().top || 0)}px` }}></div>
        ` : null}
      </div>
      <button
        type="button"
        class=${`mute-pill${muted ? " off" : ""}`}
        onClick=${() => {
          haptic();
          onToggleMute();
        }}
      >${muted ? "OFF" : "ON"}</button>
    </div>
  `;
}
