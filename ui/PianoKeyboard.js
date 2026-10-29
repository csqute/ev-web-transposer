import { useEffect, useRef } from "preact/hooks";
import { html, haptic } from "./components.js";
import { settings } from "../app/store.js";
import { themeColors } from "../app/theme.js";
import {
  BLACK_KEY_POSITIONS,
  NOTE_LABELS,
  WHITE_INDICES,
  wrapIndex
} from "../core/midi/notes.js";

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function hitTest(x, y, width, height) {
  if (width <= 0 || height <= 0) return null;
  const whiteWidth = width / 7;
  const blackWidth = whiteWidth * 0.62;
  const blackHeight = height * 0.66;
  for (const [noteIndex, afterWhite] of BLACK_KEY_POSITIONS) {
    const center = (afterWhite + 1) * whiteWidth;
    const left = center - blackWidth / 2;
    if (x >= left && x <= left + blackWidth && y >= 0 && y <= blackHeight) {
      return noteIndex;
    }
  }
  if (y < 0 || y > height) return null;
  const whitePosition = Math.max(0, Math.min(6, Math.floor(x / whiteWidth)));
  return WHITE_INDICES[whitePosition];
}

export function PianoKeyboard({ offset, onSelect }) {
  const canvasRef = useRef(null);
  const themeName = settings.value.theme;
  const colors = themeColors(themeName);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const parent = canvas.parentElement;
    let frame = 0;

    const draw = () => {
      const rect = parent.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const gap = 2;
      const whiteWidth = width / 7;
      const corner = 6;
      const selectedIndex = wrapIndex(offset);
      const fontFamily = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

      roundRect(ctx, 0, 0, width, height, 10);
      ctx.fillStyle = colors.surfaceAlt;
      ctx.fill();

      for (let position = 0; position < 7; position += 1) {
        const noteIndex = WHITE_INDICES[position];
        const left = position * whiteWidth + gap / 2;
        const right = (position + 1) * whiteWidth - gap / 2;
        const active = noteIndex === selectedIndex;
        roundRect(ctx, left, gap, right - left, height - gap * 2, corner);
        ctx.fillStyle = active ? colors.pressed : colors.whiteKey;
        ctx.fill();
        ctx.fillStyle = active ? colors.onAccent : colors.whiteKeyText;
        ctx.font = `700 ${Math.max(10, whiteWidth * 0.18)}px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(NOTE_LABELS[noteIndex], left + (right - left) / 2, height - 20);
      }

      const blackWidth = whiteWidth * 0.62;
      const blackHeight = height * 0.66;
      for (const [noteIndex, afterWhite] of BLACK_KEY_POSITIONS) {
        const center = (afterWhite + 1) * whiteWidth;
        const left = center - blackWidth / 2;
        const active = noteIndex === selectedIndex;
        roundRect(ctx, left, gap, blackWidth, blackHeight, corner);
        ctx.fillStyle = active ? colors.pressed : colors.blackKey;
        ctx.fill();
        ctx.fillStyle = active ? colors.onAccent : colors.blackKeyText;
        ctx.font = `700 ${Math.max(9, blackWidth * 0.24)}px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(NOTE_LABELS[noteIndex], center, blackHeight - 14);
      }
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(parent);
    schedule();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [offset, themeName, colors]);

  const onPointerDown = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const note = hitTest(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
    if (note !== null) {
      haptic();
      onSelect(note);
    }
  };

  return html`
    <canvas
      ref=${canvasRef}
      class="piano-canvas"
      onPointerDown=${onPointerDown}
      aria-label="钢琴键盘，点按选择调"
    ></canvas>
  `;
}
